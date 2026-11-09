// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import { characterDefaults } from "@/lib/store/character-slice";
import { npcDefaults } from "@/lib/store/npc-slice";
import type { Campaign } from "@/lib/store/types";
import {
	TOKEN_PLACE_FAILED,
	TOKEN_PLACE_NEEDS_GM,
} from "@/lib/vtt/token-spawn";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const mockUpload = vi.fn(
	async () => "https://cdn.test/vtt-tokens/guardiao.webp",
);
const mockReadDimensions = vi.fn(async () => ({ width: 512, height: 512 }));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ session: { user: { id: "gm-1" } } }),
}));
vi.mock("@/lib/image-storage", () => ({
	imageStorage: {
		upload: (...args: unknown[]) => mockUpload(...(args as [])),
		delete: vi.fn(async () => {}),
	},
}));
vi.mock("@/lib/image-metadata", () => ({
	readImageDimensions: (...args: unknown[]) =>
		mockReadDimensions(...(args as [])),
}));
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

import { SceneMapTab, VTTRosterDrawer } from "./vtt-roster-drawer";

const MAP = "https://cdn.test/mapa-caverna.webp";
const scene: VTTScene = {
	id: "scene-1",
	campaignId: "camp-1",
	name: "Caverna",
	mapImageUrl: MAP,
	gridType: "square",
	gridSize: 70,
	gridColor: "#ffffff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	width: 2000,
	height: 1400,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
} as VTTScene;

const thumbName = "Ver mapa de Caverna em tela cheia";
const itemName = "Ver mapa em tela cheia";
const onSetSceneMap = vi.fn(async () => {});

function renderTab(isGM: boolean, s: VTTScene = scene) {
	useVTTStore.setState({ isGM });
	render(<SceneMapTab scene={s} onSetSceneMap={onSetSceneMap} />);
}

beforeEach(() => {
	useVTTStore.setState({ isGM: false, showRosterDrawer: false });
	onSetSceneMap.mockClear();
	mockUpload.mockClear();
	mockReadDimensions.mockClear();
});
afterEach(cleanup);

describe("Mapa da cena em tela cheia (aba Mapa)", () => {
	it("mestre: miniatura e item abrem o mapa em tela cheia", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		expect(thumb.getAttribute("aria-haspopup")).toBe("dialog");
		fireEvent.click(thumb);
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("Caverna");
		expect(
			dialog.querySelector(`img[src="${MAP}"]`) ??
				document.querySelector(`[role="dialog"] img[src="${MAP}"]`),
		).toBeTruthy();
		act(() => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		fireEvent.click(screen.getByRole("button", { name: itemName }));
		expect(await screen.findByRole("dialog")).toBeTruthy();
		expect(onSetSceneMap).not.toHaveBeenCalled();
	});

	it("miniatura sem Tooltip: mantém aria-label e ícone, não abre tooltip no foco", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		expect(thumb.getAttribute("data-slot")).toBeNull();
		expect(thumb.querySelector("svg")).toBeTruthy();
		act(() => {
			thumb.focus();
		});
		await new Promise((r) => setTimeout(r, 50));
		expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
	});

	it("mestre: Esc fecha só a tela cheia e o foco volta à miniatura", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		thumb.focus();
		fireEvent.click(thumb);
		const dialog = await screen.findByRole("dialog");
		act(() => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(thumb));
	});

	it("cena sem mapa não tem gatilho de tela cheia", () => {
		renderTab(true, { ...scene, mapImageUrl: null });
		expect(screen.queryByRole("button", { name: thumbName })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
	});

	it("jogador: mesmo com a aba Mapa renderizada à força, não há gatilho", () => {
		renderTab(false);
		expect(screen.queryByRole("button", { name: thumbName })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
		// A miniatura continua só imagem.
		expect(screen.getByRole("img", { name: "Mapa Mapa atual" })).toBeTruthy();
	});

	it("jogador: a Biblioteca da mesa não tem a aba Mapa", () => {
		useVTTStore.setState({ isGM: false, showRosterDrawer: true });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);
		expect(screen.queryByRole("button", { name: "Mapa" })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
	});

	it("mestre: a Biblioteca da mesa tem a aba Mapa com os gatilhos", () => {
		useVTTStore.setState({ isGM: true, showRosterDrawer: true });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Mapa" }));
		expect(screen.getByRole("button", { name: thumbName })).toBeTruthy();
		expect(screen.getByRole("button", { name: itemName })).toBeTruthy();
	});
});

