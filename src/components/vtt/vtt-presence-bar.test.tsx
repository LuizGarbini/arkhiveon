// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURSOR_PALETTE, pickCursorColor } from "@/lib/vtt/cursor-color";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTPresenceBar } from "./vtt-presence-bar";

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		user: {
			id: "user-1",
			email: "luiz@exemplo.com",
			user_metadata: { full_name: "Luiz" },
		},
	}),
}));

const memory = new Map<string, string>();

beforeEach(() => {
	memory.clear();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => memory.get(key) ?? null,
		setItem: (key: string, value: string) => void memory.set(key, value),
		removeItem: (key: string) => void memory.delete(key),
	});
	useVTTStore.setState({
		onlineUsers: [],
		remoteCursors: {},
		tokens: [],
		userColor: CURSOR_PALETTE[0],
		userColorChosen: false,
		showRemoteCursors: true,
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const toggle = () =>
	screen.getByRole("button", { name: "Cursores dos outros integrantes" });

describe("interruptor dos cursores dos outros", () => {
	it("começa ligado e tem o estado em aria-pressed", () => {
		render(<VTTPresenceBar />);
		expect(toggle().getAttribute("aria-pressed")).toBe("true");
		expect(toggle().className).toContain("size-11");
	});

	it("desliga na hora, sem confirmação, e liga de volta", () => {
		render(<VTTPresenceBar />);
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-pressed")).toBe("false");
		expect(useVTTStore.getState().showRemoteCursors).toBe(false);
		expect(memory.get("arkhiveon:vtt:show-remote-cursors:v1")).toBe("0");
		// Feedback no próprio gatilho (para quem usa leitor de tela).
		expect(screen.getByText("Cursores dos outros ocultos")).toBeTruthy();
		fireEvent.click(toggle());
		expect(toggle().getAttribute("aria-pressed")).toBe("true");
		expect(memory.has("arkhiveon:vtt:show-remote-cursors:v1")).toBe(false);
		expect(screen.getByText("Cursores dos outros visíveis")).toBeTruthy();
	});

	it("ocultar tira os cursores que já estavam na tela", () => {
		useVTTStore.getState().setRemoteCursor({
			userId: "u2",
			userName: "Ana",
			color: "#22c55e",
			x: 1,
			y: 1,
			timestamp: 1,
		});
		render(<VTTPresenceBar />);
		fireEvent.click(toggle());
		expect(useVTTStore.getState().remoteCursors).toEqual({});
	});
});

describe("seletor da minha cor", () => {
	const openPicker = () =>
		fireEvent.click(
			screen.getByRole("button", { name: "Alterar a cor do meu cursor" }),
		);

	it("o gatilho tem pelo menos 44 px (size-11)", () => {
		render(<VTTPresenceBar />);
		expect(
			screen.getByRole("button", { name: "Alterar a cor do meu cursor" })
				.className,
		).toContain("size-11");
	});

	it("mostra a paleta com nome, cada amostra com 44 px", async () => {
		render(<VTTPresenceBar />);
		openPicker();
		for (const name of ["Céu", "Azul", "Rosa", "Verde", "Turquesa"]) {
			const swatch = await screen.findByRole("button", { name });
			expect(swatch.className).toContain("size-11");
			expect(swatch.getAttribute("aria-pressed")).toBe("false");
		}
	});

	it("escolher uma cor aplica na hora e salva por conta", async () => {
		render(<VTTPresenceBar />);
		openPicker();
		const rosa = await screen.findByRole("button", { name: "Rosa" });
		fireEvent.click(rosa);
		expect(useVTTStore.getState().userColor).toBe("#db2777");
		expect(useVTTStore.getState().userColorChosen).toBe(true);
		expect(memory.get("arkhiveon:vtt:cursor-color:v1:user-1")).toBe("#db2777");
		expect(rosa.getAttribute("aria-pressed")).toBe("true");
		expect(
			screen
				.getByRole("button", { name: "Automática" })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("Automática volta à cor do meu id e apaga a escolha", async () => {
		useVTTStore.getState().chooseUserColor("user-1", "#db2777");
		render(<VTTPresenceBar />);
		openPicker();
		const auto = await screen.findByRole("button", { name: "Automática" });
		expect(auto.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(auto);
		expect(useVTTStore.getState().userColorChosen).toBe(false);
		expect(useVTTStore.getState().userColor).toBe(pickCursorColor("user-1"));
		expect(memory.has("arkhiveon:vtt:cursor-color:v1:user-1")).toBe(false);
		expect(auto.getAttribute("aria-pressed")).toBe("true");
	});

	it("Automática foge das cores de quem já está na mesa", async () => {
		const mine = pickCursorColor("user-1");
		useVTTStore.setState({
			onlineUsers: [
				{
					userId: "outro",
					userName: "Ana",
					color: mine,
					isGM: false,
					onlineAt: 1,
				},
			],
		});
		render(<VTTPresenceBar />);
		openPicker();
		fireEvent.click(await screen.findByRole("button", { name: "Automática" }));
		expect(useVTTStore.getState().userColor).not.toBe(mine);
	});

	it("a cor livre tem rótulo ligado ao campo de cor", async () => {
		render(<VTTPresenceBar />);
		openPicker();
		const input = await screen.findByLabelText("Cor livre");
		expect(input.getAttribute("type")).toBe("color");
	});

	it("mostra a foto escolhida e não desenha javascript: nem data:", () => {
		useVTTStore.setState({
			onlineUsers: [
				{
					userId: "ana",
					userName: "Ana",
					avatarUrl: "https://lh3.googleusercontent.com/a/foto",
					color: "#22c55e",
					isGM: false,
					onlineAt: 1,
				},
				{
					userId: "bob",
					userName: "Bob",
					avatarUrl: "javascript://lh3.googleusercontent.com/a",
					color: "#db2777",
					isGM: false,
					onlineAt: 2,
				},
				{
					userId: "cia",
					userName: "Cia",
					avatarUrl: "data:image/svg+xml,<svg/>",
					color: "#2563eb",
					isGM: false,
					onlineAt: 3,
				},
			],
		});
		render(<VTTPresenceBar />);
		const ana = screen.getByTitle(/^Ana/);
		expect(ana.querySelector("img")?.getAttribute("src")).toBe(
			"https://lh3.googleusercontent.com/a/foto",
		);
		expect(screen.getByTitle(/^Bob/).querySelector("img")).toBeNull();
		expect(screen.getByTitle(/^Bob/).textContent).toContain("BO");
		expect(screen.getByTitle(/^Cia/).querySelector("img")).toBeNull();
	});

	it("cor livre só é gravada depois que o arrasto sossega", async () => {
		render(<VTTPresenceBar />);
		openPicker();
		const input = await screen.findByLabelText("Cor livre");
		vi.useFakeTimers();
		try {
			fireEvent.change(input, { target: { value: "#123456" } });
			fireEvent.change(input, { target: { value: "#654321" } });
			// Ainda arrastando: nada gravado, nada anunciado.
			expect(useVTTStore.getState().userColorChosen).toBe(false);
			expect(memory.size).toBe(0);
			await vi.advanceTimersByTimeAsync(400);
			expect(useVTTStore.getState().userColor).toBe("#654321");
			expect(memory.get("arkhiveon:vtt:cursor-color:v1:user-1")).toBe(
				"#654321",
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
