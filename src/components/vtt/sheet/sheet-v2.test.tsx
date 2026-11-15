// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeEffectiveStats } from "@/core/rules";
import type { Character, Item, Spell } from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { AttacksTab } from "./sheet-attacks";
import { SheetCompactBar, SheetHero } from "./sheet-hero";
import { DeathSaves, SheetResources } from "./sheet-resources";
import { SkillsTab } from "./sheet-skills";
import { SummaryTab } from "./sheet-summary";
import type { SheetResourceApi } from "./use-sheet-resources";

afterEach(cleanup);

const itemsById = new Map<string, Item>();
const spell = (over: Partial<Spell>): Spell => ({
	id: over.name ?? "s",
	system: "dnd5e",
	name: "Magia",
	level: 1,
	school: "evocação",
	casting_time: "Ação",
	range: "18 m",
	components: "V, S",
	duration: "Instantânea",
	description: "",
	...over,
});
function character(extra: Partial<Character> = {}): Character {
	return {
		id: "c1",
		system: "dnd5e",
		characterName: "Dante Diavolo",
		race: "Tiefling",
		class: "Mago",
		level: 5,
		proficiencyBonus: 3,
		strength: 10,
		dexterity: 14,
		constitution: 14,
		intelligence: 16,
		wisdom: 12,
		charisma: 20,
		armorClass: 15,
		initiative: 2,
		speed: 9,
		inventoryList: [],
		hitDice: "5d8",
		deathSaves: { successes: 0, failures: 0 },
		spellSlots: "",
		spellSaveDc: 0,
		spellAttackBonus: 0,
		...extra,
	} as unknown as Character;
}
const api = (over: Partial<SheetResourceApi> = {}) => ({
	canEdit: true,
	isStaff: false,
	save: vi.fn(),
	saveVision: vi.fn(),
	...over,
});
const slots = (over = {}) => ({
	slots: {
		"1": { total: 4, used: 1 },
		"2": { total: 2, used: 2 },
	},
	...over,
});

