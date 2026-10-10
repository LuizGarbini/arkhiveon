import { describe, expect, it } from "vitest";
import {
	countGalleryFilters,
	type GalleryScope,
	isInGalleryWorld,
	isVttMapAsset,
	selectGalleryAssets,
	visibleWorldAssets,
	worldCampaignIds,
} from "./image-gallery";
import type { ImageAsset } from "./store/types";

function asset(partial: Partial<ImageAsset> & { id: string }): ImageAsset {
	return {
		campaignId: "camp-a",
		createdBy: "user-1",
		name: partial.id,
		url: `https://cdn.example/user-1/library/${partial.id}.webp`,
		mimeType: "image/webp",
		sizeBytes: 1000,
		isPrivate: false,
		createdAt: 1,
		...partial,
	};
}

const scope: GalleryScope = {
	activeCampaignId: "camp-a",
	worldId: "world-1",
	campaigns: [
		{ id: "camp-a", worldId: "world-1", myRole: "owner" },
		{ id: "camp-b", worldId: "world-1", myRole: "viewer" },
		{ id: "camp-c", worldId: "world-2", myRole: "owner" },
	],
};

describe("worldCampaignIds", () => {
	it("junta a campanha ativa e as outras do mesmo mundo", () => {
		expect([...worldCampaignIds(scope)].sort()).toEqual(["camp-a", "camp-b"]);
	});

	it("sem mundo, fica só a campanha ativa", () => {
		expect([...worldCampaignIds({ ...scope, worldId: null })]).toEqual([
			"camp-a",
		]);
	});
});

describe("isInGalleryWorld", () => {
	it("usa world_id quando a linha já tem (migração 0036)", () => {
		// Campanha que o usuário não conhece, mas mesmo mundo.
		expect(
			isInGalleryWorld({ campaignId: "camp-x", worldId: "world-1" }, scope),
		).toBe(true);
		expect(
			isInGalleryWorld({ campaignId: "camp-a", worldId: "world-2" }, scope),
		).toBe(false);
	});

	it("sem world_id, decide pelas campanhas do mundo", () => {
		expect(isInGalleryWorld({ campaignId: "camp-b" }, scope)).toBe(true);
		expect(isInGalleryWorld({ campaignId: "camp-c" }, scope)).toBe(false);
	});
});

describe("visibleWorldAssets", () => {
	const assets = [
		asset({ id: "mesa-a", name: "Taverna do Javali" }),
		asset({ id: "privada-a", isPrivate: true, name: "Barão" }),
		asset({ id: "mesa-b", campaignId: "camp-b", name: "Colinas" }),
		asset({ id: "privada-b", campaignId: "camp-b", isPrivate: true }),
		asset({ id: "outro-mundo", campaignId: "camp-c" }),
		asset({ id: "mesa-x", campaignId: "camp-x", worldId: "world-1" }),
	];

	it("mostra as imagens do mundo inteiro, não só da campanha ativa", () => {
		const ids = visibleWorldAssets(assets, scope).map((a) => a.id);
		expect(ids).toEqual(["mesa-a", "privada-a", "mesa-b", "mesa-x"]);
	});

	it("privada só aparece para o mestre da campanha dona", () => {
		const ids = visibleWorldAssets(assets, scope).map((a) => a.id);
		expect(ids).toContain("privada-a");
		expect(ids).not.toContain("privada-b");
	});

	it("jogador não vê privadas", () => {
		const playerScope: GalleryScope = {
			...scope,
			campaigns: scope.campaigns.map((c) => ({ ...c, myRole: "viewer" })),
		};
		const ids = visibleWorldAssets(assets, playerScope).map((a) => a.id);
		expect(ids).not.toContain("privada-a");
		expect(ids).toContain("mesa-b");
	});

	it("filtra pela busca sem diferenciar maiúsculas", () => {
		const ids = visibleWorldAssets(assets, scope, "  JAVALI ").map((a) => a.id);
		expect(ids).toEqual(["mesa-a"]);
	});
});

describe("filtros e ordenação", () => {
	const map = asset({
		id: "mapa",
		url: "https://cdn.example/user-1/vtt-maps/1-mapa.webp",
		createdAt: 30,
		name: "Cripta",
	});
	const pub = asset({ id: "pub", createdAt: 10, name: "Arena" });
	const priv = asset({
		id: "priv",
		isPrivate: true,
		createdAt: 20,
		updatedAt: 40,
		name: "Bastião",
	});
	const all = [pub, priv, map];

	it("reconhece mapas enviados pela VTT", () => {
		expect(isVttMapAsset(map)).toBe(true);
		expect(isVttMapAsset(pub)).toBe(false);
	});

	it("conta cada filtro", () => {
		expect(countGalleryFilters(all)).toEqual({
			all: 3,
			table: 2,
			private: 1,
			"vtt-maps": 1,
		});
	});

	it("aplica o filtro e ordena", () => {
		expect(selectGalleryAssets(all, "all", "recent").map((a) => a.id)).toEqual([
			"priv",
			"mapa",
			"pub",
		]);
		expect(selectGalleryAssets(all, "all", "oldest").map((a) => a.id)).toEqual([
			"pub",
			"mapa",
			"priv",
		]);
		expect(selectGalleryAssets(all, "all", "name").map((a) => a.id)).toEqual([
			"pub",
			"priv",
			"mapa",
		]);
		expect(
			selectGalleryAssets(all, "table", "recent").map((a) => a.id),
		).toEqual(["mapa", "pub"]);
		expect(
			selectGalleryAssets(all, "private", "recent").map((a) => a.id),
		).toEqual(["priv"]);
		expect(
			selectGalleryAssets(all, "vtt-maps", "recent").map((a) => a.id),
		).toEqual(["mapa"]);
	});

	it("não muda a lista original", () => {
		const copy = [...all];
		selectGalleryAssets(all, "all", "name");
		expect(all).toEqual(copy);
	});
});
