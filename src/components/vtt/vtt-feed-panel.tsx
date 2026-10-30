import { Dices, Lock, MoreHorizontal } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { tryParseDiceFormula } from "@/lib/vtt/dice";
import {
	CHAT_MESSAGE_MAX,
	canSendChat,
	FEED_EMPTY_TEXT,
	FEED_UNAVAILABLE_TEXT,
	feedLineView,
	formatFeedTime,
	QUICK_DICE_FACES,
	SECRET_ROLL_TEXT,
	SESSION_DIALOG_BODY,
	sessionConfirmLabel,
	sessionDialogTitle,
	sessionStartedText,
} from "@/lib/vtt/feed-line";
import {
	beginFeedSession,
	loadFeed,
	postChat,
	rollOnTable,
	subscribeFeed,
} from "@/lib/vtt/feed-sync";
import {
	selectRollEntries,
	selectRollResults,
	useRollStore,
} from "@/lib/vtt/roll-store";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const FORMULA_HINT = "Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.";
const CHAT_LIMIT_HINT = "A mensagem pode ter até 2000 caracteres.";

type PendingRoll = {
	localId: string;
	formula: string;
	secret: boolean;
	status: "sending" | "error";
	message?: string;
};

type PendingChat = {
	localId: string;
	text: string;
	status: "sending" | "error";
	message?: string;
};

function characterIdForRoll(): string | null {
	const { selectedTokenIds, tokens } = useVTTStore.getState();
	const token = tokens.find((item) => item.id === selectedTokenIds[0]);
	return token?.characterId ?? null;
}

