// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeEffectiveStats } from "@/core/rules";
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { AttacksTab } from "./sheet-attacks";
import { SkillsTab } from "./sheet-skills";
import { SummaryTab } from "./sheet-summary";
import { SheetTabs } from "./sheet-tabs";
import type { SheetRolls } from "./sheet-types";

afterEach(cleanup);

const staff = {
	id: "staff",
	name: "Cajado do Pacto +1",
	type: "Arma",
	weapon: {
		damageDice: "1d6",
		damageType: "bludgeoning",
		magicBonus: 1,
		ability: "charisma",
		weaponCategory: "simple",
		properties: [],
		customProperties: [],
		extraDamage: [],
	},
} as unknown as Item;
const bow = {
	id: "bow",
	name: "Arco Curto",
	type: "Arma",
	weapon: {
		damageDice: "1d6",
		damageType: "piercing",
		ability: "dexterity",
		weaponCategory: "simple",
		properties: ["ammunition"],
		customProperties: [],
		extraDamage: [],
	},
} as unknown as Item;
const itemsById = new Map<string, Item>([
	[staff.id, staff],
	[bow.id, bow],
]);

const equipped = (item: Item, slot: InventoryItem["slot"]): InventoryItem =>
	({
		id: `e-${item.id}`,
		name: item.name,
		quantity: 1,
		weightLbs: 0,
		location: "equipped",
		campaignItemId: item.id,
		category: "gear",
		proficient: true,
		slot,
	}) as InventoryItem;

function character(extra: Partial<Character> = {}): Character {
	return {
		id: "c1",
		system: "dnd5e",
		characterName: "Dante",
		level: 14,
		proficiencyBonus: 5,
		strength: 10,
		dexterity: 14,
		constitution: 14,
		intelligence: 12,
		wisdom: 12,
		charisma: 20,
		armorClass: 18,
		initiative: 2,
		speed: 12,
		speedUnit: "m",
		savingThrowProficiencies: { wisdom: true, charisma: true },
		skillProficiencies: { perception: "proficient", persuasion: "expertise" },
		inventoryList: [],
		...extra,
	} as unknown as Character;
}

function rolls(): SheetRolls & {
	check: ReturnType<typeof vi.fn>;
	formula: ReturnType<typeof vi.fn>;
} {
	return { rolling: false, check: vi.fn(), formula: vi.fn() };
}

const resourcesApi = () => ({ canEdit: true, isStaff: false, save: vi.fn() });

describe("SheetTabs", () => {
	function Harness() {
		const [value, setValue] = useState("a");
		return (
			<SheetTabs
				idPrefix="t"
				value={value}
				onChange={setValue}
				tabs={[
					{ id: "a", label: "Um" },
					{ id: "b", label: "Dois" },
					{ id: "c", label: "Três" },
				]}
			/>
		);
	}
	const selected = () =>
		screen
			.getAllByRole("tab")
			.find((t) => t.getAttribute("aria-selected") === "true")?.textContent;

	it("só a aba ativa entra na ordem do Tab (roving tabindex)", () => {
		render(<Harness />);
		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
	});

	it("setas, Home e End trocam a aba e levam o foco", () => {
		render(<Harness />);
		const list = screen.getByRole("tablist");
		fireEvent.keyDown(list, { key: "ArrowRight" });
		expect(selected()).toBe("Dois");
		expect(document.activeElement?.textContent).toBe("Dois");
		fireEvent.keyDown(list, { key: "End" });
		expect(selected()).toBe("Três");
		fireEvent.keyDown(list, { key: "ArrowRight" });
		expect(selected()).toBe("Um");
		fireEvent.keyDown(list, { key: "ArrowLeft" });
		expect(selected()).toBe("Três");
		fireEvent.keyDown(list, { key: "Home" });
		expect(selected()).toBe("Um");
	});

	it("clicar escolhe a aba", () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("tab", { name: "Dois" }));
		expect(selected()).toBe("Dois");
	});
});

describe("AttacksTab", () => {
	function renderAttacks(c: Character, r = rolls(), open = vi.fn()) {
		const stats = computeEffectiveStats(c, itemsById);
		render(
			<AttacksTab
				character={c}
				stats={stats}
				itemsById={itemsById}
				rolls={r}
				resources={resourcesApi()}
				onOpenEquipment={open}
			/>,
		);
		return { r, open };
	}

	it("acerto rola d20 + bônus e o dano rola a fórmula, com o nome da arma", () => {
		const { r } = renderAttacks(
			character({ inventoryList: [equipped(staff, "mainHand")] }),
		);
		// Carisma 20 (+5) + proficiência 5 + cajado +1
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rolar acerto de Cajado do Pacto +1 (+11)",
			}),
		);
		expect(r.check).toHaveBeenCalledWith("Cajado do Pacto +1 · Ataque", 11);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rolar dano de Cajado do Pacto +1 (1d6+6)",
			}),
		);
		expect(r.formula).toHaveBeenCalledWith(
			"Cajado do Pacto +1 · Dano",
			"1d6+6",
		);
	});

	it("arma com munição avisa que o gasto é na ficha", () => {
		renderAttacks(character({ inventoryList: [equipped(bow, "mainHand")] }));
		expect(screen.getByText(/usa munição/)).toBeTruthy();
	});

	it("sem arma equipada: estado vazio com ação para abrir o equipamento", () => {
		const { open } = renderAttacks(character());
		expect(screen.getByText("Nenhuma arma equipada")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Abrir equipamento" }));
		expect(open).toHaveBeenCalledTimes(1);
	});

	it("arma na mochila (não equipada) não vira ataque", () => {
		renderAttacks(
			character({
				inventoryList: [
					{ ...equipped(staff, "mainHand"), location: "backpack" },
				],
			}),
		);
		expect(screen.getByText("Nenhuma arma equipada")).toBeTruthy();
	});

	it("durante uma rolagem em andamento os botões ficam desabilitados", () => {
		const c = character({ inventoryList: [equipped(staff, "mainHand")] });
		const stats = computeEffectiveStats(c, itemsById);
		render(
			<AttacksTab
				character={c}
				stats={stats}
				itemsById={itemsById}
				rolls={{ ...rolls(), rolling: true }}
				resources={resourcesApi()}
				onOpenEquipment={() => {}}
			/>,
		);
		for (const b of screen.getAllByRole("button", { name: /^Rolar / })) {
			expect((b as HTMLButtonElement).disabled).toBe(true);
		}
	});
});

