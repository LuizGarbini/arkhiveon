// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import {
	controllableMoves,
	cursorBroadcastDue,
	cursorBroadcastIntervalMs,
	DRAG_BROADCAST_INTERVAL_MS,
	dragBroadcastDue,
} from "./drag-broadcast";
import { tokenPose } from "./token-motion";
import { remoteTokenPatch } from "./token-remote";
import type { VTTToken } from "./types";
import { isTokenDragged, useVTTStore } from "./vtt-store";

type Row = Database["public"]["Tables"]["vtt_tokens"]["Row"];

const initial = useVTTStore.getState();
const base: VTTToken = {
	id: "t1",
	sceneId: "s",
	name: "Dante",
	layer: "token",
	x: 10,
	y: 20,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
};
const row = (over: Partial<Row> = {}): Row =>
	({
		id: "t1",
		scene_id: "s",
		character_id: null,
		npc_id: null,
		name: "Dante",
		avatar_url: null,
		layer: "token",
		x: 100,
		y: 200,
		size_cells: 1,
		rotation: 0,
		hp_current: 10,
		hp_max: 10,
		temp_hp: null,
		elevation: 0,
		conditions: [],
		auras: [],
		vision_range: 6,
		is_locked: false,
		is_hidden: false,
		controlled_by: [],
		created_at: "",
		updated_at: "",
		...over,
	}) as Row;

beforeEach(() => {
	useVTTStore.setState(initial, true);
	useVTTStore.getState().setActiveSceneId("s");
});

describe("remoteTokenPatch · o que chega de outro usuário", () => {
	it("traz posição e põe o alvo de interpolação na posição real do banco", () => {
		const patch = remoteTokenPatch(row({ x: 100, y: 200 }), false);
		expect(patch).toMatchObject({
			x: 100,
			y: 200,
			targetX: 100,
			targetY: 200,
		});
	});

	it("com o token sob o ponteiro local, nunca mexe em posição nem alvo", () => {
		const patch = remoteTokenPatch(row({ x: 100, y: 200 }), true);
		expect(patch).not.toHaveProperty("x");
		expect(patch).not.toHaveProperty("y");
		expect(patch).not.toHaveProperty("targetX");
		expect(patch).not.toHaveProperty("targetY");
		expect(patch.hpCurrent).toBe(10);
	});

	it("converte números que vêm como texto e temp_hp nulo vira 0", () => {
		const patch = remoteTokenPatch(
			row({ x: "12.5" as never, y: "7" as never, temp_hp: null }),
			false,
		);
		expect(patch).toMatchObject({ x: 12.5, y: 7, tempHp: 0 });
	});

	it("não troca identidade (nome, avatar, vínculo, quem controla)", () => {
		const patch = remoteTokenPatch(
			row({ name: "Outro", avatar_url: "x", controlled_by: ["u"] as never }),
			false,
		);
		for (const k of ["id", "name", "avatarUrl", "controlledBy", "sceneId"]) {
			expect(patch).not.toHaveProperty(k);
		}
	});
});

describe("o token sempre termina na posição do banco", () => {
	/** Gerador determinístico (LCG) para o fuzz ser reproduzível. */
	function rng(seed: number) {
		let s = seed >>> 0;
		return () => {
			s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
			return s / 2 ** 32;
		};
	}

	it("qualquer mistura de broadcast e atualização do banco converge para a última do banco", () => {
		for (let seed = 1; seed <= 400; seed++) {
			useVTTStore.setState(initial, true);
			useVTTStore.getState().setActiveSceneId("s");
			useVTTStore.getState().setTokens([base]);
			const r = rng(seed);
			let dbX = base.x;
			let dbY = base.y;
			const steps = 2 + Math.floor(r() * 12);
			for (let i = 0; i < steps; i++) {
				if (r() < 0.55) {
					// broadcast de arrasto (pode chegar velho, fora de ordem ou faltar)
					useVTTStore
						.getState()
						.setTokenTargetPosition(
							"t1",
							Math.round(r() * 900),
							Math.round(r() * 900),
						);
				} else {
					dbX = Math.round(r() * 900);
					dbY = Math.round(r() * 900);
					useVTTStore
						.getState()
						.updateToken(
							"t1",
							remoteTokenPatch(row({ x: dbX, y: dbY }), false),
						);
				}
			}
			// a ÚLTIMA coisa que aconteceu foi uma atualização do banco, sem broadcast depois
			useVTTStore
				.getState()
				.updateToken("t1", remoteTokenPatch(row({ x: dbX, y: dbY }), false));
			const t = useVTTStore.getState().tokens[0] as VTTToken;
			const pose = tokenPose(t, null, []);
			expect(
				pose.mode === "drag" ? null : { x: pose.x, y: pose.y },
				`semente ${seed}`,
			).toEqual({ x: dbX, y: dbY });
		}
	});
});

