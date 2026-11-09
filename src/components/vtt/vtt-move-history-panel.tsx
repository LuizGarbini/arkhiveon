import { Eraser, Footprints, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	distanceByToken,
	formatMoveTime,
	groupByRound,
	movesForScene,
	pointLabel,
	type TokenMove,
} from "@/lib/vtt/move-history";
import { useMoveStore } from "@/lib/vtt/move-store";
import { clearMoves, loadMoves, recordMove } from "@/lib/vtt/move-sync";
import { formatDistance } from "@/lib/vtt/ruler-path";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const EMPTY_TEXT =
	"Ninguém moveu um token ainda. Os movimentos aparecem aqui, com o ponto de onde saiu e para onde foi.";
const SESSION_ONLY_TEXT =
	"O histórico está valendo só nesta sessão do navegador. Ele passa a ficar salvo quando o banco receber a atualização.";

function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters =
		words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2);
	return letters.toUpperCase();
}

interface PanelProps {
	onUpdateToken: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<unknown>;
}

function MoveRow({
	move,
	focused,
	avatar,
	fromLabel,
	toLabel,
	canUndo,
	onFocus,
	onUndo,
}: {
	move: TokenMove;
	focused: boolean;
	avatar: string | null;
	fromLabel: string | null;
	toLabel: string | null;
	canUndo: boolean;
	onFocus: () => void;
	onUndo: () => void;
}) {
	const undo = move.kind === "undo";
	return (
		<li
			className={cn(
				"flex items-stretch gap-1 rounded-xl border transition-colors duration-150",
				focused
					? "border-primary/50 bg-primary/10"
					: "border-transparent [@media(hover:hover)]:hover:bg-accent/50",
			)}
		>
			<button
				type="button"
				aria-pressed={focused}
				onClick={onFocus}
				className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99]"
			>
				<Avatar className="size-8">
					{avatar ? <AvatarImage src={avatar} alt="" /> : null}
					<AvatarFallback className="text-[11px] font-semibold text-foreground">
						{initials(move.tokenName)}
					</AvatarFallback>
				</Avatar>
				<span className="min-w-0 flex-1">
					<span className="flex items-baseline gap-1.5">
						<span className="truncate text-sm font-medium text-foreground">
							{move.tokenName}
						</span>
						{undo && (
							<span className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
								Devolvido
							</span>
						)}
					</span>
					<span className="block truncate text-xs text-muted-foreground tabular-nums">
						{fromLabel && toLabel ? (
							<>
								<span className="font-mono text-foreground">{fromLabel}</span>
								{" → "}
								<span className="font-mono text-foreground">{toLabel}</span>
								{" · "}
							</>
						) : null}
						{formatDistance(move.distance, move.unit)}
						{move.authorName ? ` · ${move.authorName}` : ""}
					</span>
				</span>
				<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
					{formatMoveTime(move.createdAt)}
				</span>
			</button>
			{canUndo && !undo && (
				<Tooltip>
					<TooltipTrigger
						render={
							<button
								type="button"
								onClick={onUndo}
								aria-label={`Devolver ${move.tokenName} ao ponto de origem`}
								className="flex size-11 shrink-0 items-center justify-center self-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
							/>
						}
					>
						<Undo2 className="size-4" aria-hidden />
					</TooltipTrigger>
					<TooltipContent>Devolver ao ponto de origem</TooltipContent>
				</Tooltip>
			)}
		</li>
	);
}

