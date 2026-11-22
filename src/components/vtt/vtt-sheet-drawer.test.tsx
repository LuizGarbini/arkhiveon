// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateAbilityModifier, formatModifier } from "@/core/rules";

const h = vi.hoisted(() => ({
	rpg: { characters: [] as unknown[], campaignLoadStatus: "ready" },
	vtt: {
		showCharacterSheetId: "tok-1" as string | null,
		openSheetIds: ["tok-1"],
		setShowCharacterSheetId: () => {},
		closeCharacterSheet: () => {},
		isGM: true,
		tokens: [
			{ id: "tok-1", name: "QA Guerreira", characterId: "char-1" },
		] as unknown[],
		scenes: [] as { id: string; gridScaleUnit: string }[],
		activeSceneId: null as string | null,
	},
}));

vi.mock("@/lib/store", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/store")>();
	return {
		...actual,
		useRPGStore: (selector: (s: typeof h.rpg) => unknown) => selector(h.rpg),
	};
});
vi.mock("@/lib/vtt/vtt-store", () => ({
	useVTTStore: (selector: (s: typeof h.vtt) => unknown) => selector(h.vtt),
}));
// Dado determinístico: o overlay "termina" com 12 ao clicar.
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: ({
		open,
		modifier,
		onComplete,
	}: {
		open: boolean;
		modifier: number;
		onComplete: (n: number) => void;
	}) =>
		open ? (
			<button
				type="button"
				data-modifier={modifier}
				onClick={() => onComplete(12)}
			>
				terminar rolagem
			</button>
		) : null,
}));

import { VTTSheetDrawer } from "./vtt-sheet-drawer";

const LABELS = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

function setCharacter(scores: Record<string, unknown>) {
	h.rpg.characters = [
		{
			id: "char-1",
			system: "dnd5e",
			characterName: "QA Guerreira",
			armorClass: 0,
			speed: 0,
			health: 10,
			healthMax: 10,
			...scores,
		},
	];
}

/** Cartão do atributo (botão de rolar): o rótulo curto é o primeiro texto. */
function chip(label: string): HTMLElement {
	const el = screen
		.getAllByRole("button")
		.find(
			(b) =>
				b.getAttribute("aria-label")?.startsWith("Rolar ") &&
				b.children[0]?.textContent === label,
		);
	if (!el) throw new Error(`chip ${label}`);
	return el;
}

/** Modificador mostrado no cartão do atributo (o número grande). */
const modOf = (label: string) => chip(label).children[1]?.textContent;

afterEach(() => {
	cleanup();
	h.vtt.scenes = [];
	h.vtt.activeSceneId = null;
});

/** Valor da célula de uma estatística da faixa (CA, INIT, MOV, PASSIVA). */
function quickStat(label: string): string | null | undefined {
	return screen.getByText(label).closest("div")?.querySelector("dd")
		?.textContent;
}

describe("VTTSheetDrawer · deslocamento na unidade da mesa", () => {
	const dnd = { speed: 30, wisdom: 14 };

	it("ficha em pés, cena em metros: 30ft aparece como 9m", () => {
		h.vtt.scenes = [{ id: "sc-1", gridScaleUnit: "m" }];
		h.vtt.activeSceneId = "sc-1";
		setCharacter(dnd);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("9m");
	});

	it("cena em pés mantém 30ft", () => {
		h.vtt.scenes = [{ id: "sc-1", gridScaleUnit: "ft" }];
		h.vtt.activeSceneId = "sc-1";
		setCharacter(dnd);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("30ft");
	});

	it("cena em quadrados: 30ft são 6sq", () => {
		h.vtt.scenes = [{ id: "sc-1", gridScaleUnit: "sq" }];
		h.vtt.activeSceneId = "sc-1";
		setCharacter(dnd);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("6sq");
	});

	it("ficha que escolheu metros (12m) em cena de metros fica 12m, sem virar 3,6m", () => {
		h.vtt.scenes = [{ id: "sc-1", gridScaleUnit: "m" }];
		h.vtt.activeSceneId = "sc-1";
		setCharacter({ speed: 12, speedUnit: "m" });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("12m");
	});

	it("ficha em metros (12m) numa cena em pés aparece como 40ft", () => {
		h.vtt.scenes = [{ id: "sc-1", gridScaleUnit: "ft" }];
		h.vtt.activeSceneId = "sc-1";
		setCharacter({ speed: 12, speedUnit: "m" });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("40ft");
	});

	it("sem cena ativa mostra como a ficha guarda", () => {
		setCharacter(dnd);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(quickStat("Desloc.")).toBe("30ft");
	});

	it("mostra a percepção passiva na ficha da mesa (D&D 5e)", () => {
		setCharacter({
			...dnd,
			proficiencyBonus: 3,
			skillProficiencies: { perception: "proficient" },
		});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		// 10 + SAB 14 (+2) + proficiência 3
		expect(quickStat("Passiva")).toBe("15");
	});

	it("sistema sem percepção passiva não mostra o quadradinho", () => {
		setCharacter({ ...dnd, system: "generic" });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(screen.queryByText("Passiva")).toBeNull();
	});
});

