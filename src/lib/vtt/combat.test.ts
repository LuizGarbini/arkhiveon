import { describe, expect, it } from "vitest";
import {
	abilityModifier,
	type Combatant,
	type CombatTurn,
	initiativeSource,
	NO_COMBAT,
	nextTurn,
	playerTurnView,
	previousTurn,
	resolveInitiative,
	rollAllInitiative,
	rollD20,
	setInitiative,
	sortCombatants,
	startCombat,
	visibleCombatants,
} from "./combat";

const c = (
	id: string,
	initiative: number | null,
	dex: number | null = null,
	sortKey = 0,
): Combatant => ({ id, tokenId: `t-${id}`, initiative, dex, sortKey });

/** rng que faz o d20 sair exatamente `face`. */
const face = (n: number) => () => (n - 1) / 20;

describe("ordem e desempate", () => {
	it("iniciativa decrescente; empate por maior DES; depois ordem de adição", () => {
		const order = sortCombatants([
			c("a", 12, 10, 0),
			c("b", 18, 10, 1),
			c("c", 12, 16, 2),
			c("d", 12, 16, 3),
			c("e", 12, null, 4),
		]);
		expect(order.map((x) => x.id)).toEqual(["b", "c", "d", "a", "e"]);
	});

	it("sem valor vai para o fim, e não altera a lista original", () => {
		const list = [c("a", null, 0, 0), c("b", 5, null, 1)];
		expect(sortCombatants(list).map((x) => x.id)).toEqual(["b", "a"]);
		expect(list.map((x) => x.id)).toEqual(["a", "b"]);
	});

	it("negativos e zero ordenam certo", () => {
		expect(
			sortCombatants([c("a", -2), c("b", 0, null, 1)]).map((x) => x.id),
		).toEqual(["b", "a"]);
	});
});

describe("de onde vem a iniciativa", () => {
	it("usa o campo initiative da ficha (inclusive 0)", () => {
		expect(initiativeSource({ initiative: 3, dexterity: 18 })).toEqual({
			kind: "sheet",
			value: 3,
		});
		expect(initiativeSource({ initiative: 0 })).toEqual({
			kind: "sheet",
			value: 0,
		});
	});

	it("sem initiative: d20 + mod. de DES", () => {
		expect(initiativeSource({ initiative: null, dexterity: 15 })).toEqual({
			kind: "roll",
			mod: 2,
		});
		expect(resolveInitiative({ kind: "roll", mod: 2 }, face(17))).toBe(19);
		expect(resolveInitiative({ kind: "roll", mod: -1 }, face(1))).toBe(0);
	});

	it("token sem ficha (ou ficha vazia) = manual", () => {
		expect(initiativeSource(null)).toEqual({ kind: "manual" });
		expect(initiativeSource({})).toEqual({ kind: "manual" });
		expect(resolveInitiative({ kind: "manual" })).toBeNull();
	});

	it("modificador de atributo e d20 entre 1 e 20", () => {
		expect([1, 8, 9, 10, 11, 20].map(abilityModifier)).toEqual([
			-5, -1, -1, 0, 0, 5,
		]);
		expect(rollD20(() => 0)).toBe(1);
		expect(rollD20(() => 0.9999999)).toBe(20);
		expect(rollD20(() => Number.NaN)).toBe(1);
	});

	it("rolar em lote: ficha, rolagem, manual fica como estava; DES vira desempate", () => {
		const sheets: Record<
			string,
			{ initiative?: number | null; dexterity?: number }
		> = {
			"t-a": { initiative: 4, dexterity: 12 },
			"t-b": { dexterity: 14 },
		};
		const out = rollAllInitiative(
			[c("a", null), c("b", null), c("m", 7)],
			(tokenId) => sheets[tokenId] ?? null,
			face(10),
		);
		expect(out.map((x) => [x.id, x.initiative, x.dex])).toEqual([
			["a", 4, 12],
			["b", 12, 14],
			["m", 7, null],
		]);
	});
});