function MovePanelContent({ onUpdateToken }: PanelProps) {
	const { user } = useAuth();
	const isMobile = useIsMobile();
	const sceneId = useVTTStore((s) => s.activeSceneId);
	const scenes = useVTTStore((s) => s.scenes);
	const tokens = useVTTStore((s) => s.tokens);
	const status = useMoveStore((s) => s.status);
	const moves = useMoveStore((s) => s.moves);
	const focusedMoveId = useMoveStore((s) => s.focusedMoveId);
	const filterTokenId = useMoveStore((s) => s.filterTokenId);
	const [confirmClear, setConfirmClear] = useState(false);
	const [clearing, setClearing] = useState(false);
	const [clearError, setClearError] = useState(false);
	const scene = scenes.find((item) => item.id === sceneId) ?? null;

	const sceneMoves = useMemo(
		() => movesForScene(moves, sceneId),
		[moves, sceneId],
	);
	const visible = useMemo(
		() => movesForScene(moves, sceneId, filterTokenId),
		[moves, sceneId, filterTokenId],
	);
	const groups = useMemo(() => groupByRound(visible), [visible]);
	const totals = useMemo(() => distanceByToken(sceneMoves), [sceneMoves]);
	const avatars = useMemo(
		() => new Map(tokens.map((token) => [token.id, token.avatarUrl ?? null])),
		[tokens],
	);
	const names = useMemo(() => {
		const seen = new Map<string, string>();
		for (const move of sceneMoves) seen.set(move.tokenId, move.tokenName);
		return [...seen.entries()];
	}, [sceneMoves]);

	if (!sceneId || !scene) return null;

	const focus = (move: TokenMove) => {
		const store = useMoveStore.getState();
		if (store.focusedMoveId === move.id) {
			store.focusMove(null);
			return;
		}
		store.focusMove(move.id);
		// Centra o trecho na área livre (o painel ocupa a direita no desktop).
		const { viewport, setViewport } = useVTTStore.getState();
		const midX = (move.from.x + move.to.x) / 2;
		const midY = (move.from.y + move.to.y) / 2;
		const spanX = Math.abs(move.to.x - move.from.x) + scene.gridSize * 3;
		const spanY = Math.abs(move.to.y - move.from.y) + scene.gridSize * 3;
		const freeW = window.innerWidth - (isMobile ? 0 : 360) - 80;
		const freeH = window.innerHeight - (isMobile ? 520 : 240);
		const scale = Math.min(
			1.5,
			Math.max(
				0.3,
				Math.min(freeW / spanX, freeH / spanY, viewport.scale * 1.6),
			),
		);
		const centerX = isMobile ? window.innerWidth / 2 : 80 + freeW / 2;
		const centerY = isMobile ? 190 : 130 + freeH / 2;
		setViewport({
			scale,
			x: centerX - midX * scale,
			y: centerY - midY * scale,
		});
	};

	const undo = (move: TokenMove) => {
		const token = useVTTStore
			.getState()
			.tokens.find((t) => t.id === move.tokenId);
		if (!token || !user) return;
		const current = { x: token.x, y: token.y };
		const saved = onUpdateToken(token.id, { x: move.from.x, y: move.from.y });
		recordMove(
			{
				sceneId: move.sceneId,
				tokenId: token.id,
				tokenName: token.name,
				from: current,
				to: move.from,
				authorId: user.id,
				authorName:
					user.user_metadata?.full_name || user.email?.split("@")[0] || null,
				kind: "undo",
			},
			Promise.resolve(saved),
		);
	};

	const clear = () => {
		if (!confirmClear) {
			setConfirmClear(true);
			setClearError(false);
			return;
		}
		setClearing(true);
		void clearMoves(sceneId, filterTokenId).then((ok) => {
			setClearing(false);
			setConfirmClear(false);
			setClearError(!ok);
		});
	};

	const label = (point: { x: number; y: number }) => pointLabel(point, scene);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			{status === "missing" && (
				<p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					{SESSION_ONLY_TEXT}
				</p>
			)}
			{status === "loading" && (
				<output
					aria-busy="true"
					aria-label="Carregando histórico"
					className="flex flex-col gap-2"
				>
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
				</output>
			)}
			{status === "error" && (
				<div
					role="alert"
					className="flex flex-col items-center gap-3 py-6 text-center"
				>
					<p className="text-sm text-muted-foreground">
						Não foi possível carregar o histórico.
					</p>
					<Button
						type="button"
						className="h-11 min-h-11 px-4"
						onClick={() => void loadMoves(sceneId)}
					>
						Tentar de novo
					</Button>
				</div>
			)}
			{status !== "loading" && status !== "error" && (
				<>
					{sceneMoves.length > 0 && (
						<>
							<Select
								aria-label="Filtrar por token"
								value={filterTokenId ?? ""}
								className="h-11 min-h-11"
								onChange={(event) =>
									useMoveStore
										.getState()
										.setFilterTokenId(event.target.value || null)
								}
							>
								<option value="">Todos os tokens</option>
								{names.map(([id, name]) => (
									<option key={id} value={id}>
										{name}
									</option>
								))}
							</Select>
							{!filterTokenId && totals.length > 0 && (
								<ul
									aria-label="Quanto cada token andou"
									className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
								>
									{totals.map((total) => (
										<li key={total.tokenId} className="shrink-0">
											<button
												type="button"
												onClick={() =>
													useMoveStore
														.getState()
														.setFilterTokenId(total.tokenId)
												}
												className="flex min-h-11 flex-col justify-center rounded-xl bg-background/60 px-3 text-left ring-1 ring-inset ring-border/70 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent"
											>
												<span className="max-w-24 truncate text-xs font-medium text-foreground">
													{total.tokenName}
												</span>
												<span className="text-[11px] text-muted-foreground tabular-nums">
													{formatDistance(total.distance, scene.gridScaleUnit)}{" "}
													· {total.moves}×
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</>
					)}
					<div
						role="log"
						aria-label="Movimentos dos tokens"
						className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
					>
						{visible.length === 0 ? (
							<div className="m-auto flex flex-col items-center gap-2 py-8 text-center">
								<span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
									<Footprints className="size-5" aria-hidden />
								</span>
								<p className="max-w-60 text-sm text-muted-foreground">
									{EMPTY_TEXT}
								</p>
							</div>
						) : (
							groups.map((group) => (
								<section
									key={`${group.round ?? "fora"}-${group.moves[0].id}`}
									className="flex flex-col gap-1"
								>
									<h3 className="px-1 text-[11px] font-semibold text-muted-foreground">
										{group.round === null
											? "Fora de combate"
											: `Rodada ${group.round}`}
									</h3>
									<ul className="flex flex-col gap-0.5">
										{group.moves.map((move) => (
											<MoveRow
												key={move.id}
												move={move}
												focused={focusedMoveId === move.id}
												avatar={avatars.get(move.tokenId) ?? null}
												fromLabel={label(move.from)}
												toLabel={label(move.to)}
												canUndo={tokens.some((t) => t.id === move.tokenId)}
												onFocus={() => focus(move)}
												onUndo={() => undo(move)}
											/>
										))}
									</ul>
								</section>
							))
						)}
					</div>
					{sceneMoves.length > 0 && (
						<div className="flex shrink-0 flex-col gap-1.5 border-t border-border/60 pt-3">
							{clearError && (
								<p role="alert" className="text-sm text-destructive">
									Não foi possível limpar o histórico.
								</p>
							)}
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant={confirmClear ? "destructive" : "outline"}
									disabled={clearing}
									className="h-11 min-h-11 flex-1 gap-1.5"
									onClick={clear}
								>
									<Eraser className="size-4" aria-hidden />
									{clearing
										? "Limpando…"
										: confirmClear
											? filterTokenId
												? "Confirmar: limpar deste token"
												: "Confirmar: limpar tudo"
											: filterTokenId
												? "Limpar deste token"
												: "Limpar histórico"}
								</Button>
								{confirmClear && !clearing && (
									<Button
										type="button"
										variant="ghost"
										className="h-11 min-h-11 px-3"
										onClick={() => setConfirmClear(false)}
									>
										Cancelar
									</Button>
								)}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

/** Painel "Movimentos": só mestre e co-mestre (a toolbar já esconde o botão). */
export function VTTMoveHistoryPanel({ onUpdateToken }: PanelProps) {
	const open = useMoveStore((s) => s.panelOpen);
	const canSee = useVTTStore((s) => s.isGM || s.isCoGM);
	const sceneId = useVTTStore((s) => s.activeSceneId);
	const isMobile = useIsMobile();
	if (!open || !canSee || !sceneId) return null;

	const close = () => {
		const store = useMoveStore.getState();
		store.setPanelOpen(false);
		store.focusMove(null);
	};

	if (isMobile) {
		return (
			<BottomSheet
				open
				modal={false}
				onOpenChange={(next) => {
					if (!next) close();
				}}
				title="Movimentos"
				aria-label="Movimentos"
			>
				<div
					data-testid="move-history-panel"
					className="flex min-h-0 flex-1 flex-col gap-3"
				>
					<MovePanelContent onUpdateToken={onUpdateToken} />
				</div>
			</BottomSheet>
		);
	}

	return (
		<aside
			aria-label="Movimentos"
			data-testid="move-history-panel"
			className="pointer-events-auto absolute top-32 right-3 bottom-20 z-30 flex w-80 min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md select-none animate-in fade-in slide-in-from-right-2 duration-200"
		>
			<div className="flex shrink-0 items-center gap-2 border-b border-border/60 pb-2">
				<h2 className="flex min-w-0 flex-1 items-center gap-2 pl-1 font-display text-base font-semibold text-foreground">
					<Footprints className="size-4 text-primary" aria-hidden />
					Movimentos
				</h2>
				<button
					type="button"
					aria-label="Fechar movimentos"
					onClick={close}
					className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>
			<MovePanelContent onUpdateToken={onUpdateToken} />
		</aside>
	);
}
