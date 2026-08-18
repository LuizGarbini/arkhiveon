import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import {
	calculateGridDistance,
	getFlatHexCorners,
	getPointyHexCorners,
	snapToGrid,
} from "@/lib/vtt/grid-math";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTCanvasProps {
	scene: VTTScene | null;
}

export function VTTCanvas({ scene }: VTTCanvasProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const worldContainerRef = useRef<Container | null>(null);
	const mapLayerRef = useRef<Container | null>(null);
	const gridLayerRef = useRef<Graphics | null>(null);
	const measurementLayerRef = useRef<Graphics | null>(null);
	const pingsLayerRef = useRef<Graphics | null>(null);

	// Interaction refs
	const isDraggingRef = useRef(false);
	const dragStartRef = useRef({ x: 0, y: 0 });
	const isSpaceHeldRef = useRef(false);
	const rulerStartRef = useRef<{ x: number; y: number } | null>(null);

	const {
		viewport,
		setViewport,
		activeTool,
		setActiveMeasurement,
		activePings,
		addPing,
		removePing,
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

			const gridLayer = new Graphics();
			gridLayerRef.current = gridLayer;
			world.addChild(gridLayer);

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
			// Subtle dark checkerboard / neutral background
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
			// Vertical lines
			for (let x = 0; x <= width; x += gridSize) {
				grid.moveTo(x, 0);
				grid.lineTo(x, height);
			}
			// Horizontal lines
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

	// 4. Render Active Pings (Concentric pulsing ripples)
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

	// 5. Setup Native DOM event listeners for Pan, Zoom, Ruler and Pings
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Convert client screen coordinates to VTT world coordinates
		const screenToWorld = (screenX: number, screenY: number) => {
			const rect = container.getBoundingClientRect();
			const clientX = screenX - rect.left;
			const clientY = screenY - rect.top;
			return {
				x: (clientX - viewport.x) / viewport.scale,
				y: (clientY - viewport.y) / viewport.scale,
			};
		};

		// Keydown / Keyup for spacebar pan shortcut
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

		// Mouse Wheel Zoom centered on cursor
		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();

			const rect = container.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			// Zoom factor
			const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
			const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.1), 5.0);

			// Adjust viewport x, y so point under mouse stays in place
			const newX = mouseX - (mouseX - viewport.x) * (newScale / viewport.scale);
			const newY = mouseY - (mouseY - viewport.y) * (newScale / viewport.scale);

			setViewport({ x: newX, y: newY, scale: newScale });
		};

		// Pointer Down
		const handlePointerDown = (e: PointerEvent) => {
			const isMiddleClick = e.button === 1;
			const isLeftClick = e.button === 0;

			// Pan start
			if (isMiddleClick || (isLeftClick && (isSpaceHeldRef.current || activeTool === "pan"))) {
				isDraggingRef.current = true;
				dragStartRef.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
				container.style.cursor = "grabbing";
				return;
			}

			const worldPoint = screenToWorld(e.clientX, e.clientY);

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

		// Pointer Move
		const handlePointerMove = (e: PointerEvent) => {
			// Handle Pan
			if (isDraggingRef.current) {
				const nextX = e.clientX - dragStartRef.current.x;
				const nextY = e.clientY - dragStartRef.current.y;
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

				// Render Ruler Line in PixiJS
				const layer = measurementLayerRef.current;
				layer.clear();

				// Base line
				layer.moveTo(start.x, start.y);
				layer.lineTo(currentSnapped.x, currentSnapped.y);
				layer.stroke({ width: 3, color: 0x38bdf8, alpha: 0.85 });

				// End circles
				layer.circle(start.x, start.y, 6);
				layer.fill({ color: 0x38bdf8 });
				layer.circle(currentSnapped.x, currentSnapped.y, 6);
				layer.fill({ color: 0x38bdf8 });
			}
		};

		// Pointer Up
		const handlePointerUp = () => {
			if (isDraggingRef.current) {
				isDraggingRef.current = false;
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
	}, [viewport, setViewport, activeTool, scene, addPing, isGM, setActiveMeasurement]);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none bg-[#090a0f]"
		/>
	);
}