describe("Biblioteca: busca sem resultado", () => {
	const lyra = {
		id: "t1",
		sceneId: "scene-1",
		name: "Lyra",
		layer: "token",
		x: 100,
		y: 100,
		sizeCells: 1,
		hpCurrent: 7,
		hpMax: 10,
		conditions: [],
		controlledBy: [],
	} as unknown as VTTToken;

	function renderDrawer(tokens: VTTToken[]) {
		useVTTStore.setState({ isGM: true, showRosterDrawer: true, tokens });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);
	}

	it('com termo: "Nada encontrado para" + Limpar busca devolve a lista e o foco', async () => {
		renderDrawer([lyra]);
		const input = screen.getByLabelText(
			"Buscar na biblioteca",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "zzz" } });
		expect(await screen.findByText('Nada encontrado para "zzz"')).toBeTruthy();
		expect(screen.queryByText("A cena está pronta para seu grupo")).toBeNull();
		expect(screen.queryByText("Escolher personagens")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
		expect(input.value).toBe("");
		expect(document.activeElement).toBe(input);
		expect(
			await screen.findByRole("button", { name: "Localizar Lyra" }),
		).toBeTruthy();
	});

	it("sem termo e sem tokens: segue o vazio da cena", () => {
		renderDrawer([]);
		expect(screen.getByText("A cena está pronta para seu grupo")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
	});
});

describe("Biblioteca: criar token com imagem (R2 + Biblioteca de imagens)", () => {
	it("envia imagem pro R2, salva na Biblioteca de imagens e passa avatarUrl ao colocar na cena", async () => {
		const addImageAssetSpy = vi.fn();
		const loadImageAssetsSpy = vi.fn(async () => {});
		useRPGStore.setState({
			activeCampaignId: "camp-1",
			addImageAsset: addImageAssetSpy,
			loadImageAssets: loadImageAssetsSpy,
			imageAssets: [],
		});
		const onSpawnToken = vi.fn(async () => {});
		useVTTStore.setState({ isGM: true, showRosterDrawer: true, tokens: [] });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={onSpawnToken}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Criar" }));

		// Arrastar arquivo sobre a aba Criar não troca para a aba Mapa
		const aside = screen.getByRole("complementary", {
			name: "Biblioteca da mesa",
		});
		fireEvent.dragEnter(aside, { dataTransfer: { types: ["Files"] } });
		expect(
			screen
				.getByRole("button", { name: "Criar" })
				.getAttribute("aria-pressed"),
		).toBe("true");

		const fileInput = screen.getByLabelText(
			"Arquivo da imagem do token",
		) as HTMLInputElement;
		const file = new File(["bytes"], "guardiao_das_ruinas.png", {
			type: "image/png",
		});
		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
		expect(mockUpload).toHaveBeenCalledWith(
			file,
			expect.objectContaining({
				folder: "vtt-tokens",
				campaignId: "camp-1",
				maxDimension: 1024,
			}),
		);
		expect(addImageAssetSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignId: "camp-1",
				name: "guardiao das ruinas",
				url: "https://cdn.test/vtt-tokens/guardiao.webp",
				width: 512,
				height: 512,
			}),
			expect.any(Object),
		);

		// Preview da imagem aparece e preenche o nome se estava vazio
		expect(
			await screen.findByRole("img", { name: "Token guardiao das ruinas" }),
		).toBeTruthy();
		const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
		expect(nameInput.value).toBe("guardiao das ruinas");

		fireEvent.click(screen.getByRole("button", { name: /Colocar na cena/ }));
		await waitFor(() => expect(onSpawnToken).toHaveBeenCalledTimes(1));
		expect(onSpawnToken).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "guardiao das ruinas",
				avatarUrl: "https://cdn.test/vtt-tokens/guardiao.webp",
				hpCurrent: 25,
				hpMax: 25,
				sizeCells: 1,
			}),
		);
	});

	it("permite selecionar uma imagem existente da Biblioteca de imagens para o token", async () => {
		const loadImageAssetsSpy = vi.fn(async () => {});
		useRPGStore.setState({
			activeCampaignId: "camp-1",
			loadImageAssets: loadImageAssetsSpy,
			imageAssets: [
				{
					id: "asset-1",
					campaignId: "camp-1",
					createdBy: "gm-1",
					name: "Lobo Atroz",
					url: "https://cdn.test/library/lobo-atroz.webp",
					mimeType: "image/webp",
					sizeBytes: 4096,
					width: 640,
					height: 640,
					isPrivate: false,
					createdAt: 1,
				},
			],
		});
		const onSpawnToken = vi.fn(async () => {});
		useVTTStore.setState({ isGM: true, showRosterDrawer: true, tokens: [] });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={onSpawnToken}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Criar" }));
		fireEvent.click(screen.getByRole("button", { name: "Da biblioteca" }));
		expect(loadImageAssetsSpy).toHaveBeenCalledWith("camp-1");

		const assetButton = await screen.findByRole("button", {
			name: /Lobo Atroz/i,
		});
		fireEvent.click(assetButton);

		expect(
			await screen.findByRole("img", { name: "Token Lobo Atroz" }),
		).toBeTruthy();
		expect(mockUpload).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: /Colocar na cena/ }));
		await waitFor(() => expect(onSpawnToken).toHaveBeenCalledTimes(1));
		expect(onSpawnToken).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Lobo Atroz",
				avatarUrl: "https://cdn.test/library/lobo-atroz.webp",
			}),
		);
	});
});

