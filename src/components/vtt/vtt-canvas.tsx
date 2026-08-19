import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { playPingAudio } from "@/lib/vtt/audio";
import { getThickLinePolygon } from "@/lib/vtt/fog-math";
import {
	calculateGridDistance,
	getFlatHexCorners,
	getPointyHexCorners,
	snapToGrid,
} from "@/lib/vtt/grid-math";
import type {
	VTTFogPath,
	VTTPingEvent,
	VTTRulerMeasurement,
	VTTScene,
	VTTToken,
} from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTCanvasProps {
	scene: VTTScene | null;
	onUpdateToken?: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
	onBroadcastDrag?: (tokenId: string, x: number, y: number) => void;
	onBroadcastCursor?: (x: number, y: number) => void;
	onBroadcastRuler?: (measurement: VTTRulerMeasurement | null) => void;
	onBroadcastPing?: (ping: VTTPingEvent) => void;
	onBroadcastFog?: (path: VTTFogPath) => void;
	onPersistFog?: (paths: VTTFogPath[]) => void;
}

export function VTTCanvas({
	scene,
	onUpdateToken,
	onBroadcastDrag,
	onBroadcastCursor,
	onBroadcastRuler,
	onBroadcastPing,
	onBroadcastFog,
	onPersistFog,
}: VTTCanvasProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const worldContainerRef = useRef<Container | null>(null);
	const mapLayerRef = useRef<Container | null>(null);
	const gridLayerRef = useRef<Graphics | null>(null);
	const aurasLayerRef = useRef<Graphics | null>(null);
	const tokensLayerRef = useRef<Container | null>(null);
	const gmTokensLayerRef = useRef<Container | null>(null);
	const fogOfWarLayerRef = useRef<Graphics | null>(null);
	const fogBrushPreviewLayerRef = useRef<Graphics | null>(null);
	const remoteRulersLayerRef = useRef<Graphics | null>(null);
	const remoteRulersLabelsRef = useRef<Container | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
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

	// Fog Drawing refs
	const fogStrokeStartRef = useRef<{ x: number; y: number } | null>(null);
	const fogCurrentPointsRef = useRef<{ x: number; y: number }[]>([]);

	// Token Dragging refs
	const draggingTokenIdRef = useRef<string | null>(null);
	const tokenDragOffsetRef = useRef({ x: 0, y: 0 });
	const lastBroadcastTimeRef = useRef(0);
	const lastCursorBroadcastRef = useRef(0);

	const {
		viewport,
		setViewport,
		activeTool,
		activeLayer,
		tokens,
		selectedTokenIds,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
		updateToken,
		setActiveMeasurement,
		activePings,
		addPing,
		removePing,
		setDraggedTokenId,
		fogPaths,
		addFogPath,
		activeFogTool,
		activeFogMode,
		fogBrushRadius,
		remoteCursors,
		remoteMeasurements,
		userColor,
		isGM,
	} = useVTTStore();

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
				backgroundColor: 0x090a0f,
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

			const pingsLayer = new Graphics();
			pingsLayerRef.current = pingsLayer;
			world.addChild(pingsLayer);

			const remoteCursorsLayer = new Container();
			remoteCursorsLayerRef.current = remoteCursorsLayer;
			world.addChild(remoteCursorsLayer);

			// Initial viewport position
			world.position.set(viewport.x, viewport.y);
			world.scale.set(viewport.scale);

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
		if (!worldContainerRef.current) return;
		worldContainerRef.current.position.set(viewport.x, viewport.y);
		worldContainerRef.current.scale.set(viewport.scale);
	}, [viewport.x, viewport.y, viewport.scale]);

	// 3. Render Map & Grid whenever scene configuration changes
	useEffect(() => {
		if (!appRef.current || !gridLayerRef.current || !mapLayerRef.current) return;

		const mapLayer = mapLayerRef.current;
		const grid = gridLayerRef.current;

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
					if (!mapLayerRef.current) return;
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
			bg.fill({ color: 0x12141c, alpha: 1 });
			mapLayer.addChild(bg);
		}

		// Draw Procedural Grid
		if (gridType === "none" || gridSize <= 0 || gridOpacity <= 0) return;

		const colorHex = Number.parseInt(gridColor.replace("#", "0x"), 16) || 0xffffff;

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
	}, [scene]);

	// 4. Render Tokens and Auras on the Stage (including GM Layer support)
	useEffect(() => {
		if (!tokensLayerRef.current || !gmTokensLayerRef.current || !aurasLayerRef.current || !scene) return;

		const tokensLayer = tokensLayerRef.current;
		const gmTokensLayer = gmTokensLayerRef.current;
		const aurasLayer = aurasLayerRef.current;

		tokensLayer.removeChildren();
		gmTokensLayer.removeChildren();
		aurasLayer.clear();
		tokenDisplayObjectsRef.current.clear();

		const gridSize = scene.gridSize || 70;

		for (const token of tokens) {
			// Security filter: GM layer tokens are NEVER added to player view
			if (token.layer === "gm" && !isGM) continue;
			if (token.isHidden && !isGM) continue;

			const isGMLayer = token.layer === "gm";
			const tokenRadius = (token.sizeCells * gridSize) / 2;
			const isSelected = selectedTokenIds.includes(token.id);

			// 4.1 Render Auras
			if (token.auras && token.auras.length > 0) {
				for (const aura of token.auras) {
					const auraRadius = aura.radius * gridSize;
					const colorHex = Number.parseInt(aura.color.replace("#", "0x"), 16) || 0x38bdf8;
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
			tokenContainer.cursor = token.isLocked ? "default" : "grab";
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
			const ring = new Graphics();
			const ringColor = isSelected
				? 0x38bdf8
				: isGMLayer
					? 0xa855f7
					: 0xd4d4d8;

			ring.circle(0, 0, tokenRadius);
			ring.stroke({
				width: isSelected ? 3.5 : isGMLayer ? 2.5 : 2,
				color: ringColor,
			});
			tokenContainer.addChild(ring);

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
				elevText.position.set(0, tokenRadius + 8);
				tokenContainer.addChild(elevText);
			}

			// Token Pointer Events (Drag & Selection)
			tokenContainer.on("pointerdown", (e) => {
				if (e.button === 2) {
					e.stopPropagation();
					setSelectedTokenIds([token.id]);
					setActiveTokenIdForMenu(token.id);
					return;
				}

				if (e.button === 0 && !isSpaceHeldRef.current && !isAltHeldRef.current && activeTool === "select") {
					// Layer selection isolation
					if (activeLayer === "gm" && !isGMLayer) return;
					if (activeLayer === "token" && isGMLayer) return;

					e.stopPropagation();
					setSelectedTokenIds([token.id]);

					if (!token.isLocked) {
						draggingTokenIdRef.current = token.id;
						setDraggedTokenId(token.id);

						const rect = containerRef.current?.getBoundingClientRect();
						if (rect) {
							const clientX = e.clientX - rect.left;
							const clientY = e.clientY - rect.top;
							const worldX = (clientX - viewport.x) / viewport.scale;
							const worldY = (clientY - viewport.y) / viewport.scale;
							tokenDragOffsetRef.current = {
								x: worldX - token.x,
								y: worldY - token.y,
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
	}, [
		tokens,
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
		setDraggedTokenId,
	]);

	// 5. Render WebGL Fog of War Layer (with cutting masks and exploration mode)
	useEffect(() => {
		if (!fogOfWarLayerRef.current || !scene) return;
		const fogLayer = fogOfWarLayerRef.current;
		fogLayer.clear();

		if (!scene.fogEnabled) {
			fogLayer.visible = false;
			return;
		}

		fogLayer.visible = true;

		const width = scene.width || 4000;
		const height = scene.height || 4000;

		// GM mode: semi-transparent blue-tinted dark fog (~40% opacity)
		// Player mode: solid pitch black fog (100% opacity)
		const fogColor = isGM ? 0x0f172a : 0x090a0f;
		const fogAlpha = isGM ? 0.45 : 1.0;

		// 5.1 Base Solid Fog Covering Scene
		fogLayer.rect(0, 0, width, height);
		fogLayer.fill({ color: fogColor, alpha: fogAlpha });

		// 5.2 Chronological Fog Mask Shaping (Cutouts & Hidden Re-fills)
		for (const path of fogPaths) {
			const isReveal = path.mode === "reveal";

			if (path.type === "rect" && path.x !== undefined && path.y !== undefined && path.width && path.height) {
				fogLayer.rect(path.x, path.y, path.width, path.height);
				if (isReveal) {
					fogLayer.cut();
				} else {
					fogLayer.fill({ color: fogColor, alpha: fogAlpha });
				}
			} else if (path.type === "circle" && path.x !== undefined && path.y !== undefined && path.radius) {
				fogLayer.circle(path.x, path.y, path.radius);
				if (isReveal) {
					fogLayer.cut();
				} else {
					fogLayer.fill({ color: fogColor, alpha: fogAlpha });
				}
			} else if (path.type === "brush" && path.points && path.points.length > 0) {
				const r = path.brushRadius || 40;

				for (const pt of path.points) {
					fogLayer.circle(pt.x, pt.y, r);
					if (isReveal) {
						fogLayer.cut();
					} else {
						fogLayer.fill({ color: fogColor, alpha: fogAlpha });
					}
				}

				if (path.points.length > 1) {
					for (let i = 0; i < path.points.length - 1; i++) {
						const p1 = path.points[i];
						const p2 = path.points[i + 1];
						const polyPoints = getThickLinePolygon(p1, p2, r);
						fogLayer.poly(polyPoints);
						if (isReveal) {
							fogLayer.cut();
						} else {
							fogLayer.fill({ color: fogColor, alpha: fogAlpha });
						}
					}
				}
			}
		}
	}, [scene, fogPaths, isGM]);

	// 6. Render Remote Multiplayer Cursors
	useEffect(() => {
		if (!remoteCursorsLayerRef.current) return;
		const layer = remoteCursorsLayerRef.current;
		layer.removeChildren();

		for (const cursor of Object.values(remoteCursors)) {
			const cursorContainer = new Container();
			cursorContainer.position.set(cursor.x, cursor.y);

			const colorHex = Number.parseInt(cursor.color.replace("#", "0x"), 16) || 0x38bdf8;

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
	}, [remoteCursors]);

	// 7. Render Remote Multiplayer Measurements (with distance labels)
	useEffect(() => {
		if (!remoteRulersLayerRef.current || !remoteRulersLabelsRef.current) return;
		const layer = remoteRulersLayerRef.current;
		const labelsLayer = remoteRulersLabelsRef.current;

		layer.clear();
		labelsLayer.removeChildren();

		for (const m of Object.values(remoteMeasurements)) {
			const colorHex = Number.parseInt(m.color.replace("#", "0x"), 16) || 0x38bdf8;

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
	}, [remoteMeasurements]);

	// 8. Render Active Pings (Concentric pulsing ripples)
	useEffect(() => {
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
			const colorHex = Number.parseInt(ping.color.replace("#", "0x"), 16) || 0xa855f7;

			layer.circle(ping.x, ping.y, radius);
			layer.stroke({ width: 3, color: colorHex, alpha });

			layer.circle(ping.x, ping.y, 6);
			layer.fill({ color: colorHex, alpha });
		}
	}, [activePings, removePing]);

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
			if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
				isSpaceHeldRef.current = true;
				container.style.cursor = "grab";
			}
			if (e.code === "AltLeft" || e.code === "AltRight") {
				isAltHeldRef.current = true;
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
			const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.1), 5.0);

			const newX = mouseX - (mouseX - viewport.x) * (newScale / viewport.scale);
			const newY = mouseY - (mouseY - viewport.y) * (newScale / viewport.scale);

			setViewport({ x: newX, y: newY, scale: newScale });
		};

		const handlePointerDown = (e: PointerEvent) => {
			const isMiddleClick = e.button === 1;
			const isLeftClick = e.button === 0;

			// Pan start
			if (isMiddleClick || (isLeftClick && (isSpaceHeldRef.current || activeTool === "pan"))) {
				isDraggingViewportRef.current = true;
				viewportDragStartRef.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
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

			// Deselect if clicking on empty canvas
			if (isLeftClick && activeTool === "select") {
				setSelectedTokenIds([]);
				setActiveTokenIdForMenu(null);
			}

			// Ruler Start
			if (activeTool === "ruler" && isLeftClick && scene) {
				const snapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				rulerStartRef.current = snapped;
			}
		};

		const handlePointerMove = (e: PointerEvent) => {
			const worldPoint = screenToWorld(e.clientX, e.clientY);
			const now = Date.now();

			// Broadcast Live Cursor movement (throttled to ~30-60fps)
			if (onBroadcastCursor && now - lastCursorBroadcastRef.current > 30) {
				lastCursorBroadcastRef.current = now;
				onBroadcastCursor(worldPoint.x, worldPoint.y);
			}

			// Handle Fog of War Live Preview Drawing
			if (activeTool === "fog" && isGM && fogStrokeStartRef.current && fogBrushPreviewLayerRef.current) {
				const previewLayer = fogBrushPreviewLayerRef.current;
				const start = fogStrokeStartRef.current;
				const isReveal = activeFogMode === "reveal";
				const previewColor = isReveal ? 0x22c55e : 0xef4444;

				previewLayer.clear();

				if (activeFogTool === "brush") {
					fogCurrentPointsRef.current.push(worldPoint);
					const pts = fogCurrentPointsRef.current;
					const r = fogBrushRadius;

					for (const pt of pts) {
						previewLayer.circle(pt.x, pt.y, r);
						previewLayer.fill({ color: previewColor, alpha: 0.35 });
					}
					if (pts.length > 1) {
						for (let i = 0; i < pts.length - 1; i++) {
							previewLayer.poly(getThickLinePolygon(pts[i], pts[i + 1], r));
							previewLayer.fill({ color: previewColor, alpha: 0.35 });
						}
					}
				} else if (activeFogTool === "rect") {
					const rx = Math.min(start.x, worldPoint.x);
					const ry = Math.min(start.y, worldPoint.y);
					const rw = Math.abs(worldPoint.x - start.x);
					const rh = Math.abs(worldPoint.y - start.y);

					previewLayer.rect(rx, ry, rw, rh);
					previewLayer.fill({ color: previewColor, alpha: 0.35 });
					previewLayer.rect(rx, ry, rw, rh);
					previewLayer.stroke({ width: 1.5, color: previewColor, alpha: 0.8 });
				} else if (activeFogTool === "circle") {
					const radius = Math.hypot(worldPoint.x - start.x, worldPoint.y - start.y);
					previewLayer.circle(start.x, start.y, radius);
					previewLayer.fill({ color: previewColor, alpha: 0.35 });
					previewLayer.circle(start.x, start.y, radius);
					previewLayer.stroke({ width: 1.5, color: previewColor, alpha: 0.8 });
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
			if (activeTool === "ruler" && rulerStartRef.current && scene && measurementLayerRef.current) {
				const currentSnapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				const start = rulerStartRef.current;

				const { distance } = calculateGridDistance(
					start,
					currentSnapped,
					scene.gridSize,
					scene.gridScaleDistance,
					scene.gridScaleUnit,
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
				layer.clear();

				const colorHex = Number.parseInt(userColor.replace("#", "0x"), 16) || 0x38bdf8;
				layer.moveTo(start.x, start.y);
				layer.lineTo(currentSnapped.x, currentSnapped.y);
				layer.stroke({ width: 3, color: colorHex, alpha: 0.85 });

				layer.circle(start.x, start.y, 6);
				layer.fill({ color: colorHex });
				layer.circle(currentSnapped.x, currentSnapped.y, 6);
				layer.fill({ color: colorHex });
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
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

				if (activeFogTool === "brush" && fogCurrentPointsRef.current.length > 0) {
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
				container.style.cursor = isSpaceHeldRef.current || activeTool === "pan" ? "grab" : "default";
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
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		container.addEventListener("wheel", handleWheel, { passive: false });
		container.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			container.removeEventListener("wheel", handleWheel);
			container.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [
		viewport,
		setViewport,
		activeTool,
		activeLayer,
		scene,
		tokens,
		updateToken,
		onUpdateToken,
		onBroadcastDrag,
		onBroadcastCursor,
		onBroadcastRuler,
		onBroadcastPing,
		onBroadcastFog,
		onPersistFog,
		addPing,
		fogPaths,
		addFogPath,
		activeFogTool,
		activeFogMode,
		fogBrushRadius,
		userColor,
		isGM,
		setActiveMeasurement,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
		setDraggedTokenId,
	]);

	return (
		<div
			ref={containerRef}
			onContextMenu={(e) => e.preventDefault()}
			className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none bg-[#090a0f]"
		/>
	);
}
