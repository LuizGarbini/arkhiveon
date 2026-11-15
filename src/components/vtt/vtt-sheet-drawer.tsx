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
	type ComponentProps,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useCampaignItems } from "@/components/character-sheet/use-linked-items";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { SheetBody } from "@/components/vtt/sheet/sheet-body";
import type { SheetHp } from "@/components/vtt/sheet/sheet-hp";
import type { SheetRolls } from "@/components/vtt/sheet/sheet-types";
import { useSheetResources } from "@/components/vtt/sheet/use-sheet-resources";
import { computeEffectiveStats } from "@/core/rules";
import { useAuth } from "@/lib/auth";
import {
	isCharacterImageHidden,
	resolveCharacterImageUrl,
} from "@/lib/character-images";
import {
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
import { canonicalDiceFormula, rollDiceLocally } from "@/lib/vtt/dice";
import { rollOnTable } from "@/lib/vtt/feed-sync";
import {
	clampMiniPos,
	clampSheetRect,
	defaultSheetRect,
	loadSheetMini,
	loadSheetRect,
	type MiniPos,
	moveMiniPos,
	moveSheetRect,
	nextDockPos,
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

/** Rolagem de fórmula ("1d6+6"): o dano de uma arma, por exemplo. */
type StartFormulaRoll = (
	tokenId: string,
	label: string,
	formula: string,
	table?: RollForTable,
) => void;

interface LastRoll {
	text: string;
	/** Foi rolada pelo servidor e está no chat da mesa. */
	shared: boolean;
}

/**
 * Fichas na mesa. Desktop: painéis flutuantes sem limite (arrastar pelo
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
	// Dano e outras fórmulas: sem dado 3D, o resultado vai para o chat da mesa.
	// Sem o feed no ar, rola aqui mesmo e só mostra na ficha.
	const startFormulaRoll: StartFormulaRoll = (
		tokenId,
		label,
		formula,
		table,
	) => {
		if (pendingRoll) return;
		const show = (total: number, shared: boolean) =>
			setLastRolls((prev) => ({
				...prev,
				[tokenId]: { text: `${label}: ${total} (${formula})`, shared },
			}));
		const local = () => {
			const rolled = rollDiceLocally(formula);
			if (rolled) show(rolled.total, false);
		};
		if (feedStatus !== "ready" || !campaignId || !sceneId) {
			local();
			return;
		}
		setPendingRoll(true);
		void rollOnTable({
			campaignId,
			sceneId,
			formula,
			secret: false,
			characterId: table?.characterId ?? null,
			label: table?.label ?? label,
		}).then((rolled) => {
			setPendingRoll(false);
			if (rolled.ok) show(rolled.total, true);
			else local();
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
					onRollFormula={startFormulaRoll}
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
						onRollFormula={startFormulaRoll}
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
	onRollFormula: StartFormulaRoll;
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
	const canManage = useVTTStore((s) => s.isGM || s.isCoGM);
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
	return { hp, showMax: !hp.fromSheet || canManage };
}

function FloatingSheet({
	id,
	index,
	isTop,
	onUpdateToken,
	onStartRoll,
	onRollFormula,
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
		// Vaga livre da doca, olhando onde os outros cartões estão agora.
		const others = Array.from(
			document.querySelectorAll<HTMLElement>(
				'[data-vtt-focus-scope="sheet"][data-minimized="true"]',
			),
		)
			.filter((el) => el !== panelRef.current)
			.map((el) => ({
				x: Number.parseFloat(el.style.left),
				y: Number.parseFloat(el.style.top),
			}))
			.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
		const pos = nextDockPos(others, window.innerWidth, window.innerHeight);
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
							onRollFormula={onRollFormula}
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
	onRollFormula,
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
				onRollFormula={onRollFormula}
				rolling={rolling}
				lastRoll={lastRoll}
			/>
		</BottomSheet>
	);
}

/** Sistemas com percepção passiva (D&D 5e): a ficha na mesa mostra o número. */
const HAS_PASSIVE_PERCEPTION: ReadonlySet<string> = new Set([
	"dnd5e",
	"dnd2024",
]);

function SheetContent({
	token,
	character,
	onUpdateToken,
	onStartRoll,
	onRollFormula,
	rolling,
	lastRoll,
}: {
	token: VTTToken | null;
	character: Character | null;
	onUpdateToken: VTTSheetDrawerProps["onUpdateToken"];
	onStartRoll: StartRoll;
	onRollFormula: StartFormulaRoll;
	rolling: boolean;
	lastRoll: LastRoll | null;
}) {
	const loadStatus = useRPGStore((s) => s.campaignLoadStatus);
	const isGM = useVTTStore((s) => s.isGM);
	const canManage = useVTTStore((s) => s.isGM || s.isCoGM);
	const role = useActiveCampaignRole();
	const { session } = useAuth();
	const imageAssets = useImageAssetLookup();
	const { hp, showMax } = useSheetHp(token, character);
	// Unidade da cena ativa: o deslocamento da ficha aparece nela (30 ft = 9 m).
	const sceneUnit = useVTTStore(
		(s) =>
			s.scenes.find((scene) => scene.id === s.activeSceneId)?.gridScaleUnit,
	);
	// Atributos com os itens equipados: as rolagens da mesa usam estes valores.
	const { byId: campaignItems } = useCampaignItems();
	const resources = useSheetResources(character);
	const effective = useMemo(
		() => (character ? computeEffectiveStats(character, campaignItems) : null),
		[character, campaignItems],
	);

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
	const rolls: SheetRolls = {
		rolling,
		check: (label, modifier, chatLabel) =>
			onStartRoll(tokenId, label, modifier, dice, table(chatLabel ?? label)),
		formula: (label, formula) =>
			onRollFormula(tokenId, label, formula, table(label)),
	};

	const hpProps: ComponentProps<typeof SheetHp> | null = token
		? {
				current: hp.current,
				max: hp.max,
				showMax,
				temp: character?.tempHealth ?? token.tempHp ?? 0,
				onChange: (next) => onUpdateToken(token.id, { hpCurrent: next }),
				onChangeTempHp: (nextTemp) => {
					const sanitized = Math.max(0, nextTemp);
					if (character) {
						void useRPGStore.getState().updateCharacter(character.id, {
							tempHealth: sanitized,
						});
					}
					return onUpdateToken(token.id, { tempHp: sanitized });
				},
				onChangeMax:
					canManage || (character && !hp.fromSheet)
						? (nextMax) => {
								if (character && isGM) {
									void useRPGStore.getState().updateCharacter(character.id, {
										healthMax: nextMax,
									});
								}
								return onUpdateToken(token.id, { hpMax: nextMax });
							}
						: undefined,
				onChangeHp:
					canManage || (character && !hp.fromSheet)
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
									return onUpdateToken(token.id, tokenPatch);
								}
							}
						: undefined,
			}
		: null;

	const portraitUrl =
		character &&
		!isCharacterImageHidden(character, imageAssets, role, session?.user.id)
			? resolveCharacterImageUrl(character, imageAssets, role, session?.user.id)
			: "";

	const notice = character ? undefined : token?.characterId ? (
		<p className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
			Você não tem acesso a esta ficha nesta campanha.
		</p>
	) : (
		<NoSheetNotice canCreate={isGM} />
	);

	return (
		<SheetBody
			character={character}
			config={config}
			hp={hpProps}
			stats={effective}
			itemsById={campaignItems}
			sceneUnit={sceneUnit}
			showPassive={
				character ? HAS_PASSIVE_PERCEPTION.has(character.system) : false
			}
			rolls={rolls}
			resources={resources}
			conditions={token?.conditions ?? []}
			lastRoll={lastRoll}
			diceLabel={config.defaultDice || "d20"}
			portraitUrl={portraitUrl}
			notice={notice}
		/>
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