describe("VTTSheetDrawer · atributos", () => {
	it("ficha antiga (tudo 0) mostra +0 em todos, como a ficha", () => {
		setCharacter({
			strength: 0,
			dexterity: 0,
			constitution: 0,
			intelligence: 0,
			wisdom: 0,
			charisma: 0,
		});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		for (const l of LABELS) expect(modOf(l)).toBe("+0");
	});

	it("ficha nova mostra cada modificador no atributo certo", () => {
		const scores = {
			strength: 8,
			dexterity: 14,
			constitution: 12,
			intelligence: 18,
			wisdom: 10,
			charisma: 3,
		};
		setCharacter(scores);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const expected = Object.values(scores).map((s) =>
			formatModifier(calculateAbilityModifier(s)),
		);
		expect(expected).toEqual(["-1", "+2", "+1", "+4", "+0", "-4"]);
		LABELS.forEach((l, i) => {
			expect(modOf(l)).toBe(expected[i]);
		});
	});

	it("rolagem de FOR usa o modificador certo no texto", () => {
		setCharacter({ strength: 8 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(chip("FOR"));
		const done = screen.getByText("terminar rolagem");
		expect(done.getAttribute("data-modifier")).toBe("-1");
		fireEvent.click(done);
		expect(screen.getByText("FOR: 12 − 1 = 11")).toBeTruthy();
	});

	it("ficha ligada mostra o PV da ficha antes do token", () => {
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		// o número grande é o da ficha (33 de 38), nunca o do token (1 de 2)
		const open = screen.getByRole("button", {
			name: "Pontos de vida: 33 / 38. Abrir dano e cura",
		});
		expect(open.textContent).toContain("33");
		expect(screen.getAllByText("/ 38").length).toBeGreaterThan(0);
		expect(screen.queryByText("/ 2")).toBeNull();
		// “Editar valores” no painel reúne PV atual, máximo e vida temporária
		fireEvent.click(open);
		fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
		expect(screen.getByRole("spinbutton", { name: "PV máximo" })).toBeTruthy();
		expect(screen.getByRole("spinbutton", { name: "PV atual" })).toBeTruthy();
		expect(
			screen.getByRole("spinbutton", { name: "Vida temporária" }),
		).toBeTruthy();
	});

	it("jogador não vê nem edita o PV máximo", () => {
		h.vtt.isGM = false;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const open = screen.getByRole("button", {
			name: "Pontos de vida: 33. Abrir dano e cura",
		});
		expect(open.textContent).toContain("33");
		expect(screen.queryByText("/ 38")).toBeNull();
		expect(screen.queryByText("38")).toBeNull();
		fireEvent.click(open);
		fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
		expect(screen.queryByRole("spinbutton", { name: "PV máximo" })).toBeNull();
		// vida temporária é só do mestre/co-mestre (o jogador não grava a ficha)
		expect(
			screen.queryByRole("spinbutton", { name: "Vida temporária" }),
		).toBeNull();
		h.vtt.isGM = true;
	});

	it("enquanto salva, mostra Salvando e ignora o segundo clique", async () => {
		let resolveSave: (value: boolean) => void = () => {};
		const onUpdateToken = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolveSave = resolve;
				}),
		);
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={onUpdateToken} />);
		fireEvent.click(
			screen.getByRole("button", {
				name: /Pontos de vida: .*Abrir dano e cura/,
			}),
		);
		const minus = screen.getByRole("button", { name: "Tirar 5 PV" });
		fireEvent.click(minus);
		fireEvent.click(minus);
		expect(onUpdateToken).toHaveBeenCalledTimes(1);
		expect(onUpdateToken).toHaveBeenCalledWith("tok-1", { hpCurrent: 28 });
		expect(screen.getAllByText("Salvando…").length).toBeGreaterThan(0);
		expect((minus as HTMLButtonElement).disabled).toBe(true);
		await act(async () => {
			resolveSave(true);
		});
		expect((minus as HTMLButtonElement).disabled).toBe(false);
	});

	it("+0 sai sem sufixo (ficha antiga não vira −5)", () => {
		setCharacter({ strength: 0 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(chip("FOR"));
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(screen.getByText("FOR: 12 = 12")).toBeTruthy();
	});
});

