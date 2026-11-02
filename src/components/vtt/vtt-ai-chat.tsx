import {
	Check,
	ChevronDown,
	Clock,
	Compass,
	FileText,
	IdCard,
	SendHorizontal,
	Sparkles,
	Undo2,
	X,
} from "lucide-react";
import {
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
	buildCharacterPatchDiff,
	type CharacterDiffRow,
	missingPatchItems,
} from "@/lib/ai-mesa/character-patch";
import { askMesaAssistant } from "@/lib/ai-mesa/client";
import {
	describeProposal,
	errorMessage,
	formatDailyLimitNotice,
	IA_MESA_INPUT_MAX_CHARS,
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
	time: string;
	isError?: boolean;
	proposal?: IaMesaProposal;
	status?: ProposalStatus;
	npcId?: string;
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

/** Hover e foco visíveis, com tokens que já existem. O anel não fica cortado. */
const tactileControl =
	"overflow-visible focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [@media(hover:hover)]:hover:ring-2 [@media(hover:hover)]:hover:ring-primary/40";

type PanelState =
	| { kind: "idle" }
	| { kind: "loading"; reading?: boolean }
	| { kind: "error"; text: string }
	| { kind: "limit"; resetsAt: string };

function readingPrompt(text: string): boolean {
	return (
		text.length >= 400 ||
		(/\b(atualiz|edit|alter|mud)\w*/i.test(text) && /\bficha\b/i.test(text))
	);
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
}: {
	campaignId: string;
	campaignName: string;
	sceneName?: string;
	/**
	 * `absolute` (padrão): ancorado no container da mesa VTT.
	 * `fixed`: ancorado na viewport, para o shell logado. Mesmo visual.
	 */
	placement?: "absolute" | "fixed";
}) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const listRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
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

	const send = async (bubbleText?: string) => {
		const fromBubble = typeof bubbleText === "string";
		const text = (fromBubble ? bubbleText : draft).trim();
		if (
			!text ||
			busyRef.current ||
			panel.kind === "loading" ||
			panel.kind === "limit"
		)
			return;
		if (!fromBubble && draft.length > IA_MESA_INPUT_MAX_CHARS) {
			setPanel({
				kind: "error",
				text: errorMessage("input_too_large"),
			});
			return;
		}
		busyRef.current = true;
		const prior = messages.filter((m) => m.id !== "welcome" && !m.isError);
		const last = prior[prior.length - 1];
		const alreadyShown = last?.role === "user" && last.text === text;
		const history = toHistory(alreadyShown ? prior.slice(0, -1) : prior);
		if (!alreadyShown) {
			setMessages((prev) => [
				...prev,
				{ id: newId(), role: "user", text, time: nowLabel() },
			]);
		}
		// Chat normal: a bolha já leva a pergunta e o campo esvazia no envio.
		// Lote: o texto colado fica no campo até um Aplicar bem-sucedido.
		const keepForBatch = !fromBubble && batchMode;
		if (!fromBubble && !keepForBatch) setDraft("");
		setPanel({ kind: "loading", reading: readingPrompt(text) });
		scrollToEnd();
		try {
			const result = await askMesaAssistant({
				campaignId,
				message: text,
				history,
			});
			if (result.ok) {
				setPanel({ kind: "idle" });
				if (keepForBatch && result.proposal?.kind !== "sheet_batch") {
					setDraft("");
				}
				setMessages((prev) => [
					...prev,
					{
						id: newId(),
						role: "assistant",
						text: result.reply,
						time: nowLabel(),
						proposal: result.proposal ?? undefined,
						status: result.proposal ? "pending" : undefined,
					},
				]);
				scrollToEnd();
				return;
			}
			if (result.code === "daily_limit") {
				setPanel({ kind: "limit", resetsAt: result.resetsAt ?? "" });
				scrollToEnd();
				return;
			}
			setPanel({ kind: "error", text: failureCopy(result.code) });
			scrollToEnd();
		} finally {
			busyRef.current = false;
		}
	};

	const retryFromBubble = () => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			if (message.role === "user" && message.id !== "welcome") {
				void send(message.text);
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
						persisted = store.saveCharacter(id, changes);
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
			} catch {
				patch(message.id, {
					status: "pending",
					applyError: SAVE_FAILED,
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
						{panel.kind === "loading" && (
							<output
								aria-label={
									panel.reading ? "Lendo o prompt" : "Carregando resposta"
								}
								className="block max-w-[85%] space-y-2 rounded-2xl bg-muted px-3.5 py-2.5"
							>
								<Skeleton className="h-3 w-40" />
								<Skeleton className="h-3 w-56" />
								<Skeleton className="h-3 w-32" />
							</output>
						)}
						{panel.kind === "error" && (
							<div
								role="alert"
								className="max-w-[85%] space-y-2 rounded-2xl border border-destructive/40 bg-muted px-3.5 py-2.5"
							>
								<p className="text-sm">{panel.text}</p>
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
						<div className="rounded-xl border border-border/70 bg-background/60 focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/15">
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
								rows={2}
								placeholder={
									panel.kind === "limit" ? "" : "Peça algo para a IA..."
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
							{panel.kind === "limit" && (
								<p
									id={limitHintId}
									className="px-3 pb-1 text-xs text-muted-foreground"
								>
									{limitHint}
								</p>
							)}
							<div className="flex items-center justify-between gap-2 px-2 pb-2">
								{sceneName ? (
									<span className="inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
										<Compass className="size-3.5 shrink-0" aria-hidden />
										<span className="truncate">{sceneName}</span>
									</span>
								) : (
									<span />
								)}
								<Button
									type="submit"
									size="icon"
									className={cn("size-11 rounded-full", tactileControl)}
									aria-label="Enviar"
									disabled={!draft.trim() || inputLocked || overLimit}
								>
									<SendHorizontal />
								</Button>
							</div>
						</div>
						{batchMode && (
							<div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
								<span id={batchModeId} className="text-muted-foreground">
									Modo edição em lote
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
			<div className="flex flex-col items-end gap-1">
				<p className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-primary/25 bg-primary/15 px-3.5 py-2.5 text-sm">
					{message.text}
				</p>
				{message.time && (
					<span className="text-[11px] tabular-nums text-muted-foreground">
						{message.time}
					</span>
				)}
			</div>
		);
	}
	return (
		<div className="space-y-3">
			<p
				role={message.isError ? "alert" : undefined}
				className={cn(
					"max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-3.5 py-2.5 text-sm",
					message.isError && "border border-destructive/40",
				)}
			>
				{message.text}
			</p>
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
				<p className="text-sm font-semibold">
					{isPatch
						? `Alterar ficha · ${count} ${count === 1 ? "mudança" : "mudanças"}`
						: `Proposta · ${count} itens`}
				</p>
				<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
							: "Desfeito. O NPC foi removido."}
					</p>
				)}
			</div>
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