function FeedComposer({
	isGM,
	campaignId,
	sceneId,
}: {
	isGM: boolean;
	campaignId: string;
	sceneId: string;
}) {
	const formulaId = useId();
	const messageId = useId();
	const [formula, setFormula] = useState("");
	const [mode, setMode] = useState("public");
	const [message, setMessage] = useState("");
	const [rollPending, setRollPending] = useState<PendingRoll | null>(null);
	const [chatPending, setChatPending] = useState<PendingChat | null>(null);
	const parsed = formula.trim() ? tryParseDiceFormula(formula) : null;
	const formulaInvalid = formula.trim().length > 0 && !parsed;
	const chatTooLong = message.trim().length > CHAT_MESSAGE_MAX;
	const rolling = rollPending?.status === "sending";
	const chatting = chatPending?.status === "sending";

	const sendRoll = (
		raw: string,
		secret: boolean,
		localId: string = crypto.randomUUID(),
	) => {
		setRollPending({ localId, formula: raw, secret, status: "sending" });
		void rollOnTable({
			campaignId,
			sceneId,
			formula: raw,
			secret,
			characterId: characterIdForRoll(),
		}).then((result) => {
			if (result.ok) {
				setRollPending((current) =>
					current?.localId === localId ? null : current,
				);
				return;
			}
			setRollPending((current) =>
				current?.localId === localId
					? { ...current, status: "error", message: result.message }
					: current,
			);
		});
	};

	const sendChat = (text: string, localId: string = crypto.randomUUID()) => {
		setChatPending({ localId, text, status: "sending" });
		void postChat({
			campaignId,
			sceneId,
			message: text,
			characterId: characterIdForRoll(),
		}).then((result) => {
			if (result.ok) {
				setChatPending((current) =>
					current?.localId === localId ? null : current,
				);
				setMessage((current) => (current === text ? "" : current));
				return;
			}
			setChatPending((current) =>
				current?.localId === localId
					? { ...current, status: "error", message: result.message }
					: current,
			);
		});
	};

	return (
		<div className="flex flex-col gap-3 border-t border-border/70 pt-3">
			{rollPending && (
				<p
					aria-live="polite"
					className={cn(
						"text-sm",
						rollPending.status === "sending"
							? "text-muted-foreground"
							: "text-destructive",
					)}
				>
					{rollPending.status === "sending"
						? "Rolando…"
						: (rollPending.message ?? "Não foi possível rolar.")}
					{rollPending.status === "error" && (
						<Button
							type="button"
							variant="ghost"
							className="ml-2 h-11 min-h-11 px-3"
							onClick={() =>
								sendRoll(
									rollPending.formula,
									rollPending.secret,
									rollPending.localId,
								)
							}
						>
							Tentar de novo
						</Button>
					)}
				</p>
			)}
			<form
				className="flex flex-col gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					if (!parsed || rolling) return;
					sendRoll(parsed.formula, isGM && mode === "secret");
				}}
			>
				<label
					htmlFor={formulaId}
					className="text-sm font-semibold text-foreground"
				>
					Fórmula
				</label>
				<div className="flex gap-2">
					<Input
						id={formulaId}
						value={formula}
						onChange={(event) => setFormula(event.target.value)}
						placeholder="2d6+3"
						spellCheck={false}
						autoComplete="off"
						aria-invalid={formulaInvalid || undefined}
						className="h-11 min-h-11"
					/>
					<Button
						type="submit"
						className="h-11 min-h-11 shrink-0 px-3"
						disabled={!parsed || rolling}
					>
						{rolling ? "Rolando…" : "Rolar"}
					</Button>
				</div>
				{formulaInvalid && (
					<p role="alert" className="text-sm text-destructive">
						{FORMULA_HINT}
					</p>
				)}
				<div className="flex flex-wrap gap-1">
					{QUICK_DICE_FACES.map((faces) => (
						<Button
							key={faces}
							type="button"
							variant="outline"
							className="h-11 min-h-11 min-w-11 shrink-0 px-2 tabular-nums"
							disabled={rolling}
							aria-label={`Rolar 1d${faces}`}
							onClick={() => sendRoll(`1d${faces}`, isGM && mode === "secret")}
						>
							d{faces}
						</Button>
					))}
				</div>
				{isGM && (
					<Select
						aria-label="Modo da rolagem"
						value={mode}
						disabled={rolling}
						className="h-11 min-h-11"
						onChange={(event) => setMode(event.target.value)}
					>
						<option value="public">Pública</option>
						<option value="secret">Secreta do mestre</option>
					</Select>
				)}
			</form>
			{chatPending && (
				<p
					aria-live="polite"
					className={cn(
						"text-sm",
						chatPending.status === "sending"
							? "text-muted-foreground"
							: "text-destructive",
					)}
				>
					{chatPending.status === "sending"
						? "Enviando…"
						: (chatPending.message ?? "Não foi possível enviar.")}
					{chatPending.status === "error" && (
						<Button
							type="button"
							variant="ghost"
							className="ml-2 h-11 min-h-11 px-3"
							onClick={() => sendChat(chatPending.text, chatPending.localId)}
						>
							Tentar de novo
						</Button>
					)}
				</p>
			)}
			<form
				className="flex flex-col gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					if (!canSendChat(message) || chatting) return;
					sendChat(message);
				}}
			>
				<label
					htmlFor={messageId}
					className="text-sm font-semibold text-foreground"
				>
					Mensagem
				</label>
				<div className="flex gap-2">
					<Input
						id={messageId}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="Escreva para a mesa"
						spellCheck={false}
						autoComplete="off"
						aria-invalid={chatTooLong || undefined}
						className="h-11 min-h-11"
					/>
					<Button
						type="submit"
						variant="outline"
						className="h-11 min-h-11 shrink-0 px-3"
						disabled={!canSendChat(message) || chatting}
					>
						{chatting ? "Enviando…" : "Enviar"}
					</Button>
				</div>
				{chatTooLong && (
					<p role="alert" className="text-sm text-destructive">
						{CHAT_LIMIT_HINT}
					</p>
				)}
			</form>
		</div>
	);
}

