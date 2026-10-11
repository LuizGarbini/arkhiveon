import { describe, expect, it } from "vitest";
import { buildModuleSavePatch } from "@/components/character-sheet/view/module-editor-dialog";
import {
	cloneSheetLayout,
	createDefaultSheetLayout,
	lockSheetLayoutTitles,
	normalizeSheetLayout,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import type { Character, SheetLayoutConfig } from "@/lib/store";

// Layout corrompido igual ao da Elbereth (Rise): títulos trocados entre módulos.
function corruptedLayout(): SheetLayoutConfig {
	const layout = createDefaultSheetLayout("dnd5e");
	return {
		...layout,
		modules: layout.modules.map((m) => {
			if (m.kind === "abilities") return { ...m, title: "Combate" };
			if (m.kind === "skills" || m.kind === "feats" || m.kind === "magic")
				return { ...m, title: "Inventário" };
			return m;
		}),
	};
}

describe("sheet module titles locked by kind", () => {
	it("normalizeSheetLayout forces SHEET_MODULE_LABELS for system modules", () => {
		const layout = normalizeSheetLayout({
			system: "dnd5e",
			sheetLayout: corruptedLayout(),
		} as Character);
		for (const m of layout.modules) {
			expect(m.title).toBe(SHEET_MODULE_LABELS[m.kind]);
		}
		expect(layout.modules.filter((m) => m.title === "Combate")).toHaveLength(1);
		expect(layout.modules.filter((m) => m.title === "Inventário")).toHaveLength(
			1,
		);
	});

	it("keeps module content/fields untouched when fixing the title", () => {
		const corrupted = corruptedLayout();
		const fixed = lockSheetLayoutTitles(corrupted);
		fixed.modules.forEach((m, i) => {
			const { title: _a, ...rest } = m;
			const { title: _b, ...orig } = corrupted.modules[i];
			expect(rest).toEqual(orig);
		});
	});

	it("keeps user titles for custom modules", () => {
		const layout = lockSheetLayoutTitles({
			version: 1,
			template: "dnd5e",
			modules: [
				{
					id: "customText-1",
					kind: "customText",
					title: "Combate",
					enabled: true,
					order: 10,
				},
				{
					id: "ctf-1",
					kind: "custom_template_fields",
					title: "Minha ficha",
					enabled: true,
					order: 20,
				},
			],
		});
		expect(layout.modules.map((m) => m.title)).toEqual([
			"Combate",
			"Minha ficha",
		]);
	});

	it("cloneSheetLayout (templates) does not propagate wrong titles", () => {
		const cloned = cloneSheetLayout(corruptedLayout(), "dnd5e");
		const abilities = cloned.modules.find((m) => m.kind === "abilities");
		expect(abilities?.title).toBe("Atributos");
	});
});

describe("module editor save patch", () => {
	it("abilities submit with stale 'Combate' draft persists 'Atributos'", () => {
		const abilities = createDefaultSheetLayout("dnd5e").modules.find(
			(m) => m.kind === "abilities",
		);
		if (!abilities) throw new Error("abilities missing");
		const patch = buildModuleSavePatch(abilities, {
			title: "Combate",
			enabled: true,
			column: "main",
		});
		expect(patch.title).toBe("Atributos");
		expect(patch.column).toBe("main");
	});

	it("custom module submit keeps the typed title", () => {
		const patch = buildModuleSavePatch(
			{
				id: "customText-1",
				kind: "customText",
				title: "x",
				enabled: true,
				order: 10,
			},
			{ title: "História de fundo" },
		);
		expect(patch.title).toBe("História de fundo");
	});
});
