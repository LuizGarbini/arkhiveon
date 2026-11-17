// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTScene, VTTSceneFolder } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTSceneBar } from "./vtt-scene-bar";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href="/dashboard" className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

afterEach(cleanup);

function scene(
	over: Partial<VTTScene> & Pick<VTTScene, "id" | "name">,
): VTTScene {
	return {
		campaignId: "camp",
		gridType: "square",
		gridSize: 70,
		gridColor: "white",
		gridOpacity: 0.2,
		gridScaleDistance: 1.5,
		gridScaleUnit: "m",
		gridOffsetX: 0,
		gridOffsetY: 0,
		mapScale: 1,
		width: 800,
		height: 600,
		fogEnabled: false,
		fogExploration: true,
		isActive: false,
		orderIndex: 0,
		...over,
	};
}

const masmorra: VTTSceneFolder = {
	id: "masmorra",
	campaignId: "camp",
	name: "Masmorra",
	orderIndex: 0,
};

function renderBar() {
	const onMoveScene = vi.fn().mockResolvedValue(undefined);
	const onCreateFolder = vi.fn().mockResolvedValue(undefined);
	const onRenameFolder = vi.fn().mockResolvedValue(undefined);
	const onDeleteFolder = vi.fn().mockResolvedValue(undefined);
	render(
		<VTTSceneBar
			campaignId="camp"
			campaignName="Campanha"
			onCreateScene={vi.fn().mockResolvedValue(undefined)}
			onActivateScene={vi.fn().mockResolvedValue(undefined)}
			onDeleteScene={vi.fn().mockResolvedValue(undefined)}
			onCreateFolder={onCreateFolder}
			onRenameFolder={onRenameFolder}
			onDeleteFolder={onDeleteFolder}
			onMoveScene={onMoveScene}
			onOpenJournal={vi.fn()}
		/>,
	);
	return { onMoveScene, onCreateFolder, onRenameFolder, onDeleteFolder };
}

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		isCoGM: false,
		scenes: [],
		sceneFolders: [],
		activeSceneId: null,
	});
});

describe("barra de cenas em pastas", () => {
	it("o mestre vê a pasta e a cena solta, não cada mapa do grupo", () => {
		const grouped = Array.from({ length: 12 }, (_, index) =>
			scene({
				id: `s${index}`,
				name: `Cena ${index}`,
				orderIndex: index,
				folderId: "masmorra",
			}),
		);
		useVTTStore.setState({
			isGM: true,
			scenes: [
				...grouped,
				scene({ id: "raiz", name: "Raiz", orderIndex: 20, isActive: true }),
			],
			sceneFolders: [masmorra],
			activeSceneId: "raiz",
		});
		renderBar();
		const nav = screen.getByRole("navigation", { name: "Cenas da mesa" });
		expect(
			within(nav).getByRole("button", { name: /Pasta Masmorra, 12 cenas/ }),
		).toBeTruthy();
		expect(within(nav).getByRole("button", { name: /^Raiz/ })).toBeTruthy();
		expect(within(nav).queryByRole("button", { name: /Cena 0/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /Cena 11/ })).toBeNull();
		expect(within(nav).getAllByRole("button")).toHaveLength(3);
	});

	it("abrir a pasta mostra as cenas sem alongar a barra", () => {
		useVTTStore.setState({
			isGM: true,
			scenes: [
				scene({
					id: "sala",
					name: "Sala do trono",
					orderIndex: 0,
					folderId: "masmorra",
				}),
			],
			sceneFolders: [masmorra],
			activeSceneId: "sala",
		});
		renderBar();
		const nav = screen.getByRole("navigation", { name: "Cenas da mesa" });
		expect(
			within(nav).queryByRole("button", { name: /Sala do trono/ }),
		).toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: /Pasta Masmorra, 1 cena/ }),
		);
		const popover = document.querySelector("[data-slot='popover-content']");
		if (!(popover instanceof HTMLElement)) {
			throw new Error("A pasta não abriu.");
		}
		expect(
			within(popover).getByRole("button", { name: /^Sala do trono/ }),
		).toBeTruthy();
		expect(
			within(nav).getAllByRole("button", { name: /Pasta Masmorra/ }),
		).toHaveLength(1);
	});

	it("mover a cena solta chama a pasta escolhida", () => {
		useVTTStore.setState({
			isGM: true,
			scenes: [
				scene({ id: "raiz", name: "Raiz", orderIndex: 0, isActive: true }),
			],
			sceneFolders: [masmorra],
			activeSceneId: "raiz",
		});
		const { onMoveScene } = renderBar();
		fireEvent.click(
			screen.getByRole("button", { name: "Mover Raiz para pasta" }),
		);
		fireEvent.click(screen.getByRole("menuitem", { name: "Masmorra" }));
		expect(onMoveScene).toHaveBeenCalledWith("raiz", "masmorra");
	});

	it("a pasta vazia e o botão de criar ficam óbvios", () => {
		useVTTStore.setState({ isGM: true, scenes: [], sceneFolders: [] });
		renderBar();
		expect(
			screen.getByText(/Crie uma pasta para a barra não crescer/),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Nova pasta" })).toBeTruthy();
	});

	it("criar pasta envia o nome limpo", async () => {
		useVTTStore.setState({ isGM: true });
		const { onCreateFolder } = renderBar();
		fireEvent.click(screen.getByRole("button", { name: "Nova pasta" }));
		fireEvent.change(screen.getByLabelText("Nome da pasta"), {
			target: { value: "  Calabouço  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar pasta" }));
		await waitFor(() => expect(onCreateFolder).toHaveBeenCalledTimes(1));
		expect(onCreateFolder.mock.calls[0]?.[0]).toMatchObject({
			name: "Calabouço",
		});
	});

	it("jogador vê a cena permitida e não organiza pastas", () => {
		useVTTStore.setState({
			isGM: false,
			isCoGM: false,
			scenes: [
				scene({
					id: "sala",
					name: "Sala do trono",
					orderIndex: 0,
					folderId: "masmorra",
					isActive: true,
				}),
				scene({
					id: "segredo",
					name: "Segredo do mestre",
					orderIndex: 1,
					folderId: "masmorra",
					isActive: false,
				}),
			],
			sceneFolders: [masmorra],
			activeSceneId: "sala",
		});
		renderBar();
		expect(screen.getByRole("button", { name: /Sala do trono/ })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /Segredo do mestre/ }),
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Nova pasta" })).toBeNull();
		expect(screen.queryByRole("button", { name: /Mover / })).toBeNull();
	});

	it("co-mestre não ganha os controles de pasta", () => {
		useVTTStore.setState({
			isGM: false,
			isCoGM: true,
			scenes: [
				scene({ id: "sala", name: "Sala", isActive: true, orderIndex: 0 }),
			],
			activeSceneId: "sala",
		});
		renderBar();
		expect(screen.queryByRole("button", { name: "Nova pasta" })).toBeNull();
		expect(screen.queryByRole("button", { name: /Mover / })).toBeNull();
		expect(screen.getByRole("button", { name: /Sala/ })).toBeTruthy();
	});
});
