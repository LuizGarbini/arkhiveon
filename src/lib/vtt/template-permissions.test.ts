// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { isEditableElement } from "./shortcut-guard";
import type { VTTSpellTemplate } from "./template-math";
import {
	acceptTemplateRemoval,
	canRemoveSpellTemplate,
	shouldDeleteSelectedTemplate,
	templateIdsToClear,
} from "./template-permissions";
import { useVTTStore } from "./vtt-store";

function mold(
	id: string,
	userId?: string,
	extra?: Partial<VTTSpellTemplate>,
): VTTSpellTemplate {
	return {
		id,
		kind: "sphere",
		originX: 0,
		originY: 0,
		targetX: 70,
		targetY: 0,
		color: "white",
		...(userId ? { userId } : {}),
		...extra,
	};
}

const player = { userId: "lia", isGM: false, isCoGM: false };
const gm = { userId: "mestre", isGM: true, isCoGM: false };
const coGm = { userId: "co", isGM: false, isCoGM: true };

describe("canRemoveSpellTemplate", () => {
	it("lets the owner, the GM and the co-GM delete, and denies another player", () => {
		const own = { userId: "lia" };
		const foreign = { userId: "otto" };
		expect(canRemoveSpellTemplate(player, own)).toBe(true);
		expect(canRemoveSpellTemplate(gm, foreign)).toBe(true);
		expect(canRemoveSpellTemplate(coGm, foreign)).toBe(true);
		expect(canRemoveSpellTemplate(player, foreign)).toBe(false);
		expect(
			canRemoveSpellTemplate(
				{ userId: null, isGM: true, isCoGM: true },
				foreign,
			),
		).toBe(false);
	});
});

describe("acceptTemplateRemoval", () => {
	const templates = [
		{ id: "mine", userId: "lia" },
		{ id: "other", userId: "otto" },
	];

	it("removes only the sender's template when the receiver's membership says player, ignoring a GM claim in the payload", () => {
		expect(
			acceptTemplateRemoval({
				templates,
				requestedIds: ["mine", "other", "missing"],
				senderUserId: "lia",
				source: {
					memberships: [{ userId: "lia", role: "player" }],
					presence: [{ userId: "lia", isGM: true, isCoGM: true }],
				},
				claimedRole: { isGM: true, isCoGM: true },
			}),
		).toEqual(["mine"]);
	});

	it("lets a GM membership on the receiver remove any listed template and ignores a player claim in the payload", () => {
		expect(
			acceptTemplateRemoval({
				templates,
				requestedIds: ["other", "missing"],
				senderUserId: "mestre",
				source: {
					campaignOwnerId: "mestre",
					memberships: [{ userId: "mestre", role: "owner" }],
				},
				claimedRole: { isGM: false, isCoGM: false },
			}),
		).toEqual(["other"]);
	});

	it("lets a co-GM known by the receiver's presence remove someone else's template", () => {
		expect(
			acceptTemplateRemoval({
				templates,
				requestedIds: ["other"],
				senderUserId: "co",
				source: {
					presence: [{ userId: "co", isGM: false, isCoGM: true }],
				},
				claimedRole: { isGM: false, isCoGM: false },
			}),
		).toEqual(["other"]);
	});

	it("denies a player presence even when the payload claims co-GM", () => {
		expect(
			acceptTemplateRemoval({
				templates,
				requestedIds: ["other"],
				senderUserId: "lia",
				source: {
					presence: [{ userId: "lia", isGM: false, isCoGM: false }],
				},
				claimedRole: { isCoGM: true, isGM: true },
			}),
		).toEqual([]);
	});
});

describe("templateIdsToClear", () => {
	it("clears only local templates for a player and every template for GM or co-GM", () => {
		const placed = [{ id: "local" }];
		const remote = ["remote"];
		expect(templateIdsToClear(player, placed, remote)).toEqual(["local"]);
		expect(templateIdsToClear(gm, placed, remote)).toEqual(["local", "remote"]);
		expect(templateIdsToClear(coGm, placed, remote)).toEqual([
			"local",
			"remote",
		]);
	});
});

describe("shouldDeleteSelectedTemplate", () => {
	it("returns the selected id for Delete when allowed", () => {
		expect(
			shouldDeleteSelectedTemplate({
				key: "Delete",
				editable: false,
				selectedTemplateId: "mine",
				canDelete: true,
			}),
		).toBe("mine");
	});

	it("ignores Delete while an editable field is focused and ignores Backspace", () => {
		const input = document.createElement("input");
		const textarea = document.createElement("textarea");
		const select = document.createElement("select");
		const editable = document.createElement("div");
		editable.setAttribute("contenteditable", "true");
		document.body.append(input, textarea, select, editable);
		for (const el of [input, textarea, select, editable]) {
			expect(isEditableElement(el)).toBe(true);
			expect(
				shouldDeleteSelectedTemplate({
					key: "Delete",
					editable: isEditableElement(el),
					selectedTemplateId: "mine",
					canDelete: true,
				}),
			).toBeNull();
		}
		expect(
			shouldDeleteSelectedTemplate({
				key: "Backspace",
				editable: false,
				selectedTemplateId: "mine",
				canDelete: true,
			}),
		).toBeNull();
		expect(
			shouldDeleteSelectedTemplate({
				key: "Delete",
				editable: false,
				selectedTemplateId: "mine",
				canDelete: false,
			}),
		).toBeNull();
		expect(
			shouldDeleteSelectedTemplate({
				key: "Delete",
				editable: false,
				selectedTemplateId: null,
				canDelete: true,
			}),
		).toBeNull();
		input.remove();
		textarea.remove();
		select.remove();
		editable.remove();
	});
});

describe("removeTemplatesByIds", () => {
	beforeEach(() => {
		useVTTStore.setState({
			placedTemplates: [mold("keep"), mold("gone")],
			remoteTemplates: { stay: mold("stay", "otto") },
			selectedTemplateId: "gone",
		});
	});

	it("drops only the given id and ignores an unknown id", () => {
		useVTTStore.getState().removeTemplatesByIds(["gone", "missing"]);
		const state = useVTTStore.getState();
		expect(state.placedTemplates.map((template) => template.id)).toEqual([
			"keep",
		]);
		expect(Object.keys(state.remoteTemplates)).toEqual(["stay"]);
		expect(state.selectedTemplateId).toBeNull();
	});
});
