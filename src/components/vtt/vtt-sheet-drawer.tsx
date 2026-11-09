import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	Dices,
	GripHorizontal,
	Maximize2,
	Minus,
	Plus,
	User,
	X,
} from "lucide-react";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import {
	SheetIdentity,
	SheetQuickStats,
} from "@/components/character-sheet/view/sheet-header";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VttHpAdjust } from "@/components/vtt/vtt-hp-adjust";
import { characterAttributeScore } from "@/core/rules";
import { useAuth } from "@/lib/auth";
import {
	isCharacterImageHidden,
	resolveCharacterImageUrl,
} from "@/lib/character-images";
import {
	abilityModifier,
	formatModifier,
	getAttributeFullName,
	useActiveCampaignId,
	useActiveCampaignRole,
	useImageAssetLookup,
	useRPGStore,
} from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";
import {
	characterSheetOwnsHp,
	resolveTokenHp,
	selectSheetHealth,
	selectSheetHealthMax,
} from "@/lib/vtt/character-hp";
import { canonicalDiceFormula } from "@/lib/vtt/dice";
import { rollOnTable } from "@/lib/vtt/feed-sync";
import {
	clampMiniPos,
	clampSheetRect,
	defaultSheetRect,
	dockMiniPos,
	loadSheetMini,
	loadSheetRect,
	type MiniPos,
	moveMiniPos,
	moveSheetRect,
	resizeSheetRect,
	SHEET_MINI_H,
	SHEET_MINI_W,
	type SheetRect,
	saveSheetMini,
	saveSheetRect,
	sheetStorageKey,
} from "@/lib/vtt/floating-sheet";
import { useRollStore } from "@/lib/vtt/roll-store";
import { hasOpenVttDialog } from "@/lib/vtt/shortcut-guard";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

type DiceType = "d20" | "d100" | "d10" | "d6";

const DICE_FACES: Record<DiceType, number> = {
	d20: 20,
	d100: 100,
	d10: 10,
	d6: 6,
};

interface VTTSheetDrawerProps {
	onUpdateToken: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<unknown>;
}

/** Como a rolagem aparece no chat da mesa (cartão com o nome do personagem). */
interface RollForTable {
	label: string;
	characterId: string | null;
}

type StartRoll = (
	tokenId: string,
	label: string,
	modifier: number,
	diceType: DiceType,
	table?: RollForTable,
) => void;

interface LastRoll {
	text: string;
	/** Foi rolada pelo servidor e está no chat da mesa. */
	shared: boolean;
}

/**
 * Fichas na mesa. Desktop: até 3 painéis flutuantes (arrastar pelo
 * cabeçalho, redimensionar no canto, posição/tamanho lembrados). Celular:
 * Sheet de baixo do DS, sem X. As rolagens que já existiam continuam iguais.
 */
