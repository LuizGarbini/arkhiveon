import {
	Check,
	ChevronDown,
	Clock,
	Compass,
	FileText,
	IdCard,
	ImagePlus,
	SendHorizontal,
	Sparkles,
	Undo2,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type FormEvent,
	type KeyboardEvent,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	applyCharacterPatch,
	buildCharacterCreateRows,
	buildCharacterPatchDiff,
	type CharacterCreateRow,
	type CharacterDiffRow,
	missingPatchItems,
	proposalToCharacterInput,
} from "@/lib/ai-mesa/character-patch";
import { askMesaAssistant } from "@/lib/ai-mesa/client";
import {
	IA_MESA_MAX_IMAGES,
	type IaMesaPreparedImage,
	prepareMesaImage,
	toImageAttachments,
} from "@/lib/ai-mesa/image-input";
import {
	describeProposal,
	errorMessage,
	formatDailyLimitNotice,
	IA_MESA_INPUT_MAX_CHARS,
	type IaMesaCharacterCreateProposal,
	type IaMesaCharacterPatchProposal,
	type IaMesaNpcProposal,
	type IaMesaProposal,
	nextProposalStatus,
	type ProposalAction,
	type ProposalStatus,
	proposalToNpcInput,
	toHistory,
} from "@/lib/ai-mesa/proposal";
import {
	commitCharacterBatch,
	reviewSheetBatch,
	snapshotFromCharacter,
} from "@/lib/ai-mesa/sheet-batch";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import {
	SheetBatchReview,
	type SheetBatchReviewRow,
} from "./sheet-batch-review";

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	images?: IaMesaPreparedImage[];
	time: string;
	isError?: boolean;
	proposal?: IaMesaProposal;
	status?: ProposalStatus;
	npcId?: string;
	createdCharacterId?: string;
	/** Valores da ficha antes do Aplicar (para Desfazer um patch). */
	undoPatch?: Partial<Character>;
	applyError?: string;
	highlighted?: boolean;
	/** Diff congelado no Aplicar, para a lista não sumir com a escrita otimista. */
	batchRows?: SheetBatchReviewRow[];
}

const SAVE_FAILED = "Não foi possível salvar. Nada foi alterado.";

const TRANSIENT_FAILURE = "Não consegui responder agora. Nada foi enviado.";
const NOT_ALLOWED = "O assistente não está disponível nesta campanha.";
const CHAT_INPUT_MAX_CHARS = 1200;
const EMPTY_THREAD = "Pergunte sobre regras, a cena ou a ficha.";
const DEFAULT_IMAGE_USER_MESSAGE =
	"Analise a imagem enviada e proponha criar ou atualizar a ficha correspondente.";

/** Hover e foco visíveis, com tokens que já existem. O anel não fica cortado. */
const tactileControl =
	"overflow-visible focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [@media(hover:hover)]:hover:ring-2 [@media(hover:hover)]:hover:ring-primary/40";

type PanelState =
	| { kind: "idle" }
	| { kind: "loading"; reading?: boolean }
	| { kind: "error"; text: string; retryable?: boolean }
	| { kind: "limit"; resetsAt: string };

const EDIT_VERB = String.raw`(?:atualiz|edit|alter|mud|troc|ajust|coloc|cri)\p{L}*`;
/** Verbo de edição no início de uma frase/linha (comando). */
const EDIT_COMMAND_START = new RegExp(
	String.raw`(?:^|[.!\n]\s*)${EDIT_VERB}\b`,
	"iu",
);
/** "atualiza a ficha", "muda na ficha do mago" como comando. */
const EDIT_THE_SHEET = new RegExp(
	String.raw`\b${EDIT_VERB}\s+(?:a|na|minha|essa|esta|uma|da)\s+ficha\b`,
	"iu",
);
const QUESTION =
	/\?\s*$|^\s*(?:o que|como|qual|quais|quando|por que|porque|pode|posso|será)\b/iu;

/** Exportado para teste: prompt longo, imagem ou comando de editar/criar ficha → skeleton. */
export function readingPrompt(text: string, hasImages = false): boolean {
	if (hasImages) return true;
	if (text.length >= 400) return true;
	if (!/\bficha\b/i.test(text) || QUESTION.test(text.trim())) return false;
	return EDIT_COMMAND_START.test(text.trim()) || EDIT_THE_SHEET.test(text);
}