describe("editar valor depois da rolagem", () => {
	const list = [c("a", 10), c("b", 5)];

	it("troca só a linha certa, lista nova", () => {
		const out = setInitiative(list, "b", 21);
		expect(out).not.toBe(list);
		expect(out.map((x) => x.initiative)).toEqual([10, 21]);
		expect(list[1].initiative).toBe(5);
	});

	it("null limpa; valor inválido, fora dos limites ou id inexistente não muda", () => {
		expect(setInitiative(list, "a", null)[0].initiative).toBeNull();
		expect(setInitiative(list, "a", Number.NaN)).toBe(list);
		expect(setInitiative(list, "a", 101)).toBe(list);
		expect(setInitiative(list, "a", -51)).toBe(list);
		expect(setInitiative(list, "zz", 3)).toBe(list);
		expect(setInitiative(list, "a", 10)).toBe(list);
	});
});

describe("turnos e rodadas", () => {
	const order = [c("a", 20), c("b", 15), c("c", 10)];

	it("iniciar: rodada 1 na primeira linha; vazio não inicia", () => {
		expect(startCombat(order)).toEqual({ round: 1, turnId: "a" });
		expect(startCombat([])).toEqual(NO_COMBAT);
	});

	it("próximo: anda na ordem e, depois da última, rodada 2", () => {
		let t: CombatTurn = startCombat(order);
		t = nextTurn(t, order);
		expect(t).toEqual({ round: 1, turnId: "b" });
		t = nextTurn(nextTurn(t, order), order);
		expect(t).toEqual({ round: 2, turnId: "a" });
	});

	it("anterior: volta na ordem e, antes da primeira, rodada desce", () => {
		expect(previousTurn({ round: 2, turnId: "b" }, order)).toEqual({
			round: 2,
			turnId: "a",
		});
		expect(previousTurn({ round: 2, turnId: "a" }, order)).toEqual({
			round: 1,
			turnId: "c",
		});
	});

	it("anterior na primeira linha da rodada 1 não muda", () => {
		const t = { round: 1, turnId: "a" };
		expect(previousTurn(t, order)).toBe(t);
	});

	it("ida e volta são inversas", () => {
		let t: CombatTurn = { round: 3, turnId: "c" };
		const start = t;
		for (let i = 0; i < 5; i++) t = nextTurn(t, order);
		for (let i = 0; i < 5; i++) t = previousTurn(t, order);
		expect(t).toEqual(start);
	});

	it("sem combate ou ordem vazia não muda; linha ativa removida recomeça na primeira", () => {
		expect(nextTurn(NO_COMBAT, order)).toBe(NO_COMBAT);
		const t = { round: 2, turnId: "b" };
		expect(nextTurn(t, [])).toBe(t);
		expect(nextTurn({ round: 2, turnId: "x" }, order)).toEqual({
			round: 2,
			turnId: "a",
		});
		expect(previousTurn({ round: 2, turnId: "x" }, order)).toEqual({
			round: 2,
			turnId: "a",
		});
	});
});

describe("visão do jogador", () => {
	// "o" é oculto / camada do mestre: não está entre os tokens do jogador.
	const order = [c("a", 20), c("o", 15), c("b", 10)];
	const visible = new Set(["t-a", "t-b"]);

	it("vez de um combatente visível: id, token e posição na lista dele", () => {
		expect(playerTurnView({ round: 1, turnId: "b" }, order, visible)).toEqual({
			kind: "turn",
			round: 1,
			combatantId: "b",
			tokenId: "t-b",
			position: 1,
		});
	});

	it("vez de um oculto: só 'gm-turn' e a rodada, sem nome, posição ou token", () => {
		const view = playerTurnView({ round: 2, turnId: "o" }, order, visible);
		expect(view).toEqual({ kind: "gm-turn", round: 2 });
		expect(Object.keys(view).sort()).toEqual(["kind", "round"]);
	});

	it("turno com id que não chegou ao jogador (opaco) também é 'gm-turn'", () => {
		expect(
			playerTurnView({ round: 1, turnId: "desconhecido" }, order, visible),
		).toEqual({ kind: "gm-turn", round: 1 });
	});

	it("token que ficou oculto no meio do combate some da lista do jogador", () => {
		const agora = new Set(["t-a"]);
		expect(visibleCombatants(order, agora).map((x) => x.id)).toEqual(["a"]);
		expect(playerTurnView({ round: 1, turnId: "b" }, order, agora).kind).toBe(
			"gm-turn",
		);
	});

	it("sem combate: 'none'", () => {
		expect(playerTurnView(NO_COMBAT, order, visible)).toEqual({ kind: "none" });
	});
});