export function VTTSheetDrawer({ onUpdateToken }: VTTSheetDrawerProps) {
	const isMobile = useIsMobile();
	const openSheetIds = useVTTStore((s) => s.openSheetIds);
	const topId = useVTTStore((s) => s.showCharacterSheetId);
	const ids = openSheetIds.length > 0 ? openSheetIds : topId ? [topId] : [];

	const sceneId = useVTTStore((s) => s.activeSceneId);
	const campaignId = useRPGStore((s) => s.activeCampaignId);
	const feedStatus = useRollStore((s) => s.status);
	const [rollState, setRollState] = useState<{
		open: boolean;
		tokenId: string;
		label: string;
		modifier: number;
		diceType: DiceType;
		result?: number;
		shared: boolean;
	}>({
		open: false,
		tokenId: "",
		label: "",
		modifier: 0,
		diceType: "d20",
		shared: false,
	});
	const [lastRolls, setLastRolls] = useState<Record<string, LastRoll>>({});
	// Rolagem esperando o servidor: os botões de rolar ficam desabilitados.
	const [pendingRoll, setPendingRoll] = useState(false);

	// Com o feed da mesa no ar, o servidor rola e o cartão vai para o chat com
	// o rótulo; o dado 3D mostra a mesma face. Sem feed, rola só nesta tela.
	const startRoll: StartRoll = (tokenId, label, modifier, diceType, table) => {
		if (pendingRoll) return;
		const open = (result?: number, shared = false) =>
			setRollState({
				open: true,
				tokenId,
				label,
				modifier,
				diceType,
				result,
				shared,
			});
		if (feedStatus !== "ready" || !campaignId || !sceneId) {
			open();
			return;
		}
		setPendingRoll(true);
		void rollOnTable({
			campaignId,
			sceneId,
			formula: canonicalDiceFormula(1, DICE_FACES[diceType], modifier),
			secret: false,
			characterId: table?.characterId ?? null,
			label: table?.label ?? label,
		}).then((rolled) => {
			setPendingRoll(false);
			if (rolled.ok) open(rolled.total - modifier, true);
			else open();
		});
	};
	const {
		tokenId: rollTokenId,
		label: rollLabel,
		modifier: rollModifier,
		shared: rollShared,
	} = rollState;
	const handleRollComplete = useCallback(
		(natural: number) => {
			const signed =
				rollModifier === 0
					? ""
					: ` ${rollModifier > 0 ? "+" : "−"} ${Math.abs(rollModifier)}`;
			setLastRolls((prev) => ({
				...prev,
				[rollTokenId]: {
					text: `${rollLabel}: ${natural}${signed} = ${natural + rollModifier}`,
					shared: rollShared,
				},
			}));
		},
		[rollTokenId, rollLabel, rollModifier, rollShared],
	);
	const handleRollClose = useCallback(
		() =>
			setRollState({
				open: false,
				tokenId: "",
				label: "",
				modifier: 0,
				diceType: "d20",
				shared: false,
			}),
		[],
	);

	return (
		<>
			{isMobile ? (
				<MobileSheet
					id={topId}
					onUpdateToken={onUpdateToken}
					onStartRoll={startRoll}
					rolling={pendingRoll}
					lastRoll={topId ? (lastRolls[topId] ?? null) : null}
				/>
			) : (
				ids.map((id, index) => (
					<FloatingSheet
						key={id}
						id={id}
						index={index}
						isTop={id === topId}
						onUpdateToken={onUpdateToken}
						onStartRoll={startRoll}
						rolling={pendingRoll}
						lastRoll={lastRolls[id] ?? null}
					/>
				))
			)}
			<DiceRollOverlay
				open={rollState.open}
				attributeLabel={rollState.label}
				diceType={rollState.diceType}
				modifier={rollState.modifier}
				result={rollState.result}
				onComplete={handleRollComplete}
				onClose={handleRollClose}
			/>
		</>
	);
}

/** Token e ficha do painel (a ficha pode ter sido aberta pelo id dela). */
function useSheetTarget(id: string | null) {
	const token = useVTTStore((s) =>
		id ? (s.tokens.find((t) => t.id === id) ?? null) : null,
	);
	const characterId = token?.characterId ?? null;
	const character = useRPGStore((s) =>
		id
			? (s.characters.find((c) => c.id === id || c.id === characterId) ?? null)
			: null,
	);
	return { token, character };
}

interface SheetPanelProps {
	id: string;
	onUpdateToken: VTTSheetDrawerProps["onUpdateToken"];
	onStartRoll: StartRoll;
	rolling: boolean;
	lastRoll: LastRoll | null;
}

/** Esc com o foco dentro da ficha fecha a ficha (em captura: o Tooltip do DS
 * do botão focado também consome o Esc). Foco na mesa não é afetado. */
function escapeCloses(close: () => void) {
	return (e: React.KeyboardEvent) => {
		if (e.key !== "Escape" || hasOpenVttDialog()) return;
		e.preventDefault();
		close();
	};
}

