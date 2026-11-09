import {
	BrickWall,
	Dices,
	Eye,
	Footprints,
	Grid,
	Hand,
	Hexagon,
	Map as MapIcon,
	MousePointer2,
	Radio,
	Ruler,
	ShieldAlert,
	Swords,
	Users,
} from "lucide-react";
import { type ComponentType, Fragment, useEffect } from "react";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import {
	ToolbarButton,
	ToolbarDivider,
	ToolbarGroup,
} from "@/components/vtt/vtt-toolbar-parts";
import { cn } from "@/lib/utils";
import {
	COMBAT_UNAVAILABLE_LABEL,
	useCombatStore,
} from "@/lib/vtt/combat-store";
import { TOOLBAR_WITH_GRID_BAR_CLASS } from "@/lib/vtt/grid-bar-layout";
import { useMoveStore } from "@/lib/vtt/move-store";
import { useRollStore } from "@/lib/vtt/roll-store";
import {
	hasOpenVttDialog,
	isVttShortcutBlocked,
} from "@/lib/vtt/shortcut-guard";
import type { VTTLayer } from "@/lib/vtt/types";
import {
	useVTTStore,
	type VTTTool,
	type VTTWallsStatus,
} from "@/lib/vtt/vtt-store";
import { handleWallKey } from "@/lib/vtt/wall-sync";

/** Texto do Tooltip quando a ferramenta Parede está desabilitada. */
export function wallToolDisabledReason(
	status: VTTWallsStatus,
	isMobile: boolean,
): string | null {
	if (status === "missing")
		return "Paredes chegam quando a atualização do banco for aplicada";
	if (status === "loading" || status === "idle") return "Carregando paredes…";
	if (status === "error") return "Não foi possível carregar as paredes";
	if (isMobile) return "Desenhe paredes no computador";
	return null;
}

/** Combate, chat e movimentos ocupam o mesmo lado: abrir um fecha os outros. */
function openRightPanel(panel: "combat" | "feed" | "moves") {
	const combat = useCombatStore.getState();
	const feed = useRollStore.getState();
	const moves = useMoveStore.getState();
	const open = {
		combat: combat.panelOpen,
		feed: feed.panelOpen,
		moves: moves.panelOpen,
	}[panel];
	combat.setPanelOpen(panel === "combat" && !open);
	feed.setPanelOpen(panel === "feed" && !open);
	moves.setPanelOpen(panel === "moves" && !open);
	if (panel !== "moves" || open) moves.focusMove(null);
}

