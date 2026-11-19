// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (orig) => {
	const actual = await orig<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		Link: ({
			children,
			to,
			params,
			search,
			className,
		}: {
			children?: import("react").ReactNode;
			to?: string;
			params?: { itemId?: string };
			search?: { edit?: boolean; tab?: string };
			className?: string;
		}) => {
			const path = String(to ?? "").replace("$itemId", params?.itemId ?? "");
			const query = new URLSearchParams();
			if (search?.edit) query.set("edit", "true");
			if (search?.tab) query.set("tab", search.tab);
			const qs = query.toString();
			return (
				<a href={qs ? `${path}?${qs}` : path} className={className}>
					{children}
				</a>
			);
		},
	};
});

import { computeEffectiveStats } from "@/core/rules";
import { useRPGStore } from "@/lib/store";
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
		expect(
			screen.queryByRole("button", { name: "Gastar uma inspiração" }),
		).toBeNull();
		expect(r.save).not.toHaveBeenCalled();
	});

	it("sem espaços e sem dados de vida ainda dá para usar inspiração, destino e dados bônus", () => {
		const r = api();
		render(
			<SheetResources
				character={character({ hitDice: "", spellSlots: "" })}
				resources={r}
			/>,
		);
		expect(screen.queryByRole("group", { name: "Dados de vida" })).toBeNull();
		expect(screen.getByRole("group", { name: "Inspiração" })).toBeTruthy();
		expect(
			screen.getByRole("group", { name: "Pontos de destino" }),
		).toBeTruthy();
		expect(screen.getByRole("group", { name: "Dados bônus" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Descanso curto" })).toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: "Adicionar uma inspiração" }),
		);
		expect(r.save).toHaveBeenCalledWith({ inspiration: 1 });
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
		expect(
			within(screen.getByRole("group", { name: "Dados de vida" })).getByText(
				"0",
			),
		).toBeTruthy();
	});
});