/** PV que a ficha mostra: o da ficha vinculada, senão o do token. */
function useSheetHp(token: VTTToken | null, character: Character | null) {
	const isGM = useVTTStore((s) => s.isGM);
	const linkedId = token?.characterId ?? null;
	const sheetHealth = useRPGStore((s) => selectSheetHealth(s, linkedId));
	const sheetHealthMax = useRPGStore((s) => selectSheetHealthMax(s, linkedId));
	const sheetOwnsHp = characterSheetOwnsHp(character);
	const hp = resolveTokenHp({
		tokenHpCurrent: token?.hpCurrent,
		tokenHpMax: token?.hpMax,
		sheetHealth,
		sheetHealthMax,
		characterHealth: sheetOwnsHp ? undefined : character?.health,
		characterHealthMax: sheetOwnsHp ? undefined : character?.healthMax,
	});
	return { hp, showMax: !hp.fromSheet || isGM };
}

function FloatingSheet({
	id,
	index,
	isTop,
	onUpdateToken,
	onStartRoll,
	rolling,
	lastRoll,
}: SheetPanelProps & { index: number; isTop: boolean }) {
	const { token, character } = useSheetTarget(id);
	const campaignId = useActiveCampaignId() ?? "sem-campanha";
	const closeSheet = useVTTStore((s) => s.closeCharacterSheet);
	const focusSheet = useVTTStore((s) => s.setShowCharacterSheetId);
	const storageKey = sheetStorageKey(campaignId, character?.id ?? id);

	const [rect, setRect] = useState<SheetRect>(
		() =>
			loadSheetRect(storageKey) ??
			defaultSheetRect(index, window.innerWidth, window.innerHeight),
	);
	// Minimizada: o cartão tem posição própria; a da ficha aberta fica guardada.
	const [mini, setMini] = useState<MiniPos | null>(() =>
		loadSheetMini(storageKey),
	);
	const minimized = mini !== null;
	const shown = clampSheetRect(rect, window.innerWidth, window.innerHeight);
	const miniShown = mini
		? clampMiniPos(mini, window.innerWidth, window.innerHeight)
		: null;
	const panelRef = useRef<HTMLElement>(null);
	// Arraste/redimensionamento mexem só no estilo do painel; o estado React
	// (e o localStorage) só muda ao soltar. O canvas não re-renderiza.
	const gesture = useRef<{
		kind: "move" | "resize" | "mini";
		x: number;
		y: number;
		start: SheetRect;
		last: SheetRect;
	} | null>(null);

	const begin =
		(kind: "move" | "resize" | "mini") =>
		(e: ReactPointerEvent<HTMLElement>) => {
			if (e.button !== 0) return;
			if (
				kind !== "resize" &&
				(e.target as Element).closest("button, a, input, [role=button]")
			)
				return;
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			const start =
				kind === "mini" && miniShown
					? { ...miniShown, w: SHEET_MINI_W, h: SHEET_MINI_H }
					: shown;
			gesture.current = {
				kind,
				x: e.clientX,
				y: e.clientY,
				start,
				last: start,
			};
		};
	const onMove = (e: ReactPointerEvent<HTMLElement>) => {
		const g = gesture.current;
		const el = panelRef.current;
		if (!g || !el) return;
		const dx = e.clientX - g.x;
		const dy = e.clientY - g.y;
		const viewW = window.innerWidth;
		const viewH = window.innerHeight;
		const next =
			g.kind === "resize"
				? resizeSheetRect(g.start, dx, dy, viewW, viewH)
				: g.kind === "mini"
					? { ...g.start, ...moveMiniPos(g.start, dx, dy, viewW, viewH) }
					: moveSheetRect(g.start, dx, dy, viewW, viewH);
		g.last = next;
		el.style.left = `${next.x}px`;
		el.style.top = `${next.y}px`;
		if (g.kind !== "mini") {
			el.style.width = `${next.w}px`;
			el.style.height = `${next.h}px`;
		}
	};
	const onEnd = () => {
		const g = gesture.current;
		if (!g) return;
		gesture.current = null;
		if (g.kind === "mini") {
			const pos = { x: g.last.x, y: g.last.y };
			setMini(pos);
			saveSheetMini(storageKey, pos);
			return;
		}
		setRect(g.last);
		saveSheetRect(storageKey, g.last);
	};
	const minimize = () => {
		const pos = dockMiniPos(index, window.innerWidth, window.innerHeight);
		setMini(pos);
		saveSheetMini(storageKey, pos);
	};
	const restore = () => {
		setMini(null);
		saveSheetMini(storageKey, null);
	};

	if (!token && !character) return null;
	const name = character?.characterName || token?.name || "Ficha";
	const close = () => closeSheet(id);

	return (
		<section
			ref={panelRef}
			aria-label={`Ficha de ${name}`}
			data-vtt-focus-scope="sheet"
			data-testid="vtt-floating-sheet"
			data-top={isTop || undefined}
			data-minimized={minimized || undefined}
			onKeyDownCapture={escapeCloses(close)}
			onPointerDownCapture={() => {
				if (!isTop) focusSheet(id);
			}}
			style={
				miniShown
					? { left: miniShown.x, top: miniShown.y, width: SHEET_MINI_W }
					: { left: shown.x, top: shown.y, width: shown.w, height: shown.h }
			}
			className={cn(
				"fixed flex flex-col overflow-hidden rounded-2xl border border-border/70 text-foreground shadow-2xl",
				minimized ? "bg-card/95 backdrop-blur-md" : "bg-card-elevated",
				isTop ? "z-[41]" : "z-40",
			)}
		>
			{minimized ? (
				<MiniSheet
					token={token}
					character={character}
					name={name}
					rolling={rolling}
					onStartRoll={onStartRoll}
					onRestore={restore}
					onClose={close}
					dragHandlers={{
						onPointerDown: begin("mini"),
						onPointerMove: onMove,
						onPointerUp: onEnd,
						onPointerCancel: onEnd,
					}}
				/>
			) : (
				<>
					<header
						data-testid="vtt-sheet-drag-handle"
						onPointerDown={begin("move")}
						onPointerMove={onMove}
						onPointerUp={onEnd}
						onPointerCancel={onEnd}
						className="flex min-h-11 shrink-0 cursor-grab touch-none items-center gap-1 border-b border-border/60 pl-3 pr-1 select-none active:cursor-grabbing"
					>
						<GripHorizontal
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden
						/>
						{/* Padrão Figma: alça + ações; o nome fica no título da identidade. */}
						<span className="flex-1" />
						<SheetIconButton
							label="Minimizar ficha"
							tooltip="Minimizar (a ficha continua aberta)"
							onClick={minimize}
						>
							<Minus className="h-4 w-4" />
						</SheetIconButton>
						<CloseSheetButton onClose={close} />
					</header>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<SheetContent
							token={token}
							character={character}
							onUpdateToken={onUpdateToken}
							onStartRoll={onStartRoll}
							rolling={rolling}
							lastRoll={lastRoll}
						/>
					</div>
					<div
						role="presentation"
						data-testid="vtt-sheet-resize-handle"
						onPointerDown={begin("resize")}
						onPointerMove={onMove}
						onPointerUp={onEnd}
						onPointerCancel={onEnd}
						className="absolute right-0 bottom-0 size-5 cursor-nwse-resize touch-none"
					>
						<span className="absolute right-1.5 bottom-1.5 size-2 border-r-2 border-b-2 border-muted-foreground/50" />
					</div>
				</>
			)}
		</section>
	);
}

