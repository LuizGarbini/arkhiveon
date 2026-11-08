import {
	Application,
	Assets,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
	Texture,
} from "pixi.js";
import { useEffect, useMemo, useRef, useState } from "react";
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
	drawFogGeometry,
	GM_FOG_ALPHA,
	GM_FOG_COLOR,
	PLAYER_FOG_COLOR,
} from "@/lib/vtt/fog-math";
import {
	calculateGridDistance,
	flatHexCenters,
	getFlatHexCorners,
	getPointyHexCorners,
	pointyHexCenters,
	snapToGrid,
	squareGridLines,
	ZERO_ORIGIN,
} from "@/lib/vtt/grid-math";
import {
	canControlVTTToken,
	type VTTCharacterOwner,
} from "@/lib/vtt/permissions";
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
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
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
import type {
	VTTFogPath,
	VTTPingEvent,
	VTTRulerMeasurement,
	VTTScene,
	VTTToken,
} from "@/lib/vtt/types";
import {
	drawRulerMeasurement,
	drawSpellTemplate,
	drawWallPreview,
	drawWalls,
	parseHexColor,
} from "@/lib/vtt/vtt-draw";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { finishWallDraft } from "@/lib/vtt/wall-sync";
import { hitTestWall, snapWallPoint } from "@/lib/vtt/walls";

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
	onPersistFog?: (paths: VTTFogPath[]) => void;
}

const EMPTY_CHARACTER_OWNERS: readonly VTTCharacterOwner[] = [];

