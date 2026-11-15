import {
	Application,
	Assets,
	Container,
	Graphics,
	RenderTexture,
	Sprite,
	Text,
	TextStyle,
	Texture,
} from "pixi.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import { playPingAudio } from "@/lib/vtt/audio";
import {
	readLinkedSheetHp,
	resolveTokenHp,
	selectLinkedSheetHpStamp,
} from "@/lib/vtt/character-hp";
import { currentTurnRingTokenId, useCombatStore } from "@/lib/vtt/combat-store";
import {
	scaledStatusDiscMetrics,
	summarizeConditions,
	tokenRingStyle,
} from "@/lib/vtt/conditions";
import {
	cursorBroadcastDue,
	type DragMove,
	dragBroadcastDue,
} from "@/lib/vtt/drag-broadcast";
import { doorRevealed, exploredMeta, exploredRuns } from "@/lib/vtt/explored";
import { uncoverExploredUnder } from "@/lib/vtt/explored-fog";
import { useExploredStore } from "@/lib/vtt/explored-store";
import { exploredSync } from "@/lib/vtt/explored-sync";
import {
	buildFogComposite,
	drawFogGeometry,
	GM_FOG_ALPHA,
	GM_FOG_COLOR,
	PLAYER_FOG_COLOR,
} from "@/lib/vtt/fog-math";
import {
	flatHexCenters,
	getFlatHexCorners,
	getPointyHexCorners,
	pointyHexCenters,
	snapToGrid,
	squareGridLines,
	ZERO_ORIGIN,
} from "@/lib/vtt/grid-math";
import { createLightZone, finishLightDraft } from "@/lib/vtt/light-zone-sync";
import { geometryFromDrag, lightAt, zoneAt } from "@/lib/vtt/light-zones";
import { useMoveStore } from "@/lib/vtt/move-store";
import { recordMove } from "@/lib/vtt/move-sync";
import {
	canControlVTTToken,
	type VTTCharacterOwner,
} from "@/lib/vtt/permissions";
import {
	type ActivePing,
	createPingAnimationLoop,
	pingVisual,
	publishPingLoopStats,
} from "@/lib/vtt/ping-queue";
import { attachRemoteCursors } from "@/lib/vtt/remote-cursor-layer";
import {
	rulerOnKey,
	rulerPointerDown,
	rulerPointerMove,
	rulerPointerUp,
} from "@/lib/vtt/ruler-gesture";
import {
	formatDistance,
	type RulerContext,
	rulerUndo,
} from "@/lib/vtt/ruler-path";
import {
	isEditableElement,
	isVttShortcutBlocked,
} from "@/lib/vtt/shortcut-guard";
import {
	clearStatusIconTextures,
	cssVarColor,
	STATUS_RING_SPRITE_FACTOR,
	statusRingTexture,
} from "@/lib/vtt/status-icon-texture";
import { createStatusLongPress } from "@/lib/vtt/status-long-press";
import {
	spellTemplateIdAtPoint,
	type VTTSpellTemplate,
} from "@/lib/vtt/template-math";
import {
	canRemoveSpellTemplate,
	shouldDeleteSelectedTemplate,
} from "@/lib/vtt/template-permissions";
import {
	tokenPose,
	tokensAppearanceKey,
	visibleTokenIds,
} from "@/lib/vtt/token-motion";
import {
	beginTokenPress,
	canvasPressAction,
	isDoublePress,
	isTokenTap,
	TOKEN_TAP_SLOP_PX,
	type TokenPress,
	tokenPressEndAction,
	trackTokenPressMove,
} from "@/lib/vtt/token-press";
import {
	beginRightPress,
	canSelectTokenLayer,
	dragMembers,
	isAdditiveSelect,
	type RightPress,
	selectionFromMarquee,
	tokensInsideRect,
	trackRightPress,
	translateMembers,
} from "@/lib/vtt/token-selection";
import {
	keyboardMovers,
	moveBlocked,
	planStep,
	stepDirectionOf,
} from "@/lib/vtt/token-step";
import type {
	VTTFogPath,
	VTTPingEvent,
	VTTRulerMeasurement,
	VTTScene,
	VTTToken,
} from "@/lib/vtt/types";
import {
	facingFromMove,
	flattenPolygon,
	freezeDragged,
	isSeenByAny,
	isVisionToken,
	resolveTokenVisionCells,
	sourcePolygons,
	toLightLevel,
	visionKey,
	visionSources,
} from "@/lib/vtt/vision";
import {
	parseVisionStamp,
	selectLinkedVisionStamp,
} from "@/lib/vtt/vision-sheet";
import {
	clearLabels,
	drawDoors,
	drawLightPreview,
	drawLightZones,
	drawMoveArrow,
	drawRulerPath,
	drawSpellTemplate,
	drawWallPreview,
	drawWalls,
	dsColor,
	parseHexColor,
} from "@/lib/vtt/vtt-draw";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { finishWallDraft, toggleDoor } from "@/lib/vtt/wall-sync";
import {
	blockingWalls,
	doorIconRadius,
	doorWithinReach,
	hitTestDoorIcon,
	hitTestWall,
	isOpenable,
	movementBlockingWalls,
	snapWallPoint,
} from "@/lib/vtt/walls";

function readFullName(metadata: unknown): string {
	if (!metadata || typeof metadata !== "object") return "";
	const name = (metadata as { full_name?: unknown }).full_name;
	return typeof name === "string" ? name.trim() : "";
}

function tableUserName(
	user: { email?: string | null; user_metadata?: unknown } | null,
): string {
	const named = readFullName(user?.user_metadata);
	if (named) return named;
	const local = user?.email?.split("@")[0]?.trim();
	return local || "Você";
}

function paintPings(
	layer: Graphics,
	pings: readonly ActivePing[],
	now: number,
) {
	layer.clear();
	for (const ping of pings) {
		const frame = pingVisual(ping.timestamp, now);
		if (!frame.alive) continue;
		const colorHex = parseHexColor(ping.color, 0xa855f7);
		layer.circle(ping.x, ping.y, frame.radius);
		layer.stroke({ width: 3, color: colorHex, alpha: frame.alpha });
		layer.circle(ping.x, ping.y, 6);
		layer.fill({ color: colorHex, alpha: frame.alpha });
	}
}

function paintTokenAuras(
	layer: Graphics,
	tokens: readonly VTTToken[],
	displays: ReadonlyMap<string, Container>,
	gridSize: number,
) {
	layer.clear();
	for (const token of tokens) {
		const display = displays.get(token.id);
		if (!display || token.auras.length === 0) continue;
		for (const aura of token.auras) {
			const auraRadius = aura.radius * gridSize;
			const colorHex = parseHexColor(aura.color, 0x38bdf8);
			layer.circle(display.position.x, display.position.y, auraRadius);
			layer.fill({ color: colorHex, alpha: aura.opacity ?? 0.25 });
			layer.circle(display.position.x, display.position.y, auraRadius);
			layer.stroke({ width: 1.5, color: colorHex, alpha: 0.6 });
		}
	}
}

function placeMarquee(
	el: HTMLDivElement | null,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
) {
	if (!el) return;
	const left = Math.min(x0, x1);
	const top = Math.min(y0, y1);
	const width = Math.abs(x1 - x0);
	const height = Math.abs(y1 - y0);
	if (width < 2 && height < 2) {
		el.style.display = "none";
		return;
	}
	el.style.display = "block";
	el.style.left = `${left}px`;
	el.style.top = `${top}px`;
	el.style.width = `${width}px`;
	el.style.height = `${height}px`;
}

function hideMarquee(el: HTMLDivElement | null) {
	if (el) el.style.display = "none";
}

function auraPoseSignature(
	tokens: readonly VTTToken[],
	displays: ReadonlyMap<string, Container>,
	gridSize: number,
) {
	let sig = String(gridSize);
	for (const token of tokens) {
		const display = displays.get(token.id);
		if (!display || token.auras.length === 0) continue;
		const auras = token.auras
			.map((aura) => `${aura.radius}:${aura.color}:${aura.opacity ?? ""}`)
			.join(",");
		sig += `|${token.id}:${display.position.x.toFixed(1)}:${display.position.y.toFixed(1)}:${auras}`;
	}
	return sig;
}

interface VTTCanvasProps {
	scene: VTTScene | null;
	characterOwners?: readonly VTTCharacterOwner[];
	/** Um lote por tick do arrasto, com todos os tokens do grupo. */
	onBroadcastDragBatch?: (moves: DragMove[]) => void;
	onUpdateToken?: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<unknown>;
	onBroadcastDrag?: (tokenId: string, x: number, y: number) => void;
	onBroadcastCursor?: (x: number, y: number) => void;
	onBroadcastRuler?: (measurement: VTTRulerMeasurement | null) => void;
	onBroadcastPing?: (ping: VTTPingEvent) => void;
	onBroadcastFog?: (path: VTTFogPath) => void;
	onBroadcastTemplate?: (
		template: VTTSpellTemplate | null,
		placed?: boolean,
	) => void;
	onRemoveTemplates?: (ids: string[]) => void;
	onPersistFog?: (paths: VTTFogPath[]) => void;
}

const EMPTY_CHARACTER_OWNERS: readonly VTTCharacterOwner[] = [];

/**
 * Fantasma do token arrastado, acima da névoa. Com a visão congelada até soltar,
 * o token pode passar por área escura: quem arrasta precisa ver onde vai soltar.
 */
function destroyChildren(layer: Container | null) {
	if (!layer) return;
	for (const child of layer.removeChildren()) child.destroy({ children: true });
}

function syncDragGhost(
	layer: Container,
	token: { id: string; name: string; sizeCells: number },
	x: number,
	y: number,
	gridSize: number,
) {
	let ghost = layer.getChildByLabel(token.id) as Container | null;
	if (!ghost) {
		ghost = new Container();
		ghost.label = token.id;
		const radius = (token.sizeCells * gridSize) / 2;
		const disc = new Graphics();
		disc.circle(0, 0, radius);
		disc.fill({ color: 0x18181b, alpha: 0.9 });
		disc.stroke({ width: 2, color: 0xfafafa, alpha: 0.9 });
		ghost.addChild(disc);
		const initials = new Text({
			text: token.name.slice(0, 2).toUpperCase(),
			style: new TextStyle({
				fill: 0xa855f7,
				fontSize: Math.max(10, radius * 0.7),
				fontWeight: "700",
			}),
		});
		initials.anchor.set(0.5);
		ghost.addChild(initials);
		layer.addChild(ghost);
	}
	ghost.position.set(x, y);
}

/**
 * Só em localhost/dev (ferramenta de teste, como `window.__vtt_store__`): conta
 * quantas vezes a textura da névoa foi refeita. `pnpm check:fog-drag` usa isso
 * para garantir que arrastar um token não refaz a névoa.
 */
function countFogRender() {
	if (typeof window === "undefined") return;
	const host = window.location.hostname;
	if (!import.meta.env.DEV && host !== "localhost" && host !== "127.0.0.1")
		return;
	const w = window as unknown as { __fog_renders__?: number };
	w.__fog_renders__ = (w.__fog_renders__ ?? 0) + 1;
}