describe("SheetResources · espaços de magia", () => {
	it("mostra os espaços por nível com o que resta", () => {
		render(
			<SheetResources
				character={character({ spellSlotsState: slots() })}
				resources={api()}
			/>,
		);
		expect(screen.getByText("Nível 1 · 3 de 4")).toBeTruthy();
		expect(screen.getByText("Nível 2 · 0 de 2")).toBeTruthy();
	});

	it("tocar numa bolinha cheia gasta um espaço", () => {
		const r = api();
		render(
			<SheetResources
				character={character({ spellSlotsState: slots() })}
				resources={r}
			/>,
		);
		const group = screen.getByRole("group", {
			name: "Espaço de magia nível 1",
		});
		fireEvent.click(within(group).getAllByRole("button")[0] as HTMLElement);
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 4, used: 2 }, "2": { total: 2, used: 2 } },
			},
		});
	});

	it("tocar numa bolinha vazia devolve um espaço", () => {
		const r = api();
		render(
			<SheetResources
				character={character({ spellSlotsState: slots() })}
				resources={r}
			/>,
		);
		const group = screen.getByRole("group", {
			name: "Espaço de magia nível 2",
		});
		fireEvent.click(within(group).getAllByRole("button")[0] as HTMLElement);
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 4, used: 1 }, "2": { total: 2, used: 1 } },
			},
		});
	});

	it("lê o texto antigo quando não há contador (Nv1: 4 / Nv2: 3)", () => {
		render(
			<SheetResources
				character={character({ spellSlots: "Nv1: 4 / Nv2: 3" })}
				resources={api()}
			/>,
		);
		expect(screen.getByText("Nível 1 · 4 de 4")).toBeTruthy();
		expect(screen.getByText("Nível 2 · 3 de 3")).toBeTruthy();
	});

	it("espaços de Pacto aparecem à parte e gastam o Pacto", () => {
		const r = api();
		render(
			<SheetResources
				character={character({
					spellSlotsState: { slots: {}, pact: { level: 5, total: 2, used: 0 } },
				})}
				resources={r}
			/>,
		);
		expect(screen.getByText(/Pacto · nível 5 · 2 de 2/)).toBeTruthy();
		const group = screen.getByRole("group", {
			name: "Espaço de Pacto nível 5",
		});
		fireEvent.click(within(group).getAllByRole("button")[0] as HTMLElement);
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: { slots: {}, pact: { level: 5, total: 2, used: 1 } },
		});
	});

	it("sem permissão: as bolinhas não respondem e não há descanso", () => {
		const r = api({ canEdit: false });
		render(
			<SheetResources
				character={character({ spellSlotsState: slots() })}
				resources={r}
			/>,
		);
		for (const b of within(
			screen.getByRole("group", { name: "Espaço de magia nível 1" }),
		).getAllByRole("button")) {
			expect((b as HTMLButtonElement).disabled).toBe(true);
		}
		expect(screen.queryByRole("button", { name: "Descanso curto" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Descanso longo" })).toBeNull();
		expect(r.save).not.toHaveBeenCalled();
	});

	it("sem espaços e sem dados de vida a seção não aparece", () => {
		const { container } = render(
			<SheetResources
				character={character({ hitDice: "", spellSlots: "" })}
				resources={api()}
			/>,
		);
		expect(container.textContent).toBe("");
	});
});

describe("SheetResources · descansos e dados de vida", () => {
	const gasto = character({
		spellSlotsState: {
			slots: { "1": { total: 4, used: 3 } },
			pact: { level: 5, total: 2, used: 2 },
		},
		hitDice: "10d8",
		hitDiceUsed: 6,
		deathSaves: { successes: 2, failures: 1 },
	});

	it("descanso curto devolve só o Pacto", () => {
		const r = api();
		render(<SheetResources character={gasto} resources={r} />);
		fireEvent.click(screen.getByRole("button", { name: "Descanso curto" }));
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 4, used: 3 } },
				pact: { level: 5, total: 2, used: 0 },
			},
		});
	});

	it("descanso longo devolve tudo, metade dos dados de vida e zera as salvaguardas", () => {
		const r = api();
		render(<SheetResources character={gasto} resources={r} />);
		fireEvent.click(screen.getByRole("button", { name: "Descanso longo" }));
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 4, used: 0 } },
				pact: { level: 5, total: 2, used: 0 },
			},
			hitDiceUsed: 1, // 6 gastos − 5 (metade de 10)
			deathSaves: { successes: 0, failures: 0 },
		});
	});

	it("mostra quantos dados de vida restam e gasta/recupera um", () => {
		const r = api();
		render(<SheetResources character={gasto} resources={r} />);
		expect(screen.getByText("4")).toBeTruthy(); // 10 − 6
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar um dado de vida" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({ hitDiceUsed: 7 });
		fireEvent.click(
			screen.getByRole("button", { name: "Recuperar um dado de vida" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({ hitDiceUsed: 5 });
	});

	it("sem dado para gastar ou recuperar, o botão fica desabilitado", () => {
		render(
			<SheetResources
				character={character({ hitDice: "3d8", hitDiceUsed: 3 })}
				resources={api()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar um dado de vida",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		cleanup();
		render(
			<SheetResources
				character={character({ hitDice: "3d8", hitDiceUsed: 0 })}
				resources={api()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Recuperar um dado de vida",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("dados gastos além do total não dão número negativo", () => {
		render(
			<SheetResources
				character={character({ hitDice: "3d8", hitDiceUsed: 9 })}
				resources={api()}
			/>,
		);
		expect(screen.getByText("0")).toBeTruthy();
	});
});

describe("DeathSaves", () => {
	it("marca sucessos até a bolinha tocada e desmarca tocando na última", () => {
		const r = api();
		render(<DeathSaves character={character()} resources={r} />);
		fireEvent.click(screen.getByRole("button", { name: "Sucesso 2" }));
		expect(r.save).toHaveBeenLastCalledWith({
			deathSaves: { successes: 2, failures: 0 },
		});
		cleanup();
		const r2 = api();
		render(
			<DeathSaves
				character={character({ deathSaves: { successes: 2, failures: 1 } })}
				resources={r2}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Sucesso 2" }));
		expect(r2.save).toHaveBeenLastCalledWith({
			deathSaves: { successes: 1, failures: 1 },
		});
		fireEvent.click(screen.getByRole("button", { name: "Falha 3" }));
		expect(r2.save).toHaveBeenLastCalledWith({
			deathSaves: { successes: 2, failures: 3 },
		});
	});

	it("sem permissão não muda nada", () => {
		const r = api({ canEdit: false });
		render(<DeathSaves character={character()} resources={r} />);
		fireEvent.click(screen.getByRole("button", { name: "Falha 1" }));
		expect(r.save).not.toHaveBeenCalled();
	});
});

describe("SheetHero · inspiração e condições", () => {
	const hero = (over: Partial<Parameters<typeof SheetHero>[0]> = {}) =>
		render(
			<SheetHero
				character={character()}
				portraitUrl=""
				conditions={[]}
				inspiration={0}
				canEditInspiration
				canGrantInspiration={false}
				onInspirationChange={vi.fn()}
				{...over}
			/>,
		);

	it("com inspiração, um toque gasta uma", () => {
		const change = vi.fn();
		hero({ inspiration: 2, onInspirationChange: change });
		fireEvent.click(
			screen.getByRole("button", { name: "Inspiração: 2. Usar uma" }),
		);
		expect(change).toHaveBeenCalledWith(1);
	});

	it("sem inspiração, só o mestre concede; jogador não", () => {
		const change = vi.fn();
		hero({
			inspiration: 0,
			canGrantInspiration: true,
			onInspirationChange: change,
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Sem inspiração. Conceder uma" }),
		);
		expect(change).toHaveBeenCalledWith(1);
		cleanup();
		const change2 = vi.fn();
		hero({
			inspiration: 0,
			canGrantInspiration: false,
			onInspirationChange: change2,
		});
		const star = screen.getByRole("button", {
			name: "Sem inspiração",
		}) as HTMLButtonElement;
		expect(star.disabled).toBe(true);
		fireEvent.click(star);
		expect(change2).not.toHaveBeenCalled();
	});

	it("quem não pode editar não gasta a inspiração", () => {
		const change = vi.fn();
		hero({
			inspiration: 1,
			canEditInspiration: false,
			onInspirationChange: change,
		});
		const star = screen.getByRole("button", {
			name: /Inspiração: 1/,
		}) as HTMLButtonElement;
		expect(star.disabled).toBe(true);
	});

	it("mostra as condições do token com o nome certo", () => {
		hero({ conditions: ["envenenado", "caido"] });
		const list = screen.getByRole("list", { name: "Condições" });
		expect(
			within(list)
				.getAllByRole("listitem")
				.map((l) => l.textContent),
		).toEqual(["Envenenado", "Caído"]);
	});

	it("mais de 4 condições: mostra 4 e '+N'", () => {
		hero({ conditions: ["a", "b", "c", "d", "e", "f"] });
		const items = within(
			screen.getByRole("list", { name: "Condições" }),
		).getAllByRole("listitem");
		expect(items).toHaveLength(5);
		expect(items[4]?.textContent).toBe("+2");
	});

	it("sem condições, nada é desenhado", () => {
		hero({ conditions: [] });
		expect(screen.queryByRole("list", { name: "Condições" })).toBeNull();
	});
});

describe("SheetCompactBar", () => {
	it("mostra nome e PV e devolve o cabeçalho ao tocar", () => {
		const expand = vi.fn();
		render(
			<SheetCompactBar
				character={character()}
				portraitUrl=""
				hpLabel="12 / 40"
				hpRatio={0.3}
				low={false}
				onExpand={expand}
			/>,
		);
		const bar = screen.getByRole("button", {
			name: /Dante Diavolo, 12 \/ 40 PV/,
		});
		expect(bar.textContent).toContain("12 / 40 PV");
		fireEvent.click(bar);
		expect(expand).toHaveBeenCalledTimes(1);
	});
});

describe("AttacksTab · magias", () => {
	const caster = (extra: Partial<Character> = {}) =>
		character({
			spellAttackBonus: 7,
			spellSaveDc: 15,
			spellSlotsState: slots(),
			spellsList: [
				spell({ name: "Rajada Mística", level: 0, range: "36 m" }),
				spell({ name: "Mísseis Mágicos", level: 1 }),
				spell({ name: "Bola de Fogo", level: 3, range: "45 m" }),
			],
			...extra,
		});
	const render1 = (
		c: Character,
		r = api(),
		rl = { rolling: false, check: vi.fn(), formula: vi.fn() },
	) => {
		render(
			<AttacksTab
				character={c}
				stats={computeEffectiveStats(c, itemsById)}
				itemsById={itemsById}
				rolls={rl}
				resources={r}
				onOpenEquipment={vi.fn()}
			/>,
		);
		return { r, rl };
	};

	it("agrupa por nível: truques à vontade, resto com espaços restantes", () => {
		render1(caster());
		expect(screen.getByText("Truques")).toBeTruthy();
		expect(screen.getByText("à vontade")).toBeTruthy();
		expect(screen.getByText("Nível 1")).toBeTruthy();
		expect(screen.getByText("3 de 4 espaços")).toBeTruthy();
		expect(screen.getByText("Nível 3")).toBeTruthy();
		// nível 3 sem espaço nenhum que sirva
		expect(screen.getByText("sem espaços")).toBeTruthy();
	});

	it("bruxo: magia de nível baixo diz que usa o espaço de Pacto", () => {
		render1(
			caster({
				class: "Bruxo",
				spellSlotsState: { slots: {}, pact: { level: 5, total: 2, used: 0 } },
			}),
		);
		expect(
			screen.getAllByText("usa espaço de Pacto (nível 5)").length,
		).toBeGreaterThan(0);
	});

	it("sem espaço do nível, o cabeçalho diz de que nível sai o espaço", () => {
		render1(
			caster({
				spellSlotsState: {
					slots: { "1": { total: 1, used: 1 }, "2": { total: 2, used: 0 } },
				},
			}),
		);
		expect(screen.getByText("usa espaço de nível 2")).toBeTruthy();
	});

	it("nível com espaços todos gastos e nenhum acima: mostra 0 de N", () => {
		render1(
			caster({ spellSlotsState: { slots: { "1": { total: 2, used: 2 } } } }),
		);
		expect(screen.getByText("0 de 2 espaços")).toBeTruthy();
	});

	it("mostra alcance e tempo de conjuração da magia", () => {
		render1(caster());
		expect(screen.getByText("Ação · 36 m · evocação")).toBeTruthy();
	});

	it("Lançar gasta o espaço do nível da magia", () => {
		const { r } = render1(caster());
		fireEvent.click(
			screen.getByRole("button", {
				name: "Lançar Mísseis Mágicos (gasta um espaço)",
			}),
		);
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 4, used: 2 }, "2": { total: 2, used: 2 } },
			},
		});
	});

	it("sem espaço do nível mas com um maior, Lançar sobe para ele", () => {
		const c = caster({
			spellSlotsState: {
				slots: { "1": { total: 1, used: 1 }, "2": { total: 2, used: 0 } },
			},
		});
		const { r } = render1(c);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Lançar Mísseis Mágicos (gasta um espaço)",
			}),
		);
		expect(r.save).toHaveBeenCalledWith({
			spellSlotsState: {
				slots: { "1": { total: 1, used: 1 }, "2": { total: 2, used: 1 } },
			},
		});
	});

	it("sem nenhum espaço que sirva, Lançar fica desabilitado", () => {
		const { r } = render1(caster());
		const btn = screen.getByRole("button", {
			name: "Lançar Bola de Fogo (gasta um espaço)",
		}) as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
		fireEvent.click(btn);
		expect(r.save).not.toHaveBeenCalled();
	});

	it("truque não tem botão de lançar (não gasta espaço)", () => {
		render1(caster());
		expect(
			screen.queryByRole("button", { name: /Lançar Rajada Mística/ }),
		).toBeNull();
	});

	it("quem não pode editar vê as magias mas não lança", () => {
		render1(caster(), api({ canEdit: false }));
		expect(screen.getByText("Mísseis Mágicos")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Lançar/ })).toBeNull();
	});

	it("o ataque de magia rola d20 + bônus e a CD aparece", () => {
		const { rl } = render1(caster());
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar ataque de magia (+7)" }),
		);
		expect(rl.check).toHaveBeenCalledWith("Ataque de magia", 7);
		expect(screen.getByText("15")).toBeTruthy();
		expect(screen.getByText("CD de salvaguarda")).toBeTruthy();
	});

	it("quem não conjura não vê a seção de magias", () => {
		render1(character({ spellsList: [], spellAttackBonus: 0, spellSaveDc: 0 }));
		expect(screen.queryByRole("region", { name: "Magias" })).toBeNull();
	});

	it("com magias mas sem arma, as magias aparecem junto do aviso de arma", () => {
		render1(caster());
		expect(screen.getByText("Nenhuma arma equipada")).toBeTruthy();
		expect(screen.getByText("Mísseis Mágicos")).toBeTruthy();
	});
});

