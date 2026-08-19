import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import {
	calculateGridDistance,
	getFlatHexCorners,
	getPointyHexCorners,
	snapToGrid,
} from "@/lib/vtt/grid-math";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTCanvasProps {
	scene: VTTScene | null;
	onUpdateToken?: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
}

export function VTTCanvas({ scene, onUpdateToken }: VTTCanvasProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const worldContainerRef = useRef<Container | null>(null);
	const mapLayerRef = useRef<Container | null>(null);
	const gridLayerRef = useRef<Graphics | null>(null);
	const aurasLayerRef = useRef<Graphics | null>(null);
	const tokensLayerRef = useRef<Container | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
	const pingsLayerRef = useRef<Graphics | null>(null);

	// Interaction refs
	const isDraggingViewportRef = useRef(false);
	const viewportDragStartRef = useRef({ x: 0, y: 0 });
	const isSpaceHeldRef = useRef(false);
	const rulerStartRef = useRef<{ x: number; y: number } | null>(null);

	// Token Dragging refs
	const draggingTokenIdRef = useRef<string | null>(null);
	const tokenDragOffsetRef = useRef({ x: 0, y: 0 });
	const tokenInitialPosRef = useRef({ x: 0, y: 0 });

	const {
		viewport,
		setViewport,
		activeTool,
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
		isGM,
	} = useVTTStore();

	// 1. Initialize PixiJS Application
	useEffect(() => {
		if (!containerRef.current) return;

		let isMounted = true;
		const app = new Application();

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

			const measurementLayer = new Graphics();
			measurementLayerRef.current = measurementLayer;
			world.addChild(measurementLayer);

			const pingsLayer = new Graphics();
			pingsLayerRef.current = pingsLayer;
			world.addChild(pingsLayer);

			// Initial viewport position
			world.position.set(viewport.x, viewport.y);
			world.scale.set(viewport.scale);
		}

		void initPixi();

		return () => {
			isMounted = false;
			if (appRef.current) {
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

	// 4. Render Tokens and Auras on the Stage
	useEffect(() => {
		if (!tokensLayerRef.current || !aurasLayerRef.current || !scene) return;

		const tokensLayer = tokensLayerRef.current;
		const aurasLayer = aurasLayerRef.current;

		tokensLayer.removeChildren();
		aurasLayer.clear();

		const gridSize = scene.gridSize || 70;

		for (const token of tokens) {
			// Visibility filter
			if (token.layer === "gm" && !isGM) continue;
			if (token.isHidden && !isGM) continue;

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
			tokenContainer.alpha = token.isHidden ? 0.5 : 1;

			// Base circular background
			const bg = new Graphics();
			bg.circle(0, 0, tokenRadius);
			bg.fill({ color: 0x18181b });
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
						// Fallback text
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
						fill: "#a855f7",
					}),
				});
				text.anchor.set(0.5);
				tokenContainer.addChild(text);
			}

			// Border Ring
			const ring = new Graphics();
			const ringColor = isSelected
				? 0x38bdf8 // Cyan for selection
				: token.layer === "gm"
					? 0xa855f7 // Purple for GM
					: 0xd4d4d8; // Light Gray standard

			ring.circle(0, 0, tokenRadius);
			ring.stroke({
				width: isSelected ? 3.5 : 2,
				color: ringColor,
			});
			tokenContainer.addChild(ring);

			// Selection outer pulse ring
			if (isSelected) {
				const outerGlow = new Graphics();
				outerGlow.circle(0, 0, tokenRadius + 4);
				outerGlow.stroke({ width: 1.5, color: 0x38bdf8, alpha: 0.6 });
				tokenContainer.addChild(outerGlow);
			}

			// HP Bar (Above token)
			if (token.hpMax && token.hpMax > 0) {
				const currentHp = Math.max(0, token.hpCurrent ?? 0);
				const maxHp = Math.max(1, token.hpMax ?? currentHp ?? 1);
				const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));

				const barWidth = tokenRadius * 1.8;
				const barHeight = Math.max(4, tokenRadius * 0.16);
				const barY = -tokenRadius - barHeight - 4;

				const hpBar = new Graphics();
				// Background bar
				hpBar.roundRect(-barWidth / 2, barY, barWidth, barHeight, 3);
				hpBar.fill({ color: 0x000000, alpha: 0.8 });

				// Foreground health fill
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
					// Right click -> open token menu
					e.stopPropagation();
					setSelectedTokenIds([token.id]);
					setActiveTokenIdForMenu(token.id);
					return;
				}

				if (e.button === 0 && !isSpaceHeldRef.current && activeTool === "select") {
					e.stopPropagation();
					setSelectedTokenIds([token.id]);

					if (!token.isLocked) {
						draggingTokenIdRef.current = token.id;
						setDraggedTokenId(token.id);
						tokenInitialPosRef.current = { x: token.x, y: token.y };

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

			tokensLayer.addChild(tokenContainer);
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
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
		setDraggedTokenId,
	]);

	// 5. Render Active Pings (Concentric pulsing ripples)
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

	// 6. Setup Native DOM event listeners for Pan, Zoom, Token Drag, Ruler and Pings
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
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				isSpaceHeldRef.current = false;
				container.style.cursor = activeTool === "pan" ? "grab" : "default";
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

			// Deselect if clicking on empty canvas
			if (isLeftClick && activeTool === "select") {
				setSelectedTokenIds([]);
				setActiveTokenIdForMenu(null);
			}

			// Ping Trigger
			if (activeTool === "ping" && isLeftClick) {
				addPing({
					x: worldPoint.x,
					y: worldPoint.y,
					userId: "self",
					userName: isGM ? "Mestre" : "Jogador",
					color: isGM ? "#a855f7" : "#3b82f6",
					timestamp: Date.now(),
				});
				return;
			}

			// Ruler Start
			if (activeTool === "ruler" && isLeftClick && scene) {
				const snapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				rulerStartRef.current = snapped;
			}
		};

		const handlePointerMove = (e: PointerEvent) => {
			// Handle Token Dragging with Smooth Movement
			if (draggingTokenIdRef.current && scene) {
				const worldPoint = screenToWorld(e.clientX, e.clientY);
				const rawX = worldPoint.x - tokenDragOffsetRef.current.x;
				const rawY = worldPoint.y - tokenDragOffsetRef.current.y;

				// Local optimistic update during drag
				updateToken(draggingTokenIdRef.current, { x: rawX, y: rawY });
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
				const worldPoint = screenToWorld(e.clientX, e.clientY);
				const currentSnapped = snapToGrid(worldPoint, scene.gridType, scene.gridSize);
				const start = rulerStartRef.current;

				const { distance } = calculateGridDistance(
					start,
					currentSnapped,
					scene.gridSize,
					scene.gridScaleDistance,
					scene.gridScaleUnit,
				);

				setActiveMeasurement({
					startX: start.x,
					startY: start.y,
					currentX: currentSnapped.x,
					currentY: currentSnapped.y,
					distance,
					unit: scene.gridScaleUnit,
				});

				const layer = measurementLayerRef.current;
				layer.clear();

				layer.moveTo(start.x, start.y);
				layer.lineTo(currentSnapped.x, currentSnapped.y);
				layer.stroke({ width: 3, color: 0x38bdf8, alpha: 0.85 });

				layer.circle(start.x, start.y, 6);
				layer.fill({ color: 0x38bdf8 });
				layer.circle(currentSnapped.x, currentSnapped.y, 6);
				layer.fill({ color: 0x38bdf8 });
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
			// Finish Token Dragging with Magnetic Grid Snapping
			if (draggingTokenIdRef.current && scene) {
				const tokenId = draggingTokenIdRef.current;
				const token = tokens.find((t) => t.id === tokenId);
				draggingTokenIdRef.current = null;
				setDraggedTokenId(null);

				if (token) {
					const worldPoint = screenToWorld(e.clientX, e.clientY);
					const rawX = worldPoint.x - tokenDragOffsetRef.current.x;
					const rawY = worldPoint.y - tokenDragOffsetRef.current.y;

					// Snap to grid
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
				}
			}

			if (isDraggingViewportRef.current) {
				isDraggingViewportRef.current = false;
				container.style.cursor = isSpaceHeldRef.current || activeTool === "pan" ? "grab" : "default";
			}

			if (rulerStartRef.current) {
				rulerStartRef.current = null;
				setActiveMeasurement(null);
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
		scene,
		tokens,
		updateToken,
		onUpdateToken,
		addPing,
		isGM,
		setActiveMeasurement,
		setSelectedTokenIds,
		setActiveTokenIdForMenu,
	]);

	return (
		<div
			ref={containerRef}
			onContextMenu={(e) => e.preventDefault()}
			className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none bg-[#090a0f]"
		/>
	);
}
