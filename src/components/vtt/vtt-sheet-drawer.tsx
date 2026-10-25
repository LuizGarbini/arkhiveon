import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	Dices,
	GripHorizontal,
	Heart,
	Plus,
	X,
} from "lucide-react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useId,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { characterAttributeScore } from "@/core/rules";
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
	visibleHpLabel,
} from "@/lib/vtt/character-hp";
import {
	clampSheetRect,
	defaultSheetRect,
	loadSheetRect,
	moveSheetRect,
	resizeSheetRect,
	type SheetRect,
	saveSheetRect,
	sheetStorageKey,
} from "@/lib/vtt/floating-sheet";
import { hasOpenVttDialog } from "@/lib/vtt/shortcut-guard";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

type DiceType = "d20" | "d100" | "d10" | "d6";

interface VTTSheetDrawerProps {
	onUpdateToken: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<unknown>;
}

type StartRoll = (
	tokenId: string,
	label: string,
	modifier: number,
	diceType: DiceType,
) => void;

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

	const [rollState, setRollState] = useState<{
		open: boolean;
		tokenId: string;
		label: string;
		modifier: number;
		diceType: DiceType;
	}>({ open: false, tokenId: "", label: "", modifier: 0, diceType: "d20" });
	const [lastRolls, setLastRolls] = useState<Record<string, string>>({});

	const startRoll: StartRoll = (tokenId, label, modifier, diceType) =>
		setRollState({ open: true, tokenId, label, modifier, diceType });
	const {
		tokenId: rollTokenId,
		label: rollLabel,
		modifier: rollModifier,
	} = rollState;
	const handleRollComplete = useCallback(
		(natural: number) => {
			const signed =
				rollModifier === 0
					? ""
					: ` ${rollModifier > 0 ? "+" : "−"} ${Math.abs(rollModifier)}`;
			setLastRolls((prev) => ({
				...prev,
				[rollTokenId]: `${rollLabel}: ${natural}${signed} = ${natural + rollModifier}`,
			}));
		},
		[rollTokenId, rollLabel, rollModifier],
	);
	const handleRollClose = useCallback(
		() =>
			setRollState({
				open: false,
				tokenId: "",
				label: "",
				modifier: 0,
				diceType: "d20",
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
						lastRoll={lastRolls[id] ?? null}
					/>
				))
			)}
			<DiceRollOverlay
				open={rollState.open}
				attributeLabel={rollState.label}
				diceType={rollState.diceType}
				modifier={rollState.modifier}
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
	lastRoll: string | null;
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

