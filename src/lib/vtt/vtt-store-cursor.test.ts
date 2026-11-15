import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURSOR_PALETTE, pickCursorColor } from "./cursor-color";
import { useVTTStore } from "./vtt-store";

const s = () => useVTTStore.getState();

function stubStorage() {
	const data = new Map<string, string>();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
	});
	return data;
}

beforeEach(() => {
	stubStorage();
	useVTTStore.setState({
		userColor: CURSOR_PALETTE[0],
		userColorChosen: false,
		showRemoteCursors: true,
		remoteCursors: {},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("cor do meu cursor", () => {
	it("sem escolha, a cor vem do meu id e é sempre a mesma", () => {
		s().initUserColor("user-abc");
		const first = s().userColor;
		s().initUserColor("user-abc");
		expect(s().userColor).toBe(first);
		expect(first).toBe(pickCursorColor("user-abc"));
		expect(s().userColorChosen).toBe(false);
	});

	it("foge das cores que já estão na mesa", () => {
		const mine = pickCursorColor("user-abc");
		s().initUserColor("user-abc", [{ color: mine }]);
		expect(s().userColor).not.toBe(mine);
		expect(CURSOR_PALETTE).toContain(s().userColor);
	});

	it("a escolha fica salva e volta ao reabrir, mesmo com a mesa ocupada", () => {
		s().chooseUserColor("user-abc", "#DB2777");
		expect(s().userColor).toBe("#db2777");
		expect(s().userColorChosen).toBe(true);
		// "Reabre": estado novo, lê do navegador.
		useVTTStore.setState({
			userColor: CURSOR_PALETTE[0],
			userColorChosen: false,
		});
		s().initUserColor("user-abc", [{ color: "#db2777" }]);
		expect(s().userColor).toBe("#db2777");
		expect(s().userColorChosen).toBe(true);
	});

	it("a escolha é por conta, não vaza para outra pessoa", () => {
		s().chooseUserColor("user-abc", "#db2777");
		s().initUserColor("outra-pessoa");
		expect(s().userColor).toBe(pickCursorColor("outra-pessoa"));
		expect(s().userColorChosen).toBe(false);
	});

	it("não aceita cor inválida (nem pela escolha, nem pelo setUserColor)", () => {
		s().chooseUserColor("user-abc", "red");
		expect(s().userColorChosen).toBe(false);
		s().chooseUserColor("user-abc", "#12345");
		expect(s().userColor).toBe(CURSOR_PALETTE[0]);
		s().setUserColor('#38bdf8" onload="x');
		expect(s().userColor).toBe(CURSOR_PALETTE[0]);
	});

	it("voltar ao automático apaga a escolha salva", () => {
		s().chooseUserColor("user-abc", "#db2777");
		s().resetUserColor("user-abc");
		expect(s().userColorChosen).toBe(false);
		expect(s().userColor).toBe(pickCursorColor("user-abc"));
		useVTTStore.setState({ userColorChosen: false });
		s().initUserColor("user-abc");
		expect(s().userColor).toBe(pickCursorColor("user-abc"));
	});

	it("quem escolheu a cor nunca cede, mesmo igual a outra pessoa", () => {
		s().chooseUserColor("user-abc", "#db2777");
		s().reconcileUserColor({ userId: "user-abc", onlineAt: 200 }, [
			{ userId: "outro", color: "#db2777", onlineAt: 100 },
		]);
		expect(s().userColor).toBe("#db2777");
	});

	it("a cor automática cede a quem escolheu a mesma à mão", () => {
		s().reconcileUserColor({ userId: "user-abc", onlineAt: 100 }, [
			{
				userId: "outro",
				color: CURSOR_PALETTE[0],
				onlineAt: 900,
				colorChosen: true,
			},
		]);
		expect(s().userColor).not.toBe(CURSOR_PALETTE[0]);
	});

	// Duas pessoas que entram ao mesmo tempo (sem ver uma à outra) acabam em
	// cores diferentes, sem combinar nada: o que chegou depois cede.
	it("três pessoas na mesma cor automática se separam em poucas rodadas", () => {
		const ids = ["a", "b", "c"];
		const onlineAt: Record<string, number> = { a: 100, b: 200, c: 300 };
		const colors: Record<string, string> = {
			a: CURSOR_PALETTE[0],
			b: CURSOR_PALETTE[0],
			c: CURSOR_PALETTE[0],
		};
		for (let round = 0; round < 6; round++) {
			for (const id of ids) {
				useVTTStore.setState({
					userColor: colors[id],
					userColorChosen: false,
				});
				s().reconcileUserColor(
					{ userId: id, onlineAt: onlineAt[id] },
					ids.map((other) => ({
						userId: other,
						color: colors[other],
						onlineAt: onlineAt[other],
					})),
				);
				colors[id] = s().userColor;
			}
		}
		expect(new Set(Object.values(colors)).size).toBe(3);
		// Quem chegou primeiro não mudou de cor.
		expect(colors.a).toBe(CURSOR_PALETTE[0]);
	});
});

describe("ocultar os cursores dos outros", () => {
	const cursor = {
		userId: "u2",
		userName: "Ana",
		color: "#22c55e",
		x: 1,
		y: 2,
		timestamp: 1,
	};

	it("por padrão aparecem", () => {
		s().setRemoteCursor(cursor);
		expect(Object.keys(s().remoteCursors)).toEqual(["u2"]);
	});

	it("ocultar tira os que já estavam na tela e ignora os novos", () => {
		s().setRemoteCursor(cursor);
		s().setShowRemoteCursors(false);
		expect(s().showRemoteCursors).toBe(false);
		expect(s().remoteCursors).toEqual({});
		s().setRemoteCursor({ ...cursor, x: 50 });
		expect(s().remoteCursors).toEqual({});
	});

	it("religar volta a mostrar os próximos", () => {
		s().setShowRemoteCursors(false);
		s().setShowRemoteCursors(true);
		s().setRemoteCursor(cursor);
		expect(Object.keys(s().remoteCursors)).toEqual(["u2"]);
	});

	it("a preferência fica no navegador", () => {
		const data = stubStorage();
		s().setShowRemoteCursors(false);
		expect([...data.values()]).toContain("0");
		s().setShowRemoteCursors(true);
		expect([...data.values()]).not.toContain("0");
	});

	it("ocultar não mexe em réguas, pings nem moldes dos outros", () => {
		const measurement = {
			start: { x: 0, y: 0 },
			end: { x: 70, y: 0 },
			distance: 1.5,
			unit: "m",
			userId: "u2",
			userName: "Ana",
			color: "#22c55e",
		} as never;
		s().setRemoteMeasurement("u2", measurement);
		s().setShowRemoteCursors(false);
		expect(Object.keys(s().remoteMeasurements)).toEqual(["u2"]);
	});
});
