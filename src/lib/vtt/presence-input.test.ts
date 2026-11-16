import { describe, expect, it } from "vitest";
import { pickCursorColor } from "./cursor-color";
import {
	cleanName,
	readPresenceUsers,
	readRemoteCursor,
} from "./presence-input";

describe("presença que chega da rede", () => {
	it("lê cada pessoa com a cor que ela anunciou", () => {
		const users = readPresenceUsers({
			u1: [{ userId: "u1", userName: "Luiz", color: "#EC4899", isGM: true }],
			u2: [{ userId: "u2", userName: "Ana", color: "#22c55e" }],
		});
		expect(users.map((u) => [u.userId, u.userName, u.color, u.isGM])).toEqual([
			["u1", "Luiz", "#ec4899", true],
			["u2", "Ana", "#22c55e", false],
		]);
	});

	// Causa de "todos com a mesma cor" no lado de quem recebe: cor ausente caía
	// numa cor fixa (#38bdf8) igual para todo mundo.
	it("sem cor (ou com cor inválida), cada pessoa recebe a sua pelo id, não a mesma", () => {
		const users = readPresenceUsers({
			a: [{ userId: "a" }],
			b: [{ userId: "b", color: "vermelho" }],
			c: [{ userId: "c", color: "url(x)" }],
			d: [{ userId: "d", color: 123 }],
		});
		for (const user of users) {
			expect(user.color).toBe(pickCursorColor(user.userId));
		}
		expect(new Set(users.map((u) => u.color)).size).toBeGreaterThan(1);
	});

	it("só vale colorChosen verdadeiro de verdade", () => {
		const users = readPresenceUsers({
			a: [{ userId: "a", colorChosen: true }],
			b: [{ userId: "b", colorChosen: "true" }],
			c: [{ userId: "c" }],
		});
		expect(users.map((u) => u.colorChosen)).toEqual([true, false, false]);
	});

	it("com a entrada velha ao lado da nova (troca de cor), vale a nova", () => {
		const users = readPresenceUsers({
			u1: [
				{ userId: "u1", userName: "Luiz", color: "#22c55e", onlineAt: 1 },
				{ userId: "u1", userName: "Luiz", color: "#db2777", onlineAt: 2 },
			],
		});
		expect(users).toHaveLength(1);
		expect(users[0].color).toBe("#db2777");
		expect(users[0].onlineAt).toBe(2);
	});

	it("descarta entradas quebradas e usa a chave quando falta o id", () => {
		const users = readPresenceUsers({
			k1: [null],
			k2: [],
			k3: ["texto"],
			k4: [{ userName: "Sem id" }],
		});
		expect(users.map((u) => u.userId)).toEqual(["k4"]);
	});

	it("a foto vinda de outro cliente só passa se for https do storage ou do Google", () => {
		const storage = {
			supabaseUrl: "https://axnektdqoxjhbbfsidfj.supabase.co",
			r2PublicUrl: "https://cdn.foto.test",
		};
		const google = "https://lh3.googleusercontent.com/a/foto";
		const mine = "https://cdn.foto.test/user/table-photo/a.webp";
		const users = readPresenceUsers(
			{
				ok: [{ userId: "ok", userName: "Ana", avatarUrl: google }],
				up: [{ userId: "up", userName: "Bia", avatarUrl: mine }],
				js: [{ userId: "js", avatarUrl: "javascript:alert(1)" }],
				disguised: [
					{
						userId: "disguised",
						avatarUrl: "javascript://lh3.googleusercontent.com/a",
					},
				],
				data: [
					{
						userId: "data",
						avatarUrl: 'data:image/svg+xml,<svg onload="alert(1)"/>',
					},
				],
				evil: [{ userId: "evil", avatarUrl: "https://evil.example/a.png" }],
				http: [
					{
						userId: "http",
						avatarUrl: "http://lh3.googleusercontent.com/a",
					},
				],
			},
			1,
			storage,
		);
		const byId = Object.fromEntries(
			users.map((user) => [user.userId, user.avatarUrl]),
		);
		expect(byId.ok).toBe(google);
		expect(byId.up).toBe(mine);
		expect(byId.js).toBeNull();
		expect(byId.disguised).toBeNull();
		expect(byId.data).toBeNull();
		expect(byId.evil).toBeNull();
		expect(byId.http).toBeNull();
	});

	it("limpa o nome: sem controle, curto, com valor padrão", () => {
		expect(cleanName("  Luiz\u0000\n Garbini ", "x")).toBe("Luiz   Garbini");
		expect(cleanName("a".repeat(500), "x")).toHaveLength(40);
		expect(cleanName("", "Aventureiro")).toBe("Aventureiro");
		expect(cleanName(42, "Aventureiro")).toBe("Aventureiro");
		expect(cleanName("   ", "Aventureiro")).toBe("Aventureiro");
	});
});

describe("cursor remoto que chega da rede", () => {
	const valid = {
		userId: "u2",
		userName: "Ana",
		color: "#22c55e",
		x: 10,
		y: 20,
	};

	it("lê posição, nome e cor", () => {
		expect(readRemoteCursor(valid, [], 5)).toEqual({
			userId: "u2",
			userName: "Ana",
			color: "#22c55e",
			x: 10,
			y: 20,
			timestamp: 5,
		});
	});

	it("a cor da presença vale mais que a do payload", () => {
		const cursor = readRemoteCursor(valid, [
			{ userId: "u2", userName: "Ana", color: "#ec4899" },
		]);
		expect(cursor?.color).toBe("#ec4899");
	});

	it("cor adulterada no payload nunca passa; cai na cor pelo id", () => {
		for (const color of [
			"red",
			"#12345",
			'#38bdf8" onload="x',
			"url(javascript:1)",
			undefined,
			9,
		]) {
			const cursor = readRemoteCursor({ ...valid, color }, []);
			expect(cursor?.color).toBe(pickCursorColor("u2"));
		}
	});

	it("recusa coordenada ou id fora do formato", () => {
		for (const bad of [
			null,
			"texto",
			[],
			{ ...valid, userId: undefined },
			{ ...valid, userId: "" },
			{ ...valid, x: "10" },
			{ ...valid, x: Number.NaN },
			{ ...valid, y: Number.POSITIVE_INFINITY },
			{ ...valid, x: 1e12 },
			{ userId: "u2" },
		]) {
			expect(readRemoteCursor(bad, [])).toBeNull();
		}
	});

	it("nome ausente usa o da presença", () => {
		const cursor = readRemoteCursor({ ...valid, userName: undefined }, [
			{ userId: "u2", userName: "Ana da Presença", color: "#22c55e" },
		]);
		expect(cursor?.userName).toBe("Ana da Presença");
	});
});