function FloatingSheet({
	id,
	index,
	isTop,
	onUpdateToken,
	onStartRoll,
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
	const shown = clampSheetRect(rect, window.innerWidth, window.innerHeight);
	const panelRef = useRef<HTMLElement>(null);
	// Arraste/redimensionamento mexem só no estilo do painel; o estado React
	// (e o localStorage) só muda ao soltar. O canvas não re-renderiza.
	const gesture = useRef<{
		kind: "move" | "resize";
		x: number;
		y: number;
		start: SheetRect;
		last: SheetRect;
	} | null>(null);

	const begin =
		(kind: "move" | "resize") => (e: ReactPointerEvent<HTMLElement>) => {
			if (e.button !== 0) return;
			if (
				kind === "move" &&
				(e.target as Element).closest("button, a, input, [role=button]")
			)
				return;
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			gesture.current = {
				kind,
				x: e.clientX,
				y: e.clientY,
				start: shown,
				last: shown,
			};
		};
	const onMove = (e: ReactPointerEvent<HTMLElement>) => {
		const g = gesture.current;
		const el = panelRef.current;
		if (!g || !el) return;
		const dx = e.clientX - g.x;
		const dy = e.clientY - g.y;
		const next =
			g.kind === "move"
				? moveSheetRect(g.start, dx, dy, window.innerWidth, window.innerHeight)
				: resizeSheetRect(
						g.start,
						dx,
						dy,
						window.innerWidth,
						window.innerHeight,
					);
		g.last = next;
		el.style.left = `${next.x}px`;
		el.style.top = `${next.y}px`;
		el.style.width = `${next.w}px`;
		el.style.height = `${next.h}px`;
	};
	const onEnd = () => {
		const g = gesture.current;
		if (!g) return;
		gesture.current = null;
		setRect(g.last);
		saveSheetRect(storageKey, g.last);
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
			onKeyDownCapture={escapeCloses(close)}
			onPointerDownCapture={() => {
				if (!isTop) focusSheet(id);
			}}
			style={{ left: shown.x, top: shown.y, width: shown.w, height: shown.h }}
			className={cn(
				"fixed flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-elevated text-foreground shadow-2xl",
				isTop ? "z-[41]" : "z-40",
			)}
		>
			<header
				data-testid="vtt-sheet-drag-handle"
				onPointerDown={begin("move")}
				onPointerMove={onMove}
				onPointerUp={onEnd}
				onPointerCancel={onEnd}
				className="flex min-h-11 shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border/60 pl-3 pr-1 select-none active:cursor-grabbing"
			>
				<GripHorizontal
					className="size-4 shrink-0 text-muted-foreground"
					aria-hidden
				/>
				{/* Padrão Figma: só alça + X; o nome fica no título da identidade. */}
				<span className="flex-1" />
				<CloseSheetButton onClose={close} />
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<SheetContent
					token={token}
					character={character}
					onUpdateToken={onUpdateToken}
					onStartRoll={onStartRoll}
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
		</section>
	);
}

function MobileSheet({
	id,
	onUpdateToken,
	onStartRoll,
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
			// Não cobre a barra de ferramentas da mesa (left-3 + w-14).
			className="left-[4.75rem] right-0 w-auto max-h-[78dvh] bg-card-elevated backdrop-blur-none"
			overlayClassName="left-[4.75rem] bg-black/30 backdrop-blur-none"
		>
			<SheetContent
				token={token}
				character={character}
				onUpdateToken={onUpdateToken}
				onStartRoll={onStartRoll}
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
	lastRoll,
}: {
	token: VTTToken | null;
	character: Character | null;
	onUpdateToken: VTTSheetDrawerProps["onUpdateToken"];
	onStartRoll: StartRoll;
	lastRoll: string | null;
}) {
	const loadStatus = useRPGStore((s) => s.campaignLoadStatus);
	const isGM = useVTTStore((s) => s.isGM);
	const role = useActiveCampaignRole();
	const imageAssets = useImageAssetLookup();
	const linkedId = token?.characterId ?? null;
	const sheetHealth = useRPGStore((s) => selectSheetHealth(s, linkedId));
	const sheetHealthMax = useRPGStore((s) => selectSheetHealthMax(s, linkedId));

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
	const sheetOwnsHp = characterSheetOwnsHp(character);
	const hp = resolveTokenHp({
		tokenHpCurrent: token?.hpCurrent,
		tokenHpMax: token?.hpMax,
		sheetHealth,
		sheetHealthMax,
		characterHealth: sheetOwnsHp ? undefined : character?.health,
		characterHealthMax: sheetOwnsHp ? undefined : character?.healthMax,
	});
	const showMax = !hp.fromSheet || isGM;
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
						)}
						isImageHidden={isCharacterImageHidden(character, imageAssets, role)}
					/>
					<SheetQuickStats
						compact
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
				<HpControl
					hpCurrent={hp.current}
					hpMax={hp.max}
					showMax={showMax}
					onChange={(next) => void onUpdateToken(token.id, { hpCurrent: next })}
					onChangeMax={
						hp.fromSheet && isGM
							? (nextMax) =>
									void onUpdateToken(token.id, {
										hpCurrent: hp.current,
										hpMax: nextMax,
									})
							: undefined
					}
				/>
			) : null}

			{character ? (
				<section aria-labelledby={`attrs-${tokenId}`} className="space-y-2">
					<h3
						id={`attrs-${tokenId}`}
						className="font-display text-sm font-bold tracking-tight"
					>
						Atributos
					</h3>
					<ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-background/40">
						{config.attributes.map((attr) => {
							const score = characterAttributeScore(character, attr.key);
							const mod = abilityModifier(score);
							const fullName = getAttributeFullName(attr.label);
							return (
								<li
									key={attr.key}
									className="flex min-h-11 items-center gap-3 px-3"
								>
									<span className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										{attr.label}
									</span>
									<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
										{fullName}
									</span>
									<span className="font-display text-base font-bold tabular-nums">
										{score}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="min-h-11 gap-1 font-mono tabular-nums"
										aria-label={`Rolar ${fullName} (${formatModifier(mod)})`}
										onClick={() => onStartRoll(tokenId, attr.label, mod, dice)}
									>
										<Dices className="size-3.5" aria-hidden />
										{formatModifier(mod)}
									</Button>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			<div className="space-y-2">
				{lastRoll ? (
					<p
						aria-live="polite"
						className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-foreground"
					>
						{lastRoll}
					</p>
				) : null}
				<Button
					type="button"
					variant="outline"
					className="h-[44px] w-full gap-2"
					onClick={() => onStartRoll(tokenId, "Teste livre", 0, dice)}
				>
					<Dices className="h-4 w-4" />
					Rolar {config.defaultDice || "d20"}
				</Button>
			</div>
		</div>
	);
}

function HpControl({
	hpCurrent,
	hpMax,
	showMax,
	onChange,
	onChangeMax,
}: {
	hpCurrent: number;
	hpMax: number;
	showMax: boolean;
	onChange: (next: number) => void;
	onChangeMax?: (next: number) => void;
}) {
	const maxFieldId = useId();
	const [maxDraft, setMaxDraft] = useState<string | null>(null);
	const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-xs font-bold">
				<span className="flex items-center gap-1.5 text-rose-400">
					<Heart className="h-3.5 w-3.5" />
					Pontos de vida
				</span>
				<span className="font-mono tabular-nums">
					{visibleHpLabel(hpCurrent, hpMax, showMax)}
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-[width] duration-150"
					style={{ width: `${ratio * 100}%` }}
				/>
			</div>
			<div className="grid grid-cols-4 gap-1.5">
				{[-5, -1, 1, 5].map((delta) => (
					<Button
						type="button"
						key={delta}
						variant="outline"
						size="sm"
						className={cn(
							"min-h-11 font-mono",
							delta < 0 ? "text-destructive" : "text-primary",
						)}
						onClick={() =>
							onChange(
								Math.max(
									0,
									Math.min(hpCurrent + delta, hpMax || hpCurrent + delta),
								),
							)
						}
					>
						{delta > 0 ? `+${delta}` : delta}
					</Button>
				))}
			</div>
			{showMax && onChangeMax ? (
				<form
					className="flex items-end gap-1.5"
					onSubmit={(event) => {
						event.preventDefault();
						const nextMax = Number.parseInt(maxDraft ?? String(hpMax), 10);
						if (!Number.isFinite(nextMax) || nextMax <= 0) return;
						onChangeMax(nextMax);
						setMaxDraft(null);
					}}
				>
					<div className="min-w-0 flex-1 space-y-1">
						<label htmlFor={maxFieldId} className="text-xs font-bold">
							PV máximo
						</label>
						<Input
							id={maxFieldId}
							type="number"
							min={1}
							inputMode="numeric"
							spellCheck={false}
							autoComplete="off"
							aria-label="PV máximo"
							value={maxDraft ?? String(hpMax)}
							onChange={(event) => setMaxDraft(event.target.value)}
							className="h-11 text-base tabular-nums"
						/>
					</div>
					<Button
						type="submit"
						variant="outline"
						className="h-11 min-h-11 select-none"
					>
						Aplicar
					</Button>
				</form>
			) : null}
		</div>
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