function nowLabel(): string {
	return new Date().toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** Hora de volta do limite, no fuso do servidor traduzido para São Paulo. */
function formatDailyLimitHint(resetsAtIso: string): string {
	const date = new Date(resetsAtIso);
	if (Number.isNaN(date.getTime())) return "Limite diário atingido";
	const time = new Intl.DateTimeFormat("pt-BR", {
		timeZone: "America/Sao_Paulo",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(date);
	return `Limite diário atingido · volta às ${time}`;
}

function failureCopy(code: string): string {
	if (code === "unavailable" || code === "model_error")
		return TRANSIENT_FAILURE;
	if (code === "not_allowed") return NOT_ALLOWED;
	return errorMessage(code);
}

let messageSeq = 0;
function newId(): string {
	messageSeq += 1;
	return `ia-${Date.now()}-${messageSeq}`;
}

/**
 * Assistente da mesa (piloto, modelo-a-limpo).
 * FAB no canto inferior direito → janela flutuante de 400 px (tela cheia no
 * celular). A IA só propõe; Confirmar → Aplicar grava um NPC desta campanha
 * ou o patch numa ficha existente dela. Ignorar não grava nada.
 * Estado da conversa é local à sessão (não persiste).
 */
export function VTTAiChat({
	campaignId,
	campaignName,
	sceneName,
	placement = "absolute",
	clientContext,
}: {
	campaignId: string;
	campaignName: string;
	sceneName?: string;
	/**
	 * `absolute` (padrão): ancorado no container da mesa VTT.
	 * `fixed`: ancorado na viewport, para o shell logado. Mesmo visual.
	 */
	placement?: "absolute" | "fixed";
	clientContext?: {
		route?: string;
		entityName?: string;
		entityKind?: string;
	};
}) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [attachments, setAttachments] = useState<IaMesaPreparedImage[]>([]);
	const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const listRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const applyingRef = useRef(false);
	const busyRef = useRef(false);

	// Composer cresce com o texto até o `max-h-52` do CSS; depois rola dentro.
	// biome-ignore lint/correctness/useExhaustiveDependencies: recalcula a cada texto/abertura.
	useLayoutEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [draft, open]);
	const inputId = useId();
	const limitNoticeId = useId();
	const counterId = useId();
	// Sem gatilho explícito de lote: texto acima do limite do chat (1.200) é
	// tratado como colagem para edição em lote. Derivado no render.
	const batchMode = draft.length > CHAT_INPUT_MAX_CHARS;
	const overLimit = draft.length > IA_MESA_INPUT_MAX_CHARS;
	const batchModeId = useId();
	const limitHintId = useId();
	const limitNotice =
		panel.kind === "limit" ? formatDailyLimitNotice(panel.resetsAt) : "";
	const limitHint =
		panel.kind === "limit" ? formatDailyLimitHint(panel.resetsAt) : "";
	const inputLocked = panel.kind === "loading" || panel.kind === "limit";
	const dockMessage = dockedSheetBatch(messages);
	const composerCollapsed =
		dockMessage?.status === "pending" || dockMessage?.status === "applying";

	const scrollToEnd = () => {
		requestAnimationFrame(() => {
			const el = listRef.current;
			if (el) el.scrollTop = el.scrollHeight;
		});
	};

	const addAttachmentFiles = async (files: FileList | File[]) => {
		const list = Array.from(files);
		if (list.length === 0 || inputLocked) return;
		setAttachmentNotice(null);
		const remaining = IA_MESA_MAX_IMAGES - attachments.length;
		if (remaining <= 0) {
			setAttachmentNotice(
				`Você pode anexar até ${IA_MESA_MAX_IMAGES} imagens por mensagem.`,
			);
			return;
		}
		if (list.length > remaining) {
			setAttachmentNotice(
				`Limite de ${IA_MESA_MAX_IMAGES} imagens por mensagem.`,
			);
		}
		const prepared: IaMesaPreparedImage[] = [];
		for (const file of list.slice(0, remaining)) {
			const res = await prepareMesaImage(file);
			if (!res.ok) {
				setAttachmentNotice(res.error);
				continue;
			}
			prepared.push(res.image);
		}
		if (prepared.length > 0) {
			setAttachments((prev) =>
				[...prev, ...prepared].slice(0, IA_MESA_MAX_IMAGES),
			);
		}
	};

	const removeAttachment = (id: string) => {
		setAttachments((prev) => prev.filter((item) => item.id !== id));
		setAttachmentNotice(null);
	};

	const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			void addAttachmentFiles(event.target.files);
		}
		event.target.value = "";
	};

	const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
		const items = event.clipboardData?.items;
		if (!items) return;
		const imageFiles: File[] = [];
		for (const item of Array.from(items)) {
			if (item.kind === "file" && item.type.startsWith("image/")) {
				const file = item.getAsFile();
				if (file) imageFiles.push(file);
			}
		}
		if (imageFiles.length > 0) {
			event.preventDefault();
			void addAttachmentFiles(imageFiles);
		}
	};

	const onComposerDragOver = (event: DragEvent<HTMLDivElement>) => {
		if (inputLocked) return;
		if (event.dataTransfer?.types?.includes("Files")) {
			event.preventDefault();
			setDragOver(true);
		}
	};

	const onComposerDragLeave = (event: DragEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
			return;
		}
		setDragOver(false);
	};

	const onComposerDrop = (event: DragEvent<HTMLDivElement>) => {
		setDragOver(false);
		if (inputLocked) return;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			event.preventDefault();
			void addAttachmentFiles(event.dataTransfer.files);
		}
	};

	const send = async (
		bubbleText?: string,
		bubbleImages?: IaMesaPreparedImage[],
	) => {
		const fromBubble = typeof bubbleText === "string";
		const text = (fromBubble ? bubbleText : draft).trim();
		const attached = fromBubble ? (bubbleImages ?? []) : attachments;
		const hasImages = attached.length > 0;
		if (
			(!text && !hasImages) ||
			busyRef.current ||
			panel.kind === "loading" ||
			panel.kind === "limit"
		)
			return;
		if (!fromBubble && draft.length > IA_MESA_INPUT_MAX_CHARS) {
			setPanel({
				kind: "error",
				text: errorMessage("input_too_large"),
				retryable: false,
			});
			return;
		}
		busyRef.current = true;
		const prior = messages.filter((m) => m.id !== "welcome" && !m.isError);
		const last = prior[prior.length - 1];
		const alreadyShown =
			last?.role === "user" &&
			last.text === text &&
			(last.images?.length ?? 0) === attached.length;
		const history = toHistory(alreadyShown ? prior.slice(0, -1) : prior);
		if (!alreadyShown) {
			setMessages((prev) => [
				...prev,
				{
					id: newId(),
					role: "user",
					text,
					...(hasImages ? { images: attached } : {}),
					time: nowLabel(),
				},
			]);
		}
		// Chat normal: a bolha já leva a pergunta e o campo esvazia no envio.
		// Lote: o texto colado fica no campo até um Aplicar bem-sucedido.
		const keepForBatch = !fromBubble && batchMode;
		if (!fromBubble && !keepForBatch) setDraft("");
		if (!fromBubble && hasImages) {
			setAttachments([]);
			setAttachmentNotice(null);
		}
		const promptText = text || DEFAULT_IMAGE_USER_MESSAGE;
		const imagePayload = toImageAttachments(attached);
		setPanel({
			kind: "loading",
			reading: readingPrompt(text, hasImages),
		});
		scrollToEnd();
		try {
			const result = await askMesaAssistant({
				campaignId,
				message: promptText,
				history,
				...(imagePayload.length > 0 ? { images: imagePayload } : {}),
				...(clientContext ? { clientContext } : {}),
			});
			if (result.ok) {
				const reply = result.reply.trim();
				const proposal = result.proposal ?? undefined;
				setPanel({ kind: "idle" });
				if (keepForBatch && result.proposal?.kind !== "sheet_batch") {
					setDraft("");
				}
				if (reply || proposal) {
					setMessages((prev) => [
						...prev,
						{
							id: newId(),
							role: "assistant",
							text: reply,
							time: nowLabel(),
							proposal,
							status: proposal ? "pending" : undefined,
						},
					]);
				}
				scrollToEnd();
				return;
			}
			if (result.code === "daily_limit") {
				setPanel({ kind: "limit", resetsAt: result.resetsAt ?? "" });
				scrollToEnd();
				return;
			}
			setPanel({
				kind: "error",
				text: failureCopy(result.code),
				retryable: result.code !== "input_too_large",
			});
			scrollToEnd();
		} finally {
			busyRef.current = false;
		}
	};

	const retryFromBubble = () => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			if (message.role === "user" && message.id !== "welcome") {
				void send(message.text, message.images);
				return;
			}
		}
	};

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		void send();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (
			event.key === "Enter" &&
			!event.shiftKey &&
			!event.nativeEvent.isComposing
		) {
			event.preventDefault();
			if (overLimit) return;
			void send();
		}
	};

	const patch = (id: string, changes: Partial<ChatMessage>) =>
		setMessages((prev) =>
			prev.map((m) => (m.id === id ? { ...m, ...changes } : m)),
		);

	const handleSheetBatch = (message: ChatMessage, action: ProposalAction) => {
		if (!message.proposal || message.proposal.kind !== "sheet_batch") return;
		const proposal = message.proposal;
		if (action === "ignore") {
			if (message.status !== "pending" || applyingRef.current) return;
			patch(message.id, {
				status: "ignored",
				applyError: undefined,
				batchRows: undefined,
			});
			return;
		}
		if (action === "undo") {
			if (message.status !== "applied" || !message.undoPatch) return;
			useRPGStore
				.getState()
				.updateCharacter(proposal.characterId, message.undoPatch);
			patch(message.id, {
				status: "undone",
				highlighted: false,
				applyError: undefined,
				batchRows: undefined,
			});
			return;
		}
		if (
			action !== "apply" ||
			message.status !== "pending" ||
			applyingRef.current
		) {
			return;
		}
		const store = useRPGStore.getState();
		if (store.activeCampaignId !== campaignId) {
			patch(message.id, {
				applyError:
					"Esta mesa não é a campanha ativa. Troque para ela no menu de campanhas e aplique de novo.",
			});
			return;
		}
		const character = store.characters.find(
			(c) => c.id === proposal.characterId,
		);
		if (!character) {
			patch(message.id, {
				applyError: "Ficha não encontrada nesta campanha. Nada foi alterado.",
			});
			return;
		}
		const review = reviewSheetBatch(snapshotFromCharacter(character), proposal);
		if (review.rejections.length > 0 || review.diff.length === 0) {
			patch(message.id, {
				applyError: "Há campos rejeitados. Nada foi alterado.",
			});
			return;
		}
		const campaign = store.campaigns.find((c) => c.id === campaignId);
		const userId = user?.id ?? null;
		const allowed =
			campaign?.myRole === "owner" ||
			campaign?.myRole === "editor" ||
			(!!userId && campaign?.ownerId === userId) ||
			(!!userId && character.createdBy === userId);
		const batchRows = rowsFromReview(review);
		applyingRef.current = true;
		patch(message.id, {
			status: "applying",
			applyError: undefined,
			batchRows,
			highlighted: false,
		});
		void (async () => {
			let persisted: Promise<void> = Promise.resolve();
			try {
				const result = commitCharacterBatch({
					allowed,
					character,
					proposal,
					write: (id, changes) => {
						persisted = store.updateCharacter(id, changes, { quiet: true });
					},
				});
				if (!result.ok) {
					patch(message.id, {
						status: "pending",
						applyError: result.error,
						batchRows: undefined,
						highlighted: false,
					});
					return;
				}
				await persisted;
				setDraft("");
				patch(message.id, {
					status: "applied",
					undoPatch: result.before,
					highlighted: true,
					applyError: undefined,
					batchRows,
				});
				window.setTimeout(() => {
					setMessages((prev) =>
						prev.map((item) =>
							item.id === message.id ? { ...item, highlighted: false } : item,
						),
					);
				}, 1000);
			} catch (err: unknown) {
				const messageText =
					err instanceof Error && err.message.trim()
						? err.message.trim()
						: SAVE_FAILED;
				patch(message.id, {
					status: "pending",
					applyError: messageText,
					highlighted: false,
				});
			} finally {
				applyingRef.current = false;
			}
		})();
	};

	const act = (message: ChatMessage, action: ProposalAction) => {
		if (message.proposal?.kind === "sheet_batch") {
			handleSheetBatch(message, action);
			return;
		}
		if (!message.proposal || !message.status) return;
		const next = nextProposalStatus(message.status, action);
		if (!next) return;

		if (action === "apply") {
			const store = useRPGStore.getState();
			if (store.activeCampaignId !== campaignId) {
				patch(message.id, {
					applyError:
						"Esta mesa não é a campanha ativa. Troque para ela no menu de campanhas e aplique de novo.",
				});
				return;
			}
			if (message.proposal.kind === "character_patch") {
				const proposal = message.proposal;
				const character = store.characters.find(
					(c) => c.id === proposal.characterId,
				);
				if (!character) {
					patch(message.id, {
						applyError:
							"Ficha não encontrada nesta campanha. Nada foi alterado.",
					});
					return;
				}
				const result = applyCharacterPatch(character, proposal);
				if (!result.ok) {
					patch(message.id, { applyError: result.error });
					return;
				}
				store.updateCharacter(character.id, result.changes);
				patch(message.id, {
					status: next,
					undoPatch: result.before,
					applyError: undefined,
				});
				return;
			}
			if (message.proposal.kind === "character_create") {
				const created = store.addCharacter(
					proposalToCharacterInput(message.proposal),
				);
				if (!created || !created.id) {
					patch(message.id, {
						applyError:
							useRPGStore.getState().syncError ||
							"Não foi possível criar a ficha. Nada foi alterado.",
					});
					return;
				}
				patch(message.id, {
					status: next,
					createdCharacterId: created.id,
					applyError: undefined,
				});
				return;
			}
			const created = store.addNpc(
				proposalToNpcInput(message.proposal, campaignId),
			);
			if (!created) {
				patch(message.id, {
					applyError:
						useRPGStore.getState().syncError ||
						"Não foi possível salvar o NPC. Nada foi alterado.",
				});
				return;
			}
			patch(message.id, {
				status: next,
				npcId: created.id,
				applyError: undefined,
			});
			return;
		}

		if (action === "undo" && message.npcId) {
			useRPGStore.getState().removeNpc(message.npcId);
		}
		if (
			action === "undo" &&
			message.createdCharacterId &&
			message.proposal.kind === "character_create"
		) {
			useRPGStore.getState().removeCharacter(message.createdCharacterId);
		}
		if (
			action === "undo" &&
			message.undoPatch &&
			message.proposal.kind === "character_patch"
		) {
			useRPGStore
				.getState()
				.updateCharacter(message.proposal.characterId, message.undoPatch);
		}
		patch(message.id, { status: next, applyError: undefined });
	};

	return (
		<>
			{open && (
				<section
					aria-label="Assistente da mesa"
					className={cn(
						"vtt-ai-chat fixed inset-0 z-[80] flex flex-col bg-popover text-popover-foreground sm:inset-auto sm:right-4 sm:bottom-24 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-border/70 sm:bg-popover/95 sm:shadow-2xl sm:backdrop-blur-md",
						placement === "fixed" ? "sm:fixed" : "sm:absolute",
					)}
				>
					<header className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
							<Sparkles className="size-4" aria-hidden />
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold">
								Assistente da mesa
							</p>
							<p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
								<span
									className="size-1.5 shrink-0 rounded-full bg-emerald-400"
									aria-hidden
								/>
								{campaignName} · Piloto
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-11"
							aria-label="Fechar assistente"
							onClick={() => setOpen(false)}
						>
							<X />
						</Button>
					</header>

					<div
						ref={listRef}
						className={cn(
							"space-y-3 overflow-y-auto overscroll-contain px-4 py-4",
							dockMessage ? "max-h-36 shrink-0 sm:max-h-44" : "min-h-0 flex-1",
						)}
						aria-live="polite"
					>
						{messages.length === 0 && (
							<p className="text-sm text-muted-foreground">{EMPTY_THREAD}</p>
						)}
						{messages.map((message) => (
							<MessageItem
								key={message.id}
								message={message}
								onAct={act}
								docked={dockMessage?.id === message.id}
							/>
						))}
						{panel.kind === "loading" && panel.reading && (
							<output
								aria-label="Lendo o prompt"
								className="block max-w-[85%] space-y-2 rounded-2xl bg-muted px-3.5 py-2.5"
							>
								<span className="block text-xs text-muted-foreground">
									Lendo o prompt
								</span>
								<Skeleton className="h-3 w-40 bg-muted-foreground/20" />
								<Skeleton className="h-3 w-56 bg-muted-foreground/20" />
								<Skeleton className="h-3 w-32 bg-muted-foreground/20" />
							</output>
						)}
						{panel.kind === "loading" && !panel.reading && (
							<output
								aria-label="Carregando resposta"
								className="flex h-5 items-center gap-1 px-3.5"
							>
								<span
									aria-hidden="true"
									className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
									style={{ animationDelay: "0ms" }}
								/>
								<span
									aria-hidden="true"
									className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
									style={{ animationDelay: "150ms" }}
								/>
								<span
									aria-hidden="true"
									className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
									style={{ animationDelay: "300ms" }}
								/>
							</output>
						)}
						{panel.kind === "error" && (
							<div
								role="alert"
								className="max-w-[85%] space-y-2 rounded-2xl border border-destructive/40 bg-muted px-3.5 py-2.5"
							>
								<p className="text-sm">{panel.text}</p>
								{panel.retryable !== false ? (
									<Button
										type="button"
										className={cn(
											"min-h-11 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
											tactileControl,
										)}
										onClick={retryFromBubble}
									>
										Tentar de novo
									</Button>
								) : null}
							</div>
						)}
						{panel.kind === "limit" && (
							<output
								id={limitNoticeId}
								className="flex max-w-[85%] items-start gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground"
							>
								<Clock
									className="mt-0.5 size-4 shrink-0 text-muted-foreground"
									aria-hidden
								/>
								{limitNotice}
							</output>
						)}
					</div>

					{dockMessage ? (
						<div
							data-slot="sheet-batch-dock"
							className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3"
						>
							<SheetBatchCard message={dockMessage} onAct={act} fill />
						</div>
					) : null}

					<form
						hidden={composerCollapsed}
						onSubmit={onSubmit}
						className="border-t border-border/70 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
					>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							multiple
							aria-label="Selecionar imagem da ficha"
							onChange={onFileInputChange}
							className="hidden"
						/>
						{/* biome-ignore lint/a11y/noStaticElementInteractions: dropzone around composer inputs */}
						<div
							onDragOver={onComposerDragOver}
							onDragLeave={onComposerDragLeave}
							onDrop={onComposerDrop}
							className={cn(
								"rounded-xl border border-border/70 bg-background/60 transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/15",
								dragOver && "border-primary/60 bg-primary/10",
							)}
						>
							{attachments.length > 0 && (
								<ul
									aria-label="Imagens anexadas"
									className="flex flex-wrap gap-2 border-b border-border/70 px-3 pt-2.5 pb-2"
								>
									{attachments.map((item) => (
										<li
											key={item.id}
											className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/60 p-1 pl-1.5"
										>
											<img
												src={item.dataUrl}
												alt={item.name}
												className="size-10 shrink-0 rounded-md object-cover"
											/>
											<span className="max-w-28 truncate text-xs text-foreground">
												{item.name}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label={`Remover imagem ${item.name}`}
												disabled={inputLocked}
												onClick={() => removeAttachment(item.id)}
												className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
											>
												<X className="size-3.5" />
											</Button>
										</li>
									))}
								</ul>
							)}
							<label htmlFor={inputId} className="sr-only">
								Mensagem para o assistente
							</label>
							<textarea
								id={inputId}
								ref={inputRef}
								value={draft}
								onChange={(e) => {
									const next = e.target.value;
									setDraft(next.length > 50_000 ? next.slice(0, 50_000) : next);
								}}
								onKeyDown={onKeyDown}
								onPaste={onPaste}
								rows={2}
								placeholder={
									panel.kind === "limit"
										? ""
										: attachments.length > 0
											? "Explique o que fazer com a imagem (ex: criar ficha)..."
											: "Peça algo para a IA ou anexe uma ficha..."
								}
								disabled={inputLocked}
								spellCheck={false}
								autoComplete="off"
								aria-describedby={
									[
										batchMode ? `${batchModeId} ${counterId}` : "",
										panel.kind === "limit"
											? `${limitNoticeId} ${limitHintId}`
											: "",
									]
										.filter(Boolean)
										.join(" ") || undefined
								}
								className="block box-border w-full min-w-0 max-h-52 resize-none overflow-y-auto overscroll-contain break-words bg-transparent px-3 py-2.5 text-[16px] outline-none placeholder:text-muted-foreground/60 disabled:opacity-60 sm:text-sm"
							/>
							{attachmentNotice && (
								<p role="alert" className="px-3 pb-1 text-xs text-destructive">
									{attachmentNotice}
								</p>
							)}
							{panel.kind === "limit" && (
								<p
									id={limitHintId}
									className="px-3 pb-1 text-xs text-muted-foreground"
								>
									{limitHint}
								</p>
							)}
							<div className="flex items-center justify-between gap-2 px-2 pb-2">
								<div className="flex min-w-0 items-center gap-1.5">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Anexar imagem"
										title="Anexar imagem (PNG, JPG, WebP ou GIF)"
										disabled={
											inputLocked || attachments.length >= IA_MESA_MAX_IMAGES
										}
										onClick={() => fileInputRef.current?.click()}
										className={cn(
											"size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground",
											tactileControl,
										)}
									>
										<ImagePlus className="size-4" />
									</Button>
									{sceneName ? (
										<span className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
											<Compass className="size-3.5 shrink-0" aria-hidden />
											<span className="truncate">{sceneName}</span>
										</span>
									) : null}
								</div>
								<Button
									type="submit"
									size="icon"
									className={cn(
										"size-11 shrink-0 rounded-full",
										tactileControl,
									)}
									aria-label="Enviar"
									disabled={
										(!draft.trim() && attachments.length === 0) ||
										inputLocked ||
										overLimit
									}
								>
									<SendHorizontal />
								</Button>
							</div>
						</div>
						{batchMode && (
							<div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
								<span id={batchModeId} className="text-muted-foreground">
									Modo edição em lote · texto longo vira proposta de alteração
								</span>
								<span
									id={counterId}
									className={cn(
										"tabular-nums",
										overLimit ? "text-destructive" : "text-muted-foreground",
									)}
								>
									<span className="sr-only">Tamanho do texto: </span>
									{draft.length}/{IA_MESA_INPUT_MAX_CHARS}
								</span>
							</div>
						)}
						<p className="mt-2 text-center text-[11px] text-muted-foreground">
							A IA sugere. Nada é salvo sem sua confirmação.
						</p>
					</form>
				</section>
			)}

			<Button
				type="button"
				size="icon"
				aria-label={
					open ? "Fechar assistente da mesa" : "Abrir assistente da mesa"
				}
				aria-expanded={open}
				onClick={() => {
					setOpen((v) => !v);
					if (!open) requestAnimationFrame(() => inputRef.current?.focus());
				}}
				className={cn(
					"right-4 bottom-4 z-[70] size-14 rounded-full shadow-2xl",
					tactileControl,
					placement === "fixed" ? "fixed" : "absolute",
					open && "hidden sm:inline-flex",
				)}
			>
				{open ? <X className="size-5" /> : <Sparkles className="size-5" />}
			</Button>
		</>
	);
}

