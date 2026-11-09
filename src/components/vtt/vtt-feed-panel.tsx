import { Dices, Lock, MoreHorizontal, SendHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
	continuesPrevious,
	FEED_EMPTY_TEXT,
	FEED_UNAVAILABLE_TEXT,
	type FeedLineView,
	feedLineView,
	formatFeedTime,
	parseChatCommand,
	QUICK_DICE_FACES,
	type RolledDie,
	rolledDice,
	rollHighlight,
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
	type TableFeedEntry,
	type TableRollResult,
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

const quickDieClass =
	"h-11 min-h-11 rounded-xl bg-background/60 px-0 text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-inset ring-border/70 transition-colors duration-150 select-none active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

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
	const command = parseChatCommand(message);
	const commandInvalid = command.kind === "invalid-roll";
	const chatTooLong = message.trim().length > CHAT_MESSAGE_MAX;
	const rolling = rollPending?.status === "sending";
	const chatting = chatPending?.status === "sending";
	const secret = isGM && mode === "secret";
	const canSubmitMessage =
		command.kind === "roll"
			? !rolling
			: command.kind === "chat" && canSendChat(message) && !chatting;

	const sendRoll = (
		raw: string,
		secretRoll: boolean,
		localId: string = crypto.randomUUID(),
		onDone?: () => void,
	) => {
		setRollPending({
			localId,
			formula: raw,
			secret: secretRoll,
			status: "sending",
		});
		void rollOnTable({
			campaignId,
			sceneId,
			formula: raw,
			secret: secretRoll,
			characterId: characterIdForRoll(),
		}).then((result) => {
			if (result.ok) {
				setRollPending((current) =>
					current?.localId === localId ? null : current,
				);
				onDone?.();
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
		<div className="flex shrink-0 flex-col gap-2 border-t border-border/60 pt-3">
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
					sendRoll(parsed.formula, secret);
				}}
			>
				<div className="grid grid-cols-7 gap-1">
					{QUICK_DICE_FACES.map((faces) => (
						<button
							key={faces}
							type="button"
							className={quickDieClass}
							disabled={rolling}
							aria-label={`Rolar 1d${faces}`}
							onClick={() => sendRoll(`1d${faces}`, secret)}
						>
							d{faces}
						</button>
					))}
				</div>
				<div className="flex items-center gap-2">
					<label htmlFor={formulaId} className="sr-only">
						Fórmula
					</label>
					<div className="relative min-w-0 flex-1">
						<Dices
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id={formulaId}
							value={formula}
							onChange={(event) => setFormula(event.target.value)}
							placeholder="2d6+3"
							spellCheck={false}
							autoComplete="off"
							aria-invalid={formulaInvalid || undefined}
							className="h-11 min-h-11 pl-9 font-mono"
						/>
					</div>
					{isGM && (
						<Select
							aria-label="Modo da rolagem"
							value={mode}
							disabled={rolling}
							className="h-11 min-h-11 w-[8.5rem] shrink-0"
							onChange={(event) => setMode(event.target.value)}
						>
							<option value="public">Pública</option>
							<option value="secret">Secreta do mestre</option>
						</Select>
					)}
					<Button
						type="submit"
						className="h-11 min-h-[44px] shrink-0 px-4"
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
				className="flex flex-col gap-1.5"
				onSubmit={(event) => {
					event.preventDefault();
					if (!canSubmitMessage) return;
					if (command.kind === "roll") {
						const sent = message;
						sendRoll(command.formula, secret, undefined, () =>
							setMessage((current) => (current === sent ? "" : current)),
						);
						return;
					}
					sendChat(message);
				}}
			>
				<label htmlFor={messageId} className="sr-only">
					Mensagem
				</label>
				<div className="relative">
					<Input
						id={messageId}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="Fale com a mesa · /r 1d20+5 rola"
						spellCheck={false}
						autoComplete="off"
						aria-invalid={chatTooLong || commandInvalid || undefined}
						className="h-11 min-h-11 pr-12"
					/>
					<button
						type="submit"
						aria-label="Enviar"
						disabled={!canSubmitMessage}
						className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-xl text-primary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:text-muted-foreground disabled:opacity-50 [@media(hover:hover)]:hover:bg-accent"
					>
						{command.kind === "roll" ? (
							<Dices className="size-4" aria-hidden="true" />
						) : (
							<SendHorizontal className="size-4" aria-hidden="true" />
						)}
					</button>
				</div>
				{commandInvalid && message.trim().length > 2 && (
					<p role="alert" className="text-sm text-destructive">
						{FORMULA_HINT}
					</p>
				)}
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
			aria-label="Iniciar nova sessão"
			className="h-11 min-h-11 shrink-0 px-3"
			onClick={() => setOpen(true)}
		>
			Nova sessão
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

function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters =
		words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2);
	return letters.toUpperCase();
}

function FeedAvatar({
	name,
	src,
	color,
}: {
	name: string;
	src?: string | null;
	color?: string;
}) {
	return (
		<Avatar className="mt-0.5 size-8">
			{src ? <AvatarImage src={src} alt="" /> : null}
			<AvatarFallback
				className="text-[11px] font-semibold text-foreground"
				style={color ? { backgroundColor: `${color}33`, color } : undefined}
			>
				{initials(name)}
			</AvatarFallback>
		</Avatar>
	);
}

interface FeedAuthor {
	name: string;
	/** Nome para as iniciais do avatar ("Você" usa o nome do jogador). */
	initialsOf: string;
	avatar: string | null;
	color?: string;
	isGM: boolean;
	mine: boolean;
}

function AuthorLine({ author, time }: { author: FeedAuthor; time: string }) {
	return (
		<div className="flex min-w-0 items-baseline gap-1.5">
			<span className="truncate text-sm font-semibold text-foreground">
				{author.name}
			</span>
			{author.isGM && (
				<span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">
					Mestre
				</span>
			)}
			<span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
				{time}
			</span>
		</div>
	);
}

const dieToneClass: Record<RolledDie["tone"], string> = {
	max: "bg-primary/15 text-primary ring-primary/50",
	min: "bg-destructive/10 text-destructive ring-destructive/40",
	plain: "bg-background/70 text-foreground ring-border",
};

function RollCard({
	author,
	time,
	label,
	view,
	result,
}: {
	author: FeedAuthor;
	time: string;
	label: string | null;
	view: Extract<FeedLineView, { kind: "roll" }>;
	result: TableRollResult | undefined;
}) {
	const visible = view.total !== null && result;
	const dice = visible ? rolledDice(result.details) : [];
	const highlight = visible ? rollHighlight(result.details) : null;
	return (
		<li
			className={cn(
				"flex gap-2.5 rounded-2xl border p-3",
				highlight === "critical"
					? "border-primary/40 bg-primary/[0.07]"
					: highlight === "fumble"
						? "border-destructive/40 bg-destructive/[0.06]"
						: view.secret
							? "border-dashed border-border bg-card-elevated/60"
							: "border-border/60 bg-card-elevated/80",
			)}
		>
			<FeedAvatar
				name={author.initialsOf}
				src={author.avatar}
				color={author.color}
			/>
			<div className="min-w-0 flex-1">
				<AuthorLine author={author} time={time} />
				<div className="mt-1.5 flex items-end gap-3">
					<div className="min-w-0 flex-1">
						<p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
							{view.secret && (
								<span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold text-foreground">
									<Lock className="size-3" aria-hidden="true" />
									<span>Secreta</span>
								</span>
							)}
							{label && (
								<span className="truncate text-sm font-medium text-foreground">
									{label}
								</span>
							)}
							{view.formula && (
								<span className="shrink-0 font-mono">{view.formula}</span>
							)}
						</p>
						{dice.length > 0 && (
							<ul
								aria-label="Dados"
								className="mt-2 flex flex-wrap items-center gap-1"
							>
								{dice.map((die, index) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: dados são posicionais
										key={index}
										title={`d${die.faces}`}
										className={cn(
											"flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
											dieToneClass[die.tone],
										)}
									>
										{die.value}
									</li>
								))}
								{view.modifier ? (
									<li className="px-1 text-xs text-muted-foreground tabular-nums">
										{view.modifier > 0 ? `+${view.modifier}` : view.modifier}
									</li>
								) : null}
							</ul>
						)}
					</div>
					{view.total !== null && (
						<div className="flex shrink-0 flex-col items-end">
							<p
								className={cn(
									"font-display text-3xl leading-none font-semibold tabular-nums",
									highlight === "critical"
										? "text-primary"
										: highlight === "fumble"
											? "text-destructive"
											: "text-foreground",
								)}
							>
								{view.total}
							</p>
							{highlight && (
								<span
									className={cn(
										"mt-1 text-[11px] font-semibold",
										highlight === "critical"
											? "text-primary"
											: "text-destructive",
									)}
								>
									{highlight === "critical" ? "Crítico" : "Falha crítica"}
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</li>
	);
}

function ChatLine({
	author,
	time,
	message,
	continued,
}: {
	author: FeedAuthor;
	time: string;
	message: string;
	continued: boolean;
}) {
	if (author.mine) {
		return (
			<li
				className={cn(
					"flex flex-col items-end",
					continued ? "-mt-1.5" : "mt-1",
				)}
			>
				{!continued && (
					<span className="mb-1 text-[11px] text-muted-foreground tabular-nums">
						Você · {time}
					</span>
				)}
				<p className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary/15 px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-primary/20">
					{message}
				</p>
			</li>
		);
	}
	return (
		<li className={cn("flex gap-2.5", continued ? "-mt-1.5" : "mt-1")}>
			{continued ? (
				<span aria-hidden className="w-8 shrink-0" />
			) : (
				<FeedAvatar
					name={author.initialsOf}
					src={author.avatar}
					color={author.color}
				/>
			)}
			<div className="min-w-0 max-w-[85%]">
				{!continued && <AuthorLine author={author} time={time} />}
				<p
					className={cn(
						"rounded-2xl rounded-tl-md bg-muted/70 px-3 py-2 text-sm text-foreground",
						!continued && "mt-1",
					)}
				>
					{message}
				</p>
			</div>
		</li>
	);
}

function FeedBody({ isGM, userId }: { isGM: boolean; userId: string | null }) {
	const campaignId = useRPGStore((state) => state.activeCampaignId);
	const sceneId = useVTTStore((state) => state.activeSceneId);
	const tokens = useVTTStore((state) => state.tokens);
	const onlineUsers = useVTTStore((state) => state.onlineUsers);
	const characters = useRPGStore((state) => state.characters);
	const status = useRollStore((state) => state.status);
	const entries = useRollStore(selectRollEntries);
	const results = useRollStore(selectRollResults);
	const sessionId = useRollStore((state) => state.sessionId);
	const sessionStartedAt = useRollStore((state) => state.sessionStartedAt);
	const sessionNumber = useRollStore((state) => state.sessionNumber);
	const bottomRef = useRef<HTMLDivElement>(null);
	const people = useMemo(() => {
		const names = new Map<string, string>();
		const avatars = new Map<string, string>();
		for (const character of characters) {
			if (character.characterName)
				names.set(character.id, character.characterName);
		}
		for (const token of tokens) {
			if (!token.characterId) continue;
			if (token.name && !names.has(token.characterId))
				names.set(token.characterId, token.name);
			if (token.avatarUrl && !avatars.has(token.characterId))
				avatars.set(token.characterId, token.avatarUrl);
		}
		const players = new Map(onlineUsers.map((user) => [user.userId, user]));
		return { names, avatars, players };
	}, [characters, tokens, onlineUsers]);
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

	// Os dados da rolagem chegam depois da linha e aumentam o cartão: rola de
	// novo quando eles chegam, para o último cartão não ficar cortado.
	const lastRowId = rows.at(-1)?.id;
	const lastRowKey = lastRowId
		? `${lastRowId}:${results[lastRowId]?.details.rolls.length ?? -1}`
		: null;
	useEffect(() => {
		if (!lastRowKey) return;
		bottomRef.current?.scrollIntoView?.({ block: "nearest" });
	}, [lastRowKey]);

	if (!campaignId || !sceneId) return null;

	if (status === "idle" || status === "loading") {
		return (
			<output
				aria-busy="true"
				aria-label="Carregando feed"
				className="flex flex-col gap-2"
			>
				<Skeleton className="h-16 w-full rounded-2xl" />
				<Skeleton className="h-11 w-3/4 rounded-2xl" />
				<Skeleton className="h-16 w-full rounded-2xl" />
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

	const authorOf = (entry: TableFeedEntry): FeedAuthor => {
		const mine = Boolean(userId && entry.authorId === userId);
		const player = people.players.get(entry.authorId);
		const playerIsGM = mine ? isGM : Boolean(player?.isGM);
		const characterName = entry.characterId
			? people.names.get(entry.characterId)
			: undefined;
		const name =
			characterName ??
			(mine ? "Você" : playerIsGM ? "Mestre" : (player?.userName ?? "Jogador"));
		return {
			name,
			initialsOf: characterName ?? player?.userName ?? name,
			avatar:
				(entry.characterId && people.avatars.get(entry.characterId)) ||
				player?.avatarUrl ||
				null,
			color: player?.color,
			isGM: playerIsGM && Boolean(characterName || mine),
			mine,
		};
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			<div
				role="log"
				aria-label="Rolagens e mensagens"
				className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1"
			>
				{sessionId && sessionNumber !== null && (
					<div className="mb-3 flex items-center gap-3 text-muted-foreground">
						<span aria-hidden className="h-px flex-1 bg-border" />
						<div className="text-center leading-tight">
							<p className="text-[11px]">{sessionStartedText(sessionNumber)}</p>
							{sessionStartedAt && (
								<p className="text-[11px] tabular-nums">
									{formatFeedTime(sessionStartedAt)}
								</p>
							)}
						</div>
						<span aria-hidden className="h-px flex-1 bg-border" />
					</div>
				)}
				{rows.length === 0 && (
					<div className="m-auto flex flex-col items-center gap-2 py-8 text-center">
						<span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
							<Dices className="size-5" aria-hidden="true" />
						</span>
						{!sessionId && (
							<p className="text-sm text-muted-foreground">{FEED_EMPTY_TEXT}</p>
						)}
						<p className="max-w-56 text-xs text-muted-foreground">
							Role um dado abaixo ou escreva para a mesa. Rolagens da ficha
							também aparecem aqui.
						</p>
					</div>
				)}
				{rows.length > 0 && (
					<ul className="flex flex-col gap-2.5">
						{rows.map((entry, index) => {
							const view = feedLineView(entry, results[entry.id], isGM);
							const time = formatFeedTime(entry.createdAt);
							if (view.kind === "secret") {
								return (
									<li
										key={entry.id}
										className="flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2"
									>
										<Lock
											className="size-4 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
										<span className="text-sm text-muted-foreground">
											{SECRET_ROLL_TEXT}
										</span>
										<span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
											{time}
										</span>
									</li>
								);
							}
							if (view.kind === "chat") {
								return (
									<ChatLine
										key={entry.id}
										author={authorOf(entry)}
										time={time}
										message={view.message}
										continued={continuesPrevious(rows[index - 1], entry)}
									/>
								);
							}
							return (
								<RollCard
									key={entry.id}
									author={authorOf(entry)}
									time={time}
									label={entry.label}
									view={view}
									result={results[entry.id]}
								/>
							);
						})}
					</ul>
				)}
				<div ref={bottomRef} />
			</div>
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
		<div className="flex shrink-0 items-center gap-2 border-b border-border/60 pb-2">
			<h2 className="flex min-w-0 flex-1 items-center gap-2 pl-1 font-display text-base font-semibold text-foreground">
				<Dices className="size-4 text-primary" aria-hidden="true" />
				Rolagens e chat
			</h2>
			{isGM && status === "ready" && campaignId && (
				<SessionControl
					campaignId={campaignId}
					sessionNumber={sessionNumber}
					compact={isMobile}
				/>
			)}
			<button
				type="button"
				aria-label="Fechar rolagens e chat"
				onClick={() => useRollStore.getState().setPanelOpen(false)}
				className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
			>
				<X className="size-4" />
			</button>
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
				<div
					data-testid="feed-panel"
					className="flex min-h-0 flex-1 flex-col gap-3"
				>
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
			className="pointer-events-auto absolute top-32 right-3 bottom-4 z-30 flex w-[min(28rem,calc(100vw-6.5rem))] min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200"
		>
			{header}
			{body}
		</aside>
	);
}