describe("SkillsTab", () => {
	function renderSkills(r = rolls(), c = character()) {
		render(
			<SkillsTab
				character={c}
				stats={computeEffectiveStats(c, itemsById)}
				rolls={r}
			/>,
		);
		return r;
	}

	it("calcula atributo + proficiência (especialista dobra) e rola", () => {
		const r = renderSkills();
		// Carisma +5, especialista: 5 + 2×5 = +15; Percepção: SAB +1 + 5 = +6
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Persuasão (+15)" }),
		);
		expect(r.check).toHaveBeenLastCalledWith("Persuasão", 15);
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Percepção (+6)" }),
		);
		expect(r.check).toHaveBeenLastCalledWith("Percepção", 6);
		// sem proficiência: só o atributo (DES +2)
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Acrobacia (+2)" }),
		);
		expect(r.check).toHaveBeenLastCalledWith("Acrobacia", 2);
	});

	it("busca ignora acento e maiúscula", () => {
		renderSkills();
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "PERCEP" },
		});
		expect(
			screen.getByRole("button", { name: /Rolar Percepção/ }),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /Rolar Acrobacia/ }),
		).toBeNull();
	});

	it("filtro Proficientes mostra só proficientes e especialistas", () => {
		renderSkills();
		fireEvent.click(screen.getByRole("button", { name: "Proficientes" }));
		const rows = screen.getAllByRole("button", { name: /^Rolar / });
		expect(rows).toHaveLength(2);
	});

	it("nada encontrado: estado vazio com Limpar filtros", () => {
		renderSkills();
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "xyzxyz" },
		});
		expect(screen.getByText("Nenhuma perícia encontrada")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
		expect(screen.getAllByRole("button", { name: /^Rolar / }).length).toBe(18);
	});

	it("itens que mexem no atributo mexem na perícia", () => {
		const amulet = {
			id: "amulet",
			name: "Amuleto",
			type: "Amuleto",
			abilityBonuses: [
				{ id: "a", ability: "dexterity", mode: "set", value: 20 },
			],
		} as unknown as Item;
		const map = new Map(itemsById).set(amulet.id, amulet);
		const c = character({
			inventoryList: [
				{
					...equipped(amulet, "neck"),
					id: "e-amulet",
				},
			],
		});
		render(
			<SkillsTab
				character={c}
				stats={computeEffectiveStats(c, map)}
				rolls={rolls()}
			/>,
		);
		// DES 20 (+5) em vez de 14 (+2)
		expect(
			screen.getByRole("button", { name: "Rolar Acrobacia (+5)" }),
		).toBeTruthy();
	});
});

describe("SummaryTab", () => {
	function renderSummary(c = character(), r = rolls(), sceneUnit?: string) {
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, itemsById)}
				sceneUnit={sceneUnit}
				showPassive
				rolls={r}
				resources={resourcesApi()}
			/>,
		);
		return r;
	}

	it("atributo rola com o rótulo curto no dado e o nome inteiro no chat", () => {
		const r = renderSummary();
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Sabedoria (+1)" }),
		);
		expect(r.check).toHaveBeenCalledWith("SAB", 1, "Sabedoria");
	});

	it("salvaguarda soma a proficiência só onde ela existe", () => {
		const r = renderSummary();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rolar salvaguarda de Sabedoria (+6)",
			}),
		);
		expect(r.check).toHaveBeenLastCalledWith("Salvaguarda de Sabedoria", 6);
		// Força: sem proficiência, só o atributo (+0)
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rolar salvaguarda de Força (+0)",
			}),
		);
		expect(r.check).toHaveBeenLastCalledWith("Salvaguarda de Força", 0);
	});

	it("a salvaguarda fica na mesma coluna do atributo", () => {
		renderSummary();
		const attrs = screen.getByRole("region", { name: "Atributos" });
		expect(
			within(attrs).getAllByRole("button", { name: /^Rolar salvaguarda/ }),
		).toHaveLength(6);
	});

	it("atributos com salvaguarda proficiente ganham marca", () => {
		renderSummary();
		expect(
			screen.getAllByRole("img", { name: "Salvaguarda proficiente" }),
		).toHaveLength(2);
	});

	it("deslocamento aparece na unidade da cena (12 m → 40 ft)", () => {
		renderSummary(character(), rolls(), "ft");
		const stat = screen.getByText("Desloc.").previousElementSibling;
		expect(stat?.textContent).toBe("40ft");
	});

	it("outros sistemas não mostram salvaguardas", () => {
		const c = character({ system: "generic" });
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.generic}
				stats={computeEffectiveStats(c, itemsById)}
				showPassive={false}
				rolls={rolls()}
				resources={resourcesApi()}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: /^Rolar salvaguarda/ }),
		).toBeNull();
	});
});