/**
 * Ficha minimizada: cartão pequeno que continua na mesa (como no Roll20).
 * Arrasta pelo cartão; o botão Restaurar volta ao tamanho guardado.
 */
function MiniSheet({
	token,
	character,
	name,
	rolling,
	onStartRoll,
	onRestore,
	onClose,
	dragHandlers,
}: {
	token: VTTToken | null;
	character: Character | null;
	name: string;
	rolling: boolean;
	onStartRoll: StartRoll;
	onRestore: () => void;
	onClose: () => void;
	dragHandlers: {
		onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
		onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
		onPointerUp: () => void;
		onPointerCancel: () => void;
	};
}) {
	const role = useActiveCampaignRole();
	const { session } = useAuth();
	const imageAssets = useImageAssetLookup();
	const { hp, showMax } = useSheetHp(token, character);
	const portrait =
		(character &&
			!isCharacterImageHidden(character, imageAssets, role, session?.user.id) &&
			resolveCharacterImageUrl(
				character,
				imageAssets,
				role,
				session?.user.id,
			)) ||
		token?.avatarUrl ||
		null;
	const config = character
		? (SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.dnd5e)
		: SYSTEM_CONFIG.dnd5e;
	const dice: DiceType = config.defaultDice || "d20";
	const pct =
		hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0;
	const tokenId = token?.id ?? character?.id ?? "";

	return (
		<header
			data-testid="vtt-sheet-drag-handle"
			{...dragHandlers}
			className="flex cursor-grab touch-none items-center gap-2 p-2 select-none active:cursor-grabbing"
		>
			<span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-border/70">
				{portrait ? (
					<img
						src={portrait}
						alt=""
						draggable={false}
						className="size-full object-cover"
					/>
				) : (
					<User className="size-5 text-primary/50" aria-hidden />
				)}
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold">{name}</p>
				<div className="mt-1 flex items-center gap-2">
					<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
						<span
							className={cn(
								"block h-full rounded-full transition-[width] duration-200",
								pct <= 25 ? "bg-destructive" : "bg-primary",
							)}
							style={{ width: `${pct}%` }}
						/>
					</span>
					<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
						{showMax ? `${hp.current}/${hp.max}` : hp.current} PV
					</span>
				</div>
			</div>
			<SheetIconButton
				label={`Rolar ${dice} (${name})`}
				tooltip={`Rolar ${dice}`}
				disabled={rolling}
				onClick={() =>
					onStartRoll(tokenId, "Teste livre", 0, dice, {
						label: "Teste livre",
						characterId: character?.id ?? null,
					})
				}
			>
				<Dices className="h-4 w-4" />
			</SheetIconButton>
			<SheetIconButton
				label="Restaurar ficha"
				tooltip="Restaurar ficha"
				onClick={onRestore}
			>
				<Maximize2 className="h-4 w-4" />
			</SheetIconButton>
			<CloseSheetButton onClose={onClose} />
		</header>
	);
}

