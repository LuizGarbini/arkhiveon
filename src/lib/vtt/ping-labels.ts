import { type Container, Text, TextStyle } from "pixi.js";
import type { PingLabelSpec } from "./ping-motion";

/**
 * Um Text por ping vivo, reaproveitado pelo id. O Graphics do ping continua
 * sendo um só; aqui só entra o nome.
 */

const LABEL_STYLE = new TextStyle({
	fontFamily: "system-ui, sans-serif",
	fontSize: 13,
	fontWeight: "600",
	fill: "#f8fafc",
});

const PREFIX = "ping-label:";

export function syncPingLabels(
	parent: Container,
	specs: readonly PingLabelSpec[],
) {
	const want = new Set(specs.map((spec) => spec.id));
	for (const child of [...parent.children]) {
		if (!child.label.startsWith(PREFIX)) continue;
		const id = child.label.slice(PREFIX.length);
		if (want.has(id)) continue;
		parent.removeChild(child);
		child.destroy();
	}
	for (const spec of specs) {
		const label = `${PREFIX}${spec.id}`;
		let node = parent.getChildByLabel(label) as Text | null;
		if (!node) {
			node = new Text({
				text: spec.text,
				resolution: 2,
				style: LABEL_STYLE,
			});
			node.label = label;
			node.anchor.set(0.5, 0);
			parent.addChild(node);
		} else if (node.text !== spec.text) {
			node.text = spec.text;
		}
		node.position.set(spec.x, spec.y);
	}
}