describe("VTTSheetDrawer · abas", () => {
	const tab = (name: string) => screen.getByRole("tab", { name });

	it("D&D 5e tem Resumo, Ataques, Perícias e Equipamento; Resumo abre primeiro", () => {
		setCharacter({ dexterity: 14 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
			"Resumo",
			"Ataques",
			"Perícias",
			"Equipamento",
		]);
		expect(tab("Resumo").getAttribute("aria-selected")).toBe("true");
		expect(screen.getByRole("region", { name: "Atributos" })).toBeTruthy();
	});

	it("outros sistemas mostram só o resumo, sem barra de abas", () => {
		setCharacter({ system: "generic" });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(screen.queryByRole("tablist")).toBeNull();
		expect(screen.getByRole("region", { name: "Atributos" })).toBeTruthy();
	});

	it("trocar de aba mostra o painel certo", () => {
		setCharacter({});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(tab("Perícias"));
		expect(screen.getByRole("searchbox")).toBeTruthy();
		expect(screen.queryByRole("region", { name: "Atributos" })).toBeNull();
		expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
			tab("Perícias").id,
		);
		fireEvent.click(tab("Ataques"));
		expect(screen.getByText("Nenhuma arma equipada")).toBeTruthy();
		fireEvent.click(tab("Equipamento"));
		expect(screen.getByText("Nada equipado")).toBeTruthy();
	});

	it("perícia rola no dado e o resultado aparece com o nome", () => {
		setCharacter({ dexterity: 14 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(tab("Perícias"));
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Acrobacia (+2)" }),
		);
		const done = screen.getByText("terminar rolagem");
		expect(done.getAttribute("data-modifier")).toBe("2");
		fireEvent.click(done);
		expect(screen.getByText("Acrobacia: 12 + 2 = 14")).toBeTruthy();
	});

	it("salvaguarda rola como Salvaguarda de <atributo>", () => {
		setCharacter({
			wisdom: 12,
			proficiencyBonus: 3,
			savingThrowProficiencies: { wisdom: true },
		});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rolar salvaguarda de Sabedoria (+4)",
			}),
		);
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(
			screen.getByText("Salvaguarda de Sabedoria: 12 + 4 = 16"),
		).toBeTruthy();
	});

	it("Rolar d20 continua rolando um teste livre", () => {
		setCharacter({});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(screen.getByRole("button", { name: "Rolar d20" }));
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(screen.getByText("Teste livre: 12 = 12")).toBeTruthy();
	});
});