function SessionControl({
	campaignId,
	sessionNumber,
	compact,
}: {
	campaignId: string;
	sessionNumber: number | null;
	compact: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [starting, setStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const next = (sessionNumber ?? 0) + 1;

	const start = () => {
		if (starting) return;
		setStarting(true);
		setError(null);
		void beginFeedSession(campaignId).then((result) => {
			setStarting(false);
			if (result.ok) {
				setOpen(false);
				setError(null);
				return;
			}
			setError(result.message);
		});
	};

	const trigger = compact ? (
		<Popover open={menuOpen} onOpenChange={setMenuOpen}>
			<PopoverTrigger
				type="button"
				aria-label="Ações do feed"
				className="flex size-11 items-center justify-center rounded-lg text-muted-foreground select-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-muted [@media(hover:hover)]:hover:text-foreground"
			>
				<MoreHorizontal className="size-4" />
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 gap-2 p-2">
				<Button
					type="button"
					variant="ghost"
					className="h-11 min-h-11 w-full justify-start px-3"
					onClick={() => {
						setMenuOpen(false);
						setOpen(true);
					}}
				>
					Iniciar nova sessão
				</Button>
			</PopoverContent>
		</Popover>
	) : (
		<Button
			type="button"
			variant="outline"
			className="h-11 min-h-11 px-3"
			onClick={() => setOpen(true)}
		>
			Iniciar nova sessão
		</Button>
	);

	return (
		<>
			{trigger}
			<Dialog
				open={open}
				disablePointerDismissal={starting}
				onOpenChange={(nextOpen) => {
					if (starting) return;
					setOpen(nextOpen);
					if (!nextOpen) setError(null);
				}}
			>
				<DialogContent className="max-sm:max-w-[calc(100%-1rem)]">
					<DialogTitle className="font-display text-lg font-semibold text-foreground">
						{sessionDialogTitle(next)}
					</DialogTitle>
					<DialogDescription>{SESSION_DIALOG_BODY}</DialogDescription>
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
					<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							className="h-11 min-h-11 px-4"
							autoFocus
							disabled={starting}
							onClick={() => {
								if (starting) return;
								setOpen(false);
								setError(null);
							}}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							className="h-11 min-h-11 px-4"
							disabled={starting}
							onClick={start}
						>
							{starting
								? "Iniciando…"
								: error
									? "Tentar de novo"
									: sessionConfirmLabel(next)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function FeedBody({ isGM, userId }: { isGM: boolean; userId: string | null }) {
	const campaignId = useRPGStore((state) => state.activeCampaignId);
	const sceneId = useVTTStore((state) => state.activeSceneId);
	const tokens = useVTTStore((state) => state.tokens);
	const characters = useRPGStore((state) => state.characters);
	const status = useRollStore((state) => state.status);
	const entries = useRollStore(selectRollEntries);
	const results = useRollStore(selectRollResults);
	const sessionId = useRollStore((state) => state.sessionId);
	const sessionStartedAt = useRollStore((state) => state.sessionStartedAt);
	const sessionNumber = useRollStore((state) => state.sessionNumber);
	const [expanded, setExpanded] = useState<string | null>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const names = useMemo(() => {
		const map = new Map<string, string>();
		for (const character of characters) {
			if (character.characterName)
				map.set(character.id, character.characterName);
		}
		for (const token of tokens) {
			if (token.characterId && token.name && !map.has(token.characterId)) {
				map.set(token.characterId, token.name);
			}
		}
		return map;
	}, [characters, tokens]);
	const rows = useMemo(
		() =>
			entries
				.filter(
					(entry) =>
						!sceneId || entry.sceneId === sceneId || entry.sceneId === null,
				)
				.slice()
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
		[entries, sceneId],
	);

	const lastRowId = rows.at(-1)?.id;
	useEffect(() => {
		const list = listRef.current;
		if (!list || !lastRowId) return;
		list.scrollTop = list.scrollHeight;
	}, [lastRowId]);

	if (!campaignId || !sceneId) return null;

	if (status === "idle" || status === "loading") {
		return (
			<output
				aria-busy="true"
				aria-label="Carregando feed"
				className="flex flex-col gap-2"
			>
				<Skeleton className="h-11 w-full" />
				<Skeleton className="h-11 w-full" />
				<Skeleton className="h-11 w-full" />
			</output>
		);
	}

	if (status === "unavailable") {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				{FEED_UNAVAILABLE_TEXT}
			</p>
		);
	}

	if (status === "error") {
		return (
			<div
				role="alert"
				className="flex flex-col items-center gap-3 py-6 text-center"
			>
				<p className="text-sm text-muted-foreground">
					Não foi possível carregar o feed.
				</p>
				<Button
					type="button"
					className="h-11 min-h-11 px-4"
					onClick={() => {
						useRollStore.getState().setStatus("loading");
						void loadFeed(campaignId);
					}}
				>
					Tentar de novo
				</Button>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			{sessionId && sessionNumber !== null && (
				<div className="text-sm">
					<p className="text-foreground">{sessionStartedText(sessionNumber)}</p>
					{sessionStartedAt && (
						<p className="text-muted-foreground tabular-nums">
							{formatFeedTime(sessionStartedAt)}
						</p>
					)}
				</div>
			)}
			{rows.length === 0 && !sessionId && (
				<p className="py-6 text-center text-sm text-muted-foreground">
					{FEED_EMPTY_TEXT}
				</p>
			)}
			{rows.length > 0 && (
				<ul
					ref={listRef}
					aria-label="Rolagens e mensagens"
					className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
				>
					{rows.map((entry) => {
						const view = feedLineView(entry, results[entry.id], isGM);
						const author =
							(entry.characterId && names.get(entry.characterId)) ||
							(userId && entry.authorId === userId ? "Você" : "Jogador");
						const time = formatFeedTime(entry.createdAt);
						if (view.kind === "secret") {
							return (
								<li
									key={entry.id}
									className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-1"
								>
									<span className="text-sm text-muted-foreground">
										{SECRET_ROLL_TEXT}
									</span>
									<span className="text-sm text-muted-foreground tabular-nums">
										{time}
									</span>
								</li>
							);
						}
						if (view.kind === "chat") {
							return (
								<li key={entry.id} className="rounded-lg px-2 py-1">
									<div className="flex items-baseline justify-between gap-2">
										<span className="truncate text-sm font-semibold text-foreground">
											{author}
										</span>
										<span className="text-sm text-muted-foreground tabular-nums">
											{time}
										</span>
									</div>
									<p className="text-sm text-foreground">{view.message}</p>
								</li>
							);
						}
						const open = expanded === entry.id;
						return (
							<li key={entry.id} className="rounded-lg px-2 py-1">
								<div className="flex items-baseline justify-between gap-2">
									<span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-foreground">
										{view.secret && (
											<Lock className="size-3.5 shrink-0" aria-hidden="true" />
										)}
										{view.secret ? "Secreta" : author}
									</span>
									<span className="text-sm text-muted-foreground tabular-nums">
										{time}
									</span>
								</div>
								<div className="flex items-baseline justify-between gap-2">
									<span className="truncate text-sm text-muted-foreground">
										{view.formula}
									</span>
									{view.total !== null && (
										<span className="text-lg font-semibold text-foreground tabular-nums">
											{view.total}
										</span>
									)}
								</div>
								{view.rolls && view.rolls.length > 0 && (
									<button
										type="button"
										className="h-11 min-h-11 text-sm text-muted-foreground select-none focus-visible:ring-2 focus-visible:ring-primary"
										aria-expanded={open}
										onClick={() => setExpanded(open ? null : entry.id)}
									>
										{open ? "Ocultar dados" : "Mostrar dados"}
									</button>
								)}
								{open && view.rolls && (
									<p className="text-sm text-muted-foreground tabular-nums">
										{view.rolls.join(" + ")}
										{view.modifier
											? ` ${view.modifier > 0 ? "+" : ""}${view.modifier}`
											: ""}
									</p>
								)}
							</li>
						);
					})}
				</ul>
			)}
			<FeedComposer isGM={isGM} campaignId={campaignId} sceneId={sceneId} />
		</div>
	);
}

export function VTTFeedPanel() {
	const campaignId = useRPGStore((state) => state.activeCampaignId);
	const sceneId = useVTTStore((state) => state.activeSceneId);
	const panelOpen = useRollStore((state) => state.panelOpen);
	const isGM = useVTTStore((state) => state.isGM);
	const isMobile = useIsMobile();
	const { user } = useAuth();
	const sessionNumber = useRollStore((state) => state.sessionNumber);
	const status = useRollStore((state) => state.status);

	const sawRole = useRef(false);

	useEffect(() => {
		if (!campaignId) return;
		return subscribeFeed(campaignId);
	}, [campaignId]);

	// A primeira leitura pode acontecer antes da mesa saber quem é o mestre.
	// Quando o papel chega, busca de novo: a policy entrega o valor só ao mestre.
	useEffect(() => {
		if (!campaignId) return;
		if (!sawRole.current) {
			sawRole.current = true;
			return;
		}
		if (isGM || !isGM) void loadFeed(campaignId, { quiet: true });
	}, [campaignId, isGM]);

	if (!panelOpen || !sceneId) return null;

	const header = (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
				<Dices className="size-4" aria-hidden="true" />
				Rolagens e chat
			</h2>
			{isGM && status === "ready" && campaignId && (
				<SessionControl
					campaignId={campaignId}
					sessionNumber={sessionNumber}
					compact={isMobile}
				/>
			)}
		</div>
	);

	const body = <FeedBody isGM={isGM} userId={user?.id ?? null} />;

	if (isMobile) {
		return (
			<BottomSheet
				open
				modal={false}
				onOpenChange={(next) => {
					if (!next) useRollStore.getState().setPanelOpen(false);
				}}
				title="Rolagens e chat"
				aria-label="Rolagens e chat"
			>
				<div data-testid="feed-panel" className="flex min-h-0 flex-col gap-3">
					{isGM && status === "ready" && campaignId && (
						<div className="flex justify-end">
							<SessionControl
								campaignId={campaignId}
								sessionNumber={sessionNumber}
								compact
							/>
						</div>
					)}
					{body}
				</div>
			</BottomSheet>
		);
	}

	return (
		<aside
			aria-label="Rolagens e chat"
			data-testid="feed-panel"
			className="pointer-events-auto absolute top-32 left-20 z-30 flex h-[calc(100dvh-9rem)] w-80 flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md"
		>
			{header}
			{body}
		</aside>
	);
}