function dockedSheetBatch(messages: ChatMessage[]): ChatMessage | undefined {
	const open = [...messages]
		.reverse()
		.find(
			(message) =>
				message.proposal?.kind === "sheet_batch" &&
				(message.status === "pending" || message.status === "applying"),
		);
	if (open) return open;
	const applied = [...messages]
		.reverse()
		.find(
			(message) =>
				message.proposal?.kind === "sheet_batch" &&
				message.status === "applied",
		);
	if (!applied) return undefined;
	const index = messages.findIndex((message) => message.id === applied.id);
	const hasNewer = messages
		.slice(index + 1)
		.some((message) => message.id !== "welcome");
	return hasNewer ? undefined : applied;
}

function rowsFromReview(
	review: ReturnType<typeof reviewSheetBatch>,
): SheetBatchReviewRow[] {
	return [
		...review.diff.map((row) => ({
			section: row.section,
			field: row.field,
			label: row.label,
			before: row.before,
			after: row.after,
		})),
		...review.rejections.map((row) => ({
			section: row.section,
			field: row.field,
			label: row.label,
			reason: row.reason,
		})),
	];
}

function MessageItem({
	message,
	onAct,
	docked = false,
}: {
	message: ChatMessage;
	onAct: (message: ChatMessage, action: ProposalAction) => void;
	docked?: boolean;
}) {
	if (message.role === "user") {
		return (
			<div className="flex flex-col items-end gap-1.5">
				{message.images && message.images.length > 0 && (
					<div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
						{message.images.map((image) => (
							<img
								key={image.id}
								src={image.dataUrl}
								alt={image.name}
								className="max-h-36 max-w-44 rounded-xl border border-primary/25 object-cover"
							/>
						))}
					</div>
				)}
				{message.text && (
					<p className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-primary/25 bg-primary/15 px-3.5 py-2.5 text-sm">
						{message.text}
					</p>
				)}
				{message.time && (
					<span className="text-[11px] tabular-nums text-muted-foreground">
						{message.time}
					</span>
				)}
			</div>
		);
	}
	const hasText = message.text.trim().length > 0;
	const hasProposal = Boolean(message.proposal && message.status);
	if (!hasText && !hasProposal) return null;
	return (
		<div className="space-y-3">
			{hasText && (
				<p
					role={message.isError ? "alert" : undefined}
					className={cn(
						"max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-3.5 py-2.5 text-sm",
						message.isError && "border border-destructive/40",
					)}
				>
					{message.text}
				</p>
			)}
			{message.proposal &&
				message.status &&
				(message.proposal.kind === "sheet_batch" ? (
					docked ? null : (
						<SheetBatchCard message={message} onAct={onAct} />
					)
				) : (
					<ProposalCard message={message} onAct={onAct} />
				))}
		</div>
	);
}