function MobileSheet({
	id,
	onUpdateToken,
	onStartRoll,
	rolling,
	lastRoll,
}: Omit<SheetPanelProps, "id"> & { id: string | null }) {
	const { token, character } = useSheetTarget(id);
	const setShow = useVTTStore((s) => s.setShowCharacterSheetId);
	const name = character?.characterName || token?.name || "Ficha";
	return (
		<BottomSheet
			open={Boolean(id && (token || character))}
			onOpenChange={(next) => {
				if (!next) setShow(null);
			}}
			title={<span className="sr-only">Ficha de {name}</span>}
			aria-label={`Ficha de ${name}`}
			data-vtt-focus-scope="sheet"
			className="max-h-[78dvh] bg-card-elevated backdrop-blur-none"
			overlayClassName="bg-black/60 backdrop-blur-none"
		>
			<SheetContent
				token={token}
				character={character}
				onUpdateToken={onUpdateToken}
				onStartRoll={onStartRoll}
				rolling={rolling}
				lastRoll={lastRoll}
			/>
		</BottomSheet>
	);
}

function SheetContent({
	token,
	character,
	onUpdateToken,
	onStartRoll,
	rolling,
	lastRoll,
}: {
	token: VTTToken | null;
	character: Character | null;
	onUpdateToken: VTTSheetDrawerProps["onUpdateToken"];
	onStartRoll: StartRoll;
	rolling: boolean;
	lastRoll: LastRoll | null;
}) {
	const loadStatus = useRPGStore((s) => s.campaignLoadStatus);
	const isGM = useVTTStore((s) => s.isGM);
	const role = useActiveCampaignRole();
	const { session } = useAuth();
	const imageAssets = useImageAssetLookup();
	const { hp, showMax } = useSheetHp(token, character);
	const feedReady = useRollStore((s) => s.status === "ready");

	if (
		token?.characterId &&
		!character &&
		(loadStatus === "loading" || loadStatus === "idle")
	) {
		return (
			<div data-testid="sheet-skeleton" aria-busy className="space-y-3">
				<span className="sr-only">Carregando ficha…</span>
				<div className="flex items-center gap-3">
					<Skeleton className="size-14 rounded-2xl" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-3 w-1/3" />
						<Skeleton className="h-5 w-2/3" />
					</div>
				</div>
				<Skeleton className="h-16 w-full rounded-2xl" />
				<Skeleton className="h-40 w-full rounded-xl" />
			</div>
		);
	}
	if (token?.characterId && !character && loadStatus === "error") {
		return (
			<div role="alert" className="space-y-3 text-sm">
				<p className="flex items-center gap-2 font-semibold text-destructive">
					<AlertTriangle className="h-4 w-4" />
					Não deu para carregar a ficha.
				</p>
				<Button
					size="sm"
					variant="outline"
					onClick={() => void useRPGStore.getState().loadCampaigns()}
				>
					Tentar de novo
				</Button>
			</div>
		);
	}

	const tokenId = token?.id ?? character?.id ?? "";
	const config = character
		? (SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.dnd5e)
		: SYSTEM_CONFIG.dnd5e;
	const dice: DiceType = config.defaultDice || "d20";
	const table = (label: string): RollForTable => ({
		label,
		characterId: character?.id ?? null,
	});
	// A faixa compacta usa o mesmo `atual/máximo` do restante da ficha.
	const quickHp = showMax ? `${hp.current}/${hp.max}` : String(hp.current);

	return (
		<div className="space-y-4">
			{character ? (
				<>
					<SheetIdentity
						compact
						isViewer
						character={character}
						config={config}
						characterImageUrl={resolveCharacterImageUrl(
							character,
							imageAssets,
							role,
							session?.user.id,
						)}
						isImageHidden={isCharacterImageHidden(
							character,
							imageAssets,
							role,
							session?.user.id,
						)}
					/>
					<SheetQuickStats
						compact
						showHealth={false}
						character={character}
						config={config}
						health={quickHp}
					/>
				</>
			) : token?.characterId ? (
				<p className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
					Você não tem acesso a esta ficha nesta campanha.
				</p>
			) : (
				<NoSheetNotice canCreate={isGM} />
			)}

			{token ? (
				<VttHpAdjust
					hpCurrent={hp.current}
					hpMax={hp.max}
					showMax={showMax}
					tempHp={character?.tempHealth ?? token.tempHp ?? 0}
					onChange={(next) => onUpdateToken(token.id, { hpCurrent: next })}
					onChangeTempHp={(nextTemp) => {
						const sanitized = Math.max(0, nextTemp);
						if (character) {
							void useRPGStore.getState().updateCharacter(character.id, {
								tempHealth: sanitized,
							});
						}
						void onUpdateToken(token.id, { tempHp: sanitized });
					}}
					onChangeMax={
						isGM || (character && !hp.fromSheet)
							? (nextMax) => {
									if (character && isGM) {
										void useRPGStore.getState().updateCharacter(character.id, {
											healthMax: nextMax,
										});
									}
									void onUpdateToken(token.id, {
										hpMax: nextMax,
									});
								}
							: undefined
					}
					onChangeHp={
						isGM || (character && !hp.fromSheet)
							? ({ current, max }) => {
									if (character && isGM) {
										const patch: Partial<Character> = {};
										if (current !== undefined) patch.health = current;
										if (max !== undefined) patch.healthMax = max;
										if (Object.keys(patch).length > 0) {
											void useRPGStore
												.getState()
												.updateCharacter(character.id, patch);
										}
									}
									const tokenPatch: Partial<VTTToken> = {};
									if (current !== undefined) tokenPatch.hpCurrent = current;
									if (max !== undefined) tokenPatch.hpMax = max;
									if (Object.keys(tokenPatch).length > 0) {
										void onUpdateToken(token.id, tokenPatch);
									}
								}
							: undefined
					}
				/>
			) : null}

			{character ? (
				<section aria-labelledby={`attrs-${tokenId}`} className="space-y-2">
					<div className="flex items-baseline justify-between">
						<h3
							id={`attrs-${tokenId}`}
							className="font-display text-sm font-semibold tracking-tight"
						>
							Atributos
						</h3>
						{feedReady && (
							<span className="text-[11px] text-muted-foreground">
								Rolagens vão para o chat
							</span>
						)}
					</div>
					<ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
						{config.attributes.map((attr) => {
							const score = characterAttributeScore(character, attr.key);
							const mod = abilityModifier(score);
							const fullName = getAttributeFullName(attr.label);
							return (
								<li
									key={attr.key}
									className="flex min-h-12 items-center gap-3 py-0.5 pr-1 pl-3"
								>
									<span className="w-9 shrink-0 text-xs font-semibold text-muted-foreground">
										{attr.label}
									</span>
									<span className="min-w-0 flex-1 truncate text-sm text-foreground">
										{fullName}
									</span>
									<span className="w-7 text-right text-xs text-muted-foreground tabular-nums">
										{score}
									</span>
									<button
										type="button"
										disabled={rolling}
										className="flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-2.5 font-mono text-sm font-semibold text-primary tabular-nums ring-1 ring-inset ring-primary/25 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:hover:bg-primary/20"
										aria-label={`Rolar ${fullName} (${formatModifier(mod)})`}
										onClick={() =>
											onStartRoll(
												tokenId,
												attr.label,
												mod,
												dice,
												table(fullName),
											)
										}
									>
										<Dices className="size-3.5" aria-hidden />
										{formatModifier(mod)}
									</button>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			<div className="space-y-2">
				{lastRoll ? (
					<div
						aria-live="polite"
						className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2"
					>
						<Dices className="size-4 shrink-0 text-primary" aria-hidden />
						<p className="min-w-0 flex-1 font-mono text-xs font-semibold tabular-nums text-foreground">
							{lastRoll.text}
						</p>
						{lastRoll.shared && (
							<span className="shrink-0 text-[11px] text-muted-foreground">
								no chat da mesa
							</span>
						)}
					</div>
				) : null}
				<Button
					type="button"
					variant="outline"
					disabled={rolling}
					className="h-[44px] w-full gap-2"
					onClick={() =>
						onStartRoll(tokenId, "Teste livre", 0, dice, table("Teste livre"))
					}
				>
					<Dices className="h-4 w-4" />
					{rolling ? "Rolando…" : `Rolar ${config.defaultDice || "d20"}`}
				</Button>
			</div>
		</div>
	);
}

/** Botão de ícone do cabeçalho da ficha, com Tooltip do DS (sem `title`). */
function SheetIconButton({
	label,
	tooltip,
	disabled,
	onClick,
	children,
}: {
	label: string;
	tooltip: string;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={disabled}
						onClick={onClick}
						className="size-11 shrink-0 text-muted-foreground"
						aria-label={label}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function CloseSheetButton({ onClose }: { onClose: () => void }) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="size-11 shrink-0 text-muted-foreground"
						aria-label="Fechar ficha"
					/>
				}
			>
				<X className="h-4 w-4" />
			</TooltipTrigger>
			<TooltipContent>Fechar ficha (Esc)</TooltipContent>
		</Tooltip>
	);
}

/** Token sem ficha: o mestre pode criar uma; o jogador só vê o aviso. */
function NoSheetNotice({ canCreate }: { canCreate: boolean }) {
	return (
		<div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
			<p>
				Este token ainda não tem ficha. Os pontos de vida abaixo são do token.
			</p>
			{canCreate ? (
				<Link
					to="/sheets/new"
					className={cn(
						buttonVariants({ variant: "outline", size: "sm" }),
						"gap-1.5",
					)}
				>
					<Plus className="h-3.5 w-3.5" />
					Criar ficha
				</Link>
			) : null}
		</div>
	);
}