describe("Biblioteca: NPCs e fichas (Rise of Tiamat / busca Dar)", () => {
	const campaign: Campaign = {
		id: "camp-1",
		name: "Rise of Tiamat",
		description: "",
		ownerId: "gm-1",
		worldId: "world-1",
		myRole: "owner",
		createdAt: 1,
	};

	function seedLibrary() {
		useRPGStore.setState({
			activeCampaignId: "camp-1",
			campaigns: [campaign],
			npcs: [
				{
					...npcDefaults,
					id: "npc-dargan",
					createdAt: 1,
					worldId: "world-1",
					campaignIds: ["camp-1"],
					name: "Dargan",
					kind: "npc",
					role: "",
				},
				{
					...npcDefaults,
					id: "npc-andariel",
					createdAt: 1,
					worldId: "world-1",
					campaignIds: ["camp-1"],
					name: "Andariel",
					kind: "npc",
					role: "Deusa do Sol",
				},
			],
			characters: [
				{
					...characterDefaults,
					id: "char-lyra",
					createdAt: 1,
					characterName: "Lyra",
					class: "Maga",
					health: 12,
					healthMax: 20,
				},
			],
		});
	}

	afterEach(() => {
		useRPGStore.setState({
			activeCampaignId: null,
			campaigns: [],
			npcs: [],
			characters: [],
		});
	});

	function renderDrawer(
		onSpawnToken: (data: Partial<VTTToken>) => Promise<void> = vi.fn(
			async () => {},
		),
		isGM = true,
	) {
		useVTTStore.setState({ isGM, showRosterDrawer: true, tokens: [] });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={onSpawnToken}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={vi.fn(async () => true)}
			/>,
		);
		return onSpawnToken;
	}

	it('busca "Dar" lista Dargan e Andariel porque o nome contém dar', async () => {
		seedLibrary();
		renderDrawer();
		fireEvent.click(screen.getByRole("button", { name: "NPCs" }));
		fireEvent.change(screen.getByLabelText("Buscar na biblioteca"), {
			target: { value: "Dar" },
		});
		expect(await screen.findByText("Dargan")).toBeTruthy();
		expect(screen.getByText("Andariel")).toBeTruthy();
		expect(screen.getByText("Deusa do Sol")).toBeTruthy();
	});

	it("mestre coloca Dargan com npcId e sem characterId", async () => {
		seedLibrary();
		const onSpawnToken = renderDrawer();
		fireEvent.click(screen.getByRole("button", { name: "NPCs" }));
		fireEvent.click(screen.getAllByRole("button", { name: "Colocar" })[0]);
		await waitFor(() => expect(onSpawnToken).toHaveBeenCalledTimes(1));
		expect(onSpawnToken).toHaveBeenCalledWith(
			expect.objectContaining({
				npcId: "npc-dargan",
				name: "Dargan",
			}),
		);
		expect(
			vi.mocked(onSpawnToken).mock.calls[0][0].characterId,
		).toBeUndefined();
	});

	it("mostra o erro da biblioteca quando o spawn recusa o NPC", async () => {
		seedLibrary();
		const onSpawnToken = vi.fn(async () => {
			throw new Error(TOKEN_PLACE_FAILED);
		});
		renderDrawer(onSpawnToken);
		fireEvent.click(screen.getByRole("button", { name: "NPCs" }));
		fireEvent.click(screen.getAllByRole("button", { name: "Colocar" })[0]);
		expect((await screen.findByRole("alert")).textContent).toBe(
			TOKEN_PLACE_FAILED,
		);
	});

	it("mestre coloca a ficha com characterId e sem npcId", async () => {
		seedLibrary();
		const onSpawnToken = renderDrawer();
		fireEvent.click(screen.getByRole("button", { name: "Fichas" }));
		fireEvent.click(screen.getByRole("button", { name: "Colocar" }));
		await waitFor(() => expect(onSpawnToken).toHaveBeenCalledTimes(1));
		expect(onSpawnToken).toHaveBeenCalledWith(
			expect.objectContaining({
				characterId: "char-lyra",
				name: "Lyra",
			}),
		);
		const spawned = vi.mocked(onSpawnToken).mock.calls[0][0];
		expect(spawned.npcId).toBeUndefined();
	});

	it("jogador não vê a aba NPCs nem o botão Colocar", () => {
		seedLibrary();
		renderDrawer(
			vi.fn(async () => {}),
			false,
		);
		expect(screen.queryByRole("button", { name: "NPCs" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Colocar" })).toBeNull();
		expect(screen.queryByText(TOKEN_PLACE_NEEDS_GM)).toBeNull();
	});
});

describe("Biblioteca: remover token da mesa", () => {
	const storeSnapshot = {
		characters: useRPGStore.getState().characters,
		activeCampaignId: useRPGStore.getState().activeCampaignId,
	};
	afterEach(() => {
		useRPGStore.setState(storeSnapshot);
	});

	const lyra = {
		id: "t1",
		sceneId: "scene-1",
		name: "Lyra",
		layer: "token",
		x: 100,
		y: 100,
		sizeCells: 1,
		hpCurrent: 7,
		hpMax: 10,
		conditions: [],
		controlledBy: [],
	} as unknown as VTTToken;

	function renderDrawer(
		tokens: VTTToken[],
		isGM = true,
		onRemoveToken = vi.fn(async () => true as boolean | undefined),
	) {
		useVTTStore.setState({ isGM, showRosterDrawer: true, tokens });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
				onRemoveToken={onRemoveToken}
			/>,
		);
		return { onRemoveToken };
	}

	it("jogador não vê Remover; o mestre confirma e tira o token da cena", async () => {
		renderDrawer([{ ...lyra, characterId: "char-1" }], false);
		expect(
			screen.queryByRole("button", { name: "Remover Lyra da mesa" }),
		).toBeNull();
		expect(
			screen.getByText(/Encontre um token no mapa ou abra sua ficha/),
		).toBeTruthy();
		cleanup();
		const { onRemoveToken } = renderDrawer([
			{ ...lyra, characterId: "char-1" },
		]);
		expect(screen.getByText(/remova da mesa/)).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Remover Lyra da mesa" }),
		);
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("A ficha continua na campanha.");
		expect(onRemoveToken).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(onRemoveToken).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Remover Lyra da mesa" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Remover da mesa" }));
		await waitFor(() => expect(onRemoveToken).toHaveBeenCalledWith("t1"));
	});

	it("token sem ficha avisa que não dá para desfazer", async () => {
		renderDrawer([lyra]);
		fireEvent.click(
			screen.getByRole("button", { name: "Remover Lyra da mesa" }),
		);
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("Não dá para desfazer.");
	});

	it("falha do servidor mantém a confirmação aberta", async () => {
		const { onRemoveToken } = renderDrawer(
			[lyra],
			true,
			vi.fn(async () => false),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Remover Lyra da mesa" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Remover da mesa" }));
		expect(
			await screen.findByText(
				"Não foi possível remover o token. Ele foi mantido na mesa.",
			),
		).toBeTruthy();
		expect(onRemoveToken).toHaveBeenCalledWith("t1");
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("na ficha, Remover tira todos os tokens daquele personagem", async () => {
		useRPGStore.setState({
			activeCampaignId: "camp-1",
			characters: [
				{
					...characterDefaults,
					id: "char-1",
					createdAt: 1,
					characterName: "Lyra",
					class: "Ladina",
					health: 7,
					healthMax: 10,
				},
			],
		});
		const { onRemoveToken } = renderDrawer([
			{ ...lyra, id: "t1", characterId: "char-1" },
			{ ...lyra, id: "t2", characterId: "char-1" },
		]);
		fireEvent.click(screen.getByRole("button", { name: "Fichas" }));
		expect(screen.getByText("2 na mesa")).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Remover os 2 tokens de Lyra da mesa",
			}),
		);
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("Os 2 tokens saem desta cena.");
		expect(dialog.textContent).toContain("A ficha continua na campanha.");
		fireEvent.click(screen.getByRole("button", { name: "Remover da mesa" }));
		await waitFor(() => expect(onRemoveToken).toHaveBeenCalledTimes(2));
		expect(onRemoveToken).toHaveBeenNthCalledWith(1, "t1");
		expect(onRemoveToken).toHaveBeenNthCalledWith(2, "t2");
	});
});