function SheetBatchCard({
	message,
	onAct,
	fill = false,
}: {
	message: ChatMessage;
	onAct: (message: ChatMessage, action: ProposalAction) => void;
	fill?: boolean;
}) {
	const proposal = message.proposal;
	const character = useRPGStore((s) =>
		proposal?.kind === "sheet_batch"
			? s.characters.find((c) => c.id === proposal.characterId)
			: undefined,
	);
	const review = useMemo(() => {
		if (!proposal || proposal.kind !== "sheet_batch" || !character) return null;
		return reviewSheetBatch(snapshotFromCharacter(character), proposal);
	}, [character, proposal]);
	if (!proposal || proposal.kind !== "sheet_batch") return null;
	if (message.status === "ignored" || message.status === "undone") {
		return (
			<p className="text-xs text-muted-foreground">
				{message.status === "undone"
					? "Desfeito. A ficha voltou ao que era."
					: "Proposta descartada. Nada foi salvo."}
			</p>
		);
	}
	const useFrozen =
		!!message.batchRows &&
		(message.status === "applying" ||
			message.status === "applied" ||
			(message.status === "pending" && !!message.applyError));
	const rows =
		useFrozen && message.batchRows
			? message.batchRows
			: review
				? rowsFromReview(review)
				: [
						{
							section: "Ficha",
							field: "characterId",
							label: "Ficha",
							reason:
								"Esta ficha não está na campanha ativa. Nada pode ser aplicado aqui.",
						},
					];
	const phase =
		message.status === "applying"
			? "applying"
			: message.status === "applied"
				? "applied"
				: "ready";
	return (
		<SheetBatchReview
			characterName={proposal.characterName}
			rows={rows}
			phase={phase}
			fill={fill}
			highlighted={message.highlighted === true && message.status === "applied"}
			error={message.applyError}
			onApply={() => onAct(message, "apply")}
			onCancel={() => onAct(message, "ignore")}
			onUndo={() => onAct(message, "undo")}
		/>
	);
}

