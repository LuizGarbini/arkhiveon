// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { exploredSync } from "@/lib/vtt/explored-sync";
import { createSceneSession } from "@/lib/vtt/scene-session";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	FOG_BRUSH_SIZES,
	fogBrushDiameterLabel,
	VTTFogControls,
} from "./vtt-fog-controls";

const scene = {
	id: "scene-1",
	campaignId: "qa",
	name: "QA",
	gridType: "square",
	gridSize: 70,
	width: 1600,
	height: 1200,
	fogEnabled: false,
	fogExploration: false,
} as VTTScene;

function setup(fogEnabled: boolean) {
	const onUpdateScene = vi.fn(async () => {});
	const onClearFog = vi.fn();
	render(
		<ToastProvider>
			<VTTFogControls
				scene={{ ...scene, fogEnabled }}
				onUpdateScene={onUpdateScene}
				onClearFog={onClearFog}
			/>
		</ToastProvider>,
	);
	return { onUpdateScene, onClearFog };
}

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		activeSceneId: scene.id,
		scenes: [scene],
		showFogControls: true,
		activeFogTool: "brush",
		fogBrushRadius: 40,
	});
});
afterEach(cleanup);

describe("VTTFogControls — Cobrir/Revelar Tudo", () => {
	it.each([
		["Cobrir Tudo", "all_hidden", "Névoa ativada e mapa coberto"],
		["Revelar Tudo", "all_revealed", "Névoa ativada e mapa revelado"],
	] as const)(
		"%s com a névoa inativa ativa a névoa, aplica e avisa",
		async (label, mode, toastText) => {
			const { onUpdateScene, onClearFog } = setup(false);
			fireEvent.click(screen.getByRole("button", { name: label }));
			await waitFor(() => expect(onClearFog).toHaveBeenCalledWith(mode));
			expect(onUpdateScene).toHaveBeenCalledWith("scene-1", {
				fogEnabled: true,
			});
			expect(await screen.findByText(toastText)).toBeTruthy();
		},
	);

	it("com a névoa ativa só aplica, sem mexer na cena nem avisar", async () => {
		const { onUpdateScene, onClearFog } = setup(true);
		fireEvent.click(screen.getByRole("button", { name: "Cobrir Tudo" }));
		await waitFor(() => expect(onClearFog).toHaveBeenCalledWith("all_hidden"));
		expect(onUpdateScene).not.toHaveBeenCalled();
		expect(screen.queryByText(/Névoa ativada/)).toBeNull();
	});
});

describe("VTTFogControls — pincel em diâmetro", () => {
	it.each(FOG_BRUSH_SIZES)(
		"tamanho $label: cabeçalho igual ao botão selecionado",
		({ label, radius }) => {
			useVTTStore.setState({ fogBrushRadius: radius });
			setup(true);
			const diameter = fogBrushDiameterLabel(radius);
			const button = screen.getByRole("button", {
				name: `${label}(${diameter})`,
			});
			expect(button.className).toContain("bg-white/20");
			// cabeçalho "Espessura do Pincel" mostra o mesmo número do botão
			expect(screen.getByText(diameter)).toBeTruthy();
		},
	);

	it("M mostra 80px no botão e no cabeçalho (antes: 40px e 80px)", () => {
		setup(true);
		expect(screen.getByRole("button", { name: "M(80px)" })).toBeTruthy();
		expect(screen.getByText("80px")).toBeTruthy();
		expect(screen.queryByText("(20px)")).toBeNull();
	});
});

