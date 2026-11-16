import { flushSync } from "react-dom";
import type { PingKind } from "./ping-kinds";
import { pingKindInfo } from "./ping-kinds";
import { noteWheelFrame } from "./ping-latency";
import { useVTTStore } from "./vtt-store";

/**
 * A roda e a lista do celular já estão no DOM (escondidas até a hora).
 * Revelar e acender uma opção mexe só em atributo: não recria os nós e não
 * espera o React pintar de novo.
 */

export const WHEEL_IDLE_LABEL =
	"Arraste até um tipo e solte · centro usa o escolhido · Esc cancela";

export function wheelHoverLabel(hover: PingKind | null): string {
	return hover ? pingKindInfo(hover).label : WHEEL_IDLE_LABEL;
}

export function hideWheelDom(root: HTMLElement | null) {
	if (!root) return;
	root.dataset.revealed = "false";
	root.hidden = true;
	root.style.visibility = "hidden";
}

export function revealWheelDom(root: HTMLElement): boolean {
	const shown = root.dataset.revealed === "true" && !root.hidden;
	root.dataset.revealed = "true";
	root.hidden = false;
	root.style.visibility = "visible";
	return !shown;
}

/** Acende a opção sob o ponteiro. Devolve false se nada mudou. */
export function paintWheelHover(
	root: ParentNode,
	hover: string | null,
): boolean {
	let changed = false;
	for (const chip of root.querySelectorAll("[data-ping-kind]")) {
		const active = chip.getAttribute("data-ping-kind") === hover;
		const next = active ? "true" : "false";
		if (chip.getAttribute("data-active") !== next) {
			chip.setAttribute("data-active", next);
			changed = true;
		}
	}
	const label = root.querySelector("[data-ping-wheel-label]");
	const text = wheelHoverLabel(hover as PingKind | null);
	if (label && label.textContent !== text) {
		label.textContent = text;
		changed = true;
	}
	return changed;
}

export function paintPickerHover(
	root: ParentNode,
	hover: string | null,
): boolean {
	let changed = false;
	for (const row of root.querySelectorAll("[data-ping-kind]")) {
		const active = row.getAttribute("data-ping-kind") === hover;
		const next = active ? "true" : "false";
		if (row.getAttribute("data-active") !== next) {
			row.setAttribute("data-active", next);
			changed = true;
		}
	}
	return changed;
}

export interface WheelFrame {
	revealed: boolean;
	hoverPainted: boolean;
	ms: number;
}

/**
 * Mostra a roda e a opção sob o ponteiro antes deste quadro pintar.
 * Se o React ainda não montou a casca, força o commit agora.
 */
export function showPingWheelFrame(hover: PingKind | null): WheelFrame {
	const started = performance.now();
	const live = useVTTStore.getState();
	if (!live.pingWheel) {
		return { revealed: false, hoverPainted: false, ms: 0 };
	}
	if (live.pingWheel.hover !== hover) live.setPingWheelHover(hover);
	let root = document.querySelector<HTMLElement>("[data-ping-wheel]");
	const visible = useVTTStore.getState().pingWheel?.visible === true;
	if (!visible) {
		if (!root) {
			flushSync(() => {
				useVTTStore.getState().revealPingWheel();
			});
			root = document.querySelector<HTMLElement>("[data-ping-wheel]");
		} else {
			useVTTStore.getState().revealPingWheel();
			revealWheelDom(root);
		}
	} else if (root && root.dataset.revealed !== "true") {
		revealWheelDom(root);
	}
	const hoverPainted = root ? paintWheelHover(root, hover) : false;
	const ms = performance.now() - started;
	noteWheelFrame(ms);
	return {
		revealed: root?.dataset.revealed === "true",
		hoverPainted,
		ms,
	};
}