describe("arrasto em grupo: todos os membros são protegidos", () => {
	it("isTokenDragged vale para qualquer membro do grupo, não só o primeiro", () => {
		useVTTStore.getState().setDraggedTokenIds(["a", "b", "c"]);
		const s = useVTTStore.getState();
		expect(isTokenDragged(s, "a")).toBe(true);
		expect(isTokenDragged(s, "b")).toBe(true);
		expect(isTokenDragged(s, "c")).toBe(true);
		expect(isTokenDragged(s, "d")).toBe(false);
	});
});

describe("setTokenTargetPositions · lote de alvos", () => {
	const tokens = ["a", "b", "c"].map((id) => ({ ...base, id }));

	it("aplica todos de uma vez, numa única mudança da store", () => {
		useVTTStore.getState().setTokens(tokens);
		let changes = 0;
		const unsub = useVTTStore.subscribe(() => {
			changes++;
		});
		useVTTStore.getState().setTokenTargetPositions([
			{ tokenId: "a", x: 1, y: 1 },
			{ tokenId: "b", x: 2, y: 2 },
			{ tokenId: "c", x: 3, y: 3 },
		]);
		unsub();
		expect(changes).toBe(1);
		const got = useVTTStore
			.getState()
			.tokens.map((t) => [t.targetX, t.targetY]);
		expect(got).toEqual([
			[1, 1],
			[2, 2],
			[3, 3],
		]);
	});

	it("pula os tokens que o ponteiro local está arrastando (grupo inteiro)", () => {
		useVTTStore.getState().setTokens(tokens);
		useVTTStore.getState().setDraggedTokenIds(["a", "b"]);
		useVTTStore.getState().setTokenTargetPositions([
			{ tokenId: "a", x: 1, y: 1 },
			{ tokenId: "b", x: 2, y: 2 },
			{ tokenId: "c", x: 3, y: 3 },
		]);
		const [a, b, c] = useVTTStore.getState().tokens;
		expect(a?.targetX).toBeUndefined();
		expect(b?.targetX).toBeUndefined();
		expect(c?.targetX).toBe(3);
	});

	it("sem nada novo, não gera mudança (mesma referência)", () => {
		useVTTStore.getState().setTokens(tokens);
		const moves = [{ tokenId: "a", x: 1, y: 1 }];
		useVTTStore.getState().setTokenTargetPositions(moves);
		const before = useVTTStore.getState().tokens;
		useVTTStore.getState().setTokenTargetPositions(moves);
		expect(useVTTStore.getState().tokens).toBe(before);
		useVTTStore
			.getState()
			.setTokenTargetPositions([{ tokenId: "fantasma", x: 9, y: 9 }]);
		expect(useVTTStore.getState().tokens).toBe(before);
	});
});