function ProposalCard({
	message,
	onAct,
}: {
	message: ChatMessage;
	onAct: (message: ChatMessage, action: ProposalAction) => void;
}) {
	const proposal = message.proposal as IaMesaProposal;
	const status = message.status as ProposalStatus;
	const isPatch = proposal.kind === "character_patch";
	const isCreate = proposal.kind === "character_create";
	const character = useRPGStore((s) =>
		proposal.kind === "character_patch"
			? s.characters.find((c) => c.id === proposal.characterId)
			: undefined,
	);
	const patchState = useMemo(() => {
		if (proposal.kind !== "character_patch" || !character) return null;
		return {
			rows: buildCharacterPatchDiff(character, proposal),
			missing: missingPatchItems(character, proposal).length,
		};
	}, [proposal, character]);
	const createRows = useMemo(
		() =>
			proposal.kind === "character_create"
				? buildCharacterCreateRows(proposal)
				: [],
		[proposal],
	);
	const statusChip =
		status === "applied"
			? { dot: "bg-emerald-400", label: "Salvo" }
			: status === "ignored" || status === "undone"
				? {
						dot: "bg-muted-foreground",
						label: status === "undone" ? "Desfeito" : "Descartado",
					}
				: { dot: "bg-amber-400", label: "Não salvo" };
	const isOpen = status === "pending" || status === "confirmed";
	// Patch sem ficha visível, com item sumido ou sem mudança real: não aplica.
	const patchBlocked =
		isPatch &&
		isOpen &&
		(!patchState || patchState.missing > 0 || patchState.rows.length === 0);
	const count = isPatch
		? (patchState?.rows.length ?? 0)
		: isCreate
			? createRows.length
			: proposal.kind === "npc"
				? describeProposal(proposal).length
				: 0;

	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border border-border/70 bg-card",
				!isOpen && status !== "applied" && "opacity-60",
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2.5">
				<p className="truncate text-sm font-semibold">
					{isPatch
						? `Alterar ficha · ${count} ${count === 1 ? "mudança" : "mudanças"}`
						: isCreate
							? `Nova ficha · ${proposal.characterName}`
							: `Proposta · ${count} itens`}
				</p>
				<span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
					<span
						className={cn("size-1.5 rounded-full", statusChip.dot)}
						aria-hidden
					/>
					{statusChip.label}
				</span>
			</div>
			{proposal.kind === "character_patch" ? (
				<CharacterPatchBody
					proposal={proposal}
					found={!!character}
					rows={patchState?.rows ?? []}
					missing={patchState?.missing ?? 0}
				/>
			) : proposal.kind === "character_create" ? (
				<CharacterCreateBody proposal={proposal} rows={createRows} />
			) : proposal.kind === "npc" ? (
				<NpcProposalBody proposal={proposal} />
			) : null}

			{message.applyError && (
				<p
					role="alert"
					className="border-t border-destructive/40 px-3.5 py-2 text-xs text-destructive"
				>
					{message.applyError}
				</p>
			)}

			<div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-3.5 py-2.5">
				{isOpen && (
					<>
						<Button
							type="button"
							variant="ghost"
							className="min-h-11 text-muted-foreground"
							onClick={() => onAct(message, "ignore")}
						>
							Ignorar
						</Button>
						<div className="ml-auto flex items-center gap-2">
							{status === "pending" ? (
								<Button
									type="button"
									className="min-h-11"
									disabled={patchBlocked}
									onClick={() => onAct(message, "confirm")}
								>
									Confirmar alteração
								</Button>
							) : (
								<Button
									type="button"
									variant="outline"
									className="min-h-11"
									disabled
								>
									<Check />
									Confirmado
								</Button>
							)}
							<Button
								type="button"
								variant={status === "confirmed" ? "default" : "outline"}
								className="min-h-11"
								disabled={status !== "confirmed" || patchBlocked}
								title={
									status === "pending"
										? "Confirme a alteração antes de aplicar"
										: undefined
								}
								onClick={() => onAct(message, "apply")}
							>
								Aplicar
							</Button>
						</div>
					</>
				)}
				{status === "applied" && (
					<>
						<p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
							<Check className="size-3.5 text-emerald-400" aria-hidden />
							{isPatch
								? `Aplicado por você · agora — ficha de ${(proposal as IaMesaCharacterPatchProposal).characterName} atualizada`
								: isCreate
									? `Aplicado por você · agora — ficha de ${(proposal as IaMesaCharacterCreateProposal).characterName} criada`
									: "Aplicado por você · agora — NPC salvo no Diário"}
						</p>
						<Button
							type="button"
							variant="ghost"
							className="ml-auto min-h-11"
							onClick={() => onAct(message, "undo")}
						>
							<Undo2 />
							Desfazer
						</Button>
					</>
				)}
				{status === "ignored" && (
					<p className="text-xs text-muted-foreground">
						Proposta descartada. Nada foi salvo.
					</p>
				)}
				{status === "undone" && (
					<p className="text-xs text-muted-foreground">
						{isPatch
							? "Desfeito. A ficha voltou ao que era."
							: isCreate
								? "Desfeito. A ficha criada foi removida."
								: "Desfeito. O NPC foi removido."}
					</p>
				)}
			</div>
		</div>
	);
}

