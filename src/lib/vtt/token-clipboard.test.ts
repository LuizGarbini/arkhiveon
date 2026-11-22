import { describe, expect, it } from "vitest";
import { tokenHpInsert } from "./character-hp";
import {
	buildTokenClipboard,
	nextCopyName,
	planTokenPaste,
	tokenNameBase,
} from "./token-clipboard";
import { buildTokenInsertPayload } from "./token-spawn";
import type { VTTToken } from "./types";

const grid = {
	gridType: "square" as const,
	gridSize: 70,
	bounds: { width: 2000, height: 2000 },
};

function token(
	over: Partial<VTTToken> & Pick<VTTToken, "id" | "name">,
): VTTToken {
	return {
		sceneId: "cena",
		layer: "token",
		x: 105,
		y: 105,
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		conditions: [],
		auras: [],
		visionRange: 6,
		isLocked: false,
		isHidden: false,
		controlledBy: [],
		...over,
	};
}

const goblin = token({
	id: "g",
	name: "Goblin",
	x: 105,
	y: 105,
	avatarUrl: "https://cdn.test/goblin.webp",
	sizeCells: 2,
	rotation: 45,
	layer: "gm",
	isHidden: true,
	elevation: 3,
	visionRange: 12,
	conditions: ["caído", "envenenado"],
	auras: [{ radius: 2, color: "red", opacity: 0.4 }],
	controlledBy: ["jogador-1"],
	hpCurrent: 7,
	hpMax: 11,
	tempHp: 4,
	isLocked: true,
});

describe("tokenNameBase", () => {
	it("tira o número do fim e deixa o nome sem número", () => {
		expect(tokenNameBase("Goblin")).toBe("Goblin");
		expect(tokenNameBase("Goblin 2")).toBe("Goblin");
		expect(tokenNameBase("Guarda Goblin 12")).toBe("Guarda Goblin");
	});
});

describe("nextCopyName", () => {
	it("usa o menor número livre a partir de 2", () => {
		expect(nextCopyName("Goblin", ["Goblin"])).toBe("Goblin 2");
		expect(nextCopyName("Goblin", ["Goblin", "Goblin 2"])).toBe("Goblin 3");
		expect(nextCopyName("Goblin", ["Goblin 2"])).toBe("Goblin 3");
		expect(nextCopyName("Goblin", ["Goblin", "Goblin 4"])).toBe("Goblin 2");
	});
});

describe("buildTokenClipboard", () => {
	it("copia o token avulso com PV, condições e tamanho, e sem trava", () => {
		const [copied] = buildTokenClipboard([goblin.id], [goblin], () => true);
		expect(copied).toMatchObject({
			nameBase: "Goblin",
			avatarUrl: "https://cdn.test/goblin.webp",
			sizeCells: 2,
			rotation: 45,
			layer: "gm",
			isHidden: true,
			elevation: 3,
			visionRange: 12,
			conditions: ["caído", "envenenado"],
			auras: [{ radius: 2, color: "red", opacity: 0.4 }],
			characterId: null,
			npcId: null,
			controlledBy: ["jogador-1"],
			hpCurrent: 7,
			hpMax: 11,
			tempHp: 4,
			x: 105,
			y: 105,
		});
		expect(copied).not.toHaveProperty("isLocked");
	});

	it("copia o PV do NPC", () => {
		const npc = token({
			id: "npc",
			name: "Lobo",
			npcId: "npc-lobo",
			hpCurrent: 9,
			hpMax: 15,
			tempHp: 1,
		});
		const [copied] = buildTokenClipboard([npc.id], [npc], () => true);
		expect(copied.npcId).toBe("npc-lobo");
		expect(copied.characterId).toBeNull();
		expect(copied.hpCurrent).toBe(9);
		expect(copied.hpMax).toBe(15);
		expect(copied.tempHp).toBe(1);
	});

	it("anula o PV quando a ficha é dona da vida", () => {
		const hero = token({
			id: "hero",
			name: "Lyra",
			characterId: "ficha-lyra",
			hpCurrent: 12,
			hpMax: 20,
			tempHp: 5,
		});
		const [copied] = buildTokenClipboard(
			[hero.id],
			[hero],
			(id) => id === "ficha-lyra",
		);
		expect(copied.characterId).toBe("ficha-lyra");
		expect(copied.hpCurrent).toBeNull();
		expect(copied.hpMax).toBeNull();
		expect(copied.tempHp).toBeNull();
	});

	it("mantém o PV da ficha que não é dona da vida", () => {
		const hero = token({
			id: "hero",
			name: "Lyra",
			characterId: "ficha-lyra",
			hpCurrent: 12,
			hpMax: 20,
			tempHp: 5,
		});
		const [copied] = buildTokenClipboard([hero.id], [hero], () => false);
		expect(copied.hpCurrent).toBe(12);
		expect(copied.hpMax).toBe(20);
		expect(copied.tempHp).toBe(5);
	});

	it("guarda a base quando o original já é numerado e ignora quem não está selecionado", () => {
		const numbered = token({ id: "g2", name: "Goblin 2", x: 175, y: 105 });
		const other = token({ id: "lobo", name: "Lobo", x: 245, y: 105 });
		const copied = buildTokenClipboard(
			[numbered.id, "sumiu", goblin.id],
			[goblin, numbered, other],
			() => false,
		);
		expect(copied.map((item) => item.nameBase)).toEqual(["Goblin", "Goblin"]);
		expect(copied.map((item) => item.x)).toEqual([175, 105]);
	});
});