describe("VTTSheetDrawer · cabeçalho novo", () => {
	const withToken = (extra: Record<string, unknown> = {}) => {
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 7,
				hpMax: 10,
				conditions: [],
				...extra,
			},
		];
	};

	it("mostra as condições do token como etiquetas", () => {
		withToken({ conditions: ["envenenado"] });
		setCharacter({});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const list = screen.getByRole("list", { name: "Condições" });
		expect(list.textContent).toBe("Envenenado");
	});

	it("salvaguardas contra a morte só aparecem com o PV em zero", () => {
		withToken({ hpCurrent: 7 });
		setCharacter({ health: 7, healthMax: 10 });
		const view = render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(
			screen.queryByRole("region", { name: "Salvaguardas contra a morte" }),
		).toBeNull();
		view.unmount();
		withToken({ hpCurrent: 0 });
		setCharacter({ health: 0, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(
			screen.getByRole("region", { name: "Salvaguardas contra a morte" }),
		).toBeTruthy();
	});

	it("ao rolar o conteúdo o cabeçalho recolhe numa barra, e tocar nela devolve", () => {
		withToken();
		setCharacter({ health: 7, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const panel = screen.getByRole("tabpanel");
		const set = (name: string, value: number) =>
			Object.defineProperty(panel, name, { configurable: true, value });
		set("scrollTop", 120);
		set("scrollHeight", 1200);
		set("clientHeight", 300);
		expect(
			screen.queryByRole("button", { name: /Mostrar cabeçalho/ }),
		).toBeNull();
		fireEvent.scroll(panel);
		const bar = screen.getByRole("button", {
			name: /QA Guerreira, 7 \/ 10 PV. Mostrar cabeçalho/,
		});
		fireEvent.click(bar);
		expect(
			screen.queryByRole("button", { name: /Mostrar cabeçalho/ }),
		).toBeNull();
	});

	it("conteúdo curto: rolar não recolhe o cabeçalho (evita pisca-pisca)", () => {
		withToken();
		setCharacter({ health: 7, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const panel = screen.getByRole("tabpanel");
		for (const [name, value] of [
			["scrollTop", 60],
			["scrollHeight", 360],
			["clientHeight", 300],
		] as const) {
			Object.defineProperty(panel, name, { configurable: true, value });
		}
		fireEvent.scroll(panel);
		expect(
			screen.queryByRole("button", { name: /Mostrar cabeçalho/ }),
		).toBeNull();
	});

	it("trocar de aba reabre o cabeçalho recolhido", () => {
		withToken();
		setCharacter({ health: 7, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const panel = screen.getByRole("tabpanel");
		for (const [name, value] of [
			["scrollTop", 120],
			["scrollHeight", 1200],
			["clientHeight", 300],
		] as const) {
			Object.defineProperty(panel, name, { configurable: true, value });
		}
		fireEvent.scroll(panel);
		expect(
			screen.getByRole("button", { name: /Mostrar cabeçalho/ }),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("tab", { name: "Perícias" }));
		expect(
			screen.queryByRole("button", { name: /Mostrar cabeçalho/ }),
		).toBeNull();
	});
});

describe("VTTSheetDrawer · rolagem entre abas", () => {
	it("a rolagem de uma aba não vaza para a outra (painel novo, no topo)", () => {
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 7,
				hpMax: 10,
				conditions: [],
			},
		];
		setCharacter({ health: 7, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const before = screen.getByRole("tabpanel");
		before.scrollTop = 240;
		fireEvent.click(screen.getByRole("tab", { name: "Perícias" }));
		const after = screen.getByRole("tabpanel");
		expect(after).not.toBe(before);
		expect(after.scrollTop).toBe(0);
	});
});

describe("VTTSheetDrawer · recolher o cabeçalho com animação", () => {
	const collapse = () => {
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 7,
				hpMax: 10,
				conditions: [],
			},
		];
		setCharacter({ health: 7, healthMax: 10 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const panel = screen.getByRole("tabpanel");
		for (const [name, value] of [
			["scrollTop", 120],
			["scrollHeight", 1200],
			["clientHeight", 300],
		] as const) {
			Object.defineProperty(panel, name, { configurable: true, value });
		}
		return panel;
	};
	const heading = () => document.querySelector("h2") as HTMLElement;

	it("aberto: o cabeçalho é alcançável e a barra fina fica fora do teclado", () => {
		collapse();
		expect(heading().closest("[inert]")).toBeNull();
		expect(heading().closest("[aria-hidden='true']")).toBeNull();
		// a barra existe (para animar), mas inerte e escondida de leitor de tela
		const bar = document.querySelector(
			"button[aria-label*='Mostrar cabeçalho']",
		) as HTMLElement;
		expect(bar.closest("[inert]")).not.toBeNull();
		expect(bar.closest("[aria-hidden='true']")).not.toBeNull();
	});

	it("recolhido: o cabeçalho completo fica inerte (Tab não entra nele) e a barra vira alcançável", () => {
		const panel = collapse();
		fireEvent.scroll(panel);
		expect(heading().closest("[inert]")).not.toBeNull();
		expect(heading().closest("[aria-hidden='true']")).not.toBeNull();
		const bar = screen.getByRole("button", { name: /Mostrar cabeçalho/ });
		expect(bar.closest("[inert]")).toBeNull();
	});

	it("a animação respeita 'reduzir movimento'", () => {
		collapse();
		const wrapper = heading().closest("[class*='grid-rows']") as HTMLElement;
		expect(wrapper.className).toContain(
			"transition-[grid-template-rows,opacity]",
		);
		expect(wrapper.className).toContain("motion-reduce:transition-none");
	});
});