export function VTTCanvas({
	scene,
	characterOwners = EMPTY_CHARACTER_OWNERS,
	onBroadcastDragBatch,
	onUpdateToken,
	onBroadcastDrag,
	onBroadcastCursor,
	onBroadcastRuler,
	onBroadcastPing,
	onBroadcastFog,
	onBroadcastTemplate,
	onRemoveTemplates,
	onPersistFog,
}: VTTCanvasProps) {
	const { user } = useAuth();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const [rendererReady, setRendererReady] = useState(false);
	const worldContainerRef = useRef<Container | null>(null);
	const mapLayerRef = useRef<Container | null>(null);
	const gridLayerRef = useRef<Graphics | null>(null);
	const aurasLayerRef = useRef<Graphics | null>(null);
	const tokensLayerRef = useRef<Container | null>(null);
	const gmTokensLayerRef = useRef<Container | null>(null);
	const fogExplorationLayerRef = useRef<Graphics | null>(null);
	const visionMaskRef = useRef<Graphics | null>(null);
	const dragGhostLayerRef = useRef<Container | null>(null);
	const gmExploredLayerRef = useRef<Graphics | null>(null);
	const penumbraMaskRef = useRef<Graphics | null>(null);
	const fogOfWarLayerRef = useRef<Container | null>(null);
	const fogSpriteRef = useRef<Sprite | null>(null);
	const fogTextureRef = useRef<RenderTexture | null>(null);
	const fogBrushPreviewLayerRef = useRef<Graphics | null>(null);
	// Paredes (só mestre): um Graphics para todas + um para a prévia do desenho.
	const wallsLayerRef = useRef<Graphics | null>(null);
	const doorsLayerRef = useRef<Graphics | null>(null);
	const doorIconsTopRef = useRef<Graphics | null>(null);
	const wallPreviewLayerRef = useRef<Graphics | null>(null);
	const lightZonesLayerRef = useRef<Graphics | null>(null);
	const lightPreviewLayerRef = useRef<Graphics | null>(null);
	const lightDragRef = useRef<{ x: number; y: number } | null>(null);
	const lightCursorRef = useRef<{ x: number; y: number } | null>(null);
	const lastLightClickRef = useRef<{ x: number; y: number; t: number } | null>(
		null,
	);
	const wallCursorRef = useRef<{ x: number; y: number } | null>(null);
	const lastWallClickRef = useRef<{ x: number; y: number; t: number } | null>(
		null,
	);
	const remoteRulersLayerRef = useRef<Graphics | null>(null);
	const remoteRulersLabelsRef = useRef<Container | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
	const measurementLabelsRef = useRef<Container | null>(null);
	const templatesLayerRef = useRef<Graphics | null>(null);
	const templateLabelsRef = useRef<Container | null>(null);
	const moveTrailLayerRef = useRef<Graphics | null>(null);
	const moveTrailLabelsRef = useRef<Container | null>(null);
	const pingsLayerRef = useRef<Graphics | null>(null);
	const remoteCursorsLayerRef = useRef<Container | null>(null);

	// Display containers map for direct 60fps WebGL interpolation without React state thrashing
	const tokenDisplayObjectsRef = useRef<Map<string, Container>>(new Map());
	const paintAurasRef = useRef<() => void>(() => {});
	const auraPoseRef = useRef("");
	// Anel da vez: um Graphics no token ativo. Não entra no ticker.
	const turnRingRef = useRef<Graphics | null>(null);
	const turnRingTokenRef = useRef<string | null>(null);
	const turnRingSigRef = useRef("");
	const sceneRef = useRef(scene);
	sceneRef.current = scene;
	paintAurasRef.current = () => {
		const layer = aurasLayerRef.current;
		if (!layer) return;
		const liveTokens = useVTTStore.getState().tokens;
		const gridSize = sceneRef.current?.gridSize || 70;
		const sig = auraPoseSignature(
			liveTokens,
			tokenDisplayObjectsRef.current,
			gridSize,
		);
		if (sig === auraPoseRef.current) return;
		auraPoseRef.current = sig;
		paintTokenAuras(
			layer,
			liveTokens,
			tokenDisplayObjectsRef.current,
			gridSize,
		);
	};
	const paintTurnRingRef = useRef<() => void>(() => {});
	paintTurnRingRef.current = () => {
		const combat = useCombatStore.getState();
		const vtt = useVTTStore.getState();
		let tokenVis = "gm";
		if (!vtt.isGM) {
			tokenVis = "";
			for (const token of vtt.tokens) {
				tokenVis += `${token.id}:${token.layer}:${token.isHidden ? 1 : 0}|`;
			}
		}
		const turnExists = combat.turnId
			? combat.combatants.some((c) => c.id === combat.turnId)
			: false;
		const sig = `${combat.status}:${combat.round ?? ""}:${combat.turnId ?? ""}:${turnExists ? 1 : 0}:${tokenVis}`;
		const node = turnRingRef.current;
		const paintedId = turnRingTokenRef.current;
		const hostNow = paintedId
			? tokenDisplayObjectsRef.current.get(paintedId)
			: null;
		const attached = Boolean(node && hostNow && node.parent === hostNow);
		if (sig === turnRingSigRef.current && attached) return;

		if (node) {
			node.parent?.removeChild(node);
			node.destroy();
			turnRingRef.current = null;
			turnRingTokenRef.current = null;
		}
		turnRingSigRef.current = sig;
		const id = currentTurnRingTokenId();
		if (!id) return;
		const host = tokenDisplayObjectsRef.current.get(id);
		const token = vtt.tokens.find((item) => item.id === id);
		const grid = sceneRef.current?.gridSize || 70;
		if (!host || !token) return;
		const baseRadius = (token.sizeCells * grid) / 2;
		const tScale = Math.min(1, baseRadius / 35);
		const radius = baseRadius + 6 * tScale;
		const ring = new Graphics();
		ring.label = "turn-ring";
		ring.eventMode = "none";
		ring.circle(0, 0, radius);
		// Cor lida de --primary. O número só entra se a variável não existir.
		ring.stroke({
			width: 3 * tScale,
			color: cssVarColor("--primary", 0x6d28d9),
			alpha: 1,
		});
		host.addChild(ring);
		turnRingRef.current = ring;
		turnRingTokenRef.current = id;
	};

	// Interaction refs
	const isDraggingViewportRef = useRef(false);
	const viewportDragStartRef = useRef({ x: 0, y: 0 });
	const isSpaceHeldRef = useRef(false);
	const isAltHeldRef = useRef(false);
	const templateStartRef = useRef<{ x: number; y: number } | null>(null);
	const lastTokenTapRef = useRef<{ id: string; time: number } | null>(null);
	// Press that started on a token; shields it from the empty-area deselect
	// on the same DOM event and decides tap vs. drag when it ends.
	const tokenPressRef = useRef<TokenPress | null>(null);
	// Toque longo num token com status: Tooltip com a lista inteira (celular).
	const statusLongPressRef = useRef(
		createStatusLongPress((tokenId) => {
			const s = useVTTStore.getState();
			if (!s.draggedTokenId) s.setHoveredStatusTokenId(tokenId);
		}),
	);
	// Set when a touch tap opens the token panel, so the click the browser
	// synthesizes after that tap cannot land on the panel that just appeared.
	const swallowTapClickRef = useRef(false);

	// Fog Drawing refs
	const fogStrokeStartRef = useRef<{ x: number; y: number } | null>(null);
	const fogCurrentPointsRef = useRef<{ x: number; y: number }[]>([]);

	// Token Dragging refs
	const draggingTokenIdRef = useRef<string | null>(null);
	// A press on a token only becomes a drag once it leaves the tap slop
	// (TOKEN_TAP_SLOP_PX, tracked by tokenPressRef), so taps and double-taps
	// that open the token menu never nudge the token.
	const pendingTokenDragRef = useRef<{
		id: string;
		grabX: number;
		grabY: number;
		additive: boolean;
		members: { id: string; x: number; y: number }[];
	} | null>(null);
	const dragGroupRef = useRef<{
		grabX: number;
		grabY: number;
		members: { id: string; x: number; y: number }[];
	} | null>(null);
	const marqueeRef = useRef<{
		startX: number;
		startY: number;
		additive: boolean;
		moved: boolean;
	} | null>(null);
	const marqueeElRef = useRef<HTMLDivElement | null>(null);
	const rightPressRef = useRef<RightPress | null>(null);
	const characterOwnersRef = useRef(characterOwners);
	characterOwnersRef.current = characterOwners;
	const onBroadcastRulerRef = useRef(onBroadcastRuler);
	onBroadcastRulerRef.current = onBroadcastRuler;
	// Régua: aperto em andamento (clique vs. arrasto) e o último clique (duplo).
	const rulerPressRef = useRef<{
		x: number;
		y: number;
		moved: boolean;
		fresh: boolean;
	} | null>(null);
	const lastRulerClickRef = useRef<{ x: number; y: number; t: number } | null>(
		null,
	);
	const userIdRef = useRef(user?.id);
	userIdRef.current = user?.id;
	const userNameRef = useRef("Você");
	userNameRef.current = tableUserName(user);
	const onRemoveTemplatesRef = useRef(onRemoveTemplates);
	onRemoveTemplatesRef.current = onRemoveTemplates;
	const authorNameRef = useRef<string | null>(null);
	authorNameRef.current =
		user?.user_metadata?.full_name || user?.email?.split("@")[0] || null;
	const lastBroadcastTimeRef = useRef(0);
	const lastCursorBroadcastRef = useRef(0);

	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const activeTool = useVTTStore((s) => s.activeTool);
	const activeLayer = useVTTStore((s) => s.activeLayer);
	const tokens = useVTTStore((s) => s.tokens);
	const linkedCharacterIds = tokens
		.map((token) => token.characterId)
		.filter((id): id is string => Boolean(id))
		.join("|");
	const linkedSheetHp = useRPGStore((s) =>
		selectLinkedSheetHpStamp(s.characters, linkedCharacterIds),
	);
	const selectedTokenIds = useVTTStore((s) => s.selectedTokenIds);
	const setSelectedTokenIds = useVTTStore((s) => s.setSelectedTokenIds);
	const setActiveTokenIdForMenu = useVTTStore((s) => s.setActiveTokenIdForMenu);
	const updateToken = useVTTStore((s) => s.updateToken);
	const setActiveMeasurement = useVTTStore((s) => s.setActiveMeasurement);
	const setDraggedTokenIds = useVTTStore((s) => s.setDraggedTokenIds);
	const toggleSelectTokenId = useVTTStore((s) => s.toggleSelectTokenId);
	const fogPaths = useVTTStore((s) => s.fogPaths);
	const addFogPath = useVTTStore((s) => s.addFogPath);
	const activeFogTool = useVTTStore((s) => s.activeFogTool);
	const activeFogMode = useVTTStore((s) => s.activeFogMode);
	const fogBrushRadius = useVTTStore((s) => s.fogBrushRadius);
	const remoteMeasurements = useVTTStore((s) => s.remoteMeasurements);
	const userColor = useVTTStore((s) => s.userColor);
	const isGM = useVTTStore((s) => s.isGM);
	const canManageTokens = useVTTStore((s) => s.isGM || s.isCoGM);
	// Position and the remote target stay out of this key so a drag does not
	// destroy and recreate the sprite on every pointer move.
	const tokenAppearance = useMemo(() => tokensAppearanceKey(tokens), [tokens]);
	// Visão dos jogadores: o alcance vem da ficha (se definido) e as paredes
	// bloqueiam. A lista só é lida pelos efeitos via ref; o que dispara refazer a
	// névoa é a assinatura (visionSig), não qualquer token da mesa se mexer.
	const walls = useVTTStore((s) => s.walls);
	// Só o que bloqueia agora: parede e porta fechada. Porta aberta deixa ver e passar.
	const blockers = useMemo(() => blockingWalls(walls), [walls]);
	// Luz padrão da cena e áreas de luz: o alcance de cada personagem depende da
	// luz do lugar onde ele está (dia, penumbra ou escuro).
	const sceneLight = toLightLevel(scene?.lightLevel);
	const lightZones = useVTTStore((s) => s.lightZones);
	const sheetVisionStamp = useRPGStore((s) =>
		selectLinkedVisionStamp(s.characters, linkedCharacterIds),
	);
	const sheetVision = useMemo(
		() => parseVisionStamp(sheetVisionStamp),
		[sheetVisionStamp],
	);
	const visionCell = scene?.gridSize || 70;
	// A visão só muda quando o movimento TERMINA: enquanto o token é arrastado, a
	// visão fica onde ele estava antes (arrastar sem soltar não revela o mapa).
	const draggedForVision = useVTTStore((s) => s.draggedTokenIds);
	const standingRef = useRef<Map<string, { x: number; y: number }>>(new Map());
	const visionList = useMemo(() => {
		const standing = freezeDragged(
			tokens,
			new Set(draggedForVision),
			standingRef.current,
		);
		standingRef.current = standing;
		return visionSources(
			tokens,
			visionCell,
			(token) => {
				// A luz é a do lugar onde o token está para a visão (parado, não a
				// meio do arrasto).
				const at = standing.get(token.id) ?? token;
				return resolveTokenVisionCells(
					token,
					sheetVision,
					lightAt({ x: at.x, y: at.y }, lightZones, sceneLight),
				);
			},
			(token) => standing.get(token.id) ?? token,
		);
	}, [
		tokens,
		visionCell,
		sheetVision,
		sceneLight,
		lightZones,
		draggedForVision,
	]);
	const visionListRef = useRef(visionList);
	visionListRef.current = visionList;
	const wallsRef = useRef(blockers);
	wallsRef.current = blockers;
	const tokenVisibility = useMemo(
		() =>
			visibleTokenIds(tokens, isGM, scene, {
				sources: visionList,
				walls: blockers,
			}),
		[tokens, isGM, scene, visionList, blockers],
	);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const activeTemplateKind = useVTTStore((s) => s.activeTemplateKind);
	const previewTemplate = useVTTStore((s) => s.previewTemplate);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const remoteTemplates = useVTTStore((s) => s.remoteTemplates);
	const remoteTemplatePreviews = useVTTStore((s) => s.remoteTemplatePreviews);
	const selectedTemplateId = useVTTStore((s) => s.selectedTemplateId);
	const setPreviewTemplate = useVTTStore((s) => s.setPreviewTemplate);
	const addPlacedTemplate = useVTTStore((s) => s.addPlacedTemplate);
	const selectedWallIds = useVTTStore((s) => s.selectedWallIds);
	const wallDraft = useVTTStore((s) => s.wallDraft);

	// 1. Initialize PixiJS Application
	useEffect(() => {
		if (!containerRef.current) return;

		let isMounted = true;
		const app = new Application();
		let tickerCallback: (() => void) | null = null;
		let stopPingLoop: (() => void) | null = null;
		let stopRemoteCursors: (() => void) | null = null;

		async function initPixi() {
			if (!containerRef.current) return;

			await app.init({
				resizeTo: containerRef.current,
				backgroundAlpha: 0,
				antialias: true,
				resolution: window.devicePixelRatio || 1,
				autoDensity: true,
			});

			if (!isMounted) {
				app.destroy(true, { children: true });
				return;
			}

			appRef.current = app;
			containerRef.current.appendChild(app.canvas);

			// Setup hierarchical containers
			const world = new Container();
			worldContainerRef.current = world;
			app.stage.addChild(world);

			const mapLayer = new Container();
			mapLayerRef.current = mapLayer;
			world.addChild(mapLayer);

			const aurasLayer = new Graphics();
			aurasLayerRef.current = aurasLayer;
			world.addChild(aurasLayer);

			const gridLayer = new Graphics();
			gridLayerRef.current = gridLayer;
			world.addChild(gridLayer);

			// Portas: objeto do mapa que todo mundo vê, abaixo dos tokens e da névoa.
			const doorsLayer = new Graphics();
			doorsLayer.eventMode = "none";
			doorsLayerRef.current = doorsLayer;
			world.addChild(doorsLayer);

			const tokensLayer = new Container();
			tokensLayerRef.current = tokensLayer;
			world.addChild(tokensLayer);

			const gmTokensLayer = new Container();
			gmTokensLayerRef.current = gmTokensLayer;
			world.addChild(gmTokensLayer);

			// Exploration Penumbra overlay (intermediate layer for visited regions)
			const fogExplorationLayer = new Graphics();
			fogExplorationLayerRef.current = fogExplorationLayer;
			world.addChild(fogExplorationLayer);

			// Véu da névoa: a textura é pintada à parte, para o revelar não furar o mapa.
			const fogOfWarLayer = new Container();
			const fogSprite = new Sprite(Texture.EMPTY);
			fogSpriteRef.current = fogSprite;
			fogOfWarLayer.addChild(fogSprite);
			fogOfWarLayerRef.current = fogOfWarLayer;
			world.addChild(fogOfWarLayer);

			// Ícones das portas ACIMA da névoa (mestre e modo Exploração): em cima da
			// parede, que é a borda da visão, o ícone abaixo da névoa saía cortado.
			const doorIconsTop = new Graphics();
			doorIconsTop.eventMode = "none";
			doorIconsTopRef.current = doorIconsTop;
			world.addChild(doorIconsTop);

			// Só o mestre: realce do que os jogadores já exploraram e da visão atual.
			// Fica ACIMA do véu do mestre (senão o véu apaga o realce); a opacidade é
			// baixa para os tokens continuarem legíveis por baixo.
			const gmExploredLayer = new Graphics();
			gmExploredLayer.eventMode = "none";
			gmExploredLayerRef.current = gmExploredLayer;
			world.addChild(gmExploredLayer);

			// Fantasma do token arrastado (acima da névoa).
			const dragGhostLayer = new Container();
			dragGhostLayer.eventMode = "none";
			dragGhostLayerRef.current = dragGhostLayer;
			world.addChild(dragGhostLayer);

			// Máscara da visão (recorta a névoa opaca). Fica no mundo para herdar zoom
			// e pan, mas não desenha nada por si só.
			const visionMask = new Graphics();
			visionMaskRef.current = visionMask;
			world.addChild(visionMask);

			// Máscara da penumbra: só o que se enxerga AGORA (a da névoa também leva o
			// que já foi explorado). Recortar com cut() quebrava quando as visões de
			// dois personagens se sobrepunham.
			const penumbraMask = new Graphics();
			penumbraMaskRef.current = penumbraMask;
			world.addChild(penumbraMask);

			const fogBrushPreviewLayer = new Graphics();
			fogBrushPreviewLayerRef.current = fogBrushPreviewLayer;
			world.addChild(fogBrushPreviewLayer);

			// Paredes por cima da névoa: o mestre as vê mesmo em área escondida.
			const wallsLayer = new Graphics();
			wallsLayerRef.current = wallsLayer;
			world.addChild(wallsLayer);

			const wallPreviewLayer = new Graphics();
			wallPreviewLayerRef.current = wallPreviewLayer;
			world.addChild(wallPreviewLayer);

			// Áreas de luz (só o mestre as vê) e a prévia do desenho de uma nova.
			const lightZonesLayer = new Graphics();
			lightZonesLayer.eventMode = "none";
			lightZonesLayerRef.current = lightZonesLayer;
			world.addChild(lightZonesLayer);

			const lightPreviewLayer = new Graphics();
			lightPreviewLayer.eventMode = "none";
			lightPreviewLayerRef.current = lightPreviewLayer;
			world.addChild(lightPreviewLayer);

			const templatesLayer = new Graphics();
			templatesLayerRef.current = templatesLayer;
			world.addChild(templatesLayer);

			const templateLabels = new Container();
			templateLabelsRef.current = templateLabels;
			world.addChild(templateLabels);

			const moveTrailLayer = new Graphics();
			moveTrailLayerRef.current = moveTrailLayer;
			world.addChild(moveTrailLayer);

			const moveTrailLabels = new Container();
			moveTrailLabelsRef.current = moveTrailLabels;
			world.addChild(moveTrailLabels);

			const remoteRulersLayer = new Graphics();
			remoteRulersLayerRef.current = remoteRulersLayer;
			world.addChild(remoteRulersLayer);

			const remoteRulersLabels = new Container();
			remoteRulersLabelsRef.current = remoteRulersLabels;
			world.addChild(remoteRulersLabels);

			const measurementLayer = new Graphics();
			measurementLayerRef.current = measurementLayer;
			world.addChild(measurementLayer);

			const measurementLabels = new Container();
			measurementLabelsRef.current = measurementLabels;
			world.addChild(measurementLabels);

			const pingsLayer = new Graphics();
			pingsLayerRef.current = pingsLayer;
			world.addChild(pingsLayer);

			// O callback entra no ticker do Pixi só enquanto houver ping e sai
			// quando a lista esvazia. O frame lê o store, sem re-render do React.
			// Fica neste init porque o app WebGL ainda não existe no render.
			const pingLoop = createPingAnimationLoop({
				now: () => Date.now(),
				getPings: () => useVTTStore.getState().activePings,
				removeIds: (ids) => {
					const { removePing } = useVTTStore.getState();
					for (const id of ids) removePing(id);
				},
				draw: (pings, now) => {
					paintPings(pingsLayer, pings, now);
				},
				clear: () => {
					pingsLayer.clear();
				},
				addTicker: (tick) => {
					app.ticker.add(tick);
				},
				removeTicker: (tick) => {
					app.ticker.remove(tick);
				},
				onStats: publishPingLoopStats,
			});
			const unsubscribePings = useVTTStore.subscribe((state, previous) => {
				if (state.activePings !== previous.activePings) pingLoop.sync();
			});
			pingLoop.sync();
			stopPingLoop = () => {
				unsubscribePings();
				pingLoop.stop();
			};

			const remoteCursorsLayer = new Container();
			remoteCursorsLayerRef.current = remoteCursorsLayer;
			world.addChild(remoteCursorsLayer);
			// Cursores dos outros: desenho e suavizado em `remote-cursor-layer.ts`.
			stopRemoteCursors = attachRemoteCursors(remoteCursorsLayer, app.ticker);

			// Initial viewport position
			const initVp = useVTTStore.getState().viewport;
			world.position.set(initVp.x, initVp.y);
			world.scale.set(initVp.scale);

			// 60FPS pose. The pointer owns a dragged token. A remote target eases.
			// Anything else sits on x/y. Rebuilding the sprite here is what made
			// the token jump back and forth.
			tickerCallback = () => {
				const state = useVTTStore.getState();
				let moved = false;

				for (const t of state.tokens) {
					const displayObj = tokenDisplayObjectsRef.current.get(t.id);
					if (!displayObj) continue;
					const pose = tokenPose(
						t,
						state.draggedTokenId,
						state.draggedTokenIds,
					);
					if (pose.mode === "drag") continue;
					if (pose.mode === "place") {
						if (displayObj.x !== pose.x || displayObj.y !== pose.y) {
							displayObj.position.set(pose.x, pose.y);
							moved = true;
						}
						continue;
					}
					const dx = pose.x - displayObj.x;
					const dy = pose.y - displayObj.y;
					if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
						displayObj.x += dx * 0.35;
						displayObj.y += dy * 0.35;
						moved = true;
					} else if (displayObj.x !== pose.x || displayObj.y !== pose.y) {
						displayObj.position.set(pose.x, pose.y);
						moved = true;
					}
				}
				if (moved) paintAurasRef.current();
			};

			app.ticker.add(tickerCallback);
			setRendererReady(true);
		}

		void initPixi();

		return () => {
			isMounted = false;
			stopPingLoop?.();
			stopPingLoop = null;
			stopRemoteCursors?.();
			stopRemoteCursors = null;
			if (appRef.current) {
				if (tickerCallback) {
					appRef.current.ticker.remove(tickerCallback);
				}
				appRef.current.destroy(true, { children: true });
				fogTextureRef.current?.destroy(true);
				fogTextureRef.current = null;
				clearStatusIconTextures();
				appRef.current = null;
			}
		};
	}, []);

	// 2. Sync Viewport transformations to PixiJS world container
	useEffect(() => {
		if (!rendererReady) return;
		if (!worldContainerRef.current) return;
		worldContainerRef.current.position.set(viewport.x, viewport.y);
		worldContainerRef.current.scale.set(viewport.scale);
	}, [viewport.x, viewport.y, viewport.scale, rendererReady]);

	// Só os campos que desenham mapa e grid: mexer em nome, névoa ou ordem da
	// cena não redesenha o grid (e arrastar a célula redesenha só o grid).
	const sceneMapImageUrl = scene?.mapImageUrl;
	const sceneGridType = scene?.gridType;
	const sceneGridSize = scene?.gridSize;
	const sceneGridColor = scene?.gridColor;
	const sceneGridOpacity = scene?.gridOpacity;
	const sceneGridOffsetX = scene?.gridOffsetX ?? 0;
	const sceneGridOffsetY = scene?.gridOffsetY ?? 0;
	const sceneWidth = scene?.width;
	const sceneHeight = scene?.height;
	const sceneMapScale = scene?.mapScale ?? 1;
	// 3a. Mapa (imagem ou fundo): só quando a imagem, o tamanho ou a escala mudam.
	// sceneMapScale entra nas deps de propósito: o grafo Pixi (Sprite/Graphics no
	// mapLayer) é estado imperativo fora do React. Sem este efeito, mudar a escala
	// na store não redimensiona o sprite nem o fundo — não há "derived state" a
	// sincronizar entre hooks, e sim um side-effect no scene graph externo.
	useEffect(() => {
		if (!rendererReady) return;
		const mapLayer = mapLayerRef.current;
		if (!appRef.current || !mapLayer) return;
		let cancelled = false;
		mapLayer.removeChildren();
		if (sceneWidth === undefined || sceneHeight === undefined) return;
		const drawWidth = sceneWidth * sceneMapScale;
		const drawHeight = sceneHeight * sceneMapScale;

		// Render Map Background Image if present
		if (sceneMapImageUrl) {
			Assets.load(sceneMapImageUrl)
				.then((texture) => {
					if (cancelled || mapLayer.destroyed) return;
					mapLayer.removeChildren();
					const sprite = new Sprite(texture);
					sprite.width = drawWidth;
					sprite.height = drawHeight;
					mapLayer.addChild(sprite);
				})
				.catch((err) => {
					console.warn("Falha ao carregar textura do mapa VTT:", err);
				});
		} else {
			const bg = new Graphics();
			bg.rect(0, 0, drawWidth, drawHeight);
			const palette = document.createElement("canvas").getContext("2d");
			if (palette && containerRef.current) {
				palette.fillStyle = getComputedStyle(containerRef.current).color;
				palette.fillRect(0, 0, 1, 1);
				const [r, g, b] = palette.getImageData(0, 0, 1, 1).data;
				bg.fill({ color: (r << 16) | (g << 8) | b, alpha: 0.04 });
			}
			mapLayer.addChild(bg);
		}

		return () => {
			cancelled = true;
		};
	}, [sceneMapImageUrl, sceneWidth, sceneHeight, sceneMapScale, rendererReady]);

	// 3b. Grid procedural: redesenha só quando célula, offset, tipo, cor,
	// opacidade ou escala mudam. Arrastar a célula/offset não recarrega o mapa.
	// Mesma justificativa Pixi: Graphics do gridLayer é externo ao React; a escala
	// altera o retângulo do grid (width/height * mapScale).
	useEffect(() => {
		if (!rendererReady) return;
		const grid = gridLayerRef.current;
		if (!appRef.current || !grid) return;
		grid.clear();
		if (
			sceneGridType === undefined ||
			sceneGridSize === undefined ||
			sceneGridColor === undefined ||
			sceneGridOpacity === undefined ||
			sceneWidth === undefined ||
			sceneHeight === undefined
		)
			return;

		const drawWidth = sceneWidth * sceneMapScale;
		const drawHeight = sceneHeight * sceneMapScale;

		// Draw Procedural Grid
		if (sceneGridType === "none" || sceneGridSize <= 0 || sceneGridOpacity <= 0)
			return;

		const colorHex = parseHexColor(sceneGridColor, 0xffffff);

		const gridOrigin = { x: sceneGridOffsetX, y: sceneGridOffsetY };
		if (sceneGridType === "square") {
			const lines = squareGridLines(
				drawWidth,
				drawHeight,
				sceneGridSize,
				gridOrigin,
			);
			grid.beginPath();
			for (const x of lines.xs) {
				grid.moveTo(x, 0);
				grid.lineTo(x, drawHeight);
			}
			for (const y of lines.ys) {
				grid.moveTo(0, y);
				grid.lineTo(drawWidth, y);
			}
			grid.stroke({ width: 1, color: colorHex, alpha: sceneGridOpacity });
		} else if (sceneGridType === "hex_pointy") {
			const r = sceneGridSize / 2;
			grid.beginPath();
			for (const center of pointyHexCenters(
				drawWidth,
				drawHeight,
				sceneGridSize,
				gridOrigin,
			)) {
				const corners = getPointyHexCorners(center.x, center.y, r);
				grid.moveTo(corners[0].x, corners[0].y);
				for (let i = 1; i < 6; i++) {
					grid.lineTo(corners[i].x, corners[i].y);
				}
				grid.closePath();
			}
			grid.stroke({ width: 1, color: colorHex, alpha: sceneGridOpacity });
		} else if (sceneGridType === "hex_flat") {
			const r = sceneGridSize / 2;
			grid.beginPath();
			for (const center of flatHexCenters(
				drawWidth,
				drawHeight,
				sceneGridSize,
				gridOrigin,
			)) {
				const corners = getFlatHexCorners(center.x, center.y, r);
				grid.moveTo(corners[0].x, corners[0].y);
				for (let i = 1; i < 6; i++) {
					grid.lineTo(corners[i].x, corners[i].y);
				}
				grid.closePath();
			}
			grid.stroke({ width: 1, color: colorHex, alpha: sceneGridOpacity });
		}
	}, [
		sceneGridType,
		sceneGridSize,
		sceneGridColor,
		sceneGridOpacity,
		sceneGridOffsetX,
		sceneGridOffsetY,
		sceneWidth,
		sceneHeight,
		sceneMapScale,
		rendererReady,
	]);

	// 4. Render Tokens and Auras on the Stage (with exploration visibility & layer isolation)
	// tokenAppearance e tokenVisibility são a chave de redesenho. x/y e o alvo
	// remoto ficam de fora: incluí-los destruía o sprite a cada movimento e o
	// ticker puxava o token de volta para o outro lado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a chave acima é a dependência; o efeito lê os tokens na hora pelo store.
	useEffect(() => {
		if (!rendererReady) return;
		if (
			!tokensLayerRef.current ||
			!gmTokensLayerRef.current ||
			!aurasLayerRef.current ||
			!scene
		)
			return;

		const tokensLayer = tokensLayerRef.current;
		const gmTokensLayer = gmTokensLayerRef.current;
		// Latest list. x/y updates do not rerun this effect, so the tokens
		// closed over from render would be from the last time the drawing changed.
		const liveTokens = useVTTStore.getState().tokens;

		tokensLayer.removeChildren();
		gmTokensLayer.removeChildren();
		tokenDisplayObjectsRef.current.clear();

		const gridSize = scene.gridSize || 70;
		const foreground = cssVarColor("--foreground", 0xfafafa);
		const hpFill = cssVarColor("--primary", foreground);
		// Celular/toque: 1 ícone de status maior + "+N" (lido por render, não
		// por frame).
		const compactStatus =
			typeof window !== "undefined" &&
			window.matchMedia?.("(max-width: 639px), (pointer: coarse)").matches ===
				true;

		for (const token of liveTokens) {
			// Security filter: GM layer tokens are NEVER added to player view
			if (token.layer === "gm" && !isGM) continue;
			if (token.isHidden && !isGM) continue;

			// Exploration Mode Line-of-Sight check for Players:
			// If fog and exploration are active, NPCs / monsters outside active player vision radius are hidden
			if (!isGM && scene.fogEnabled && scene.fogExploration) {
				const isPlayerControlled =
					token.characterId ||
					(token.controlledBy && token.controlledBy.length > 0);
				if (!isPlayerControlled) {
					// Monstro só aparece se alguém que enxerga o vê: no alcance e sem parede no meio.
					const isInActiveVision = isSeenByAny(
						{ x: token.x, y: token.y },
						visionListRef.current,
						wallsRef.current,
					);

					if (!isInActiveVision) {
						continue; // Hide enemy/monster in explored penumbra
					}
				}
			}

			const isGMLayer = token.layer === "gm";
			const tokenRadius = (token.sizeCells * gridSize) / 2;
			const tokenScale = Math.max(0.15, Math.min(1, tokenRadius / 38));
			const isSelected = selectedTokenIds.includes(token.id);
			const status = summarizeConditions(token.conditions);
			const hasStatusRow = status.visible.length > 0;
			const disc = scaledStatusDiscMetrics(tokenRadius, compactStatus);

			// 4.2 Token Container
			const tokenContainer = new Container();
			tokenContainer.position.set(token.x, token.y);
			tokenContainer.eventMode = "static";
			const canControl = canControlVTTToken(
				token,
				user?.id,
				canManageTokens,
				characterOwners,
			);
			tokenContainer.cursor =
				token.isLocked || !canControl ? "default" : "grab";
			tokenContainer.alpha = isGMLayer ? 0.55 : token.isHidden ? 0.5 : 1;

			// Register in display objects map for zero-thrash GPU interpolation
			tokenDisplayObjectsRef.current.set(token.id, tokenContainer);

			// Base circular background
			const bg = new Graphics();
			bg.circle(0, 0, tokenRadius);
			bg.fill({ color: isGMLayer ? 0x2e1065 : 0x18181b });
			tokenContainer.addChild(bg);

			// Load avatar image or initials placeholder
			if (token.avatarUrl) {
				Assets.load(token.avatarUrl)
					.then((tex) => {
						const sprite = new Sprite(tex);
						sprite.anchor.set(0.5);
						sprite.width = tokenRadius * 2;
						sprite.height = tokenRadius * 2;

						const mask = new Graphics();
						mask.circle(0, 0, Math.max(1, tokenRadius - 1 * tokenScale));
						mask.fill({ color: 0xffffff });
						sprite.mask = mask;

						tokenContainer.addChildAt(mask, 1);
						tokenContainer.addChildAt(sprite, 2);
					})
					.catch(() => {
						const initials = token.name.slice(0, 2).toUpperCase();
						const text = new Text({
							text: initials,
							resolution: 4,
							style: new TextStyle({
								fontFamily: "system-ui, sans-serif",
								fontSize: Math.max(4, tokenRadius * 0.7),
								fontWeight: "bold",
								fill: "#ffffff",
							}),
						});
						text.anchor.set(0.5);
						tokenContainer.addChild(text);
					});
			} else {
				const initials = token.name.slice(0, 2).toUpperCase();
				const text = new Text({
					text: initials,
					resolution: 4,
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: Math.max(4, tokenRadius * 0.7),
						fontWeight: "bold",
						fill: isGMLayer ? "#c084fc" : "#a855f7",
					}),
				});
				text.anchor.set(0.5);
				tokenContainer.addChild(text);
			}

			// Border Ring
			// Seleção > status (2px na cor do 1º status) > anel padrão.
			const ring = new Graphics();
			const ringStyle = tokenRingStyle(token.conditions, isSelected, isGMLayer);
			ring.circle(0, 0, tokenRadius);
			ring.stroke({
				width: ringStyle.width * tokenScale,
				color: ringStyle.color,
			});
			tokenContainer.addChild(ring);

			// Seta de direção: para onde o personagem olha (o cone de visão aponta
			// para lá). Só aparece com a névoa de exploração ligada.
			if (scene.fogEnabled && scene.fogExploration && isVisionToken(token)) {
				const arrow = new Graphics();
				const tip = tokenRadius + 9 * tokenScale;
				const base = tokenRadius + 1.5 * tokenScale;
				const half = 5 * tokenScale;
				arrow.poly([0, -tip, -half, -base, half, -base]);
				arrow.fill({ color: ringStyle.color, alpha: 0.9 });
				arrow.rotation = ((token.rotation || 0) * Math.PI) / 180;
				tokenContainer.addChild(arrow);
			}

			// Disco/anel de efeitos ao redor do token (vazado no centro para nunca
			// cobrir o retrato do personagem, escalando proporcionalmente ao tokenRadius).
			if (hasStatusRow) {
				const ringTex = statusRingTexture(status.visible);
				if (ringTex !== Texture.EMPTY) {
					const ringSprite = new Sprite(ringTex);
					ringSprite.anchor.set(0.5);
					const spriteDiameter = tokenRadius * STATUS_RING_SPRITE_FACTOR * 2;
					ringSprite.width = spriteDiameter;
					ringSprite.height = spriteDiameter;
					tokenContainer.addChild(ringSprite);
				}
			}

			// Selection outer pulse ring (drawn outside the status ring when present)
			if (isSelected) {
				const outerGlow = new Graphics();
				const glowRadius =
					(hasStatusRow ? disc.ringOuterRadius : tokenRadius) + 3 * tokenScale;
				outerGlow.circle(0, 0, glowRadius);
				outerGlow.stroke({
					width: 1.5 * tokenScale,
					color: 0x38bdf8,
					alpha: 0.65,
				});
				tokenContainer.addChild(outerGlow);
			}

			// GM Shield Badge
			if (isGMLayer) {
				const gmBadge = new Graphics();
				gmBadge.circle(tokenRadius * 0.65, -tokenRadius * 0.65, 8 * tokenScale);
				gmBadge.fill({ color: 0x581c87 });
				gmBadge.stroke({ width: 1.5 * tokenScale, color: 0xc084fc });
				tokenContainer.addChild(gmBadge);

				const gmText = new Text({
					text: "GM",
					resolution: 4,
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: 8 * tokenScale,
						fontWeight: "bold",
						fill: "#ffffff",
					}),
				});
				gmText.anchor.set(0.5);
				gmText.position.set(tokenRadius * 0.65, -tokenRadius * 0.65);
				tokenContainer.addChild(gmText);
			}

			// HP Bar (Above token / status ring). Ficha ligada: PV vem do carimbo da ficha, não de hp_*.
			const linkedHp = readLinkedSheetHp(linkedSheetHp, token.characterId);
			const hp = resolveTokenHp({
				tokenHpCurrent: token.hpCurrent,
				tokenHpMax: token.hpMax,
				sheetHealth: linkedHp?.health,
				sheetHealthMax: linkedHp?.healthMax,
			});
			if (hp.max > 0 && !isGMLayer) {
				const currentHp = Math.max(0, hp.current);
				const maxHp = Math.max(1, hp.max);
				const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));

				const barWidth = tokenRadius * 1.65;
				const barHeight = Math.max(1.2, 5.5 * tokenScale);
				const topEdge = hasStatusRow ? disc.ringOuterRadius : tokenRadius;
				const barY = -topEdge - barHeight - 4 * tokenScale;
				const barCorner = 2.5 * tokenScale;

				const hpBar = new Graphics();
				hpBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, barCorner);
				hpBar.fill({ color: 0x000000, alpha: 0.8 });

				if (hpRatio > 0) {
					hpBar.roundRect(
						-barWidth / 2,
						barY,
						Math.max(2 * tokenScale, barWidth * hpRatio),
						barHeight,
						barCorner,
					);
					hpBar.fill({ color: hpFill });
				}

				const tokenTempHp = token.tempHp ?? 0;
				if (tokenTempHp > 0) {
					const tempRatio = Math.min(1, tokenTempHp / maxHp);
					const currentWidth = Math.max(0, barWidth * hpRatio);
					hpBar.roundRect(
						-barWidth / 2 + currentWidth,
						barY,
						Math.max(
							2 * tokenScale,
							Math.min(barWidth - currentWidth, barWidth * tempRatio),
						),
						barHeight,
						barCorner,
					);
					hpBar.fill({ color: 0x22d3ee });
				}

				hpBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, barCorner);
				hpBar.stroke({ width: 1 * tokenScale, color: 0xffffff, alpha: 0.3 });

				tokenContainer.addChild(hpBar);
			}

			// Elevation Badge
			if (token.elevation && token.elevation !== 0) {
				const elevText = new Text({
					text: `↑ ${token.elevation}m`,
					resolution: 4,
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: Math.max(3, 9 * tokenScale),
						fontWeight: "bold",
						fill: "#38bdf8",
						dropShadow: {
							alpha: 0.8,
							angle: Math.PI / 6,
							blur: 2 * tokenScale,
							color: "#000000",
							distance: 1 * tokenScale,
						},
					}),
				});
				elevText.anchor.set(0.5);
				const bottomEdge = hasStatusRow ? disc.ringOuterRadius : tokenRadius;
				elevText.position.set(0, bottomEdge + 8 * tokenScale);
				tokenContainer.addChild(elevText);
			}

			// Tooltip do DS com os status (DOM, fora do canvas): só marca qual
			// token está sob o ponteiro; nada no ticker.
			if (hasStatusRow) {
				// Hover só com mouse; no toque a lista vem no toque longo.
				tokenContainer.on("pointerover", (e) => {
					if (e.pointerType !== "mouse") return;
					if (useVTTStore.getState().draggedTokenId) return;
					useVTTStore.getState().setHoveredStatusTokenId(token.id);
				});
				tokenContainer.on("pointerout", () => {
					const s = useVTTStore.getState();
					if (s.hoveredStatusTokenId === token.id)
						s.setHoveredStatusTokenId(null);
				});
			}

			// Token Pointer Events (Drag & Selection with Strict Layer Isolation)
			tokenContainer.on("pointerdown", (e) => {
				// Qualquer jogador que vê o token pode ver os status dele.
				if (hasStatusRow && e.pointerType !== "mouse") {
					statusLongPressRef.current.start(token.id, e.clientX, e.clientY);
				}
				if (!canControl) return;
				if (e.button === 2) {
					e.stopPropagation();
					rightPressRef.current = beginRightPress(
						e.clientX,
						e.clientY,
						token.id,
					);
					return;
				}

				const live = useVTTStore.getState();
				if (
					e.button === 0 &&
					!isSpaceHeldRef.current &&
					!isAltHeldRef.current &&
					live.activeTool === "select"
				) {
					// Strict Layer Isolation:
					// 1. Map Layer: Tokens cannot be selected/dragged
					if (live.activeLayer === "map") return;
					// 2. GM Layer: Only GM tokens can be selected
					if (live.activeLayer === "gm" && !isGMLayer) return;
					// 3. Token Layer: GM tokens cannot be selected
					if (live.activeLayer === "token" && isGMLayer) return;

					e.stopPropagation();
					const additive = isAdditiveSelect(e);
					tokenPressRef.current = beginTokenPress(
						token.id,
						e,
						e.nativeEvent instanceof Event ? e.nativeEvent : null,
					);
					const current = useVTTStore.getState();
					// A token already in the selection keeps the rest, so the
					// group can move together. Shift/Ctrl/Command adds on release.
					if (!additive && !current.selectedTokenIds.includes(token.id)) {
						setSelectedTokenIds([token.id]);
					}
					const openMenuId = current.activeTokenIdForMenu;
					if (!additive && openMenuId && openMenuId !== token.id) {
						setActiveTokenIdForMenu(null);
					}

					const now = Date.now();
					if (
						!additive &&
						isDoublePress(lastTokenTapRef.current, token.id, now)
					) {
						// Mouse: duplo clique abre a Ficha na mesa. Toque: segue
						// abrindo o menu do token (que tem o botão da ficha), já que
						// no celular não há clique direito.
						if (e.pointerType === "mouse") {
							setActiveTokenIdForMenu(null);
							useVTTStore.getState().setShowCharacterSheetId(token.id);
						} else {
							setActiveTokenIdForMenu(token.id);
						}
						lastTokenTapRef.current = null;
						pendingTokenDragRef.current = null;
						return;
					}
					if (!additive) lastTokenTapRef.current = { id: token.id, time: now };

					if (!token.isLocked) {
						const rect = containerRef.current?.getBoundingClientRect();
						if (rect) {
							const vp = useVTTStore.getState().viewport;
							const clientX = e.clientX - rect.left;
							const clientY = e.clientY - rect.top;
							const worldX = (clientX - vp.x) / vp.scale;
							const worldY = (clientY - vp.y) / vp.scale;
							const selectedIds = useVTTStore.getState().selectedTokenIds;
							const members = dragMembers({
								grabbedId: token.id,
								selectedIds: additive
									? selectedIds
									: selectedIds.includes(token.id)
										? selectedIds
										: [token.id],
								additive,
								tokens: useVTTStore.getState().tokens.map((item) => {
									const shown = tokenDisplayObjectsRef.current.get(item.id);
									return {
										id: item.id,
										x: shown?.position.x ?? item.x,
										y: shown?.position.y ?? item.y,
										isLocked: item.isLocked,
										canMove:
											canControlVTTToken(
												item,
												userIdRef.current,
												live.isGM || live.isCoGM,
												characterOwnersRef.current,
											) && canSelectTokenLayer(live.activeLayer, item.layer),
									};
								}),
							});
							pendingTokenDragRef.current = {
								id: token.id,
								grabX: worldX,
								grabY: worldY,
								additive,
								members,
							};
						}
					}
				}
			});

			if (isGMLayer) {
				gmTokensLayer.addChild(tokenContainer);
			} else {
				tokensLayer.addChild(tokenContainer);
			}
		}
		// Containers novos: o anel antigo ficou no container descartado.
		auraPoseRef.current = "";
		paintAurasRef.current();
		paintTurnRingRef.current();
	}, [
		rendererReady,
		tokenAppearance,
		tokenVisibility,
		characterOwners,
		user?.id,
		scene,
		selectedTokenIds,
		isGM,
		canManageTokens,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
		linkedSheetHp,
	]);

	useEffect(() => {
		// Anel da vez no canvas. Não é estado derivado: assina as stores e
		// desenha uma vez quando muda o token da vez (ou a visibilidade que
		// esconde esse token do jogador). Não há ticker. Iniciativa e pan
		// não trocam a assinatura, então o stroke não roda de novo.
		if (!rendererReady) return;
		const paint = () => paintTurnRingRef.current();
		const unCombat = useCombatStore.subscribe(paint);
		const unVtt = useVTTStore.subscribe((state, prev) => {
			if (state.isGM === prev.isGM && state.tokens === prev.tokens) return;
			paint();
		});
		paint();
		return () => {
			unCombat();
			unVtt();
			const node = turnRingRef.current;
			if (node) {
				node.parent?.removeChild(node);
				node.destroy();
				turnRingRef.current = null;
			}
			turnRingTokenRef.current = null;
			turnRingSigRef.current = "";
		};
	}, [rendererReady]);

	// 5a. Textura da névoa pintada. Depende só da cena e das pinturas: mover um
	// token NÃO pode refazê-la (era um redesenho de até 4096×4096 a cada
	// movimento do mouse, o que travava a mesa com a névoa ligada).
	const hasScene = scene != null;
	const sceneFogEnabled = scene?.fogEnabled ?? false;
	const sceneFogExploration = scene?.fogExploration ?? false;
	const fogWidth = (scene?.width || 4000) * (scene?.mapScale || 1);
	const fogHeight = (scene?.height || 4000) * (scene?.mapScale || 1);
	useEffect(() => {
		if (!rendererReady || !hasScene) return;
		const fogLayer = fogOfWarLayerRef.current;
		if (!fogLayer) return;
		if (!sceneFogEnabled) {
			fogLayer.visible = false;
			return;
		}
		fogLayer.visible = true;
		countFogRender();

		// Véu do mestre: quase preto, ainda dá para ver o mapa por baixo.
		// Jogador: névoa opaca. A textura é só a cobertura (branco = névoa).
		const fogColor = isGM ? GM_FOG_COLOR : PLAYER_FOG_COLOR;
		const fogAlpha = isGM ? GM_FOG_ALPHA : 1;
		const sprite = fogSpriteRef.current;
		const app = appRef.current;
		if (sprite && app && fogWidth > 0 && fogHeight > 0) {
			const fit = Math.min(1, 4096 / Math.max(fogWidth, fogHeight));
			const texW = Math.max(1, Math.ceil(fogWidth * fit));
			const texH = Math.max(1, Math.ceil(fogHeight * fit));
			let texture = fogTextureRef.current;
			if (!texture || texture.width !== texW || texture.height !== texH) {
				sprite.texture = Texture.EMPTY;
				texture?.destroy(true);
				texture = RenderTexture.create({ width: texW, height: texH });
				fogTextureRef.current = texture;
			}
			const composite = buildFogComposite({
				width: fogWidth,
				height: fogHeight,
				paths: fogPaths,
			});
			composite.scale.set(fit);
			app.renderer.render({
				container: composite,
				target: texture,
				clear: true,
			});
			composite.destroy({ children: true });
			sprite.texture = texture;
			sprite.width = fogWidth;
			sprite.height = fogHeight;
			sprite.tint = fogColor;
			sprite.alpha = fogAlpha;
		}
	}, [
		rendererReady,
		hasScene,
		sceneFogEnabled,
		fogWidth,
		fogHeight,
		fogPaths,
		isGM,
	]);

	// 5b. Visão do modo Exploração. Cada token que enxerga ganha um polígono
	// (recortado pelas paredes). Em TODOS os clientes o que ele vê vira memória do
	// grupo; só para o jogador o polígono recorta a névoa opaca e a penumbra.
	// É vetor (barato) e só refaz quando QUEM ENXERGA muda ou as paredes mudam
	// (visionSig / blockers), não quando qualquer token da mesa se mexe.
	const visionSig = visionKey(visionList);
	const sceneId = scene?.id ?? null;
	const exploredVersion = useExploredStore((s) => s.version);
	const showPlayerExploration = useVTTStore((s) => s.showPlayerExploration);
	const showAllVisionCones = useVTTStore((s) => s.showAllVisionCones);
	// biome-ignore lint/correctness/useExhaustiveDependencies: visionSig, walls e exploredVersion são as dependências; o efeito lê a lista e a grade na hora (ref/store).
	useEffect(() => {
		if (!rendererReady) return;
		const layer = fogExplorationLayerRef.current;
		const fogLayer = fogOfWarLayerRef.current;
		const mask = visionMaskRef.current;
		const penumbraMask = penumbraMaskRef.current;
		if (!layer || !fogLayer || !mask || !penumbraMask) return;
		layer.clear();
		mask.clear();
		penumbraMask.clear();
		const overlay = gmExploredLayerRef.current;
		overlay?.clear();
		if (!sceneFogEnabled || !sceneFogExploration || !sceneId) {
			layer.visible = false;
			layer.mask = null;
			fogLayer.mask = null;
			return;
		}

		// Cada fonte vira o cone voltado para onde olha + a casa ao redor.
		const polygons = visionListRef.current.map((source) => ({
			id: source.id,
			parts: sourcePolygons(source, wallsRef.current),
		}));

		// Memória do grupo: o que cada um vê fica marcado. Só quem controla o token
		// (e o mestre) grava no banco; os outros marcam a tela e recebem o resto
		// pelo aviso em tempo real.
		const meta = exploredMeta(fogWidth, fogHeight, visionCell);
		const explored = useExploredStore.getState();
		const before = explored.grid;
		explored.ensure(sceneId, meta);
		if (useExploredStore.getState().grid !== before) {
			void exploredSync.load(sceneId, meta);
		}
		const live = useVTTStore.getState();
		for (const polygon of polygons) {
			const fresh = useExploredStore.getState().mark(sceneId, polygon.parts);
			if (fresh.length === 0) continue;
			const token = live.tokens.find((item) => item.id === polygon.id);
			if (
				token &&
				canControlVTTToken(
					token,
					userIdRef.current,
					live.isGM || live.isCoGM,
					characterOwnersRef.current,
				)
			) {
				exploredSync.track(sceneId, meta, fresh);
			}
		}

		if (isGM) {
			layer.visible = false;
			layer.mask = null;
			fogLayer.mask = null;
			// O mestre não tem névoa de jogador, mas vê o que o grupo já liberou: o
			// explorado em realce e, em contorno, para onde cada um olha agora.
			if (overlay && showPlayerExploration) {
				const tint = cssVarColor("--primary", 0x6d28d9);
				const memory = useExploredStore.getState();
				if (memory.sceneId === sceneId && memory.grid) {
					for (const run of exploredRuns(memory.grid)) {
						overlay.rect(run.x, run.y, run.w, run.h);
					}
					overlay.fill({ color: tint, alpha: 0.15 });
				}
				for (const polygon of polygons) {
					// Cone só do token selecionado (ou de todos, se o mestre pedir):
					// com muitos personagens, todos os cones juntos viram uma bagunça.
					if (
						!showAllVisionCones &&
						!useVTTStore.getState().selectedTokenIds.includes(polygon.id)
					)
						continue;
					polygon.parts.forEach((part, index) => {
						const flat = flattenPolygon(part);
						if (flat.length < 6) return;
						overlay.poly(flat, true);
						overlay.fill({ color: tint, alpha: 0.1 });
						// Só o cone leva contorno (o círculo curto fica só no realce).
						if (index === 0) {
							overlay.poly(flat, true);
							overlay.stroke({ width: 2, color: tint, alpha: 0.85 });
						}
					});
				}
			}
			return;
		}
		layer.visible = true;
		layer.rect(0, 0, fogWidth, fogHeight);
		layer.fill({ color: 0x090a0f, alpha: 0.55 });
		// O que o grupo já explorou também revela o mapa (a penumbra o deixa em
		// meia-luz). Vai na MESMA máscara da visão: duas máscaras aninhadas não se
		// combinam no Pixi.
		const memory = useExploredStore.getState();
		if (memory.sceneId === sceneId && memory.grid) {
			for (const run of exploredRuns(memory.grid)) {
				mask.rect(run.x, run.y, run.w, run.h);
			}
		}
		for (const polygon of polygons) {
			for (const part of polygon.parts) {
				const flat = flattenPolygon(part);
				if (flat.length < 6) continue;
				mask.poly(flat, true);
				penumbraMask.poly(flat, true);
			}
		}
		mask.fill(0xffffff);
		penumbraMask.fill(0xffffff);
		// Máscaras invertidas: a névoa opaca e a penumbra ficam só FORA do que se
		// enxerga (a névoa também libera o que o grupo já explorou).
		fogLayer.setMask({ mask, inverse: true });
		layer.setMask({ mask: penumbraMask, inverse: true });
	}, [
		rendererReady,
		sceneFogEnabled,
		sceneFogExploration,
		sceneId,
		isGM,
		fogWidth,
		fogHeight,
		visionCell,
		visionSig,
		blockers,
		exploredVersion,
		showPlayerExploration,
		showAllVisionCones,
		selectedTokenIds,
	]);

	const viewScale = viewport.scale;
	const sceneScaleDistance = scene?.gridScaleDistance ?? 1;
	const sceneScaleUnit = scene?.gridScaleUnit ?? "m";

	// 7. Réguas dos outros jogadores, com o nome de quem mede no total.
	useEffect(() => {
		if (!rendererReady || !sceneGridType || !sceneGridSize) return;
		const layer = remoteRulersLayerRef.current;
		const labels = remoteRulersLabelsRef.current;
		if (!layer || !labels) return;
		layer.clear();
		clearLabels(labels);
		for (const m of Object.values(remoteMeasurements)) {
			drawRulerPath(layer, labels, m, {
				gridType: sceneGridType,
				gridSize: sceneGridSize,
				origin: { x: sceneGridOffsetX, y: sceneGridOffsetY },
				viewScale,
				color: m.color,
				owner: m.userName,
			});
		}
	}, [
		remoteMeasurements,
		rendererReady,
		sceneGridType,
		sceneGridSize,
		sceneGridOffsetX,
		sceneGridOffsetY,
		viewScale,
	]);

	// 7a. Régua local: desenha direto da store (sem re-render do canvas) e
	// transmite a cada mudança, com no máximo um envio a cada 40 ms enquanto a
	// ponta só se move; pontos novos, fixar e apagar saem na hora.
	useEffect(() => {
		if (!rendererReady) return;
		let lastSent = 0;
		let pending: ReturnType<typeof setTimeout> | null = null;
		const paint = () => {
			const layer = measurementLayerRef.current;
			const labels = measurementLabelsRef.current;
			const current = sceneRef.current;
			if (!layer || !labels) return;
			layer.clear();
			clearLabels(labels);
			const state = useVTTStore.getState();
			const m = state.activeMeasurement;
			if (!m || !current) return;
			const vp = state.viewport;
			const screen = appRef.current?.screen;
			drawRulerPath(layer, labels, m, {
				gridType: current.gridType,
				gridSize: current.gridSize,
				origin: { x: current.gridOffsetX ?? 0, y: current.gridOffsetY ?? 0 },
				viewScale: vp.scale,
				color: state.userColor,
				// Fora do cabeçalho (≈7,5 rem) e da toolbar à esquerda.
				bounds: screen && {
					x0: (72 - vp.x) / vp.scale,
					y0: (120 - vp.y) / vp.scale,
					x1: (screen.width - 12 - vp.x) / vp.scale,
					y1: (screen.height - 12 - vp.y) / vp.scale,
				},
			});
		};
		const send = () => {
			pending = null;
			lastSent = Date.now();
			onBroadcastRulerRef.current?.(useVTTStore.getState().activeMeasurement);
		};
		paint();
		const unsubscribe = useVTTStore.subscribe((state, prev) => {
			const changed = state.activeMeasurement !== prev.activeMeasurement;
			if (
				!changed &&
				(!state.activeMeasurement || state.viewport === prev.viewport) &&
				state.userColor === prev.userColor
			)
				return;
			paint();
			if (!changed) return;
			const m = state.activeMeasurement;
			const before = prev.activeMeasurement;
			const structural =
				!m ||
				!before ||
				m.pinned !== before.pinned ||
				m.waypoints?.length !== before.waypoints?.length;
			if (pending) clearTimeout(pending);
			if (structural || Date.now() - lastSent > 40) send();
			else pending = setTimeout(send, 40);
		});
		return () => {
			unsubscribe();
			if (pending) clearTimeout(pending);
		};
	}, [rendererReady]);

	// 7b. Moldes (prévia local, colocados e remotos) com a medida na ponta.
	useEffect(() => {
		if (!rendererReady || !sceneGridSize) return;
		const layer = templatesLayerRef.current;
		const labels = templateLabelsRef.current;
		if (!layer || !labels) return;
		layer.clear();
		clearLabels(labels);

		const allTemplates: VTTSpellTemplate[] = [
			...placedTemplates,
			...Object.values(remoteTemplates),
			...Object.values(remoteTemplatePreviews),
		];
		if (previewTemplate) allTemplates.push(previewTemplate);

		for (const template of allTemplates) {
			drawSpellTemplate(layer, template, sceneGridSize, labels, {
				viewScale,
				scaleDistance: sceneScaleDistance,
				unit: sceneScaleUnit,
				selected: template.id === selectedTemplateId,
			});
		}
	}, [
		placedTemplates,
		remoteTemplates,
		remoteTemplatePreviews,
		previewTemplate,
		selectedTemplateId,
		sceneGridSize,
		sceneScaleDistance,
		sceneScaleUnit,
		viewScale,
		rendererReady,
	]);

	// 7b2. Histórico de movimentos: o movimento escolhido na lista (forte) e a
	// trilha do token filtrado (fraca). Só mestre e co-mestre têm a lista.
	const moveLog = useMoveStore((s) => s.moves);
	const focusedMoveId = useMoveStore((s) => s.focusedMoveId);
	const moveFilterTokenId = useMoveStore((s) => s.filterTokenId);
	const movePanelOpen = useMoveStore((s) => s.panelOpen);
	useEffect(() => {
		if (!rendererReady || !sceneGridSize) return;
		const layer = moveTrailLayerRef.current;
		const labels = moveTrailLabelsRef.current;
		if (!layer || !labels) return;
		layer.clear();
		clearLabels(labels);
		if (!movePanelOpen || !scene) return;
		const accent = dsColor("--primary", 0xa855f7);
		const inScene = moveLog.filter((move) => move.sceneId === scene.id);
		const trail = moveFilterTokenId
			? inScene.filter((move) => move.tokenId === moveFilterTokenId)
			: [];
		for (const move of trail) {
			if (move.id === focusedMoveId) continue;
			drawMoveArrow(layer, labels, move.from, move.to, {
				viewScale,
				gridSize: sceneGridSize,
				color: accent,
				emphasis: false,
			});
		}
		const focused = inScene.find((move) => move.id === focusedMoveId);
		if (focused) {
			drawMoveArrow(layer, labels, focused.from, focused.to, {
				viewScale,
				gridSize: sceneGridSize,
				color: accent,
				emphasis: true,
				caption: formatDistance(focused.distance, focused.unit),
			});
		}
	}, [
		moveLog,
		focusedMoveId,
		moveFilterTokenId,
		movePanelOpen,
		scene,
		sceneGridSize,
		viewScale,
		rendererReady,
	]);

	// 7c. Paredes: redesenha só na camada do mestre ou quando usando a ferramenta de parede.
	// Na camada normal (token ou mapa), as linhas das paredes não aparecem no mapa.
	// Portas: ícone no meio do vão. Com névoa de exploração (ou para o mestre) o
	// ícone vai acima da névoa e o jogador só vê as portas que já revelou; nos demais
	// casos fica abaixo dela, como os tokens.
	const doorsOnTop = isGM || (sceneFogEnabled && sceneFogExploration);
	// biome-ignore lint/correctness/useExhaustiveDependencies: exploredVersion é a dependência; a grade é lida na hora pela store.
	useEffect(() => {
		const below = doorsLayerRef.current;
		const top = doorIconsTopRef.current;
		if (!rendererReady || !below || !top) return;
		const radius = doorIconRadius(visionCell);
		if (!doorsOnTop) {
			drawDoors(below, walls, radius);
			top.clear();
			return;
		}
		below.clear();
		const memory = useExploredStore.getState();
		const grid = memory.sceneId === sceneId ? memory.grid : null;
		const shown = isGM
			? walls
			: walls.filter((wall) => !isOpenable(wall) || doorRevealed(wall, grid));
		drawDoors(top, shown, radius);
	}, [
		walls,
		rendererReady,
		visionCell,
		doorsOnTop,
		isGM,
		sceneId,
		exploredVersion,
	]);

	// Paredes só aparecem para o mestre, na camada do mestre (a ferramenta Parede
	// já leva para ela). Portas são do mapa: todo mundo vê, abaixo da névoa.
	const showWalls = isGM && activeLayer === "gm";
	useEffect(() => {
		if (!rendererReady || !wallsLayerRef.current) return;
		drawWalls(wallsLayerRef.current, showWalls ? walls : [], selectedWallIds);
	}, [walls, selectedWallIds, showWalls, rendererReady]);

	// Áreas de luz: o mestre as vê com a ferramenta Luz ou na camada do mestre.
	const lightSelectedId = useVTTStore((s) => s.selectedLightZoneId);
	const lightDraftPoints = useVTTStore((s) => s.lightDraft);
	const lightDrawLevel = useVTTStore((s) => s.lightDrawLevel);
	const showLightZones =
		isGM && (activeTool === "light" || activeLayer === "gm");
	useEffect(() => {
		const layer = lightZonesLayerRef.current;
		if (!rendererReady || !layer) return;
		if (!showLightZones) {
			layer.clear();
			return;
		}
		drawLightZones(
			layer,
			lightZones,
			activeTool === "light" ? lightSelectedId : null,
		);
	}, [lightZones, lightSelectedId, showLightZones, activeTool, rendererReady]);
	useEffect(() => {
		const layer = lightPreviewLayerRef.current;
		if (!rendererReady || !layer) return;
		if (lightDraftPoints.length === 0) {
			lightCursorRef.current = null;
			layer.clear();
			return;
		}
		drawLightPreview(layer, lightDrawLevel, {
			kind: "polygon",
			points: lightDraftPoints,
			cursor: lightCursorRef.current,
		});
	}, [lightDraftPoints, lightDrawLevel, rendererReady]);

	// 7d. Prévia da polilinha (os pontos fixos; o trecho até o cursor é
	// atualizado direto no pointermove, sem passar pelo React).
	useEffect(() => {
		if (!rendererReady || !wallPreviewLayerRef.current) return;
		if (wallDraft.length === 0) wallCursorRef.current = null;
		drawWallPreview(
			wallPreviewLayerRef.current,
			wallDraft,
			wallCursorRef.current,
		);
	}, [wallDraft, rendererReady]);

	// Confirma o movimento de tokens, seja soltar o arrasto ou apertar uma seta: o
	// jogador é barrado por parede, porta fechada e janela; o token vira para onde
	// andou; a posição é gravada, entra no histórico e vai para os outros. Um só
	// caminho para os dois jeitos de mover, para as regras não divergirem.
	// `commitUnchanged`: o arrasto sempre confirma (os outros precisam ver o token
	// voltar quando foi barrado); a seta barrada não grava nem registra nada.
	const commitTokenMoves = (
		moves: readonly {
			id: string;
			from: { x: number; y: number };
			to: { x: number; y: number };
		}[],
		options: { commitUnchanged: boolean },
	): { wasBlocked: boolean } => {
		if (!scene) return { wasBlocked: false };
		const live = useVTTStore.getState();
		const blockers = movementBlockingWalls(live.walls);
		let wasBlocked = false;
		const finalMoves: DragMove[] = [];
		for (const move of moves) {
			const token = live.tokens.find((item) => item.id === move.id);
			if (!token) continue;
			const blocked = moveBlocked(move.from, move.to, blockers, isGM);
			const finalPos = blocked ? move.from : move.to;
			if (blocked) wasBlocked = true;
			if (
				!options.commitUnchanged &&
				finalPos.x === move.from.x &&
				finalPos.y === move.from.y
			)
				continue;
			const display = tokenDisplayObjectsRef.current.get(move.id);
			if (display) display.position.set(finalPos.x, finalPos.y);
			// Mover de verdade também vira o token para onde ele andou (é para lá
			// que o cone de visão aponta). Ficar no mesmo lugar não vira.
			const facing = facingFromMove(move.from, finalPos);
			const committed =
				facing === null
					? { x: finalPos.x, y: finalPos.y }
					: { x: finalPos.x, y: finalPos.y, rotation: facing };
			updateToken(move.id, committed);
			if (onUpdateToken) {
				const saved = onUpdateToken(move.id, committed);
				// Histórico: aparece na hora; se o servidor recusar a posição
				// (o token volta), a linha é retirada.
				const authorId = userIdRef.current;
				if (authorId) {
					recordMove(
						{
							sceneId: scene.id,
							tokenId: move.id,
							tokenName: token.name,
							from: { x: move.from.x, y: move.from.y },
							to: { x: finalPos.x, y: finalPos.y },
							authorId,
							authorName: authorNameRef.current,
						},
						Promise.resolve(saved),
					);
				}
			}
			if (!onBroadcastDragBatch && onBroadcastDrag) {
				onBroadcastDrag(move.id, finalPos.x, finalPos.y);
			}
			finalMoves.push({ tokenId: move.id, x: finalPos.x, y: finalPos.y });
		}
		// A posição final de todo o grupo sai numa mensagem só.
		if (onBroadcastDragBatch && finalMoves.length > 0) {
			onBroadcastDragBatch(finalMoves);
		}
		if (wasBlocked) {
			showToast("info", {
				title: "Movimento bloqueado",
				description:
					"Você não pode atravessar paredes nem janelas. Peça ao mestre.",
			});
		}
		return { wasBlocked };
	};
	const commitTokenMovesRef = useRef(commitTokenMoves);
	commitTokenMovesRef.current = commitTokenMoves;
	const lastArrowStepRef = useRef(0);

	// 9. Native DOM event listeners for Pan, Zoom, Token Drag, Fog Painting, Alt-Ping & Ruler
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const gridOrigin = scene
			? { x: scene.gridOffsetX ?? 0, y: scene.gridOffsetY ?? 0 }
			: ZERO_ORIGIN;

		const committedSpellTemplates = () => {
			const state = useVTTStore.getState();
			return [
				...state.placedTemplates,
				...Object.values(state.remoteTemplates),
			];
		};
		const screenToWorld = (screenX: number, screenY: number) => {
			const rect = container.getBoundingClientRect();
			const clientX = screenX - rect.left;
			const clientY = screenY - rect.top;
			return {
				x: (clientX - viewport.x) / viewport.scale,
				y: (clientY - viewport.y) / viewport.scale,
			};
		};

		const rulerCtx: RulerContext | null = scene
			? {
					gridSize: scene.gridSize,
					scaleDistance: scene.gridScaleDistance,
					unit: scene.gridScaleUnit,
					diagonalRule,
				}
			: null;
		const templateSize = () => {
			const cells = useVTTStore.getState().templateSizeCells;
			return cells ? { sizeCells: cells } : {};
		};
		// A régua mede de centro a centro de casa ("medir os blocos").
		const snapRuler = (point: { x: number; y: number }) =>
			scene
				? snapToGrid(point, scene.gridType, scene.gridSize, 1, gridOrigin)
				: point;

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeEl =
				document.activeElement instanceof Element
					? document.activeElement
					: null;
			const typing =
				isEditableElement(e.target instanceof Element ? e.target : null) ||
				isEditableElement(activeEl);
			// Espaço num campo ou dentro de um dialog não vira a mão de arrastar.
			const blocked = isVttShortcutBlocked(e);
			if (e.code === "Space" && !e.repeat && !blocked) {
				isSpaceHeldRef.current = true;
				container.style.cursor = "grab";
			}
			if (e.code === "AltLeft" || e.code === "AltRight") {
				isAltHeldRef.current = true;
			}
			// Tool shortcuts (V/H/R/G/T/F) live in VTTToolbar; only Escape here.
			if (typing) return;
			// Setas: movem os tokens selecionados uma casa (juntos, se forem vários),
			// com as mesmas regras do arrasto. Não vale com campo, diálogo, Biblioteca
			// ou ficha com o foco, nem durante um arrasto.
			const stepDir = stepDirectionOf(e.key);
			if (
				stepDir &&
				scene &&
				activeTool === "select" &&
				!blocked &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.altKey &&
				!draggingTokenIdRef.current &&
				!dragGroupRef.current
			) {
				const live = useVTTStore.getState();
				const movers = keyboardMovers(
					live.selectedTokenIds,
					live.tokens.map((item) => ({
						id: item.id,
						x: item.x,
						y: item.y,
						sizeCells: item.sizeCells,
						isLocked: item.isLocked,
						canMove:
							canControlVTTToken(
								item,
								userIdRef.current,
								live.isGM || live.isCoGM,
								characterOwnersRef.current,
							) && canSelectTokenLayer(live.activeLayer, item.layer),
					})),
				);
				if (movers.length > 0) {
					// Segurar a seta repete, mas no máximo ~7 casas por segundo: cada
					// casa é gravada e entra no histórico.
					e.preventDefault();
					const now = Date.now();
					if (e.repeat && now - lastArrowStepRef.current < 140) return;
					lastArrowStepRef.current = now;
					commitTokenMovesRef.current(
						planStep(movers, stepDir, {
							gridType: scene.gridType,
							gridSize: scene.gridSize,
							origin: gridOrigin,
						}),
						{ commitUnchanged: false },
					);
					paintAurasRef.current();
					return;
				}
			}
			// Esc dentro de um dialog (ex.: imagem em tela cheia) fecha só o dialog.
			const inDialog =
				e.target instanceof Element && e.target.closest('[role="dialog"]');
			const ruler = useVTTStore.getState().activeMeasurement;
			if (
				activeTool === "ruler" &&
				ruler &&
				rulerCtx &&
				!inDialog &&
				!blocked &&
				(e.key === "Escape" || e.key === "Backspace" || e.key === "Enter")
			) {
				if (e.key !== "Escape") e.preventDefault();
				const next = rulerOnKey(
					{
						measurement: ruler,
						press: rulerPressRef.current,
						lastClick: lastRulerClickRef.current,
					},
					e.key,
					rulerCtx,
				);
				rulerPressRef.current = next.press;
				lastRulerClickRef.current = next.lastClick;
				setActiveMeasurement(next.measurement);
			}
			if (e.key === "Escape" && !inDialog) {
				setActiveTokenIdForMenu(null);
				setPreviewTemplate(null);
				templateStartRef.current = null;
				useVTTStore.getState().setSelectedTemplateId(null);
				if (onBroadcastTemplate) onBroadcastTemplate(null);
			}
			const live = useVTTStore.getState();
			if (!(live.activeTool === "wall" && live.selectedWallIds.length > 0)) {
				const selected =
					live.placedTemplates.find(
						(template) => template.id === live.selectedTemplateId,
					) ??
					Object.values(live.remoteTemplates).find(
						(template) => template.id === live.selectedTemplateId,
					);
				const canDelete = selected
					? canRemoveSpellTemplate(
							{
								userId: userIdRef.current,
								isGM: live.isGM,
								isCoGM: live.isCoGM,
							},
							selected,
							{
								unownedBelongsTo: live.placedTemplates.some(
									(template) => template.id === selected.id,
								)
									? userIdRef.current
									: null,
							},
						)
					: false;
				const removeId = shouldDeleteSelectedTemplate({
					key: e.key,
					editable: typing,
					selectedTemplateId: live.selectedTemplateId,
					canDelete,
				});
				if (removeId) {
					e.preventDefault();
					live.removeTemplatesByIds([removeId]);
					onRemoveTemplatesRef.current?.([removeId]);
				}
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				isSpaceHeldRef.current = false;
				container.style.cursor = activeTool === "pan" ? "grab" : "default";
			}
			if (e.code === "AltLeft" || e.code === "AltRight") {
				isAltHeldRef.current = false;
			}
		};

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();

			const rect = container.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
			const newScale = Math.min(
				Math.max(viewport.scale * zoomFactor, 0.1),
				5.0,
			);

			const newX = mouseX - (mouseX - viewport.x) * (newScale / viewport.scale);
			const newY = mouseY - (mouseY - viewport.y) * (newScale / viewport.scale);

			setViewport({ x: newX, y: newY, scale: newScale });
		};

		const handlePointerDown = (e: PointerEvent) => {
			// Toque novo fecha a lista de status aberta pelo toque longo.
			if (e.pointerType !== "mouse") {
				const s = useVTTStore.getState();
				if (s.hoveredStatusTokenId) s.setHoveredStatusTokenId(null);
			}
			const isMiddleClick = e.button === 1;
			const isLeftClick = e.button === 0;
			const isRightClick = e.button === 2;

			// Right press pans once it moves. A tap on a token still opens its menu.
			if (isRightClick) {
				lastRulerClickRef.current = null;
				if (!rightPressRef.current) {
					rightPressRef.current = beginRightPress(e.clientX, e.clientY, null);
				}
				return;
			}

			// Pan start
			if (
				isMiddleClick ||
				(isLeftClick && (isSpaceHeldRef.current || activeTool === "pan"))
			) {
				isDraggingViewportRef.current = true;
				viewportDragStartRef.current = {
					x: e.clientX - viewport.x,
					y: e.clientY - viewport.y,
				};
				container.style.cursor = "grabbing";
				return;
			}

			const worldPoint = screenToWorld(e.clientX, e.clientY);

			// Fast Alt + Click Instant Ping OR Ping tool.
			// Throttle local: ping recusado não toca som nem entra no broadcast.
			if ((isAltHeldRef.current || activeTool === "ping") && isLeftClick) {
				const accepted = useVTTStore.getState().addPing({
					x: worldPoint.x,
					y: worldPoint.y,
					userId: userIdRef.current ?? "self",
					userName: isGM ? "Mestre" : "Jogador",
					color: userColor,
					timestamp: Date.now(),
				});
				if (!accepted) return;
				playPingAudio();
				if (onBroadcastPing) onBroadcastPing(accepted);
				return;
			}

			// Fog of War Drawing (GM Only)
			if (activeTool === "fog" && isGM && isLeftClick) {
				fogStrokeStartRef.current = worldPoint;
				fogCurrentPointsRef.current = [worldPoint];
				return;
			}

			// Parede (mestre): clique fixa um ponto da polilinha; sem desenho em
			// andamento, clique perto de uma parede a seleciona (Shift soma).
			if (activeTool === "wall" && isGM && isLeftClick && scene) {
				const store = useVTTStore.getState();
				const draft = store.wallDraft;
				if (draft.length === 0) {
					const hit = hitTestWall(store.walls, worldPoint, 8 / viewport.scale);
					if (hit) {
						const sel = store.selectedWallIds;
						store.setSelectedWallIds(
							e.shiftKey
								? sel.includes(hit)
									? sel.filter((id) => id !== hit)
									: [...sel, hit]
								: [hit],
						);
						lastWallClickRef.current = null;
						return;
					}
				}
				const p = snapWallPoint(
					worldPoint,
					scene.gridType,
					scene.gridSize,
					e.shiftKey,
					gridOrigin,
				);
				const now = Date.now();
				const last = lastWallClickRef.current;
				lastWallClickRef.current = { x: e.clientX, y: e.clientY, t: now };
				// Duplo clique encerra o desenho.
				if (
					draft.length > 0 &&
					last &&
					now - last.t < 350 &&
					Math.hypot(e.clientX - last.x, e.clientY - last.y) < 6
				) {
					lastWallClickRef.current = null;
					finishWallDraft();
					return;
				}
				const prev = draft.at(-1);
				if (!prev || prev.x !== p.x || prev.y !== p.y) {
					wallCursorRef.current = p;
					store.setWallDraft([...draft, p]);
				}
				if (draft.length === 0 && store.selectedWallIds.length > 0)
					store.setSelectedWallIds([]);
				return;
			}

			// Luz (mestre): em "Selecionar" o clique escolhe uma área; nas formas, o
			// arrasto desenha círculo ou retângulo e os cliques marcam o polígono.
			if (activeTool === "light" && isGM && isLeftClick && scene) {
				const store = useVTTStore.getState();
				const mode = store.lightDrawShape;
				if (mode === "select") {
					const hit = zoneAt(worldPoint, store.lightZones);
					store.setSelectedLightZoneId(hit ? hit.id : null);
					return;
				}
				if (mode === "polygon") {
					const draft = store.lightDraft;
					const now = Date.now();
					const last = lastLightClickRef.current;
					lastLightClickRef.current = { x: e.clientX, y: e.clientY, t: now };
					// Duplo clique fecha a área.
					if (
						draft.length > 0 &&
						last &&
						now - last.t < 350 &&
						Math.hypot(e.clientX - last.x, e.clientY - last.y) < 6
					) {
						lastLightClickRef.current = null;
						void finishLightDraft();
						return;
					}
					lightCursorRef.current = { x: worldPoint.x, y: worldPoint.y };
					store.setLightDraft([...draft, { x: worldPoint.x, y: worldPoint.y }]);
					store.setSelectedLightZoneId(null);
					return;
				}
				lightDragRef.current = { x: worldPoint.x, y: worldPoint.y };
				store.setSelectedLightZoneId(null);
				return;
			}

			// Deselect if clicking on empty canvas. A press on a token reaches this
			// listener right after the token handler (same DOM event), so it must
			// not undo the selection/panel that handler just set.
			// Porta: o clique abre ou fecha. O mestre abre qualquer uma; o jogador
			// precisa de um personagem a até 1,5 casa dela. Um token pressionado tem
			// prioridade (não vira clique na porta atrás dele).
			if (
				isLeftClick &&
				activeTool === "select" &&
				!tokenPressRef.current &&
				scene
			) {
				const live = useVTTStore.getState();
				// O ícone é a única parte clicável da porta (o traço do vão não aparece).
				const door = hitTestDoorIcon(
					live.walls,
					worldPoint,
					doorIconRadius(scene.gridSize || 70) * 1.35,
				);
				if (door) {
					const staff = live.isGM || live.isCoGM;
					const mine = live.tokens.filter(
						(t) =>
							t.layer === "token" &&
							canControlVTTToken(
								t,
								userIdRef.current,
								staff,
								characterOwnersRef.current,
							),
					);
					if (
						staff ||
						doorWithinReach(
							door,
							mine.map((t) => ({ x: t.x, y: t.y })),
							scene.gridSize || 70,
						)
					) {
						void toggleDoor(door.id, door.isOpen !== true);
					} else {
						showToast("info", {
							title: "Longe demais da porta",
							description: "Chegue mais perto com o seu personagem para abrir.",
						});
					}
					return;
				}
			}

			const additive = isAdditiveSelect(e);
			if (
				canvasPressAction(tokenPressRef.current, e, {
					isLeftClick,
					activeTool,
					additive,
				}) === "deselect"
			) {
				tokenPressRef.current = null;
				setSelectedTokenIds([]);
				setActiveTokenIdForMenu(null);
			}

			// Drag on empty ground draws a selection box. Shift adds to it.
			if (
				isLeftClick &&
				activeTool === "select" &&
				!isSpaceHeldRef.current &&
				!isAltHeldRef.current &&
				!tokenPressRef.current
			) {
				const hit = scene
					? spellTemplateIdAtPoint(
							committedSpellTemplates(),
							worldPoint,
							scene.gridSize,
						)
					: null;
				if (hit) {
					useVTTStore.getState().setSelectedTemplateId(hit);
					return;
				}
				useVTTStore.getState().setSelectedTemplateId(null);
				const rect = container.getBoundingClientRect();
				marqueeRef.current = {
					startX: e.clientX - rect.left,
					startY: e.clientY - rect.top,
					additive,
					moved: false,
				};
			}

			// Régua: clique marca pontos, arrastar mantém a reta ao soltar,
			// duplo clique fixa o caminho.
			if (activeTool === "ruler" && isLeftClick && rulerCtx) {
				const current = useVTTStore.getState().activeMeasurement;
				const next = rulerPointerDown(
					{
						measurement: current,
						press: rulerPressRef.current,
						lastClick: lastRulerClickRef.current,
					},
					{
						screenX: e.clientX,
						screenY: e.clientY,
						world: snapRuler(worldPoint),
						now: Date.now(),
					},
					rulerCtx,
				);
				lastRulerClickRef.current = next.lastClick;
				rulerPressRef.current = next.press;
				if (next.measurement !== current)
					setActiveMeasurement(next.measurement);
			}

			if (activeTool === "template" && isLeftClick && scene) {
				const hit = spellTemplateIdAtPoint(
					committedSpellTemplates(),
					worldPoint,
					scene.gridSize,
				);
				if (hit) {
					useVTTStore.getState().setSelectedTemplateId(hit);
					templateStartRef.current = null;
					return;
				}
				useVTTStore.getState().setSelectedTemplateId(null);
				const snapped = snapToGrid(
					worldPoint,
					scene.gridType,
					scene.gridSize,
					1,
					gridOrigin,
				);
				templateStartRef.current = snapped;
			}
		};

		const handlePointerMove = (e: PointerEvent) => {
			statusLongPressRef.current.move(e.clientX, e.clientY);
			const right = rightPressRef.current;
			if (right && !isDraggingViewportRef.current) {
				const next = trackRightPress(right, e.clientX, e.clientY);
				rightPressRef.current = next;
				if (next.moved) {
					const vp = useVTTStore.getState().viewport;
					isDraggingViewportRef.current = true;
					viewportDragStartRef.current = {
						x: e.clientX - vp.x,
						y: e.clientY - vp.y,
					};
					container.style.cursor = "grabbing";
					pendingTokenDragRef.current = null;
					dragGroupRef.current = null;
					draggingTokenIdRef.current = null;
					marqueeRef.current = null;
					hideMarquee(marqueeElRef.current);
					setDraggedTokenIds([]);
					destroyChildren(dragGhostLayerRef.current);
				}
			}
			if (isDraggingViewportRef.current) {
				const nextX = e.clientX - viewportDragStartRef.current.x;
				const nextY = e.clientY - viewportDragStartRef.current.y;
				setViewport({ x: nextX, y: nextY });
				return;
			}

			const marquee = marqueeRef.current;
			if (marquee) {
				const rect = container.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;
				if (
					Math.hypot(x - marquee.startX, y - marquee.startY) > TOKEN_TAP_SLOP_PX
				) {
					marquee.moved = true;
				}
				if (marquee.moved) {
					placeMarquee(
						marqueeElRef.current,
						marquee.startX,
						marquee.startY,
						x,
						y,
					);
				}
			}

			const worldPoint = screenToWorld(e.clientX, e.clientY);

			// Luz: prévia do círculo/retângulo arrastado ou do polígono até o cursor.
			if (activeTool === "light" && isGM && lightPreviewLayerRef.current) {
				const store = useVTTStore.getState();
				const mode = store.lightDrawShape;
				if ((mode === "circle" || mode === "rect") && lightDragRef.current) {
					const geometry = geometryFromDrag(
						mode,
						lightDragRef.current,
						worldPoint,
					);
					drawLightPreview(
						lightPreviewLayerRef.current,
						store.lightDrawLevel,
						geometry ? { kind: "geometry", geometry } : null,
					);
				} else if (mode === "polygon" && store.lightDraft.length > 0) {
					lightCursorRef.current = { x: worldPoint.x, y: worldPoint.y };
					drawLightPreview(lightPreviewLayerRef.current, store.lightDrawLevel, {
						kind: "polygon",
						points: store.lightDraft,
						cursor: worldPoint,
					});
				}
			}

			// Prévia do segmento até o cursor (só redesenha a camada da prévia).
			if (
				activeTool === "wall" &&
				isGM &&
				scene &&
				wallPreviewLayerRef.current
			) {
				const draft = useVTTStore.getState().wallDraft;
				if (draft.length > 0) {
					const p = snapWallPoint(
						worldPoint,
						scene.gridType,
						scene.gridSize,
						e.shiftKey,
						gridOrigin,
					);
					const c = wallCursorRef.current;
					if (!c || c.x !== p.x || c.y !== p.y) {
						wallCursorRef.current = p;
						drawWallPreview(wallPreviewLayerRef.current, draft, p);
					}
				}
			}
			const now = Date.now();

			// A press that leaves the tap slop is a drag: no panel, no double-click,
			// and a pending token press is promoted into an actual drag.
			const press = tokenPressRef.current;
			if (press && !press.moved) {
				const next = trackTokenPressMove(press, e.clientX, e.clientY);
				tokenPressRef.current = next;
				const pending = pendingTokenDragRef.current;
				if (next.moved) {
					lastTokenTapRef.current = null;
					if (
						pending &&
						pending.members.length > 0 &&
						!draggingTokenIdRef.current
					) {
						draggingTokenIdRef.current = pending.id;
						dragGroupRef.current = {
							grabX: pending.grabX,
							grabY: pending.grabY,
							members: pending.members,
						};
						setDraggedTokenIds(pending.members.map((member) => member.id));
						if (pending.additive) {
							const selected = useVTTStore.getState().selectedTokenIds;
							setSelectedTokenIds(
								selectionFromMarquee(
									selected,
									pending.members.map((member) => member.id),
									true,
								),
							);
						}
						pendingTokenDragRef.current = null;
					}
				}
			}

			// Broadcast Live Cursor movement (throttled to ~30-60fps)
			// Quem arrasta um token não manda o cursor: o token já mostra onde ele
			// está, e cada mensagem a mais conta contra o limite do Realtime.
			if (
				onBroadcastCursor &&
				!draggingTokenIdRef.current &&
				cursorBroadcastDue(
					now,
					lastCursorBroadcastRef.current,
					useVTTStore.getState().onlineUsers.length,
				)
			) {
				lastCursorBroadcastRef.current = now;
				onBroadcastCursor(worldPoint.x, worldPoint.y);
			}

			// Handle Fog of War Live Preview Drawing (using shared drawFogGeometry)
			if (
				activeTool === "fog" &&
				isGM &&
				fogStrokeStartRef.current &&
				fogBrushPreviewLayerRef.current
			) {
				const previewLayer = fogBrushPreviewLayerRef.current;
				const start = fogStrokeStartRef.current;
				const isReveal = activeFogMode === "reveal";
				const previewColor = isReveal ? 0x22c55e : 0xef4444;

				previewLayer.clear();

				let previewPath: VTTFogPath | null = null;
				if (activeFogTool === "brush") {
					fogCurrentPointsRef.current.push(worldPoint);
					previewPath = {
						id: "live-preview",
						type: "brush",
						mode: activeFogMode,
						brushRadius: fogBrushRadius,
						points: [...fogCurrentPointsRef.current],
					};
				} else if (activeFogTool === "rect") {
					const rx = Math.min(start.x, worldPoint.x);
					const ry = Math.min(start.y, worldPoint.y);
					const rw = Math.abs(worldPoint.x - start.x);
					const rh = Math.abs(worldPoint.y - start.y);
					previewPath = {
						id: "live-preview",
						type: "rect",
						mode: activeFogMode,
						x: rx,
						y: ry,
						width: rw,
						height: rh,
					};
				} else if (activeFogTool === "circle") {
					const radius = Math.hypot(
						worldPoint.x - start.x,
						worldPoint.y - start.y,
					);
					previewPath = {
						id: "live-preview",
						type: "circle",
						mode: activeFogMode,
						x: start.x,
						y: start.y,
						radius,
					};
				}

				if (previewPath) {
					drawFogGeometry(previewLayer, previewPath, false, previewColor, 0.35);
				}
				return;
			}

			// Handle Token Dragging with Realtime Broadcast.
			// The sprite moves here. The store follows so the menu stays put,
			// but the canvas must not rebuild the token for that write.
			const group = dragGroupRef.current;
			if (group && draggingTokenIdRef.current && scene) {
				const moved = translateMembers(
					group.members,
					worldPoint.x - group.grabX,
					worldPoint.y - group.grabY,
				);
				const broadcast = dragBroadcastDue(now, lastBroadcastTimeRef.current);
				if (broadcast) lastBroadcastTimeRef.current = now;
				const ghostLayer = dragGhostLayerRef.current;
				const ghostsOn =
					!isGM && scene.fogEnabled && scene.fogExploration && ghostLayer;
				for (const member of moved) {
					const display = tokenDisplayObjectsRef.current.get(member.id);
					if (display) display.position.set(member.x, member.y);
					if (ghostsOn) {
						const dragged = useVTTStore
							.getState()
							.tokens.find((item) => item.id === member.id);
						if (dragged)
							syncDragGhost(
								ghostLayer,
								dragged,
								member.x,
								member.y,
								scene.gridSize || 70,
							);
					}
					updateToken(member.id, { x: member.x, y: member.y });
					if (broadcast && !onBroadcastDragBatch && onBroadcastDrag) {
						onBroadcastDrag(member.id, member.x, member.y);
					}
				}
				if (broadcast && onBroadcastDragBatch) {
					onBroadcastDragBatch(
						moved.map((m) => ({ tokenId: m.id, x: m.x, y: m.y })),
					);
				}
				paintAurasRef.current();
				return;
			}

			// Régua: a ponta segue o cursor (mouse) ou o dedo (arrasto).
			if (activeTool === "ruler" && rulerCtx) {
				const current = useVTTStore.getState().activeMeasurement;
				const next = rulerPointerMove(
					{
						measurement: current,
						press: rulerPressRef.current,
						lastClick: lastRulerClickRef.current,
					},
					{
						screenX: e.clientX,
						screenY: e.clientY,
						world: snapRuler(worldPoint),
					},
					rulerCtx,
				);
				rulerPressRef.current = next.press;
				if (next.measurement !== current)
					setActiveMeasurement(next.measurement);
			}

			if (activeTool === "template" && templateStartRef.current && scene) {
				const currentSnapped = snapToGrid(
					worldPoint,
					scene.gridType,
					scene.gridSize,
					1,
					gridOrigin,
				);
				const start = templateStartRef.current;
				const template: VTTSpellTemplate = {
					id: "live-template",
					kind: activeTemplateKind,
					originX: start.x,
					originY: start.y,
					targetX: currentSnapped.x,
					targetY: currentSnapped.y,
					color: userColor,
					...templateSize(),
				};
				setPreviewTemplate(template);
				if (onBroadcastTemplate) onBroadcastTemplate(template);
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
			// Luz: soltar fecha o círculo ou retângulo arrastado (cancelar o toque
			// descarta). A área nova já nasce selecionada para trocar a luz ou apagar.
			if (lightDragRef.current) {
				const start = lightDragRef.current;
				lightDragRef.current = null;
				lightPreviewLayerRef.current?.clear();
				const store = useVTTStore.getState();
				const mode = store.lightDrawShape;
				if (
					e.type !== "pointercancel" &&
					store.activeTool === "light" &&
					store.isGM &&
					(mode === "circle" || mode === "rect")
				) {
					const geometry = geometryFromDrag(
						mode,
						start,
						screenToWorld(e.clientX, e.clientY),
					);
					if (geometry) {
						void createLightZone(geometry, store.lightDrawLevel).then((id) => {
							if (id) useVTTStore.getState().setSelectedLightZoneId(id);
						});
					}
				}
				return;
			}
			const right = rightPressRef.current;
			rightPressRef.current = null;
			const marquee = marqueeRef.current;
			marqueeRef.current = null;
			hideMarquee(marqueeElRef.current);

			// A touch/pen tap on a token (no drag) selects it and opens its panel.
			const press = tokenPressRef.current;
			const pending = pendingTokenDragRef.current;
			tokenPressRef.current = null;
			// Depois do toque longo (lista de status) o mesmo toque não abre o menu.
			const longPressed = statusLongPressRef.current.end();
			if (
				press &&
				!longPressed &&
				tokenPressEndAction(press, e.clientX, e.clientY) === "open-panel"
			) {
				swallowTapClickRef.current = press.pointerType === "touch";
				setActiveTokenIdForMenu(press.tokenId);
			}
			if (
				press &&
				pending?.additive &&
				!longPressed &&
				isTokenTap(press, e.clientX, e.clientY)
			) {
				toggleSelectTokenId(press.tokenId, true);
			} else if (
				press &&
				!pending?.additive &&
				!longPressed &&
				isTokenTap(press, e.clientX, e.clientY)
			) {
				const selected = useVTTStore.getState().selectedTokenIds;
				if (selected.length > 1 && selected.includes(press.tokenId)) {
					setSelectedTokenIds([press.tokenId]);
				}
			}
			if (right && !right.moved && right.tokenId && !longPressed) {
				setSelectedTokenIds([right.tokenId]);
				setActiveTokenIdForMenu(right.tokenId);
			}
			if (marquee?.moved && scene) {
				const rect = container.getBoundingClientRect();
				const start = screenToWorld(
					rect.left + marquee.startX,
					rect.top + marquee.startY,
				);
				const end = screenToWorld(e.clientX, e.clientY);
				const live = useVTTStore.getState();
				const hits = tokensInsideRect(
					live.tokens
						.filter(
							(item) =>
								(live.isGM || (!item.isHidden && item.layer !== "gm")) &&
								canSelectTokenLayer(live.activeLayer, item.layer) &&
								canControlVTTToken(
									item,
									userIdRef.current,
									live.isGM || live.isCoGM,
									characterOwnersRef.current,
								) &&
								!item.isLocked,
						)
						.map((item) => ({ id: item.id, x: item.x, y: item.y })),
					{ x0: start.x, y0: start.y, x1: end.x, y1: end.y },
				);
				setSelectedTokenIds(
					selectionFromMarquee(live.selectedTokenIds, hits, marquee.additive),
				);
				setActiveTokenIdForMenu(null);
			}

			// Finish Fog of War Drawing and Commit
			if (activeTool === "fog" && isGM && fogStrokeStartRef.current) {
				const start = fogStrokeStartRef.current;
				const end = screenToWorld(e.clientX, e.clientY);
				fogStrokeStartRef.current = null;

				if (fogBrushPreviewLayerRef.current) {
					fogBrushPreviewLayerRef.current.clear();
				}

				let newFogPath: VTTFogPath | null = null;
				const id = `fog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

				if (
					activeFogTool === "brush" &&
					fogCurrentPointsRef.current.length > 0
				) {
					newFogPath = {
						id,
						type: "brush",
						mode: activeFogMode,
						brushRadius: fogBrushRadius,
						points: [...fogCurrentPointsRef.current],
					};
				} else if (activeFogTool === "rect") {
					const rw = Math.abs(end.x - start.x);
					const rh = Math.abs(end.y - start.y);
					if (rw > 5 && rh > 5) {
						newFogPath = {
							id,
							type: "rect",
							mode: activeFogMode,
							x: Math.min(start.x, end.x),
							y: Math.min(start.y, end.y),
							width: rw,
							height: rh,
						};
					}
				} else if (activeFogTool === "circle") {
					const radius = Math.hypot(end.x - start.x, end.y - start.y);
					if (radius > 5) {
						newFogPath = {
							id,
							type: "circle",
							mode: activeFogMode,
							x: start.x,
							y: start.y,
							radius,
						};
					}
				}

				if (newFogPath) {
					addFogPath(newFogPath);
					// Cobrir (ocultar) também apaga a memória de exploração debaixo do
					// traço: senão a área já explorada "furava" a névoa e não escurecia.
					if (scene?.fogExploration) uncoverExploredUnder(newFogPath, scene);
					if (onBroadcastFog) {
						onBroadcastFog(newFogPath);
					}
					if (onPersistFog) {
						onPersistFog([...fogPaths, newFogPath]);
					}
				}
				fogCurrentPointsRef.current = [];
				return;
			}

			if (pendingTokenDragRef.current) {
				lastTokenTapRef.current = {
					id: pendingTokenDragRef.current.id,
					time: Date.now(),
				};
				pendingTokenDragRef.current = null;
			}

			// Finish Token Dragging with Magnetic Grid Snapping & Persistence.
			// Clear the drag flag only after the snapped position is stored, so
			// a broadcast that arrives in between cannot start interpolating.
			const group = dragGroupRef.current;
			if (group && draggingTokenIdRef.current && scene) {
				const worldPoint = screenToWorld(e.clientX, e.clientY);
				const moved = translateMembers(
					group.members,
					worldPoint.x - group.grabX,
					worldPoint.y - group.grabY,
				);
				const liveTokens = useVTTStore.getState().tokens;
				const dropMoves = moved.flatMap((member) => {
					const orig = group.members.find((m) => m.id === member.id);
					const token = liveTokens.find((item) => item.id === member.id);
					if (!token || !orig) return [];
					const snapped = snapToGrid(
						{ x: member.x, y: member.y },
						scene.gridType,
						scene.gridSize,
						token.sizeCells,
						gridOrigin,
					);
					return [
						{ id: member.id, from: { x: orig.x, y: orig.y }, to: snapped },
					];
				});
				commitTokenMovesRef.current(dropMoves, { commitUnchanged: true });
				paintAurasRef.current();
				draggingTokenIdRef.current = null;
				dragGroupRef.current = null;
				setDraggedTokenIds([]);
				destroyChildren(dragGhostLayerRef.current);
			}

			if (isDraggingViewportRef.current) {
				isDraggingViewportRef.current = false;
				container.style.cursor =
					isSpaceHeldRef.current || activeTool === "pan" ? "grab" : "default";
			}

			const rulerPress = rulerPressRef.current;
			rulerPressRef.current = null;
			if (rulerPress && activeTool === "ruler" && rulerCtx) {
				const current = useVTTStore.getState().activeMeasurement;
				const next = rulerPointerUp(
					{
						measurement: current,
						press: rulerPress,
						lastClick: lastRulerClickRef.current,
					},
					{ world: snapRuler(screenToWorld(e.clientX, e.clientY)) },
					rulerCtx,
				);
				if (next.measurement !== current)
					setActiveMeasurement(next.measurement);
			}
			// Clique direito no chão (sem arrastar) tira o último ponto.
			if (
				right &&
				!right.moved &&
				!right.tokenId &&
				activeTool === "ruler" &&
				rulerCtx
			) {
				const current = useVTTStore.getState().activeMeasurement;
				if (current) setActiveMeasurement(rulerUndo(current, rulerCtx));
			}

			if (templateStartRef.current && scene && activeTool === "template") {
				const start = templateStartRef.current;
				templateStartRef.current = null;
				const end = snapToGrid(
					screenToWorld(e.clientX, e.clientY),
					scene.gridType,
					scene.gridSize,
					1,
					gridOrigin,
				);
				const spellName = useVTTStore.getState().templateSpellName.trim();
				const placed: VTTSpellTemplate = {
					id: crypto.randomUUID(),
					kind: activeTemplateKind,
					originX: start.x,
					originY: start.y,
					targetX: end.x,
					targetY: end.y,
					color: userColor,
					userName: userNameRef.current,
					...(userIdRef.current ? { userId: userIdRef.current } : {}),
					...(spellName ? { spellName } : {}),
					...templateSize(),
				};
				addPlacedTemplate(placed);
				if (onBroadcastTemplate) onBroadcastTemplate(placed, true);
			}
		};

		const handleContextMenu = (e: MouseEvent) => e.preventDefault();

		// touchend follows pointerup; cancelling it drops the synthesized click.
		const handleTouchEnd = (e: TouchEvent) => {
			if (!swallowTapClickRef.current) return;
			swallowTapClickRef.current = false;
			if (e.cancelable) e.preventDefault();
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		container.addEventListener("wheel", handleWheel, { passive: false });
		container.addEventListener("pointerdown", handlePointerDown);
		container.addEventListener("contextmenu", handleContextMenu);
		container.addEventListener("touchend", handleTouchEnd, { passive: false });
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			container.removeEventListener("wheel", handleWheel);
			container.removeEventListener("pointerdown", handlePointerDown);
			container.removeEventListener("touchend", handleTouchEnd);
			container.removeEventListener("contextmenu", handleContextMenu);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerUp);
		};
	}, [
		viewport,
		setViewport,
		activeTool,
		scene,
		updateToken,
		onBroadcastDrag,
		onBroadcastDragBatch,
		onBroadcastCursor,
		onBroadcastPing,
		onBroadcastFog,
		onBroadcastTemplate,
		onPersistFog,
		fogPaths,
		addFogPath,
		activeFogTool,
		activeFogMode,
		fogBrushRadius,
		userColor,
		isGM,
		diagonalRule,
		activeTemplateKind,
		setActiveMeasurement,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
		setDraggedTokenIds,
		toggleSelectTokenId,
		setPreviewTemplate,
		addPlacedTemplate,
	]);

	return (
		<div className="absolute inset-0 h-full w-full">
			<div
				ref={containerRef}
				className="absolute inset-0 h-full w-full touch-none select-none overflow-hidden bg-background"
			/>
			<div
				ref={marqueeElRef}
				className="pointer-events-none absolute z-10 hidden border border-primary bg-primary/20"
			/>
		</div>
	);
}
