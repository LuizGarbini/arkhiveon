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
	NotebookPen,
	Radio,
	Ruler,
	ShieldAlert,
	Sun,
	Swords,
	Users,
} from "lucide-react";
import {
	type ComponentType,
	Fragment,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
} from "react";
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
import { handleLightKey } from "@/lib/vtt/light-zone-sync";
import { useMoveStore } from "@/lib/vtt/move-store";
import { useNotesStore } from "@/lib/vtt/notes-store";
import { flushAllNotes } from "@/lib/vtt/notes-sync";
import { pingKindsFor } from "@/lib/vtt/ping-kinds";
import {
	PICKER_HOLD_MS,
	PICKER_MOVE_SLOP_PX,
	pickerBox,
	pickerIndexAt,
} from "@/lib/vtt/ping-picker";
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

/** Combate, chat, movimentos e notas ocupam o mesmo lado: abrir um fecha os outros. */
function openRightPanel(panel: "combat" | "feed" | "moves" | "notes") {
	const combat = useCombatStore.getState();
	const feed = useRollStore.getState();
	const moves = useMoveStore.getState();
	const notes = useNotesStore.getState();
	const open = {
		combat: combat.panelOpen,
		feed: feed.panelOpen,
		moves: moves.panelOpen,
		notes: notes.panelOpen,
	}[panel];
	// Trocar de painel não pode perder o que acabou de ser digitado numa nota.
	void flushAllNotes();
	combat.setPanelOpen(panel === "combat" && !open);
	feed.setPanelOpen(panel === "feed" && !open);
	moves.setPanelOpen(panel === "moves" && !open);
	notes.setPanelOpen(panel === "notes" && !open);
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
	const notesOpen = useNotesStore((s) => s.panelOpen);
	const isMobile = useIsMobile();
	const sheetOpen = useVTTStore((s) => s.showCharacterSheetId);
	const wallDisabledReason = wallToolDisabledReason(wallsStatus, isMobile);

	// Segurar o botão de Ping abre a lista de tipos ao lado dele; arrastar o dedo
	// escolhe e soltar fixa o tipo (e liga a ferramenta). É o jeito do celular
	// trocar o tipo; no computador o mesmo vale com o mouse. Um toque rápido segue
	// só ligando a ferramenta, como antes.
	const suppressPingClickRef = useRef(false);
	const handlePingPointerDown = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		if (event.button !== 0) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const start = useVTTStore.getState();
		const kinds = pingKindsFor(start.isGM || start.isCoGM).map(
			(kind) => kind.id,
		);
		const box = pickerBox(rect, kinds.length, {
			width: window.innerWidth,
			height: window.innerHeight,
		});
		const hold = {
			opened: false,
			x: event.clientX,
			y: event.clientY,
			timer: null as ReturnType<typeof setTimeout> | null,
		};
		const stop = () => {
			if (hold.timer) clearTimeout(hold.timer);
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", finish);
			window.removeEventListener("pointercancel", finish);
		};
		const move = (e: PointerEvent) => {
			if (!hold.opened) {
				// Mexeu antes da lista abrir: não é um "segurar".
				if (
					Math.hypot(e.clientX - hold.x, e.clientY - hold.y) >
					PICKER_MOVE_SLOP_PX
				)
					stop();
				return;
			}
			const index = pickerIndexAt(
				{ x: e.clientX, y: e.clientY },
				box,
				kinds.length,
			);
			useVTTStore
				.getState()
				.setPingPickerHover(index >= 0 ? (kinds[index] ?? null) : null);
		};
		const finish = (e: PointerEvent) => {
			stop();
			if (!hold.opened) return;
			const live = useVTTStore.getState();
			const picked = live.pingPicker?.hover ?? null;
			live.closePingPicker();
			// Soltar fora do botão não dispara o clique dele; soltar nele dispara.
			// A trava expira sozinha para não engolir o próximo toque de verdade.
			suppressPingClickRef.current = true;
			setTimeout(() => {
				suppressPingClickRef.current = false;
			}, 120);
			if (e.type !== "pointercancel" && picked) {
				live.setPingKind(picked);
				live.setActiveTool("ping");
				setShowFogControls(false);
			}
		};
		hold.timer = setTimeout(() => {
			hold.opened = true;
			useVTTStore.getState().openPingPicker({
				left: box.left,
				top: box.top,
				kinds,
				hover: null,
			});
		}, PICKER_HOLD_MS);
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", finish);
		window.addEventListener("pointercancel", finish);
	};

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
			// Esc na ferramenta Luz: cancela o polígono ou tira a seleção antes de
			// qualquer outra coisa (como a Parede).
			if (
				e.key === "Escape" &&
				(useVTTStore.getState().lightDraft.length > 0 ||
					useVTTStore.getState().selectedLightZoneId !== null) &&
				!isVttShortcutBlocked(e) &&
				handleLightKey(e)
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
			// Ferramenta Luz: Enter fecha o polígono, Backspace tira um ponto,
			// Delete/Backspace apagam a área selecionada.
			if (!e.defaultPrevented && handleLightKey(e)) {
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
			if (key === "n") {
				openRightPanel("notes");
				return;
			}
			if (key === "v") setActiveTool("select");
			if (key === "h") setActiveTool("pan");
			if (key === "r") setActiveTool("ruler");
			if (key === "g") setActiveTool("ping");
			if (key === "t") setActiveTool("template");
			if (key === "w" && isGM && !wallDisabledReason) setActiveTool("wall");
			if (key === "l" && isGM) setActiveTool("light");
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
				tooltip: "Selecionar e mover (setas movem os selecionados)",
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
				tooltip: "Ping (segure para escolher o tipo)",
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
								onPointerDown={
									tool.id === "ping" ? handlePingPointerDown : undefined
								}
								className={tool.id === "ping" ? "touch-none" : undefined}
								onClick={() => {
									if (tool.id === "ping" && suppressPingClickRef.current) {
										suppressPingClickRef.current = false;
										return;
									}
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
						{/* Luz: áreas de luz do dia, penumbra e escuridão (desenhar pede mouse
						    ou toque preciso, então some no celular, como a Parede). */}
						{!isMobile && (
							<ToolbarButton
								label="Luz"
								shortcut="L"
								icon={Sun}
								active={activeTool === "light"}
								onClick={() => setActiveTool("light")}
							/>
						)}
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
				<ToolbarButton
					label="Notas"
					tooltip={
						isGM ? "Notas do mestre (só você vê)" : "Minhas notas (só você vê)"
					}
					shortcut="N"
					icon={NotebookPen}
					kind="toggle"
					active={notesOpen}
					onClick={() => openRightPanel("notes")}
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