export function VTTToolbar() {
	const activeTool = useVTTStore((s) => s.activeTool);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const activeLayer = useVTTStore((s) => s.activeLayer);
	const setActiveLayer = useVTTStore((s) => s.setActiveLayer);
	const isGM = useVTTStore((s) => s.isGM);
	const isStaff = useVTTStore((s) => s.isGM || s.isCoGM);
	const movesOpen = useMoveStore((s) => s.panelOpen);
	const showGridSettings = useVTTStore((s) => s.showGridSettings);
	const setShowGridSettings = useVTTStore((s) => s.setShowGridSettings);
	const gridBarOpen = isGM && showGridSettings;
	const gridMoreOpen = useVTTStore((s) => s.gridMoreOpen);
	const setShowFogControls = useVTTStore((s) => s.setShowFogControls);
	const wallsStatus = useVTTStore((s) => s.wallsStatus);
	const combatOpen = useCombatStore((s) => s.panelOpen);
	const combatStatus = useCombatStore((s) => s.status);
	const feedOpen = useRollStore((s) => s.panelOpen);
	const isMobile = useIsMobile();
	const sheetOpen = useVTTStore((s) => s.showCharacterSheetId);
	const wallDisabledReason = wallToolDisabledReason(wallsStatus, isMobile);

	// Global Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Esc fecha a Biblioteca da mesa (com qualquer foco). Com um dialog
			// aberto por cima (ex.: tela cheia), o Esc fecha só o dialog.
			if (
				e.key === "Escape" &&
				useVTTStore.getState().wallDraft.length > 0 &&
				!isVttShortcutBlocked(e) &&
				handleWallKey(e)
			) {
				e.preventDefault();
				return;
			}
			if (e.key === "Escape" && !e.defaultPrevented && !hasOpenVttDialog()) {
				const { showRosterDrawer, setShowRosterDrawer } =
					useVTTStore.getState();
				if (showRosterDrawer) setShowRosterDrawer(false);
				return;
			}
			if (isVttShortcutBlocked(e)) return;
			// Ferramenta Parede: Esc/Enter encerram o desenho, Backspace tira o
			// último ponto, Delete/Backspace apagam a seleção, Ctrl/⌘+Z desfaz.
			if (!e.defaultPrevented && handleWallKey(e)) {
				e.preventDefault();
				return;
			}

			if (e.ctrlKey || e.metaKey || e.altKey) return;
			const key = e.key.toLowerCase();
			if (key === "c") {
				openRightPanel("combat");
				return;
			}
			if (key === "m") {
				const role = useVTTStore.getState();
				if (role.isGM || role.isCoGM) openRightPanel("moves");
				return;
			}
			if (key === "v") setActiveTool("select");
			if (key === "h") setActiveTool("pan");
			if (key === "r") setActiveTool("ruler");
			if (key === "g") setActiveTool("ping");
			if (key === "t") setActiveTool("template");
			if (key === "w" && isGM && !wallDisabledReason) setActiveTool("wall");
			if (key === "f" && isGM) {
				setActiveTool("fog");
				setShowFogControls(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isGM, setActiveTool, setShowFogControls, wallDisabledReason]);

	const tools: {
		id: VTTTool;
		label: string;
		tooltip?: string;
		icon: ComponentType<{ className?: string }>;
		shortcut: string;
	}[][] = [
		[
			{
				id: "select",
				label: "Selecionar e mover vários",
				tooltip: "Selecionar e mover",
				icon: MousePointer2,
				shortcut: "V",
			},
			{
				id: "pan",
				label: "Mover a câmera com o botão direito",
				tooltip: "Mover a câmera",
				icon: Hand,
				shortcut: "H",
			},
		],
		[
			{
				id: "ruler",
				label: "Régua de Medição",
				tooltip: "Régua (clique marca pontos)",
				icon: Ruler,
				shortcut: "R",
			},
			{
				id: "template",
				label: "Moldes de magia",
				icon: Hexagon,
				shortcut: "T",
			},
			{
				id: "ping",
				label: "Ponteiro Laser (Ping)",
				tooltip: "Ping (ou Alt + clique)",
				icon: Radio,
				shortcut: "G",
			},
		],
	];

	const layers: {
		id: VTTLayer;
		label: string;
		icon: ComponentType<{ className?: string }>;
	}[] = [
		{ id: "map", label: "Camada do Mapa", icon: MapIcon },
		{ id: "token", label: "Camada de Tokens", icon: Users },
		{ id: "gm", label: "Camada do Mestre", icon: ShieldAlert },
	];

	if (isMobile && sheetOpen) return null;

	return (
		<nav
			aria-label="Ferramentas da mesa"
			data-slot="vtt-toolbar"
			className={cn(
				"absolute left-3 top-32 z-30 flex max-h-[calc(100dvh-14rem)] w-14 flex-col items-center gap-1 overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-xl backdrop-blur-md pointer-events-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-left-2 duration-200",
				// 390 px: com a barra do grid aberta, a toolbar termina acima dela
				// e rola por dentro; com "Mais ajustes" aberto recolhe junto.
				gridBarOpen &&
					TOOLBAR_WITH_GRID_BAR_CLASS[gridMoreOpen ? "open" : "closed"],
			)}
		>
			{tools.map((group, index) => (
				<Fragment key={group[0].id}>
					{index > 0 && <ToolbarDivider />}
					<ToolbarGroup>
						{group.map((tool) => (
							<ToolbarButton
								key={tool.id}
								label={tool.label}
								tooltip={tool.tooltip}
								shortcut={tool.shortcut}
								icon={tool.icon}
								active={activeTool === tool.id}
								onClick={() => {
									setActiveTool(tool.id);
									setShowFogControls(false);
								}}
							/>
						))}
					</ToolbarGroup>
				</Fragment>
			))}

			{isGM && (
				<>
					<ToolbarDivider />
					<ToolbarGroup>
						<ToolbarButton
							label="Névoa de Guerra"
							shortcut="F"
							icon={Eye}
							active={activeTool === "fog"}
							onClick={() => {
								setActiveTool("fog");
								setShowFogControls(true);
							}}
						/>
						{/* Celular: só visualização (o mestre vê as paredes no mapa; o
						    Tooltip não abre no toque, então o botão nem aparece). */}
						{!isMobile && (
							<ToolbarButton
								label="Parede"
								tooltip={wallDisabledReason ?? "Parede"}
								shortcut={wallDisabledReason ? undefined : "W"}
								icon={BrickWall}
								active={activeTool === "wall"}
								disabled={Boolean(wallDisabledReason)}
								onClick={() => setActiveTool("wall")}
							/>
						)}
					</ToolbarGroup>
				</>
			)}

			<ToolbarDivider />
			<ToolbarGroup>
				<ToolbarButton
					label="Combate"
					tooltip={
						combatStatus === "unavailable"
							? COMBAT_UNAVAILABLE_LABEL
							: "Combate"
					}
					shortcut="C"
					icon={Swords}
					kind="toggle"
					active={combatOpen}
					onClick={() => openRightPanel("combat")}
				/>
				{isStaff && (
					<ToolbarButton
						label="Movimentos dos tokens"
						tooltip="Histórico de movimentos"
						shortcut="M"
						icon={Footprints}
						kind="toggle"
						active={movesOpen}
						onClick={() => openRightPanel("moves")}
					/>
				)}
				<ToolbarButton
					label="Rolagens e chat"
					icon={Dices}
					kind="toggle"
					active={feedOpen}
					onClick={() => openRightPanel("feed")}
				/>
			</ToolbarGroup>

			{isGM && (
				<>
					<ToolbarDivider />
					<ToolbarGroup inset>
						{layers.map((layer) => (
							<ToolbarButton
								key={layer.id}
								label={layer.label}
								icon={layer.icon}
								kind="layer"
								active={activeLayer === layer.id}
								onClick={() => setActiveLayer(layer.id)}
							/>
						))}
					</ToolbarGroup>
					<ToolbarDivider />
					<ToolbarButton
						label="Configurações do Grid"
						tooltip="Ajuste do grid"
						icon={Grid}
						kind="toggle"
						active={showGridSettings}
						expanded={showGridSettings}
						onClick={() => setShowGridSettings(!showGridSettings)}
					/>
				</>
			)}
		</nav>
	);
}
