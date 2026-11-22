import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	admitInbound,
	parseVttTopic,
	privateChannelOptions,
	roomTopicsFor,
	vttGmOnlyTopic,
	vttGmTopic,
	vttUserTopic,
} from "./private-topics";

const C = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C2 = "33333333-3333-4333-8333-333333333333";

const migration = readFileSync(
	resolve(
		__dirname,
		"../../../supabase/migrations/0066_vtt_realtime_private_channels.sql",
	),
	"utf8",
);

describe("tópicos privados (0066)", () => {
	it("nomes em minúsculas, no formato das policies", () => {
		expect(vttUserTopic(C.toUpperCase(), S, A)).toBe(`vtt:${C}:${S}:u:${A}`);
		expect(vttGmTopic(C, S)).toBe(`vtt:${C}:${S}:gm`);
		expect(vttGmOnlyTopic(C, S)).toBe(`vtt:${C}:${S}:gmonly`);
	});

	it("os tópicos gerados casam com as regex da migração 0066", () => {
		const regexes = [...migration.matchAll(/~ '(\^vtt:[^']+)'/g)].map(
			(m) => new RegExp(m[1]),
		);
		expect(regexes.length).toBeGreaterThanOrEqual(3);
		for (const topic of [
			vttUserTopic(C, S, A),
			vttGmTopic(C, S),
			vttGmOnlyTopic(C, S),
		]) {
			expect(regexes.some((re) => re.test(topic))).toBe(true);
		}
	});

	it("canal privado e sem eco", () => {
		expect(privateChannelOptions(A)).toEqual({
			config: {
				private: true,
				broadcast: { self: false },
				presence: { key: A },
			},
		});
		expect(privateChannelOptions().config).not.toHaveProperty("presence");
	});

	it("parse aceita o prefixo realtime: e nega malformado", () => {
		expect(parseVttTopic(`realtime:vtt:${C}:${S}:u:${A}`)).toEqual({
			kind: "user",
			campaignId: C,
			sceneId: S,
			userId: A,
		});
		expect(parseVttTopic(`vtt-room:${C}:${S}`)).toBeNull();
		expect(parseVttTopic(`vtt:${C}:${S}:u:nao-uuid`)).toBeNull();
		expect(parseVttTopic(`vtt:${C}:${S}:gm:extra`)).toBeNull();
	});
});

describe("quem mandou vem do tópico (3.2)", () => {
	const base = { campaignId: C, sceneId: S };

	it("em u:A o remetente é A, mesmo sem userId no payload", () => {
		const d = admitInbound({
			...base,
			topic: vttUserTopic(C, S, A),
			event: "cursor_move",
		});
		expect(d).toMatchObject({ accept: true, senderUserId: A });
	});

	it("B5: payload dizendo ser o mestre em u:B é descartado", () => {
		expect(
			admitInbound({
				...base,
				topic: vttUserTopic(C, S, B),
				event: "ping",
				payloadUserId: A,
			}),
		).toEqual({ accept: false, reason: "sender_mismatch" });
	});

	it("B4: fog_update fora do gm é descartado, venha de quem vier", () => {
		for (const topic of [vttUserTopic(C, S, B), vttGmOnlyTopic(C, S)]) {
			expect(
				admitInbound({ ...base, topic, event: "fog_update", payloadUserId: B }),
			).toEqual({ accept: false, reason: "gm_topic_only" });
		}
		expect(
			admitInbound({ ...base, topic: vttGmTopic(C, S), event: "fog_update" }),
		).toMatchObject({ accept: true });
		expect(
			admitInbound({
				...base,
				topic: vttUserTopic(C, S, B),
				event: "explored_reset",
			}),
		).toEqual({ accept: false, reason: "gm_topic_only" });
	});

	it("X2: mensagem de outra campanha ou cena é descartada", () => {
		expect(
			admitInbound({
				...base,
				topic: vttGmTopic(C2, S),
				event: "ping",
			}),
		).toEqual({ accept: false, reason: "other_room" });
	});

	it("tópico malformado é descartado", () => {
		expect(
			admitInbound({ ...base, topic: `vtt-room:${C}:${S}`, event: "ping" }),
		).toEqual({ accept: false, reason: "topic_malformed" });
	});
});

describe("tópicos assinados numa cena (3.1)", () => {
	it("jogador: próprio, outros membros, gm; sem gmonly", () => {
		const t = roomTopicsFor({
			campaignId: C,
			sceneId: S,
			selfUserId: B,
			memberUserIds: [A, B, A],
			isGmOrCoGm: false,
		});
		expect(t.own).toBe(vttUserTopic(C, S, B));
		expect(t.others).toEqual([vttUserTopic(C, S, A)]);
		expect(t.gm).toBe(vttGmTopic(C, S));
		expect(t.gmonly).toBeNull();
	});

	it("mestre/co-mestre também assina gmonly", () => {
		expect(
			roomTopicsFor({
				campaignId: C,
				sceneId: S,
				selfUserId: A,
				memberUserIds: [A, B],
				isGmOrCoGm: true,
			}).gmonly,
		).toBe(vttGmOnlyTopic(C, S));
	});
});