describe("broadcast de arrasto · custo não cresce com o tamanho do grupo", () => {
	it("controllableMoves tira o que a pessoa não controla", () => {
		const moves = [
			{ tokenId: "a", x: 1, y: 1 },
			{ tokenId: "b", x: 2, y: 2 },
		];
		expect(controllableMoves(moves, (id) => id === "b")).toEqual([moves[1]]);
	});

	it("dragBroadcastDue respeita o intervalo", () => {
		expect(dragBroadcastDue(100, 100)).toBe(false);
		expect(dragBroadcastDue(100 + DRAG_BROADCAST_INTERVAL_MS, 100)).toBe(true);
		expect(dragBroadcastDue(100 + DRAG_BROADCAST_INTERVAL_MS - 1, 100)).toBe(
			false,
		);
	});

	it("arrasto de 10 tokens por 1 s (ponteiro a 125 Hz) manda poucas mensagens, cada uma com os 10", () => {
		const members = Array.from({ length: 10 }, (_, i) => `t${i}`);
		let last = 0;
		const sent: number[] = [];
		for (let now = 0; now <= 1000; now += 8) {
			if (!dragBroadcastDue(now, last)) continue;
			last = now;
			sent.push(
				controllableMoves(
					members.map((tokenId) => ({ tokenId, x: now, y: now })),
					() => true,
				).length,
			);
		}
		// antes: 10 tokens × ~33/s = 330 mensagens/s. Agora: uma por tick.
		// orçamento: poucas dezenas de mensagens por segundo, qualquer que seja o grupo
		expect(sent.length).toBeLessThanOrEqual(25);
		expect(sent.length).toBeGreaterThan(5);
		expect(sent.every((n) => n === 10)).toBe(true);
	});
});

describe("orçamento de eventos do Realtime (plano gratuito: 100/s, envio + entrega)", () => {
	const FREE_PLAN_EVENTS_PER_SECOND = 100;
	const dragRate = 1000 / DRAG_BROADCAST_INTERVAL_MS;

	it("um arrasto de grupo, visto por 4 pessoas, cabe no limite (antes: 10 tokens × 33/s × 4 ≈ 1300/s)", () => {
		const viewers = 3;
		const eventsPerSecond = dragRate * (1 + viewers); // 1 envio + 3 entregas por mensagem
		expect(eventsPerSecond).toBeLessThanOrEqual(FREE_PLAN_EVENTS_PER_SECOND);
	});

	it("o intervalo do cursor cresce com o número de pessoas", () => {
		const ms = [1, 2, 3, 4, 5, 6].map(cursorBroadcastIntervalMs);
		for (let i = 1; i < ms.length; i++) {
			expect(ms[i]).toBeGreaterThanOrEqual(ms[i - 1] as number);
		}
		expect(ms[0]).toBeGreaterThanOrEqual(100);
		expect(Math.max(...ms)).toBeLessThanOrEqual(400);
	});

	it("todos mexendo o mouse ao mesmo tempo: cursores + um arrasto cabem no limite até 4 pessoas", () => {
		for (const users of [2, 3, 4]) {
			const cursorRate = 1000 / cursorBroadcastIntervalMs(users);
			// cada pessoa envia cursorRate/s e cada mensagem é entregue às outras
			const cursorEvents = users * cursorRate * users;
			// quem arrasta não manda cursor (o token já mostra onde ele está)
			const dragEvents = dragRate * users;
			expect(
				cursorEvents - cursorRate * users + dragEvents,
				`${users} pessoas`,
			).toBeLessThanOrEqual(FREE_PLAN_EVENTS_PER_SECOND);
		}
	});

	it("sozinho na mesa não há para quem mandar o cursor", () => {
		expect(cursorBroadcastDue(10_000, 0, 1)).toBe(false);
		expect(cursorBroadcastDue(10_000, 0, 0)).toBe(false);
		expect(cursorBroadcastDue(10_000, 0, 2)).toBe(true);
	});

	it("cursorBroadcastDue respeita o intervalo de cada tamanho de mesa", () => {
		const ms = cursorBroadcastIntervalMs(3);
		expect(cursorBroadcastDue(ms - 1, 0, 3)).toBe(false);
		expect(cursorBroadcastDue(ms, 0, 3)).toBe(true);
	});
});