it("recusa de autorização não executa Revelar Tudo", async () => {
	const save = vi.fn(async () => false),
		clear = vi.fn();
	render(
		<ToastProvider>
			<VTTFogControls scene={scene} onUpdateScene={save} onClearFog={clear} />
		</ToastProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Revelar Tudo" }));
	await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
	expect(clear).toHaveBeenCalledTimes(0);
});
it("troca de cena durante enable não limpa a cena nova", async () => {
	let resolve!: (v: boolean) => void;
	const save = vi.fn(
			() =>
				new Promise<boolean>((r) => {
					resolve = r;
				}),
		),
		clear = vi.fn();
	render(
		<ToastProvider>
			<VTTFogControls scene={scene} onUpdateScene={save} onClearFog={clear} />
		</ToastProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Revelar Tudo" }));
	useVTTStore.getState().setActiveSceneId("other");
	resolve(true);
	await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
	expect(clear).toHaveBeenCalledTimes(0);
});

it("offline Revelar Tudo só aceita overlay P1 pendente e não finge ACK", async () => {
	const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
	let resolve!: (v: undefined) => void;
	const writer = vi.fn(
		() =>
			new Promise<undefined>((r) => {
				resolve = r;
			}),
	);
	const session = createSceneSession({
		userId: "gm",
		campaignId: "qa",
		sessionId: "offline",
		writeScene: writer,
		scaleScene: async () => ({ kind: "confirmed" }),
		readGeometry: async () => null,
	});
	session.acceptRemote(scene);
	const clear = vi.fn();
	try {
		render(
			<ToastProvider>
				<VTTFogControls
					session={session}
					scene={scene}
					onUpdateScene={(id, patch) => session.update(id, patch)}
					onClearFog={clear}
				/>
			</ToastProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Revelar Tudo" }));
		expect(clear).toHaveBeenCalledWith("all_revealed");
		expect(session.persistence.getSceneSnapshot(scene.id).pendingPatch).toEqual(
			{ fogEnabled: true },
		);
		expect(screen.getByText(/Ajuste pendente nesta máquina/)).toBeTruthy();
		await waitFor(() => expect(writer).toHaveBeenCalledTimes(1));
		await act(async () => resolve(undefined));
	} finally {
		session.dispose();
		online.mockRestore();
	}
});
it("offline recusa sem overlay aceito não executa Revelar Tudo", async () => {
	const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
	const clear = vi.fn();
	try {
		render(
			<ToastProvider>
				<VTTFogControls
					scene={scene}
					onUpdateScene={async () => false}
					onClearFog={clear}
				/>
			</ToastProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Revelar Tudo" }));
		await act(async () => {});
		expect(clear).toHaveBeenCalledTimes(0);
	} finally {
		online.mockRestore();
	}
});

describe("Esquecer o que já foi explorado", () => {
	function renderControls(fogExploration: boolean) {
		render(
			<ToastProvider>
				<VTTFogControls
					scene={{ ...scene, fogEnabled: true, fogExploration }}
					onUpdateScene={vi.fn(async () => {})}
					onClearFog={vi.fn()}
				/>
			</ToastProvider>,
		);
	}

	afterEach(() => vi.restoreAllMocks());

	it("só aparece com o modo Exploração ligado", () => {
		renderControls(false);
		expect(screen.queryByText("Esquecer o que já foi explorado")).toBeNull();
		cleanup();
		renderControls(true);
		expect(screen.getByText("Esquecer o que já foi explorado")).toBeTruthy();
	});

	it("o primeiro toque só pede confirmação; o segundo esquece", async () => {
		const reset = vi
			.spyOn(exploredSync, "reset")
			.mockResolvedValue({ ok: true });
		renderControls(true);
		fireEvent.click(screen.getByText("Esquecer o que já foi explorado"));
		expect(reset).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("Toque de novo para confirmar"));
		await waitFor(() => expect(reset).toHaveBeenCalledWith("scene-1"));
		await waitFor(() =>
			expect(screen.getByText(/Mapa esquecido/)).toBeTruthy(),
		);
	});

	it("a confirmação some sozinha depois de 4 s", () => {
		vi.useFakeTimers();
		try {
			renderControls(true);
			fireEvent.click(screen.getByText("Esquecer o que já foi explorado"));
			expect(screen.getByText("Toque de novo para confirmar")).toBeTruthy();
			act(() => {
				vi.advanceTimersByTime(4100);
			});
			expect(screen.getByText("Esquecer o que já foi explorado")).toBeTruthy();
		} finally {
			vi.useRealTimers();
		}
	});

	it("travado enquanto grava: toque duplo não apaga duas vezes", async () => {
		let release: (v: { ok: true }) => void = () => {};
		const reset = vi.spyOn(exploredSync, "reset").mockImplementation(
			() =>
				new Promise((resolve) => {
					release = resolve;
				}),
		);
		renderControls(true);
		fireEvent.click(screen.getByText("Esquecer o que já foi explorado"));
		fireEvent.click(screen.getByText("Toque de novo para confirmar"));
		const busy = await screen.findByText("Esquecendo…");
		fireEvent.click(busy);
		fireEvent.click(busy);
		expect(reset).toHaveBeenCalledTimes(1);
		await act(async () => release({ ok: true }));
	});

	it("erro do servidor: mostra a mensagem junto do botão e destrava", async () => {
		vi.spyOn(exploredSync, "reset").mockResolvedValue({
			ok: false,
			message: "Só o mestre ou co-mestre pode esquecer o mapa.",
		});
		renderControls(true);
		fireEvent.click(screen.getByText("Esquecer o que já foi explorado"));
		fireEvent.click(screen.getByText("Toque de novo para confirmar"));
		await waitFor(() =>
			expect(screen.getByText(/Só o mestre ou co-mestre/)).toBeTruthy(),
		);
		expect(screen.getByText("Esquecer o que já foi explorado")).toBeTruthy();
	});
});

describe("Luz da cena (mudou para a ferramenta Luz)", () => {
	it("o painel da névoa não tem mais o seletor de luz: ele vive na ferramenta Luz", () => {
		render(
			<ToastProvider>
				<VTTFogControls
					scene={{ ...scene, fogEnabled: true, fogExploration: true }}
					onUpdateScene={vi.fn(async () => {})}
					onClearFog={vi.fn()}
				/>
			</ToastProvider>,
		);
		expect(screen.queryByRole("group", { name: "Luz da cena" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Escura" })).toBeNull();
	});
});

describe("Ver exploração dos jogadores", () => {
	function renderToggle(fogExploration: boolean) {
		render(
			<ToastProvider>
				<VTTFogControls
					scene={{ ...scene, fogEnabled: true, fogExploration }}
					onUpdateScene={vi.fn(async () => {})}
					onClearFog={vi.fn()}
				/>
			</ToastProvider>,
		);
	}

	beforeEach(() => useVTTStore.setState({ showPlayerExploration: true }));

	it("só aparece com o modo Exploração ligado", () => {
		renderToggle(false);
		expect(screen.queryByText("Ver exploração dos jogadores")).toBeNull();
		cleanup();
		renderToggle(true);
		expect(screen.getByText("Ver exploração dos jogadores")).toBeTruthy();
	});

	it("vem ligado por padrão e alterna na hora, sem confirmação", () => {
		renderToggle(true);
		const button = screen.getByRole("button", {
			name: /Ver exploração dos jogadores/,
		});
		expect(button.getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(button);
		expect(useVTTStore.getState().showPlayerExploration).toBe(false);
		expect(button.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(button);
		expect(useVTTStore.getState().showPlayerExploration).toBe(true);
	});
});