describe("planTokenPaste", () => {
	const loose = token({
		id: "g",
		name: "Goblin",
		x: 105,
		y: 105,
		hpCurrent: 7,
		hpMax: 11,
		tempHp: 4,
		conditions: ["caído"],
		sizeCells: 1,
		isLocked: true,
	});
	const mate = token({
		id: "g2",
		name: "Goblin",
		x: 245,
		y: 105,
		hpCurrent: 3,
		hpMax: 11,
		sizeCells: 1,
	});

	it("numera, solta a trava e desloca a formação uma casa", () => {
		const clipboard = buildTokenClipboard(
			[loose.id, mate.id],
			[loose, mate],
			() => false,
		);
		const plan = planTokenPaste(clipboard, [loose, mate], grid);
		expect(plan.spawns.map((item) => item.name)).toEqual([
			"Goblin 2",
			"Goblin 3",
		]);
		expect(plan.spawns.every((item) => item.isLocked === false)).toBe(true);
		expect(plan.spawns[0]).toMatchObject({ x: 175, y: 175, hpCurrent: 7 });
		expect(plan.spawns[1]).toMatchObject({ x: 315, y: 175, hpCurrent: 3 });
		expect(plan.spawns[1].x - plan.spawns[0].x).toBe(140);
		expect(plan.spawns[0].conditions).toEqual(["caído"]);
	});

	it("se o original já é Goblin 2, a cópia vira Goblin 3", () => {
		const source = token({ id: "g2", name: "Goblin 2", x: 105, y: 105 });
		const clipboard = buildTokenClipboard([source.id], [source], () => false);
		const plan = planTokenPaste(clipboard, [source], grid);
		expect(plan.spawns[0].name).toBe("Goblin 3");
	});

	it("a segunda colagem anda mais uma casa e segue a numeração", () => {
		const clipboard = buildTokenClipboard(
			[loose.id, mate.id],
			[loose, mate],
			() => false,
		);
		const first = planTokenPaste(clipboard, [loose, mate], grid);
		const scene = [
			loose,
			mate,
			token({
				id: "p2",
				name: first.spawns[0].name,
				x: first.spawns[0].x,
				y: first.spawns[0].y,
			}),
			token({
				id: "p3",
				name: first.spawns[1].name,
				x: first.spawns[1].x,
				y: first.spawns[1].y,
			}),
		];
		const second = planTokenPaste(first.nextClipboard, scene, grid);
		expect(second.spawns.map((item) => item.name)).toEqual([
			"Goblin 4",
			"Goblin 5",
		]);
		expect(second.spawns[0]).toMatchObject({ x: 245, y: 245 });
		expect(second.spawns[1]).toMatchObject({ x: 385, y: 245 });
		expect(second.spawns[1].x - second.spawns[0].x).toBe(140);
	});

	it("casa ocupada usa a casa livre e a próxima âncora continua na formação", () => {
		const source = token({ id: "g", name: "Goblin", x: 105, y: 105 });
		const blocker = token({ id: "pedra", name: "Pedra", x: 175, y: 175 });
		const clipboard = buildTokenClipboard([source.id], [source], () => false);
		const plan = planTokenPaste(clipboard, [source, blocker], grid);
		expect(plan.spawns[0]).toMatchObject({ name: "Goblin 2", x: 175, y: 105 });
		expect(plan.nextClipboard[0]).toMatchObject({ x: 175, y: 175 });
	});
});

describe("payload do insert", () => {
	it("grava o PV do avulso e a trava solta", () => {
		const [copied] = buildTokenClipboard([goblin.id], [goblin], () => false);
		const plan = planTokenPaste([copied], [goblin], grid);
		const spawn = plan.spawns[0];
		const payload = buildTokenInsertPayload(
			"cena",
			spawn,
			tokenHpInsert({
				characterId: spawn.characterId,
				sheetOwnsHp: false,
				hpCurrent: spawn.hpCurrent,
				hpMax: spawn.hpMax,
			}),
		);
		expect(payload.name).toBe("Goblin 2");
		expect(payload.hp_current).toBe(7);
		expect(payload.hp_max).toBe(11);
		expect(payload.temp_hp).toBe(4);
		expect(payload.size_cells).toBe(2);
		expect(payload.conditions).toEqual(["caído", "envenenado"]);
		expect(payload.is_locked).toBe(false);
		expect(payload.is_hidden).toBe(true);
		expect(payload.layer).toBe("gm");
		expect(payload.controlled_by).toEqual(["jogador-1"]);
	});

	it("grava hp nulo na ficha que é dona do PV, como o roster", () => {
		const hero = token({
			id: "hero",
			name: "Lyra",
			characterId: "ficha-lyra",
			hpCurrent: 12,
			hpMax: 20,
			tempHp: 5,
			x: 105,
			y: 105,
			sizeCells: 1,
		});
		const [copied] = buildTokenClipboard(
			[hero.id],
			[hero],
			(id) => id === "ficha-lyra",
		);
		const plan = planTokenPaste([copied], [hero], grid);
		const spawn = plan.spawns[0];
		const payload = buildTokenInsertPayload(
			"cena",
			spawn,
			tokenHpInsert({
				characterId: spawn.characterId,
				sheetOwnsHp: true,
				hpCurrent: spawn.hpCurrent,
				hpMax: spawn.hpMax,
			}),
		);
		expect(spawn.hpCurrent).toBeNull();
		expect(spawn.hpMax).toBeNull();
		expect(spawn.tempHp).toBeNull();
		expect(payload.character_id).toBe("ficha-lyra");
		expect(payload.hp_current).toBeNull();
		expect(payload.hp_max).toBeNull();
		expect(payload.temp_hp).toBe(0);
		expect(payload.is_locked).toBe(false);
		expect(payload.name).toBe("Lyra 2");
	});
});
