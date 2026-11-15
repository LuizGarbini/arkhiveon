import { Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { colorToNumber, readableTextColor } from "./cursor-color";
import {
	chipBox,
	chipLabel,
	cursorOpacity,
	cursorScale,
	shouldTeleport,
	smoothStep,
} from "./remote-cursor-math";
import type { VTTRemoteCursor } from "./types";
import { useVTTStore } from "./vtt-store";

/**
 * Cursores dos outros integrantes no mapa: ponteiro com contorno e sombra
 * suave, e uma etiqueta com o nome na cor da pessoa (texto com contraste).
 * Vive no Pixi e lê a store direto, sem passar pelo React: cada mensagem de
 * movimento só atualiza o alvo; o ticker desliza o ponteiro até lá.
 */

// Constantes de cor do Pixi (padrão de `vtt-draw.ts`): contorno e sombra.
const OUTLINE = 0xffffff;
const SHADOW = 0x000000;

// Ponteiro clássico, com a ponta em (0, 0).
const ARROW = [
	0, 0, 0, 16.5, 4.2, 12.6, 7.2, 19.2, 10.1, 17.9, 7.2, 11.5, 12.8, 11.5,
];

function shifted(points: number[], dx: number, dy: number): number[] {
	return points.map((value, index) => value + (index % 2 === 0 ? dx : dy));
}

interface Entry {
	root: Container;
	color: string;
	name: string;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	/** Último movimento recebido (para o cursor parado sumir). */
	lastSeen: number;
}

function buildVisual(color: string, name: string): Container {
	const root = new Container();
	root.eventMode = "none";
	const fill = colorToNumber(color);

	const arrow = new Graphics();
	// Sombra suave: duas cópias deslocadas, cada uma mais fraca.
	for (const [dx, dy, alpha] of [
		[1.2, 2, 0.16],
		[2.4, 3.4, 0.09],
	] as const) {
		arrow.poly(shifted(ARROW, dx, dy)).fill({ color: SHADOW, alpha });
	}
	arrow
		.poly(ARROW)
		.fill({ color: fill })
		.stroke({ width: 1.6, color: OUTLINE, alpha: 0.95, join: "round" });
	root.addChild(arrow);

	const text = new Text({
		text: chipLabel(name),
		resolution: Math.min(3, Math.max(2, globalThis.devicePixelRatio || 1)),
		style: new TextStyle({
			fontFamily: "system-ui, -apple-system, sans-serif",
			fontSize: 11,
			fontWeight: "600",
			fill: readableTextColor(color),
		}),
	});
	const box = chipBox(text.width, text.height);
	const chipX = 11;
	const chipY = 19;
	const chip = new Graphics();
	chip
		.roundRect(chipX, chipY + 1.5, box.width, box.height, box.radius)
		.fill({ color: SHADOW, alpha: 0.22 });
	chip
		.roundRect(chipX, chipY, box.width, box.height, box.radius)
		.fill({ color: fill })
		.stroke({ width: 1.25, color: OUTLINE, alpha: 0.9 });
	root.addChild(chip);
	text.position.set(chipX + box.padX, chipY + box.padY);
	root.addChild(text);
	return root;
}

export interface RemoteCursorStat {
	userId: string;
	color: string;
	name: string;
	x: number;
	y: number;
	alpha: number;
	scale: number;
	visible: boolean;
}

/** Só em localhost: deixa os testes de navegador ler o que está desenhado. */
function publishStats(entries: Map<string, Entry>): void {
	if (typeof window === "undefined") return;
	const host = window.location?.hostname;
	if (host !== "localhost" && host !== "127.0.0.1") return;
	(
		window as Window & { __vttRemoteCursors?: RemoteCursorStat[] }
	).__vttRemoteCursors = [...entries.entries()].map(([userId, entry]) => ({
		userId,
		color: entry.color,
		name: entry.name,
		x: entry.x,
		y: entry.y,
		alpha: entry.root.alpha,
		scale: entry.root.scale.x,
		visible: entry.root.visible && entry.root.parent?.visible !== false,
	}));
}

/**
 * Liga o desenho dos cursores remotos à camada. Devolve a função que desliga
 * (inscrição na store, ticker e objetos do Pixi).
 */
export function attachRemoteCursors(
	layer: Container,
	ticker: Ticker,
): () => void {
	layer.eventMode = "none";
	const entries = new Map<string, Entry>();

	const drop = (id: string) => {
		const entry = entries.get(id);
		if (!entry) return;
		entry.root.destroy({ children: true });
		entries.delete(id);
	};

	const makeEntry = (cursor: VTTRemoteCursor, x: number, y: number): Entry => {
		const root = buildVisual(cursor.color, cursor.userName);
		root.position.set(x, y);
		layer.addChild(root);
		return {
			root,
			color: cursor.color,
			name: cursor.userName,
			x,
			y,
			targetX: cursor.x,
			targetY: cursor.y,
			lastSeen: cursor.timestamp,
		};
	};

	const reconcile = () => {
		const { remoteCursors, showRemoteCursors, viewport } =
			useVTTStore.getState();
		const visible = showRemoteCursors ? remoteCursors : {};
		for (const id of [...entries.keys()]) {
			if (!visible[id]) drop(id);
		}
		const scale = cursorScale(viewport.scale);
		for (const cursor of Object.values(visible) as VTTRemoteCursor[]) {
			let entry = entries.get(cursor.userId);
			if (
				entry &&
				(entry.color !== cursor.color || entry.name !== cursor.userName)
			) {
				// Trocou de cor ou de nome: refaz o desenho e mantém a posição.
				const { x, y } = entry;
				drop(cursor.userId);
				entry = makeEntry(cursor, x, y);
				entries.set(cursor.userId, entry);
			}
			if (!entry) {
				entry = makeEntry(cursor, cursor.x, cursor.y);
				entries.set(cursor.userId, entry);
			}
			if (shouldTeleport({ x: entry.x, y: entry.y }, cursor)) {
				entry.x = cursor.x;
				entry.y = cursor.y;
			}
			entry.targetX = cursor.x;
			entry.targetY = cursor.y;
			entry.lastSeen = cursor.timestamp;
			entry.root.scale.set(scale);
		}
		layer.visible = entries.size > 0;
		publishStats(entries);
	};

	const tick = (current: Ticker) => {
		if (entries.size === 0) return;
		const now = Date.now();
		for (const entry of entries.values()) {
			entry.x = smoothStep(entry.x, entry.targetX, current.deltaMS);
			entry.y = smoothStep(entry.y, entry.targetY, current.deltaMS);
			entry.root.position.set(entry.x, entry.y);
			const alpha = cursorOpacity(now - entry.lastSeen);
			entry.root.alpha = alpha;
			entry.root.visible = alpha > 0;
		}
		publishStats(entries);
	};

	const unsubscribe = useVTTStore.subscribe((state, previous) => {
		if (
			state.remoteCursors !== previous.remoteCursors ||
			state.showRemoteCursors !== previous.showRemoteCursors ||
			state.viewport.scale !== previous.viewport.scale
		)
			reconcile();
	});
	ticker.add(tick);
	reconcile();

	return () => {
		unsubscribe();
		ticker.remove(tick);
		for (const id of [...entries.keys()]) drop(id);
	};
}
