import {
	Application,
	Assets,
	Container,
	Graphics,
	Sprite,
	Text,
	TextStyle,
} from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { playPingAudio } from "@/lib/vtt/audio";
import { summarizeConditions, tokenRingStyle } from "@/lib/vtt/conditions";
import { drawFogGeometry } from "@/lib/vtt/fog-math";
import {
	calculateGridDistance,
	getFlatHexCorners,
	getPointyHexCorners,
	snapToGrid,
} from "@/lib/vtt/grid-math";
import {
	canControlVTTToken,
	type VTTCharacterOwner,
} from "@/lib/vtt/permissions";
import {
	isEditableElement,
	isVttShortcutBlocked,
} from "@/lib/vtt/shortcut-guard";
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
import {
	beginTokenPress,
	canvasPressAction,
	isDoublePress,
	type TokenPress,
	tokenPressEndAction,
	trackTokenPressMove,
} from "@/lib/vtt/token-press";
import type {
	VTTFogPath,
	VTTPingEvent,
	VTTRulerMeasurement,
	VTTScene,
	VTTToken,
} from "@/lib/vtt/types";
import { drawRulerMeasurement, drawSpellTemplate } from "@/lib/vtt/vtt-draw";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTCanvasProps {
	scene: VTTScene | null;
	characterOwners?: readonly VTTCharacterOwner[];
	onUpdateToken?: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<void>;
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
	const remoteRulersLayerRef = useRef<Graphics | null>(null);
	const remoteRulersLabelsRef = useRef<Container | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
	const measurementLabelsRef = useRef<Container | null>(null);
	const templatesLayerRef = useRef<Graphics | null>(null);
	const pingsLayerRef = useRef<Graphics | null>(null);
	const remoteCursorsLayerRef = useRef<Container | null>(null);

	// Display containers map for direct 60fps WebGL interpolation without React state thrashing
	const tokenDisplayObjectsRef = useRef<Map<string, Container>>(new Map());

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
		offset: { x: number; y: number };
	} | null>(null);
	const tokenDragOffsetRef = useRef({ x: 0, y: 0 });
	const lastBroadcastTimeRef = useRef(0);
	const lastCursorBroadcastRef = useRef(0);

	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const activeTool = useVTTStore((s) => s.activeTool);
	const activeLayer = useVTTStore((s) => s.activeLayer);
	const tokens = useVTTStore((s) => s.tokens);
	const selectedTokenIds = useVTTStore((s) => s.selectedTokenIds);
	const setSelectedTokenIds = useVTTStore((s) => s.setSelectedTokenIds);
	const setActiveTokenIdForMenu = useVTTStore((s) => s.setActiveTokenIdForMenu);
	const updateToken = useVTTStore((s) => s.updateToken);
	const setActiveMeasurement = useVTTStore((s) => s.setActiveMeasurement);
	const activePings = useVTTStore((s) => s.activePings);
	const addPing = useVTTStore((s) => s.addPing);
	const removePing = useVTTStore((s) => s.removePing);
	const setDraggedTokenId = useVTTStore((s) => s.setDraggedTokenId);
	const fogPaths = useVTTStore((s) => s.fogPaths);
	const addFogPath = useVTTStore((s) => s.addFogPath);
	const activeFogTool = useVTTStore((s) => s.activeFogTool);
	const activeFogMode = useVTTStore((s) => s.activeFogMode);
	const fogBrushRadius = useVTTStore((s) => s.fogBrushRadius);
	const remoteCursors = useVTTStore((s) => s.remoteCursors);
	const remoteMeasurements = useVTTStore((s) => s.remoteMeasurements);
	const userColor = useVTTStore((s) => s.userColor);
	const isGM = useVTTStore((s) => s.isGM);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const activeTemplateKind = useVTTStore((s) => s.activeTemplateKind);
	const previewTemplate = useVTTStore((s) => s.previewTemplate);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const remoteTemplates = useVTTStore((s) => s.remoteTemplates);
	const remoteTemplatePreviews = useVTTStore((s) => s.remoteTemplatePreviews);
	const setPreviewTemplate = useVTTStore((s) => s.setPreviewTemplate);
	const addPlacedTemplate = useVTTStore((s) => s.addPlacedTemplate);

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

			// 60FPS Direct PixiJS Display Object Interpolation (NO React re-renders)
			tickerCallback = () => {
				const currentTokens = useVTTStore.getState().tokens;

				for (const t of currentTokens) {
					if (t.targetX !== undefined && t.targetY !== undefined) {
						const displayObj = tokenDisplayObjectsRef.current.get(t.id);
						if (displayObj) {
							const dx = t.targetX - displayObj.x;
							const dy = t.targetY - displayObj.y;

							if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
								displayObj.x += dx * 0.35;
								displayObj.y += dy * 0.35;
							} else {
								displayObj.x = t.targetX;
								displayObj.y = t.targetY;
							}
						}
					}
				}
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

	// 3. Render Map & Grid whenever scene configuration changes
	useEffect(() => {
		if (!rendererReady) return;
		if (!appRef.current || !gridLayerRef.current || !mapLayerRef.current)
			return;

		const mapLayer = mapLayerRef.current;
		const grid = gridLayerRef.current;
		let cancelled = false;

		mapLayer.removeChildren();
		grid.clear();

		if (!scene) return;

		const {
			mapImageUrl,
			gridType,
			gridSize,
			gridColor,
			gridOpacity,
			width,
			height,
		} = scene;

		// Render Map Background Image if present
		if (mapImageUrl) {
			Assets.load(mapImageUrl)
				.then((texture) => {
					if (cancelled || mapLayer.destroyed) return;
					mapLayer.removeChildren();
					const sprite = new Sprite(texture);
					sprite.width = width;
					sprite.height = height;
					mapLayer.addChild(sprite);
				})
				.catch((err) => {
					console.warn("Falha ao carregar textura do mapa VTT:", err);
				});
		} else {
			const bg = new Graphics();
			bg.rect(0, 0, width, height);
			const palette = document.createElement("canvas").getContext("2d");
			if (palette && containerRef.current) {
				palette.fillStyle = getComputedStyle(containerRef.current).color;
				palette.fillRect(0, 0, 1, 1);
				const [r, g, b] = palette.getImageData(0, 0, 1, 1).data;
				bg.fill({ color: (r << 16) | (g << 8) | b, alpha: 0.04 });
			}
			mapLayer.addChild(bg);
		}

		// Draw Procedural Grid
		if (gridType === "none" || gridSize <= 0 || gridOpacity <= 0)
			return () => {
				cancelled = true;
			};

		const colorHex =
			Number.parseInt(gridColor.replace("#", "0x"), 16) || 0xffffff;

		if (gridType === "square") {
			grid.beginPath();
			for (let x = 0; x <= width; x += gridSize) {
				grid.moveTo(x, 0);
				grid.lineTo(x, height);
			}
			for (let y = 0; y <= height; y += gridSize) {
				grid.moveTo(0, y);
				grid.lineTo(width, y);
			}
			grid.stroke({ width: 1, color: colorHex, alpha: gridOpacity });
		} else if (gridType === "hex_pointy") {
			const r = gridSize / 2;
			const h = r * Math.sqrt(3);
			grid.beginPath();

			for (let x = 0; x <= width + r; x += 1.5 * r) {
				const col = Math.round(x / (1.5 * r));
				const offsetY = col % 2 !== 0 ? h / 2 : 0;
				for (let y = offsetY; y <= height + h; y += h) {
					const corners = getPointyHexCorners(x, y, r);
					grid.moveTo(corners[0].x, corners[0].y);
					for (let i = 1; i < 6; i++) {
						grid.lineTo(corners[i].x, corners[i].y);
					}
					grid.closePath();
				}
			}
			grid.stroke({ width: 1, color: colorHex, alpha: gridOpacity });
		} else if (gridType === "hex_flat") {
			const r = gridSize / 2;
			const w = r * Math.sqrt(3);
			grid.beginPath();

			for (let y = 0; y <= height + r; y += 1.5 * r) {
				const row = Math.round(y / (1.5 * r));
				const offsetX = row % 2 !== 0 ? w / 2 : 0;
				for (let x = offsetX; x <= width + w; x += w) {
					const corners = getFlatHexCorners(x, y, r);
					grid.moveTo(corners[0].x, corners[0].y);
					for (let i = 1; i < 6; i++) {
						grid.lineTo(corners[i].x, corners[i].y);
					}
					grid.closePath();
				}
			}
			grid.stroke({ width: 1, color: colorHex, alpha: gridOpacity });
		}
		return () => {
			cancelled = true;
		};
	}, [scene, rendererReady]);

	// 4. Render Tokens and Auras on the Stage (with exploration visibility & layer isolation)
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
		const aurasLayer = aurasLayerRef.current;

		tokensLayer.removeChildren();
		gmTokensLayer.removeChildren();
		aurasLayer.clear();
		tokenDisplayObjectsRef.current.clear();

		const gridSize = scene.gridSize || 70;

		// Calculate player tokens vision circles for Exploration Mode (Penumbra LOS check)
		const playerTokens = tokens.filter(
			(t) =>
				t.layer === "token" &&
				!t.isHidden &&
				(t.characterId || t.controlledBy?.length > 0),
		);

		for (const token of tokens) {
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
			const isSelected = selectedTokenIds.includes(token.id);

			// 4.1 Render Auras
			if (token.auras && token.auras.length > 0) {
				for (const aura of token.auras) {
					const auraRadius = aura.radius * gridSize;
					const colorHex =
						Number.parseInt(aura.color.replace("#", "0x"), 16) || 0x38bdf8;
					aurasLayer.circle(token.x, token.y, auraRadius);
					aurasLayer.fill({ color: colorHex, alpha: aura.opacity ?? 0.25 });
					aurasLayer.circle(token.x, token.y, auraRadius);
					aurasLayer.stroke({ width: 1.5, color: colorHex, alpha: 0.6 });
				}
			}

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
						mask.circle(0, 0, tokenRadius - 2);
						mask.fill({ color: 0xffffff });
						sprite.mask = mask;

						tokenContainer.addChildAt(mask, 1);
						tokenContainer.addChildAt(sprite, 2);
					})
					.catch(() => {
						const initials = token.name.slice(0, 2).toUpperCase();
						const text = new Text({
							text: initials,
							style: new TextStyle({
								fontFamily: "system-ui, sans-serif",
								fontSize: Math.max(12, tokenRadius * 0.7),
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
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: Math.max(12, tokenRadius * 0.7),
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
			ring.stroke({ width: ringStyle.width, color: ringStyle.color });
			tokenContainer.addChild(ring);

			// Status: até 3 ícones na base do token + "+N" (sem fundo colorido
			// nem brilho; só a borda do chip na cor do status).
			const status = summarizeConditions(token.conditions);
			const hasStatusRow = status.visible.length > 0;
			if (hasStatusRow) {
				const chipR = Math.max(7, tokenRadius * 0.26);
				const slots = status.visible.length + (status.overflow > 0 ? 1 : 0);
				const gap = chipR * 2 + 2;
				const startX = -((slots - 1) * gap) / 2;
				const chipY = tokenRadius - chipR * 0.4;
				const drawChip = (x: number, label: string, color: number) => {
					const chip = new Graphics();
					chip.circle(x, chipY, chipR);
					chip.fill({ color: 0x18181b, alpha: 0.92 });
					chip.stroke({ width: 1.5, color });
					tokenContainer.addChild(chip);
					const text = new Text({
						text: label,
						style: new TextStyle({
							fontFamily: "system-ui, sans-serif",
							fontSize: Math.max(8, chipR * 1.05),
							fontWeight: "bold",
							fill: "#ffffff",
						}),
					});
					text.anchor.set(0.5);
					text.position.set(x, chipY);
					tokenContainer.addChild(text);
				};
				status.visible.forEach((cond, i) => {
					drawChip(startX + i * gap, cond.icon, cond.hex);
				});
				if (status.overflow > 0) {
					drawChip(
						startX + status.visible.length * gap,
						`+${status.overflow}`,
						0xd4d4d8,
					);
				}
			}

			// GM Shield Badge
			if (isGMLayer) {
				const gmBadge = new Graphics();
				gmBadge.circle(tokenRadius * 0.65, -tokenRadius * 0.65, 8);
				gmBadge.fill({ color: 0x581c87 });
				gmBadge.stroke({ width: 1.5, color: 0xc084fc });
				tokenContainer.addChild(gmBadge);

				const gmText = new Text({
					text: "GM",
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: 8,
						fontWeight: "bold",
						fill: "#ffffff",
					}),
				});
				gmText.anchor.set(0.5);
				gmText.position.set(tokenRadius * 0.65, -tokenRadius * 0.65);
				tokenContainer.addChild(gmText);
			}

			// Selection outer pulse ring
			if (isSelected) {
				const outerGlow = new Graphics();
				outerGlow.circle(0, 0, tokenRadius + 4);
				outerGlow.stroke({ width: 1.5, color: 0x38bdf8, alpha: 0.6 });
				tokenContainer.addChild(outerGlow);
			}

			// HP Bar (Above token)
			if (token.hpMax && token.hpMax > 0 && !isGMLayer) {
				const currentHp = Math.max(0, token.hpCurrent ?? 0);
				const maxHp = Math.max(1, token.hpMax ?? currentHp ?? 1);
				const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));

				const barWidth = tokenRadius * 1.8;
				const barHeight = Math.max(4, tokenRadius * 0.16);
				const barY = -tokenRadius - barHeight - 4;

				const hpBar = new Graphics();
				hpBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, 3);
				hpBar.fill({ color: 0x000000, alpha: 0.8 });

				const fillColor =
					hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.2 ? 0xf59e0b : 0xef4444;

				if (hpRatio > 0) {
					hpBar.roundRect(
						-barWidth / 2,
						barY,
						Math.max(2, barWidth * hpRatio),
						barHeight,
						3,
					);
					hpBar.fill({ color: fillColor });
				}

				hpBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, 3);
				hpBar.stroke({ width: 1, color: 0xffffff, alpha: 0.3 });

				tokenContainer.addChild(hpBar);
			}

			// Elevation Badge
			if (token.elevation && token.elevation !== 0) {
				const elevText = new Text({
					text: `↑ ${token.elevation}m`,
					style: new TextStyle({
						fontFamily: "system-ui, sans-serif",
						fontSize: Math.max(9, tokenRadius * 0.35),
						fontWeight: "bold",
						fill: "#38bdf8",
						dropShadow: {
							alpha: 0.8,
							angle: Math.PI / 6,
							blur: 2,
							color: "#000000",
							distance: 1,
						},
					}),
				});
				elevText.anchor.set(0.5);
				elevText.position.set(
					0,
					tokenRadius +
						(hasStatusRow ? Math.max(7, tokenRadius * 0.26) + 10 : 8),
				);
				tokenContainer.addChild(elevText);
			}

			// Tooltip do DS com os status (DOM, fora do canvas): só marca qual
			// token está sob o ponteiro; nada no ticker.
			if (hasStatusRow) {
				tokenContainer.on("pointerover", () => {
					if (useVTTStore.getState().draggedTokenId) return;
					useVTTStore.getState().setHoveredStatusTokenId(token.id);
				});
				tokenContainer.on("pointerout", () => {
					const s = useVTTStore.getState();
					if (s.hoveredStatusTokenId === token.id)
						s.setHoveredStatusTokenId(null);
				});
			}

			// Duplo clique abre a Ficha na mesa (mesma regra do menu do token:
			// só quem controla o token). Lê a store no handler; nada re-renderiza.
			tokenContainer.on("pointertap", (e) => {
				if (!canControl || e.detail < 2 || e.button !== 0) return;
				const s = useVTTStore.getState();
				if (s.activeTool !== "select") return;
				s.setActiveTokenIdForMenu(null);
				s.setShowCharacterSheetId(token.id);
			});

			// Token Pointer Events (Drag & Selection with Strict Layer Isolation)
			tokenContainer.on("pointerdown", (e) => {
				if (!canControl) return;
				if (e.button === 2) {
					e.stopPropagation();
					setSelectedTokenIds([token.id]);
					setActiveTokenIdForMenu(token.id);
					return;
				}

				if (
					e.button === 0 &&
					!isSpaceHeldRef.current &&
					!isAltHeldRef.current &&
					activeTool === "select"
				) {
					// Strict Layer Isolation:
					// 1. Map Layer: Tokens cannot be selected/dragged
					if (activeLayer === "map") return;
					// 2. GM Layer: Only GM tokens can be selected
					if (activeLayer === "gm" && !isGMLayer) return;
					// 3. Token Layer: GM tokens cannot be selected
					if (activeLayer === "token" && isGMLayer) return;

					e.stopPropagation();
					tokenPressRef.current = beginTokenPress(
						token.id,
						e,
						e.nativeEvent instanceof Event ? e.nativeEvent : null,
					);
					const current = useVTTStore.getState();
					if (
						current.selectedTokenIds.length !== 1 ||
						current.selectedTokenIds[0] !== token.id
					) {
						setSelectedTokenIds([token.id]);
					}
					const openMenuId = current.activeTokenIdForMenu;
					if (openMenuId && openMenuId !== token.id) {
						setActiveTokenIdForMenu(null);
					}

					const now = Date.now();
					if (isDoublePress(lastTokenTapRef.current, token.id, now)) {
						setActiveTokenIdForMenu(token.id);
						lastTokenTapRef.current = null;
						pendingTokenDragRef.current = null;
						return;
					}
					lastTokenTapRef.current = { id: token.id, time: now };

					if (!token.isLocked) {
						const rect = containerRef.current?.getBoundingClientRect();
						const offset = { x: 0, y: 0 };
						if (rect) {
							const clientX = e.clientX - rect.left;
							const clientY = e.clientY - rect.top;
							const worldX = (clientX - viewport.x) / viewport.scale;
							const worldY = (clientY - viewport.y) / viewport.scale;
							offset.x = worldX - token.x;
							offset.y = worldY - token.y;
						}
						pendingTokenDragRef.current = { id: token.id, offset };
					}
				}
			});

			if (isGMLayer) {
				gmTokensLayer.addChild(tokenContainer);
			} else {
				tokensLayer.addChild(tokenContainer);
			}
		}
	}, [
		rendererReady,
		tokens,
		characterOwners,
		user?.id,
		scene,
		selectedTokenIds,
		isGM,
		viewport.x,
		viewport.y,
		viewport.scale,
		activeTool,
		activeLayer,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
	]);

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

		const width = scene.width || 4000;
		const height = scene.height || 4000;
		const gridSize = scene.gridSize || 70;

		// GM mode: semi-transparent blue-tinted dark fog (~45% opacity)
		// Player mode: solid pitch black fog (100% opacity)
		const fogColor = isGM ? 0x0f172a : 0x090a0f;
		const fogAlpha = isGM ? 0.45 : 1.0;

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
			const isMiddleClick = e.button === 1;
			const isLeftClick = e.button === 0;

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

			// Deselect if clicking on empty canvas. A press on a token reaches this
			// listener right after the token handler (same DOM event), so it must
			// not undo the selection/panel that handler just set.
			if (
				canvasPressAction(tokenPressRef.current, e, {
					isLeftClick,
					activeTool,
				}) === "deselect"
			) {
				tokenPressRef.current = null;
				setSelectedTokenIds([]);
				setActiveTokenIdForMenu(null);
			}

			// Ruler Start
			if (activeTool === "ruler" && isLeftClick && scene) {
				const snapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				rulerStartRef.current = snapped;
			}

			if (activeTool === "template" && isLeftClick && scene) {
				const snapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				templateStartRef.current = snapped;
			}
		};

		const handlePointerMove = (e: PointerEvent) => {
			const worldPoint = screenToWorld(e.clientX, e.clientY);
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
					if (pending && !draggingTokenIdRef.current) {
						draggingTokenIdRef.current = pending.id;
						tokenDragOffsetRef.current = pending.offset;
						setDraggedTokenId(pending.id);
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

			// Handle Token Dragging with Realtime Broadcast
			if (draggingTokenIdRef.current && scene) {
				const rawX = worldPoint.x - tokenDragOffsetRef.current.x;
				const rawY = worldPoint.y - tokenDragOffsetRef.current.y;

				// Local optimistic update
				updateToken(draggingTokenIdRef.current, { x: rawX, y: rawY });

				// Realtime drag broadcast
				if (onBroadcastDrag && now - lastBroadcastTimeRef.current > 30) {
					lastBroadcastTimeRef.current = now;
					onBroadcastDrag(draggingTokenIdRef.current, rawX, rawY);
				}
				return;
			}

			// Handle Viewport Pan
			if (isDraggingViewportRef.current) {
				const nextX = e.clientX - viewportDragStartRef.current.x;
				const nextY = e.clientY - viewportDragStartRef.current.y;
				setViewport({ x: nextX, y: nextY });
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
				);
			}

			if (activeTool === "template" && templateStartRef.current && scene) {
				const currentSnapped = snapToGrid(
					worldPoint,
					scene.gridType,
					scene.gridSize,
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
			// A touch/pen tap on a token (no drag) selects it and opens its panel.
			const press = tokenPressRef.current;
			tokenPressRef.current = null;
			if (
				press &&
				tokenPressEndAction(press, e.clientX, e.clientY) === "open-panel"
			) {
				swallowTapClickRef.current = press.pointerType === "touch";
				setActiveTokenIdForMenu(press.tokenId);
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

			// Finish Token Dragging with Magnetic Grid Snapping & Persistence
			if (draggingTokenIdRef.current && scene) {
				const tokenId = draggingTokenIdRef.current;
				const token = tokens.find((t) => t.id === tokenId);
				draggingTokenIdRef.current = null;
				setDraggedTokenId(null);

				if (token) {
					const worldPoint = screenToWorld(e.clientX, e.clientY);
					const rawX = worldPoint.x - tokenDragOffsetRef.current.x;
					const rawY = worldPoint.y - tokenDragOffsetRef.current.y;

					const snapped = snapToGrid(
						{ x: rawX, y: rawY },
						scene.gridType,
						scene.gridSize,
						token.sizeCells,
					);

					// Apply snapped position locally and persist to Supabase
					updateToken(tokenId, { x: snapped.x, y: snapped.y });
					if (onUpdateToken) {
						void onUpdateToken(tokenId, { x: snapped.x, y: snapped.y });
					}
					if (onBroadcastDrag) {
						onBroadcastDrag(tokenId, snapped.x, snapped.y);
					}
				}
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

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			container.removeEventListener("wheel", handleWheel);
			container.removeEventListener("pointerdown", handlePointerDown);
			container.removeEventListener("touchend", handleTouchEnd);
			container.removeEventListener("contextmenu", handleContextMenu);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [
		viewport,
		setViewport,
		activeTool,
		scene,
		tokens,
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
		setDraggedTokenId,
		setPreviewTemplate,
		addPlacedTemplate,
	]);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 h-full w-full touch-none select-none overflow-hidden bg-background"
		/>
	);
}
