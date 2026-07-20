import { describe, expect, it } from "vitest";
import {
	canCommentOnNews,
	canViewScopedContent,
	filterVisibleContent,
	isWorldStaffInWorld,
	passesScope,
	validateRestrictedScope,
} from "./visibility";

const worldA = "world-a";
const campA = { id: "camp-a", worldId: worldA };
const campB = { id: "camp-b", worldId: worldA };
const campC = { id: "camp-c", worldId: "world-b" };

const campaignsWorldA = [
	{ worldId: worldA, myRole: "viewer" as const },
	{ worldId: worldA, myRole: "editor" as const },
];

const campaignsViewerOnly = [{ worldId: worldA, myRole: "viewer" as const }];

const globalPublic = {
	worldId: worldA,
	publicationScope: "global" as const,
	campaignIds: [] as string[],
	visibility: "public" as const,
};

const globalSecret = { ...globalPublic, visibility: "master_secret" as const };

const restrictedPublicAB = {
	worldId: worldA,
	publicationScope: "restricted" as const,
	campaignIds: ["camp-a", "camp-b"],
	visibility: "public" as const,
};

const restrictedSecretA = {
	worldId: worldA,
	publicationScope: "restricted" as const,
	campaignIds: ["camp-a"],
	visibility: "master_secret" as const,
};

describe("passesScope", () => {
	it("global always passes", () => {
		expect(passesScope(globalPublic, campA)).toBe(true);
	});

	it("restricted passes when active campaign is listed", () => {
		expect(passesScope(restrictedPublicAB, campA)).toBe(true);
	});

	it("restricted fails when active campaign is not listed", () => {
		expect(
			passesScope({ ...restrictedPublicAB, campaignIds: ["camp-b"] }, campA),
		).toBe(false);
	});
});

describe("isWorldStaffInWorld", () => {
	it("true when any campaign in the world has owner/editor", () => {
		expect(isWorldStaffInWorld(campaignsWorldA, worldA)).toBe(true);
	});

	it("true when owner role exists for the world", () => {
		expect(
			isWorldStaffInWorld([{ worldId: worldA, myRole: "owner" }], worldA),
		).toBe(true);
	});

	it("false when only viewer roles exist for the world", () => {
		expect(isWorldStaffInWorld(campaignsViewerOnly, worldA)).toBe(false);
	});

	it("false for staff in a different world", () => {
		expect(
			isWorldStaffInWorld([{ worldId: "world-b", myRole: "editor" }], worldA),
		).toBe(false);
	});
});

describe("canViewScopedContent — matriz §4", () => {
	it("global + public: viewer vê", () => {
		expect(canViewScopedContent(globalPublic, campA, "viewer")).toBe(true);
	});

	it("global + master_secret: viewer não vê", () => {
		expect(canViewScopedContent(globalSecret, campA, "viewer")).toBe(false);
	});

	it("global + master_secret: editor vê", () => {
		expect(canViewScopedContent(globalSecret, campA, "editor")).toBe(true);
	});

	it("master_secret: staff em outra mesa do mesmo mundo vê", () => {
		expect(
			canViewScopedContent(globalSecret, campA, "viewer", campaignsWorldA),
		).toBe(true);
	});

	it("restricted + master_secret fora do escopo: staff cross-campaign via worldCampaigns vê", () => {
		const staffOnBOnly = [
			{ worldId: worldA, myRole: "viewer" as const },
			{ worldId: worldA, myRole: "editor" as const },
		];
		expect(
			canViewScopedContent(restrictedSecretA, campB, "viewer", staffOnBOnly),
		).toBe(true);
	});

	it("master_secret: só viewer no mundo não vê", () => {
		expect(
			canViewScopedContent(globalSecret, campA, "viewer", campaignsViewerOnly),
		).toBe(false);
	});

	it("restricted (ativa ∈ ids) + public: viewer vê", () => {
		expect(canViewScopedContent(restrictedPublicAB, campA, "viewer")).toBe(
			true,
		);
	});

	it("restricted (ativa ∉ ids) + public: viewer não vê", () => {
		expect(
			canViewScopedContent(
				{ ...restrictedPublicAB, campaignIds: ["camp-b"] },
				campA,
				"viewer",
			),
		).toBe(false);
	});

	it("restricted (ativa ∉ ids) + master_secret: editor na mesa B ainda vê", () => {
		expect(canViewScopedContent(restrictedSecretA, campB, "editor")).toBe(true);
	});

	it("restricted + master_secret: viewer na mesa A não vê", () => {
		expect(canViewScopedContent(restrictedSecretA, campA, "viewer")).toBe(
			false,
		);
	});

	it("outro mundo: ninguém vê", () => {
		expect(canViewScopedContent(globalPublic, campC, "owner")).toBe(false);
	});
});

describe("filterVisibleContent", () => {
	it("filtra pela campanha ativa", () => {
		const items = [
			globalPublic,
			{ ...restrictedPublicAB, campaignIds: ["camp-b"] },
		];
		const visible = filterVisibleContent(items, campA, "viewer");
		expect(visible).toHaveLength(1);
		expect(visible[0]).toEqual(globalPublic);
	});
});

describe("canCommentOnNews", () => {
	it("viewer comenta se notícia visível e não trancada", () => {
		expect(canCommentOnNews(globalPublic, campA, "viewer")).toBe(true);
	});

	it("viewer não comenta se trancada", () => {
		expect(
			canCommentOnNews(
				{ ...globalPublic, commentsLocked: true },
				campA,
				"viewer",
			),
		).toBe(false);
	});

	it("staff comenta mesmo trancada", () => {
		expect(
			canCommentOnNews(
				{ ...globalPublic, commentsLocked: true },
				campA,
				"editor",
			),
		).toBe(true);
	});

	it("commentsLocked: staff cross-campaign via worldCampaigns comenta", () => {
		expect(
			canCommentOnNews(
				{ ...globalPublic, commentsLocked: true },
				campA,
				"viewer",
				campaignsWorldA,
			),
		).toBe(true);
	});

	it("commentsLocked: só viewer no mundo não comenta", () => {
		expect(
			canCommentOnNews(
				{ ...globalPublic, commentsLocked: true },
				campA,
				"viewer",
				campaignsViewerOnly,
			),
		).toBe(false);
	});
});

describe("validateRestrictedScope", () => {
	it("global não exige campanhas", () => {
		expect(validateRestrictedScope("global", [], ["camp-a"])).toBeNull();
	});

	it("restricted exige ao menos uma campanha", () => {
		expect(validateRestrictedScope("restricted", [], ["camp-a"])).toBeTruthy();
	});

	it("rejeita campanha de outro mundo", () => {
		expect(
			validateRestrictedScope("restricted", ["camp-x"], ["camp-a"]),
		).toBeTruthy();
	});
});
