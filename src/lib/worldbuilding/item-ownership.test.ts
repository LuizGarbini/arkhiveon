import { describe, expect, it } from "vitest";
import {
	canCreateCampaignItem,
	canManageOwnItem,
	viewerSafeItemPublication,
} from "./item-ownership";

describe("canCreateCampaignItem", () => {
	it("allows owner, editor and viewer", () => {
		expect(canCreateCampaignItem("owner")).toBe(true);
		expect(canCreateCampaignItem("editor")).toBe(true);
		expect(canCreateCampaignItem("viewer")).toBe(true);
		expect(canCreateCampaignItem(undefined)).toBe(false);
	});
});

describe("canManageOwnItem", () => {
	it("allows staff for any item", () => {
		expect(canManageOwnItem({ createdBy: "other" }, "me", true)).toBe(true);
		expect(canManageOwnItem({ createdBy: "other" }, "me", "editor")).toBe(
			true,
		);
	});

	it("allows the creator when not staff", () => {
		expect(canManageOwnItem({ createdBy: "me" }, "me", "viewer")).toBe(true);
		expect(canManageOwnItem({ createdBy: "other" }, "me", "viewer")).toBe(
			false,
		);
		expect(canManageOwnItem({}, "me", "viewer")).toBe(false);
	});
});

describe("viewerSafeItemPublication", () => {
	it("locks the item to the active campaign as public", () => {
		expect(viewerSafeItemPublication("camp-1")).toEqual({
			publicationScope: "restricted",
			campaignIds: ["camp-1"],
			visibility: "public",
		});
	});
});