describe("SummaryTab · painel de combate", () => {
	const stats = (c: Character) => computeEffectiveStats(c, itemsById);
	const renderSummary = (c: Character) =>
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={stats(c)}
				showPassive
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
	const value = (label: string) =>
		screen.getByText(label).previousElementSibling?.textContent;

	it("mostra a proficiência e a CD de magia quando a ficha tem", () => {
		renderSummary(character({ spellSaveDc: 15 }));
		expect(value("Proficiência")).toBe("+3");
		expect(value("CD de magia")).toBe("15");
	});

	it("sem CD de magia na ficha, a célula não aparece", () => {
		renderSummary(character({ spellSaveDc: 0 }));
		expect(screen.queryByText("CD de magia")).toBeNull();
	});

	it("recursos aparecem para quem tem dados de vida ou espaços", () => {
		renderSummary(character({ spellSlotsState: slots() }));
		expect(screen.getByRole("region", { name: "Recursos" })).toBeTruthy();
	});

	it("outro sistema não mostra proficiência nem recursos de D&D", () => {
		const c = character({ system: "generic" });
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.generic}
				stats={stats(c)}
				showPassive={false}
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
		expect(screen.queryByText("Proficiência")).toBeNull();
		expect(screen.queryByRole("region", { name: "Recursos" })).toBeNull();
	});
});