export function VTTCanvas({
	scene,
	characterOwners = EMPTY_CHARACTER_OWNERS,
	onUpdateToken,
	onBroadcastDrag,
	onBroadcastCursor,
	onBroadcastRuler,
	onBroadcastPing,
	onBroadcastFog,
	onBroadcastTemplate,
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
	const fogOfWarLayerRef = useRef<Graphics | null>(null);
	const fogBrushPreviewLayerRef = useRef<Graphics | null>(null);
	// Paredes (só mestre): um Graphics para todas + um para a prévia do desenho.
	const wallsLayerRef = useRef<Graphics | null>(null);
	const wallPreviewLayerRef = useRef<Graphics | null>(null);
	const wallCursorRef = useRef<{ x: number; y: number } | null>(null);
	const lastWallClickRef = useRef<{ x: number; y: number; t: number } | null>(
		null,
	);
	const remoteRulersLayerRef = useRef<Graphics | null>(null);
	const remoteRulersLabelsRef = useRef<Container | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
	const measurementLabelsRef = useRef<Container | null>(null);
	const templatesLayerRef = useRef<Graphics | null>(null);
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
	const rulerStartRef = useRef<{ x: number; y: number } | null>(null);
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
	const userIdRef = useRef(user?.id);
	userIdRef.current = user?.id;
	const lastBroadcastTimeRef = useRef(0);
	const lastCursorBroadcastRef = useRef(0);

	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const activeTool = useVTTStore((s) => s.activeTool);
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
	const activePings = useVTTStore((s) => s.activePings);
	const addPing = useVTTStore((s) => s.addPing);
	const removePing = useVTTStore((s) => s.removePing);
	const setDraggedTokenIds = useVTTStore((s) => s.setDraggedTokenIds);
	const toggleSelectTokenId = useVTTStore((s) => s.toggleSelectTokenId);
	const fogPaths = useVTTStore((s) => s.fogPaths);
	const addFogPath = useVTTStore((s) => s.addFogPath);
	const activeFogTool = useVTTStore((s) => s.activeFogTool);
	const activeFogMode = useVTTStore((s) => s.activeFogMode);
	const fogBrushRadius = useVTTStore((s) => s.fogBrushRadius);
	const remoteCursors = useVTTStore((s) => s.remoteCursors);
	const remoteMeasurements = useVTTStore((s) => s.remoteMeasurements);
	const userColor = useVTTStore((s) => s.userColor);
	const isGM = useVTTStore((s) => s.isGM);
	// Position and the remote target stay out of this key so a drag does not
	// destroy and recreate the sprite on every pointer move.
	const tokenAppearance = useMemo(() => tokensAppearanceKey(tokens), [tokens]);
	const tokenVisibility = useMemo(
		() => visibleTokenIds(tokens, isGM, scene),
		[tokens, isGM, scene],
	);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const activeTemplateKind = useVTTStore((s) => s.activeTemplateKind);
	const previewTemplate = useVTTStore((s) => s.previewTemplate);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const remoteTemplates = useVTTStore((s) => s.remoteTemplates);
	const remoteTemplatePreviews = useVTTStore((s) => s.remoteTemplatePreviews);
	const setPreviewTemplate = useVTTStore((s) => s.setPreviewTemplate);
	const addPlacedTemplate = useVTTStore((s) => s.addPlacedTemplate);
	const walls = useVTTStore((s) => s.walls);
	const selectedWallIds = useVTTStore((s) => s.selectedWallIds);
	const wallDraft = useVTTStore((s) => s.wallDraft);

	// 1. Initialize PixiJS Application
	useEffect(() => {
		if (!containerRef.current) return;

		let isMounted = true;
		const app = new Application();
		let tickerCallback: (() => void) | null = null;

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

			// Solid Fog of War mask layer
			const fogOfWarLayer = new Graphics();
			fogOfWarLayerRef.current = fogOfWarLayer;
			world.addChild(fogOfWarLayer);

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

			const templatesLayer = new Graphics();
			templatesLayerRef.current = templatesLayer;
			world.addChild(templatesLayer);

			const pingsLayer = new Graphics();
			pingsLayerRef.current = pingsLayer;
			world.addChild(pingsLayer);

			const remoteCursorsLayer = new Container();
			remoteCursorsLayerRef.current = remoteCursorsLayer;
			world.addChild(remoteCursorsLayer);

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
			if (appRef.current) {
				if (tickerCallback) {
					appRef.current.ticker.remove(tickerCallback);
				}
				appRef.current.destroy(true, { children: true });
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

		const colorHex =
			Number.parseInt(sceneGridColor.replace("#", "0x"), 16) || 0xffffff;

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

		// Calculate player tokens vision circles for Exploration Mode (Penumbra LOS check)
		const playerTokens = liveTokens.filter(
			(t) =>
				t.layer === "token" &&
				!t.isHidden &&
				(t.characterId || t.controlledBy?.length > 0),
		);

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
					// Check if this NPC/monster token is inside any active player token's vision circle
					const isInActiveVision = playerTokens.some((pt) => {
						const vRange = (pt.visionRange || 6) * gridSize;
						const dist = Math.hypot(pt.x - token.x, pt.y - token.y);
						return dist <= vRange;
					});

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
				isGM,
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
												live.isGM,
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

	// 5. Render WebGL Fog of War Layer (with cutting masks and dynamic Exploration Penumbra)
	useEffect(() => {
		if (!rendererReady) return;
		if (!fogOfWarLayerRef.current || !fogExplorationLayerRef.current || !scene)
			return;
		const fogLayer = fogOfWarLayerRef.current;
		const explorationLayer = fogExplorationLayerRef.current;

		fogLayer.clear();
		explorationLayer.clear();

		if (!scene.fogEnabled) {
			fogLayer.visible = false;
			explorationLayer.visible = false;
			return;
		}

		fogLayer.visible = true;

		const width = (scene.width || 4000) * (scene.mapScale || 1);
		const height = (scene.height || 4000) * (scene.mapScale || 1);
		const gridSize = scene.gridSize || 70;

		// Véu do mestre: quase preto, ainda dá para ver o mapa por baixo.
		// Jogador: névoa opaca.
		const fogColor = isGM ? GM_FOG_COLOR : PLAYER_FOG_COLOR;
		const fogAlpha = isGM ? GM_FOG_ALPHA : 1;

		// 5.1 Base Solid Fog Covering Scene
		fogLayer.rect(0, 0, width, height);
		fogLayer.fill({ color: fogColor, alpha: fogAlpha });

		// 5.2 Chronological Fog Mask Shaping (Cutouts & Hidden Re-fills)
		for (const path of fogPaths) {
			const isReveal = path.mode === "reveal";
			drawFogGeometry(fogLayer, path, isReveal, fogColor, fogAlpha);
		}

		// 5.3 Exploration Mode (Penumbra):
		// Explored areas are covered by twilight/penumbra, cut open by active player token vision
		if (!isGM && scene.fogExploration) {
			explorationLayer.visible = true;

			// Base Penumbra overlay over the map
			explorationLayer.rect(0, 0, width, height);
			explorationLayer.fill({ color: 0x090a0f, alpha: 0.55 });

			// Cut out active vision circles around player-controlled tokens
			const playerTokens = tokens.filter(
				(t) =>
					t.layer === "token" &&
					!t.isHidden &&
					(t.characterId || t.controlledBy?.length > 0),
			);

			for (const pt of playerTokens) {
				const vRange = (pt.visionRange || 6) * gridSize;
				explorationLayer.circle(pt.x, pt.y, vRange);
				explorationLayer.cut();
			}
		} else {
			explorationLayer.visible = false;
		}
	}, [scene, fogPaths, tokens, isGM, rendererReady]);

	// 6. Render Remote Multiplayer Cursors
	useEffect(() => {
		if (!rendererReady) return;
		if (!remoteCursorsLayerRef.current) return;
		const layer = remoteCursorsLayerRef.current;
		layer.removeChildren();

		for (const cursor of Object.values(remoteCursors)) {
			const cursorContainer = new Container();
			cursorContainer.position.set(cursor.x, cursor.y);

			const colorHex =
				Number.parseInt(cursor.color.replace("#", "0x"), 16) || 0x38bdf8;

			// Pointer Arrow
			const arrow = new Graphics();
			arrow.moveTo(0, 0);
			arrow.lineTo(0, 16);
			arrow.lineTo(4, 12);
			arrow.lineTo(10, 16);
			arrow.lineTo(12, 14);
			arrow.lineTo(6, 10);
			arrow.lineTo(14, 8);
			arrow.closePath();
			arrow.fill({ color: colorHex });
			arrow.stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
			cursorContainer.addChild(arrow);

			// User Name Tag
			const nameTag = new Text({
				text: cursor.userName,
				style: new TextStyle({
					fontFamily: "system-ui, sans-serif",
					fontSize: 10,
					fontWeight: "bold",
					fill: "#ffffff",
					dropShadow: {
						alpha: 0.9,
						angle: Math.PI / 4,
						blur: 2,
						color: "#000000",
						distance: 1,
					},
				}),
			});
			nameTag.position.set(14, 12);
			cursorContainer.addChild(nameTag);

			layer.addChild(cursorContainer);
		}
	}, [remoteCursors, rendererReady]);

	// 7. Render Remote Multiplayer Measurements (with distance labels)
	useEffect(() => {
		if (!rendererReady) return;
		if (!remoteRulersLayerRef.current || !remoteRulersLabelsRef.current) return;
		const layer = remoteRulersLayerRef.current;
		const labelsLayer = remoteRulersLabelsRef.current;

		layer.clear();
		labelsLayer.removeChildren();

		for (const m of Object.values(remoteMeasurements)) {
			const colorHex =
				Number.parseInt(m.color.replace("#", "0x"), 16) || 0x38bdf8;

			// Line & Endpoints
			layer.moveTo(m.startX, m.startY);
			layer.lineTo(m.currentX, m.currentY);
			layer.stroke({ width: 2.5, color: colorHex, alpha: 0.85 });

			layer.circle(m.startX, m.startY, 5);
			layer.fill({ color: colorHex });
			layer.circle(m.currentX, m.currentY, 5);
			layer.fill({ color: colorHex });

			// Distance Badge Label
			const label = new Text({
				text: `${m.userName}: ${m.distance.toFixed(1)}${m.unit}`,
				style: new TextStyle({
					fontFamily: "system-ui, sans-serif",
					fontSize: 11,
					fontWeight: "bold",
					fill: m.color || "#38bdf8",
					dropShadow: {
						alpha: 0.9,
						angle: Math.PI / 4,
						blur: 3,
						color: "#000000",
						distance: 1.5,
					},
				}),
			});
			label.anchor.set(0.5);
			label.position.set(
				(m.startX + m.currentX) / 2,
				(m.startY + m.currentY) / 2 - 12,
			);
			labelsLayer.addChild(label);
		}
	}, [remoteMeasurements, rendererReady]);

	// 7b. Render spell templates (local preview, placed, remote)
	useEffect(() => {
		if (!rendererReady) return;
		if (!templatesLayerRef.current || !scene) return;
		const layer = templatesLayerRef.current;
		layer.clear();

		const allTemplates: VTTSpellTemplate[] = [
			...placedTemplates,
			...Object.values(remoteTemplates),
			...Object.values(remoteTemplatePreviews),
		];
		if (previewTemplate) allTemplates.push(previewTemplate);

		for (const template of allTemplates) {
			drawSpellTemplate(layer, template, scene.gridSize);
		}
	}, [
		placedTemplates,
		remoteTemplates,
		remoteTemplatePreviews,
		previewTemplate,
		scene,
		rendererReady,
	]);

	// 7c. Paredes: redesenha só quando a lista ou a seleção mudam (zoom e pan
	// só mexem no container do mundo; nada no ticker). O jogador não recebe paredes e nada é desenhado.
	useEffect(() => {
		if (!rendererReady || !wallsLayerRef.current) return;
		drawWalls(wallsLayerRef.current, isGM ? walls : [], selectedWallIds);
	}, [walls, selectedWallIds, isGM, rendererReady]);

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

	// 8. Render Active Pings (Concentric pulsing ripples)
	useEffect(() => {
		if (!rendererReady) return;
		if (!pingsLayerRef.current) return;
		const layer = pingsLayerRef.current;
		layer.clear();

		const now = Date.now();
		for (const ping of activePings) {
			const elapsed = now - ping.timestamp;
			if (elapsed > 3000) {
				removePing(ping.timestamp);
				continue;
			}

			const progress = elapsed / 3000;
			const radius = 20 + progress * 60;
			const alpha = Math.max(0, 1 - progress);
			const colorHex =
				Number.parseInt(ping.color.replace("#", "0x"), 16) || 0xa855f7;

			layer.circle(ping.x, ping.y, radius);
			layer.stroke({ width: 3, color: colorHex, alpha });

			layer.circle(ping.x, ping.y, 6);
			layer.fill({ color: colorHex, alpha });
		}
	}, [activePings, removePing, rendererReady]);

	// 9. Native DOM event listeners for Pan, Zoom, Token Drag, Fog Painting, Alt-Ping & Ruler
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const gridOrigin = scene
			? { x: scene.gridOffsetX ?? 0, y: scene.gridOffsetY ?? 0 }
			: ZERO_ORIGIN;

		const screenToWorld = (screenX: number, screenY: number) => {
			const rect = container.getBoundingClientRect();
			const clientX = screenX - rect.left;
			const clientY = screenY - rect.top;
			return {
				x: (clientX - viewport.x) / viewport.scale,
				y: (clientY - viewport.y) / viewport.scale,
			};
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const typing = isEditableElement(
				e.target instanceof Element ? e.target : null,
			);
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
			// Esc dentro de um dialog (ex.: imagem em tela cheia) fecha só o dialog.
			const inDialog =
				e.target instanceof Element && e.target.closest('[role="dialog"]');
			if (e.key === "Escape" && !inDialog) {
				setActiveTokenIdForMenu(null);
				setPreviewTemplate(null);
				templateStartRef.current = null;
				if (onBroadcastTemplate) onBroadcastTemplate(null);
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

			// Fast Alt + Click Instant Ping OR Ping tool
			if ((isAltHeldRef.current || activeTool === "ping") && isLeftClick) {
				const pingEvent: VTTPingEvent = {
					x: worldPoint.x,
					y: worldPoint.y,
					userId: "self",
					userName: isGM ? "Mestre" : "Jogador",
					color: userColor,
					timestamp: Date.now(),
				};
				addPing(pingEvent);
				playPingAudio();
				if (onBroadcastPing) {
					onBroadcastPing(pingEvent);
				}
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

			// Deselect if clicking on empty canvas. A press on a token reaches this
			// listener right after the token handler (same DOM event), so it must
			// not undo the selection/panel that handler just set.
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
				const rect = container.getBoundingClientRect();
				marqueeRef.current = {
					startX: e.clientX - rect.left,
					startY: e.clientY - rect.top,
					additive,
					moved: false,
				};
			}

			// Ruler Start
			if (activeTool === "ruler" && isLeftClick && scene) {
				const snapped = snapToGrid(
					worldPoint,
					scene.gridType,
					scene.gridSize,
					1,
					gridOrigin,
				);
				rulerStartRef.current = snapped;
			}

			if (activeTool === "template" && isLeftClick && scene) {
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
			if (onBroadcastCursor && now - lastCursorBroadcastRef.current > 30) {
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
				const broadcast = now - lastBroadcastTimeRef.current > 30;
				if (broadcast) lastBroadcastTimeRef.current = now;
				for (const member of moved) {
					const display = tokenDisplayObjectsRef.current.get(member.id);
					if (display) display.position.set(member.x, member.y);
					updateToken(member.id, { x: member.x, y: member.y });
					if (broadcast && onBroadcastDrag) {
						onBroadcastDrag(member.id, member.x, member.y);
					}
				}
				paintAurasRef.current();
				return;
			}

			// Handle Ruler Drawing
			if (
				activeTool === "ruler" &&
				rulerStartRef.current &&
				scene &&
				measurementLayerRef.current &&
				measurementLabelsRef.current
			) {
				const currentSnapped = snapToGrid(
					worldPoint,
					scene.gridType,
					scene.gridSize,
					1,
					gridOrigin,
				);
				const start = rulerStartRef.current;

				const { distance } = calculateGridDistance(
					start,
					currentSnapped,
					scene.gridSize,
					scene.gridScaleDistance,
					scene.gridScaleUnit,
					diagonalRule,
				);

				const measurement: VTTRulerMeasurement = {
					startX: start.x,
					startY: start.y,
					currentX: currentSnapped.x,
					currentY: currentSnapped.y,
					distance,
					unit: scene.gridScaleUnit,
				};

				setActiveMeasurement(measurement);
				if (onBroadcastRuler) {
					onBroadcastRuler(measurement);
				}

				const layer = measurementLayerRef.current;
				const labels = measurementLabelsRef.current;
				layer.clear();
				labels.removeChildren();
				drawRulerMeasurement(
					layer,
					labels,
					start,
					currentSnapped,
					scene.gridSize,
					scene.gridScaleDistance,
					scene.gridScaleUnit,
					userColor,
					diagonalRule,
					gridOrigin,
				);
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
				};
				setPreviewTemplate(template);
				if (onBroadcastTemplate) onBroadcastTemplate(template);
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
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
									live.isGM,
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
				for (const member of moved) {
					const token = liveTokens.find((item) => item.id === member.id);
					if (!token) continue;
					const snapped = snapToGrid(
						{ x: member.x, y: member.y },
						scene.gridType,
						scene.gridSize,
						token.sizeCells,
						gridOrigin,
					);
					const display = tokenDisplayObjectsRef.current.get(member.id);
					if (display) display.position.set(snapped.x, snapped.y);
					updateToken(member.id, { x: snapped.x, y: snapped.y });
					if (onUpdateToken) {
						void onUpdateToken(member.id, { x: snapped.x, y: snapped.y });
					}
					if (onBroadcastDrag) {
						onBroadcastDrag(member.id, snapped.x, snapped.y);
					}
				}
				paintAurasRef.current();
				draggingTokenIdRef.current = null;
				dragGroupRef.current = null;
				setDraggedTokenIds([]);
			}

			if (isDraggingViewportRef.current) {
				isDraggingViewportRef.current = false;
				container.style.cursor =
					isSpaceHeldRef.current || activeTool === "pan" ? "grab" : "default";
			}

			if (rulerStartRef.current) {
				rulerStartRef.current = null;
				setActiveMeasurement(null);
				if (onBroadcastRuler) {
					onBroadcastRuler(null);
				}
				if (measurementLayerRef.current) {
					measurementLayerRef.current.clear();
				}
				if (measurementLabelsRef.current) {
					measurementLabelsRef.current.removeChildren();
				}
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
				const placed: VTTSpellTemplate = {
					id: crypto.randomUUID(),
					kind: activeTemplateKind,
					originX: start.x,
					originY: start.y,
					targetX: end.x,
					targetY: end.y,
					color: userColor,
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
		onUpdateToken,
		onBroadcastDrag,
		onBroadcastCursor,
		onBroadcastRuler,
		onBroadcastPing,
		onBroadcastFog,
		onBroadcastTemplate,
		onPersistFog,
		addPing,
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