describe("SheetResources · inspiração, destino e dados bônus", () => {
	const mesa = {
		inspiration: 2,
		fate: 1,
		fateTotal: 10,
		divine: 0,
		divineTotal: 10,
		bonusDice: [] as [],
	};

	it("gastam ou somam na hora, no mesmo bloco, e não descem de zero", () => {
		const r = api();
		render(
			<SheetResources
				character={character({
					hitDice: "1d8",
					hitDiceUsed: 0,
					tableResources: mesa,
				})}
				resources={r}
			/>,
		);
		const recursos = screen.getByRole("region", { name: "Recursos" });
		expect(
			within(recursos).getByRole("group", { name: "Dados de vida" }),
		).toBeTruthy();
		expect(
			within(recursos).getByRole("group", { name: "Inspiração" }),
		).toBeTruthy();
		expect(
			within(recursos).getByRole("group", { name: "Pontos de destino" }),
		).toBeTruthy();
		expect(
			within(recursos).getByRole("group", { name: "Dados bônus" }),
		).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Gastar uma inspiração" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({ inspiration: 1 });
		fireEvent.click(
			screen.getByRole("button", { name: "Adicionar um ponto de destino" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({ fate: 2 });
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar um ponto de destino" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({ fate: 0 });
		fireEvent.click(
			screen.getByRole("button", { name: "Adicionar um dado bônus" }),
		);
		expect(r.save).toHaveBeenLastCalledWith({
			bonusDice: [expect.objectContaining({ sides: 6, quantity: 1 })],
		});
	});

	it("em zero o gastar fica desligado e destino não passa do total", () => {
		render(
			<SheetResources
				character={character({
					tableResources: {
						inspiration: 0,
						fate: 0,
						fateTotal: 10,
						divine: 0,
						divineTotal: 10,
						bonusDice: [],
					},
				})}
				resources={api()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar uma inspiração",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar um ponto de destino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Adicionar um ponto de destino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar um dado bônus",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		cleanup();
		render(
			<SheetResources
				character={character({
					tableResources: {
						inspiration: 1,
						fate: 10,
						fateTotal: 10,
						divine: 0,
						divineTotal: 10,
						bonusDice: [],
					},
				})}
				resources={api()}
			/>,
		);
		expect(
			(
				screen.getByRole("button", {
					name: "Adicionar um ponto de destino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar um ponto de destino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
	});

	it("quem não edita a ficha vê os números e não os botões", () => {
		const r = api({ canEdit: false });
		render(
			<SheetResources
				character={character({
					tableResources: {
						...mesa,
						bonusDice: [{ id: "d", sides: 6, quantity: 1, origin: "" }],
					},
				})}
				resources={r}
			/>,
		);
		expect(screen.getByRole("group", { name: "Inspiração" })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Gastar uma inspiração" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Adicionar um ponto de destino" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Gastar um dado bônus" }),
		).toBeNull();
		expect(r.save).not.toHaveBeenCalled();
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

	it("mostra a CD efetiva, o chip, e rola o ataque já com o item", () => {
		const item = {
			id: "flask-atk",
			name: "Frasco de Sangue",
			type: "Item Maravilhoso",
			slot: "neck",
			requiresAttunement: true,
			bonuses: [
				{ id: "dc", target: "spellSaveDc" as const, value: 3 },
				{ id: "at", target: "spellAttack" as const, value: 2 },
			],
		} as Item;
		const c = character({
			spellAttackBonus: 6,
			spellSaveDc: 14,
			spellsList: [],
			inventoryList: [
				{
					id: "inv-flask-atk",
					name: item.name,
					quantity: 1,
					weightLbs: 0,
					location: "equipped",
					slot: "neck",
					isAttuned: true,
					campaignItemId: item.id,
				},
			],
		});
		const map = new Map([[item.id, item]]);
		const rl = { rolling: false, check: vi.fn(), formula: vi.fn() };
		render(
			<AttacksTab
				character={c}
				stats={computeEffectiveStats(c, map)}
				itemsById={map}
				rolls={rl}
				resources={api()}
				onOpenEquipment={vi.fn()}
			/>,
		);
		expect(screen.getByText("17")).toBeTruthy();
		const dcChip = screen.getByText("CD · Frasco de Sangue +3");
		expect(dcChip.getAttribute("title")).toBe(
			"CD de magia Frasco de Sangue +3",
		);
		expect(dcChip.getAttribute("aria-label")).toBe(
			"CD de magia Frasco de Sangue +3",
		);
		const attackChip = screen.getByText("Ataque · Frasco de Sangue +2");
		expect(attackChip.getAttribute("title")).toBe(
			"Ataque de magia Frasco de Sangue +2",
		);
		expect(attackChip.getAttribute("aria-label")).toBe(
			"Ataque de magia Frasco de Sangue +2",
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar ataque de magia (+8)" }),
		);
		expect(rl.check).toHaveBeenCalledWith("Ataque de magia", 8);
		expect(c.spellAttackBonus).toBe(6);
		expect(c.spellSaveDc).toBe(14);
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
		expect(value("CD magia")).toBe("15");
	});

	it("sem CD de magia na ficha, a célula não aparece", () => {
		renderSummary(character({ spellSaveDc: 0 }));
		expect(screen.queryByText("CD magia")).toBeNull();
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
		expect(framed("CD magia")).toBe(false);
		expect(framed("Proficiência")).toBe(false);
	});
});

describe("SummaryTab · origem da capa equipada", () => {
	afterEach(() => {
		useRPGStore.setState({ campaigns: [], activeCampaignId: null });
	});
	function cape(bonuses: Item["bonuses"] | null, id = "it-cape"): Item {
		const base = {
			id,
			name: "Capa do Vento",
			type: "Capa",
			slot: "cloak" as const,
			requiresAttunement: false,
		} as Item;
		if (bonuses === null) {
			return {
				...base,
				bonuses: null,
				armor: null,
				abilityBonuses: null,
			} as unknown as Item;
		}
		return { ...base, bonuses };
	}
	function renderDante(
		item: Item,
		location: "equipped" | "backpack" = "equipped",
	) {
		const c = character({
			characterName: "Dante Diavolo",
			armorClass: 28,
			dexterity: 14,
			initiative: 2,
			speed: 9,
			speedUnit: "m",
			inventoryList: [
				{
					id: "e-cape",
					name: item.name,
					quantity: 1,
					weightLbs: 0,
					location,
					...(location === "equipped" ? { slot: "cloak" as const } : {}),
					campaignItemId: item.id,
				},
			],
		});
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, new Map([[item.id, item]]))}
				showPassive={false}
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
	}

	it("resumo mostra a origem do bônus (Capa do Vento +3) e os totais com o item", () => {
		renderDante(
			cape([
				{ id: "ac", target: "ac", value: 3 },
				{ id: "in", target: "initiative", value: 2 },
				{ id: "sp", target: "speed", value: 3 },
			]),
		);
		expect(screen.getByText("CA Capa do Vento +3")).toBeTruthy();
		expect(screen.getByText("Init. Capa do Vento +2")).toBeTruthy();
		expect(screen.getByText("Desloc. Capa do Vento +3m")).toBeTruthy();
		expect(screen.getByText("31")).toBeTruthy();
		expect(
			screen.getByText("Iniciativa").previousElementSibling?.textContent,
		).toBe("+4");
		expect(
			screen.getByText("Desloc.").previousElementSibling?.textContent,
		).toBe("12m");
	});

	it("resumo avisa quando a capa equipada não tem número", () => {
		useRPGStore.setState({
			campaigns: [
				{ id: "camp-1", worldId: "world-1", myRole: "owner" },
			] as never,
			activeCampaignId: "camp-1",
		});
		renderDante(cape(null, "it-cape-silent"));
		expect(screen.getByText("Sem número na ficha")).toBeTruthy();
		const link = screen.getByRole("link", { name: "Editar item" });
		const href = link.getAttribute("href") ?? "";
		expect(href).toContain("it-cape-silent");
		expect(href).toContain("edit=true");
		expect(href).toContain("tab=bonus");
		expect(link.className).toContain("min-h-11");
		expect(screen.getByText("28")).toBeTruthy();
		expect(screen.queryByText("31")).toBeNull();
	});

	it("resumo esconde Editar item quando a pessoa não gerencia o item", () => {
		useRPGStore.setState({
			campaigns: [
				{ id: "camp-1", worldId: "world-1", myRole: "viewer" },
			] as never,
			activeCampaignId: "camp-1",
		});
		renderDante(cape(null, "it-cape-silent"));
		expect(screen.getByText("Sem número na ficha")).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Editar item" })).toBeNull();
		expect(screen.getByText("28")).toBeTruthy();
	});

	it("resumo mostra a CD efetiva e o chip do item", () => {
		const item = {
			id: "flask",
			name: "Frasco de Sangue",
			type: "Item Maravilhoso",
			slot: "neck",
			requiresAttunement: true,
			bonuses: [{ id: "dc", target: "spellSaveDc", value: 3 }],
		} as Item;
		const c = character({
			spellSaveDc: 14,
			spellAttackBonus: 6,
			inventoryList: [
				{
					id: "inv-flask",
					name: item.name,
					quantity: 1,
					weightLbs: 0,
					location: "equipped",
					slot: "neck",
					isAttuned: true,
					campaignItemId: item.id,
				},
			],
		});
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, new Map([[item.id, item]]))}
				showPassive={false}
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
		expect(
			screen.getByText("CD magia").previousElementSibling?.textContent,
		).toBe("17");
		const chip = screen.getByText("CD · Frasco de Sangue +3");
		expect(chip.getAttribute("title")).toBe("CD de magia Frasco de Sangue +3");
		expect(chip.getAttribute("aria-label")).toBe(
			"CD de magia Frasco de Sangue +3",
		);
		expect(c.spellSaveDc).toBe(14);
	});

	it("manual 0 com bônus de item mostra a CD do item e o chip", () => {
		const item = {
			id: "flask-zero",
			name: "Frasco de Sangue",
			type: "Item Maravilhoso",
			slot: "neck",
			requiresAttunement: false,
			bonuses: [{ id: "dc", target: "spellSaveDc", value: 3 }],
		} as Item;
		const c = character({
			spellSaveDc: 0,
			inventoryList: [
				{
					id: "inv-flask-zero",
					name: item.name,
					quantity: 1,
					weightLbs: 0,
					location: "equipped",
					slot: "neck",
					campaignItemId: item.id,
				},
			],
		});
		render(
			<SummaryTab
				character={c}
				config={SYSTEM_CONFIG.dnd5e}
				stats={computeEffectiveStats(c, new Map([[item.id, item]]))}
				showPassive={false}
				rolls={{ rolling: false, check: vi.fn(), formula: vi.fn() }}
				resources={api()}
			/>,
		);
		expect(
			screen.getByText("CD magia").previousElementSibling?.textContent,
		).toBe("3");
		expect(screen.getByText("CD · Frasco de Sangue +3")).toBeTruthy();
		expect(c.spellSaveDc).toBe(0);
	});

	it("a mesma capa na mochila não entra no resumo", () => {
		renderDante(
			cape([{ id: "ac", target: "ac", value: 3 }], "it-cape-bag"),
			"backpack",
		);
		expect(screen.getByText("28")).toBeTruthy();
		expect(screen.queryByText("31")).toBeNull();
		expect(screen.queryByText("Capa do Vento +3")).toBeNull();
		expect(screen.queryByText("Sem número na ficha")).toBeNull();
	});
});