function CharacterCreateBody({
	proposal,
	rows,
}: {
	proposal: IaMesaCharacterCreateProposal;
	rows: CharacterCreateRow[];
}) {
	return (
		<div className="space-y-2 px-3.5 py-2.5">
			<div className="flex items-start gap-3">
				<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<IdCard className="size-3.5" aria-hidden />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold">
						{proposal.characterName}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						Nova ficha de personagem · confirme antes de criar
					</p>
					{proposal.summary && (
						<p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
							{proposal.summary}
						</p>
					)}
				</div>
			</div>
			{rows.length > 0 && (
				<ul className="divide-y divide-border/70 rounded-lg border border-border/70">
					{rows.map((row) => (
						<li
							key={`${row.label}-${row.value}`}
							className="grid gap-0.5 px-3 py-1.5 text-xs"
						>
							<span className="font-semibold text-foreground">{row.label}</span>
							<span className="whitespace-pre-wrap tabular-nums text-muted-foreground">
								{row.value}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function NpcProposalBody({ proposal }: { proposal: IaMesaNpcProposal }) {
	const lines = describeProposal(proposal);
	const [expanded, setExpanded] = useState<number | null>(0);
	return (
		<ul className="divide-y divide-border/70">
			{lines.map((line, index) => {
				const Icon = index === 0 ? FileText : IdCard;
				const isExpanded = expanded === index;
				return (
					<li key={line.meta}>
						<button
							type="button"
							aria-expanded={isExpanded}
							onClick={() => setExpanded(isExpanded ? null : index)}
							className="flex min-h-11 w-full items-start gap-3 px-3.5 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [@media(hover:hover)]:hover:bg-muted/40"
						>
							<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
								<Icon className="size-3.5" aria-hidden />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-semibold">
									{line.title}
								</span>
								<span className="block truncate text-xs text-muted-foreground">
									{line.meta}
								</span>
								{line.preview && (
									<span
										className={cn(
											"mt-1.5 block whitespace-pre-wrap text-xs text-muted-foreground",
											!isExpanded && "line-clamp-2",
										)}
									>
										{line.preview}
									</span>
								)}
							</span>
							<ChevronDown
								className={cn(
									"mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150",
									isExpanded && "rotate-180",
								)}
								aria-hidden
							/>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

const DIFF_TAG: Record<CharacterDiffRow["kind"], string | null> = {
	field: null,
	"item-add": "Novo item",
	"item-update": "Item",
	"item-remove": "Remover item",
};

function CharacterPatchBody({
	proposal,
	found,
	rows,
	missing,
}: {
	proposal: IaMesaCharacterPatchProposal;
	found: boolean;
	rows: CharacterDiffRow[];
	missing: number;
}) {
	return (
		<div className="space-y-2 px-3.5 py-2.5">
			<div className="flex items-start gap-3">
				<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<IdCard className="size-3.5" aria-hidden />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold">
						{proposal.characterName}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						Ficha existente · só muda o que está abaixo
					</p>
					{proposal.summary && (
						<p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
							{proposal.summary}
						</p>
					)}
				</div>
			</div>
			{!found ? (
				<p role="alert" className="text-xs text-destructive">
					Esta ficha não está na campanha ativa. Nada pode ser aplicado aqui.
				</p>
			) : missing > 0 ? (
				<p role="alert" className="text-xs text-destructive">
					A ficha mudou desde a proposta (item não encontrado). Peça de novo.
				</p>
			) : rows.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					Nada muda em relação à ficha atual.
				</p>
			) : (
				<ul className="divide-y divide-border/70 rounded-lg border border-border/70">
					{rows.map((row, index) => (
						<li
							key={`${row.kind}-${row.label}-${index}`}
							className="grid gap-0.5 px-3 py-2 text-xs"
						>
							<span className="flex items-center gap-2">
								<span className="truncate font-semibold text-foreground">
									{row.label}
								</span>
								{DIFF_TAG[row.kind] && (
									<span className="shrink-0 rounded-full border border-border/70 px-1.5 text-[11px] text-muted-foreground">
										{DIFF_TAG[row.kind]}
									</span>
								)}
							</span>
							<span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
								<span
									className={cn(
										"text-muted-foreground",
										row.before !== "—" && "line-through",
									)}
								>
									{row.before}
								</span>
								<span className="text-muted-foreground" aria-hidden>
									→
								</span>
								<span className="sr-only">para</span>
								<span
									className={cn(
										"text-foreground",
										row.kind === "item-remove" && "text-muted-foreground",
									)}
								>
									{row.after}
								</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
