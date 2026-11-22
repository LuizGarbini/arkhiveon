import { describe, expect, it } from "vitest";
import type { ImageAsset } from "../store/types";
import {
	buildTokenAvatarMap,
	resolveLinkedTokenAvatarUrl,
	retainTokenAvatarMap,
	shownTokenAvatarUrl,
} from "./token-avatar";

const OLD = "https://cdn.test/antiga.webp";
const NEW = "https://cdn.test/nova.webp";
const PRIVATE = "https://cdn.test/privada.webp";

function asset(
	partial: Pick<ImageAsset, "id" | "url" | "isPrivate"> & Partial<ImageAsset>,
): ImageAsset {
	return {
		campaignId: "mesa",
		createdBy: "mestre",
		name: "foto",
		mimeType: "image/webp",
		sizeBytes: 12,
		createdAt: 1,
		audience: { coGms: true, players: false },
		...partial,
	};
}

const hidden = asset({
	id: "foto-1",
	url: PRIVATE,
	isPrivate: true,
	createdBy: "mestre",
});

describe("resolveLinkedTokenAvatarUrl", () => {
	it("usa a foto nova quando a ficha está visível", () => {
		expect(
			resolveLinkedTokenAvatarUrl(
				{ characterId: "lyra", avatarUrl: OLD },
				{ id: "lyra", imageUrl: NEW },
				[],
				"viewer",
				"jogador",
			),
		).toBe(NEW);
	});

	it("cai no avatar gravado quando o asset é privado para o jogador", () => {
		const sheet = {
			id: "lyra",
			imageUrl: "https://cdn.test/texto-da-ficha.webp",
			imageAssetId: "foto-1",
		};
		expect(
			resolveLinkedTokenAvatarUrl(
				{ characterId: "lyra", avatarUrl: OLD },
				sheet,
				[hidden],
				"viewer",
				"jogador",
			),
		).toBe(OLD);
		expect(
			resolveLinkedTokenAvatarUrl(
				{ characterId: "lyra", avatarUrl: OLD },
				sheet,
				[hidden],
				"owner",
				"mestre",
			),
		).toBe(PRIVATE);
	});

	it("deixa o token sem ficha com o avatar gravado", () => {
		expect(
			resolveLinkedTokenAvatarUrl(
				{ characterId: null, avatarUrl: OLD },
				{ id: "lyra", imageUrl: NEW },
				[],
				"owner",
				"mestre",
			),
		).toBe(OLD);
	});

	it("cai no avatar gravado quando a ficha não está no store", () => {
		expect(
			resolveLinkedTokenAvatarUrl(
				{ characterId: "lyra", avatarUrl: OLD },
				undefined,
				[hidden],
				"viewer",
				"jogador",
			),
		).toBe(OLD);
	});
});

describe("buildTokenAvatarMap", () => {
	it("não troca a foto de quem não tem ficha e mantém o mapa se só a posição muda", () => {
		const sheets = [{ id: "lyra", imageUrl: NEW }];
		const linked = {
			id: "tok-lyra",
			characterId: "lyra",
			avatarUrl: OLD,
			x: 10,
		};
		const loose = {
			id: "tok-goblin",
			characterId: null,
			avatarUrl: OLD,
			x: 40,
		};
		const first = buildTokenAvatarMap(
			[linked, loose],
			sheets,
			[],
			"viewer",
			"jogador",
		);
		expect(first.get("tok-lyra")).toBe(NEW);
		expect(first.has("tok-goblin")).toBe(false);
		expect(shownTokenAvatarUrl(loose, first)).toBe(OLD);

		const movedLinked = { ...linked, x: 80 };
		const movedLoose = { ...loose, x: 90 };
		const moved = buildTokenAvatarMap(
			[movedLinked, movedLoose],
			sheets,
			[],
			"viewer",
			"jogador",
		);
		expect(retainTokenAvatarMap(first, moved)).toBe(first);

		const changed = buildTokenAvatarMap(
			[linked, loose],
			[{ id: "lyra", imageUrl: "https://cdn.test/outra.webp" }],
			[],
			"viewer",
			"jogador",
		);
		expect(retainTokenAvatarMap(first, changed)).toBe(changed);
		expect(changed.get("tok-lyra")).toBe("https://cdn.test/outra.webp");
	});
});