describe("SkillsTab · lista com marca de proficiência", () => {
	const stats = (c: Character) => computeEffectiveStats(c, itemsById);
	const renderSkills = () => {
		const c = character({
			skillProficiencies: { persuasion: "expertise", perception: "proficient" },
		});
		render(
			<SkillsTab
				character={c}
				stats={stats(c)}
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
			/>,
		);
	};
	const rowOf = (name: string) =>
		screen.getByRole("button", { name: new RegExp(`^Rolar ${name} `) });

	it("especialista tem marca própria; proficiente também; sem proficiência não tem marca anunciada", () => {
		renderSkills();
		expect(
			within(rowOf("Persuasão")).getByRole("img", { name: "Especialista" }),
		).toBeTruthy();
		expect(
			within(rowOf("Percepção")).getByRole("img", { name: "Proficiente" }),
		).toBeTruthy();
		expect(within(rowOf("Acrobacia")).queryByRole("img")).toBeNull();
	});

	it("a linha mostra nome, atributo e modificador (que é o que se rola)", () => {
		renderSkills();
		const row = rowOf("Persuasão");
		expect(row.textContent).toContain("Persuasão");
		expect(row.textContent).toContain("CAR");
		expect(row.textContent).toContain("+11"); // CAR +5 + 2 × proficiência 3
	});

	it("proficientes aparecem em destaque (peso da fonte), as demais mais discretas", () => {
		renderSkills();
		expect(
			rowOf("Persuasão").querySelector("span:nth-child(2)")?.className,
		).toContain("font-semibold");
		expect(
			rowOf("Acrobacia").querySelector("span:nth-child(2)")?.className,
		).not.toContain("font-semibold");
	});
});

describe("SummaryTab · atributos com salvaguarda na mesma coluna", () => {
	it("a salvaguarda proficiente tem escudo marcado; a sem proficiência, não", () => {
		const c = character({ savingThrowProficiencies: { wisdom: true } });
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, itemsById)}
				showPassive
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
		const wis = screen.getByRole("button", {
			name: /^Rolar salvaguarda de Sabedoria/,
		});
		const str = screen.getByRole("button", {
			name: /^Rolar salvaguarda de Força/,
		});
		expect(
			within(wis).getByRole("img", { name: "Salvaguarda proficiente" }),
		).toBeTruthy();
		expect(within(str).queryByRole("img")).toBeNull();
	});

	it("a CA é o único número com moldura; os demais ficam soltos", () => {
		const c = character({ spellSaveDc: 15 });
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, itemsById)}
				showPassive
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
		const framed = (label: string) =>
			(
				screen.getByText(label).closest("div") as HTMLElement
			).className.includes("border");
		expect(framed("CA")).toBe(true);
		expect(framed("Iniciativa")).toBe(false);
		expect(framed("CD de magia")).toBe(false);
		expect(framed("Proficiência")).toBe(false);
	});
});
