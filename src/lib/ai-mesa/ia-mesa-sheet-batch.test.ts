import { describe, expect, it, vi } from "vitest";
import {
	DND5E_SKILLS,
	SAVING_THROWS_LIST,
} from "@/components/character-sheet/fields/skills-fields";
import { CHARACTER_NUMERIC_FIELD_KEYS } from "../../../supabase/functions/_shared/ia-mesa-character";
import {
	canEditCampaignSheet,
	commitSheetBatch,
	reviewSheetBatch,
	SHEET_BATCH_FIELD_ENUM,
	SHEET_SAVES,
	SHEET_SKILLS,
	type SheetBatchProposal,
	type SheetSnapshot,
	sheetBatchAnthropicTool,
	sheetBatchInputSchema,
	validateSheetBatch,
} from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";
import {
	buildClaudeRequest,
	handleIaMesaTurn,
	IA_MESA_MODEL_HAIKU,
	IA_MESA_MODEL_SONNET,
	type MesaContextInput,
} from "../../../supabase/functions/ia-mesa-chat/logic";
import { classifyHttpFailure, normalizeResponse } from "./proposal";

const CAMPAIGN = "11111111-2222-4333-8444-555555555555";

const scene: MesaContextInput = {
	role: "player",
	sheetText: "Ficha de Dante.",
	sceneName: "Cripta",
	gmNotes: "",
	fogEnabled: false,
	tokens: [],
	fog: [],
};

const sword = {
	id: "sword",
	name: "Espada longa",
	quantity: 1,
	weightLbs: 3,
	location: "equipped",
	category: "weapon",
};

function sheetData(): Record<string, unknown> {
	return {
		strength: 16,
		dexterity: 12,
		constitution: 14,
		intelligence: 10,
		wisdom: 13,
		charisma: 8,
		health: 30,
		armorClass: 16,
		speed: 9,
		skillProficiencies: { athletics: "proficient" },
		inventoryList: [{ ...sword }],
	};
}

function snapshot(): SheetSnapshot {
	const data = sheetData();
	return {
		id: "dante-1",
		name: "Dante Diavolo",
		data,
		itemIds: ["sword"],
	};
}

const TWELVE = [
	{ field: "strength", value: "18" },
	{ field: "dexterity", value: "14" },
	{ field: "constitution", value: "16" },
	{ field: "intelligence", value: "12" },
	{ field: "wisdom", value: "15" },
	{ field: "charisma", value: "10" },
	{ field: "health", value: "42" },
	{ field: "armorClass", value: "18" },
	{ field: "speed", value: "30" },
	{ field: "skill.perception", value: "proficient" },
	{ field: "skill.athletics", value: "expertise" },
	{ field: "item.quantity", value: "sword|2" },
];

const ITEM_FIELDS = [
	"item.add",
	"item.remove",
	"item.name",
	"item.quantity",
	"item.location",
	"item.category",
	"item.description",
	"item.weapon",
];

function modelBatch(changes: { field: string; value: string }[]) {
	return vi.fn(async (_request: unknown, _options?: unknown) => ({
		content: [
			{
				type: "tool_use",
				id: "toolu_batch",
				name: "propose_sheet_batch",
				input: { characterId: "dante-1", changes },
			},
		],
		usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
	}));
}

function turnDeps(input: {
	message: string;
	callModel?: ReturnType<typeof vi.fn>;
	canEditSheet?: () => Promise<boolean>;
	loadSheet?: () => Promise<SheetSnapshot | null>;
}) {
	const callModel = input.callModel ?? vi.fn();
	const isAllowed = vi.fn(async () => true);
	const isStaff = vi.fn(async () => true);
	const consume = vi.fn(async () => "allowed" as const);
	const loadContext = vi.fn(async () => scene);
	return {
		callModel,
		isAllowed,
		isStaff,
		consume,
		loadContext,
		canEditSheet: input.canEditSheet,
		loadSheet: input.loadSheet,
		turn: {
			user: { id: "user-1" },
			campaignId: CAMPAIGN,
			message: input.message,
			history: [],
			now: new Date("2026-06-15T15:30:00.000Z"),
			apiKey: "present",
			dailyLimit: 40,
		},
	};
}

function asBatch(body: Record<string, unknown>): SheetBatchProposal {
	const proposal = body.proposal;
	if (!proposal || typeof proposal !== "object") {
		throw new Error("sem proposta");
	}
	return proposal as SheetBatchProposal;
}

describe("propose_sheet_batch: schema fechado", () => {
	it("a tool é strict e o enum cobre só os campos da ficha", () => {
		const schema = sheetBatchInputSchema();
		const tool = sheetBatchAnthropicTool();
		expect(tool.name).toBe("propose_sheet_batch");
		expect(tool.strict).toBe(true);
		expect(schema.additionalProperties).toBe(false);
		expect(JSON.stringify(schema)).not.toMatch(
			/"(minimum|maximum|pattern|minLength|maxLength)"/,
		);
		const properties = schema.properties as {
			changes: {
				items: {
					additionalProperties: boolean;
					properties: { field: { enum: string[] }; value: { type: string } };
					required: string[];
				};
			};
		};
		expect(properties.changes.items.additionalProperties).toBe(false);
		expect(properties.changes.items.required).toEqual(["field", "value"]);
		expect(properties.changes.items.properties.value.type).toBe("string");
		expect(properties.changes.items.properties.field.enum).toEqual([
			...CHARACTER_NUMERIC_FIELD_KEYS,
			...DND5E_SKILLS.map((skill) => `skill.${skill.id}`),
			...SAVING_THROWS_LIST.map((save) => `save.${save.key}`),
			...ITEM_FIELDS,
		]);
		expect(properties.changes.items.properties.field.enum).toEqual([
			...SHEET_BATCH_FIELD_ENUM,
		]);
		expect(SHEET_SKILLS.map((skill) => [skill.id, skill.label])).toEqual(
			DND5E_SKILLS.map((skill) => [skill.id, skill.name]),
		);
		expect(SHEET_SAVES.map((save) => [save.id, save.label])).toEqual(
			SAVING_THROWS_LIST.map((save) => [save.key, save.label]),
		);

		const body = buildClaudeRequest({
			model: IA_MESA_MODEL_HAIKU,
			maxTokens: 1024,
			contextText: "cena",
			history: [],
			message: "oi",
		});
		const batch = body.tools.find(
			(item) => item.name === "propose_sheet_batch",
		);
		const npc = body.tools.find((item) => item.name === "propose_npc");
		expect(batch?.strict).toBe(true);
		expect(npc?.strict).toBeUndefined();
	});
});

describe("propose_sheet_batch: lote e gravação", () => {
	it("prompt grande com 12 campos devolve o diff e grava uma vez só", async () => {
		const pasted = `${"Resumo de build colado da ficha. ".repeat(80)}atualiza a ficha`;
		expect(pasted.length).toBeGreaterThan(400);
		expect(pasted.length).toBeLessThanOrEqual(20_000);
		const callModel = modelBatch(TWELVE);
		const live = snapshot();
		const d = turnDeps({
			message: pasted,
			callModel,
			canEditSheet: async () => true,
			loadSheet: async () => live,
		});
		const result = await handleIaMesaTurn(d.turn, d);
		expect(result.status).toBe(200);
		expect(callModel).toHaveBeenCalledTimes(1);
		const request = callModel.mock.calls[0]?.[0] as unknown as {
			model: string;
			max_tokens: number;
		};
		expect(request.model).toBe(IA_MESA_MODEL_SONNET);
		expect(request.max_tokens).toBe(8192);
		expect(callModel.mock.calls[0]?.[1]).toEqual({ timeoutMs: 60_000 });

		const proposal = asBatch(result.body);
		expect(proposal.diff).toHaveLength(12);
		expect(proposal.rejections).toEqual([]);
		expect(proposal.diff.map((row) => row.section)).toEqual(
			expect.arrayContaining(["Atributos", "Combate", "Perícias", "Itens"]),
		);
		expect(proposal.diff).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					field: "strength",
					label: "FOR",
					before: "16",
					after: "18",
					section: "Atributos",
				}),
				expect.objectContaining({
					field: "dexterity",
					before: "12",
					after: "14",
				}),
				expect.objectContaining({
					field: "constitution",
					before: "14",
					after: "16",
				}),
				expect.objectContaining({
					field: "intelligence",
					before: "10",
					after: "12",
				}),
				expect.objectContaining({
					field: "wisdom",
					before: "13",
					after: "15",
				}),
				expect.objectContaining({
					field: "charisma",
					before: "8",
					after: "10",
				}),
				expect.objectContaining({
					field: "health",
					label: "PV",
					before: "30",
					after: "42",
					section: "Combate",
				}),
				expect.objectContaining({
					field: "armorClass",
					before: "16",
					after: "18",
				}),
				expect.objectContaining({
					field: "speed",
					label: "Deslocamento",
					before: "9",
					after: "30",
				}),
				expect.objectContaining({
					field: "skill.perception",
					label: "Percepção",
					before: "Sem proficiência",
					after: "Proficiente",
					section: "Perícias",
				}),
				expect.objectContaining({
					field: "skill.athletics",
					label: "Atletismo",
					before: "Proficiente",
					after: "Especialista",
				}),
				expect.objectContaining({
					field: "item.quantity",
					label: "Espada longa",
					before: "1",
					after: "2",
					section: "Itens",
				}),
			]),
		);

		const source = sheetData();
		const untouched = JSON.stringify(source);
		const write = vi.fn();
		const committed = commitSheetBatch({
			allowed: true,
			proposal,
			data: source,
			characterId: "dante-1",
			write,
		});
		expect(committed.ok).toBe(true);
		expect(write).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(source)).toBe(untouched);
		const [id, changes] = write.mock.calls[0] as [
			string,
			Record<string, unknown>,
		];
		expect(id).toBe("dante-1");
		expect(changes).toMatchObject({
			strength: 18,
			dexterity: 14,
			constitution: 16,
			intelligence: 12,
			wisdom: 15,
			charisma: 10,
			health: 42,
			armorClass: 18,
			speed: 30,
			skillProficiencies: {
				athletics: "expertise",
				perception: "proficient",
			},
		});
		const items = changes.inventoryList as { quantity: number; name: string }[];
		expect(items[0]?.quantity).toBe(2);
		expect(items[0]?.name).toBe("Espada longa");
		expect(Object.keys(changes).sort()).toEqual(
			[
				"armorClass",
				"charisma",
				"constitution",
				"dexterity",
				"health",
				"intelligence",
				"inventoryList",
				"skillProficiencies",
				"speed",
				"strength",
				"wisdom",
			].sort(),
		);
	});

	it("o mesmo campo rejeitado no servidor e no cliente vira uma linha só", () => {
		const reviewed = reviewSheetBatch(snapshot(), {
			kind: "sheet_batch",
			characterId: "dante-1",
			characterName: "Dante Diavolo",
			changes: [
				{ field: "strength", value: "18" },
				{ field: "gold", value: "100" },
			],
			diff: [
				{
					section: "Atributos",
					field: "strength",
					label: "FOR",
					before: "16",
					after: "18",
				},
			],
			rejections: [
				{
					field: "gold",
					label: "gold",
					section: "Ficha",
					reason: "Ouro não faz parte da ficha.",
				},
			],
		});
		const gold = reviewed.rejections.filter((row) => row.field === "gold");
		expect(gold).toHaveLength(1);
		expect(gold[0]?.reason).toBe("Ouro não faz parte da ficha.");
		expect(reviewed.diff.map((row) => row.field)).toEqual(["strength"]);

		const duplicated = validateSheetBatch(
			{
				characterId: "dante-1",
				changes: [
					{ field: "gold", value: "10" },
					{ field: "gold", value: "12" },
					{ field: "strength", value: "18" },
				],
			},
			snapshot(),
		);
		expect(
			duplicated?.rejections.filter((row) => row.field === "gold"),
		).toHaveLength(1);
		expect(duplicated?.diff.map((row) => row.field)).toEqual(["strength"]);
	});

	it("campo inválido volta com o motivo e não grava nada", async () => {
		const callModel = modelBatch([
			{ field: "strength", value: "18" },
			{ field: "dexterity", value: "14" },
			{ field: "armorClass", value: "80" },
			{ field: "notes", value: "segredo" },
			{ field: "item.remove", value: "nao-existe" },
		]);
		const d = turnDeps({
			message: "atualiza a ficha",
			callModel,
			canEditSheet: async () => true,
			loadSheet: async () => snapshot(),
		});
		const result = await handleIaMesaTurn(d.turn, d);
		expect(result.status).toBe(200);
		const proposal = asBatch(result.body);
		expect(proposal.diff.map((row) => row.field).sort()).toEqual([
			"dexterity",
			"strength",
		]);
		expect(proposal.rejections).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					field: "armorClass",
					reason: "CA tem que ficar entre 0 e 50.",
				}),
				expect.objectContaining({
					field: "notes",
					reason: "Campo não editável.",
				}),
				expect.objectContaining({
					field: "item.remove",
					reason: "Item não encontrado nesta ficha.",
				}),
			]),
		);
		const source = sheetData();
		const write = vi.fn();
		const committed = commitSheetBatch({
			allowed: true,
			proposal,
			data: source,
			characterId: "dante-1",
			write,
		});
		expect(committed).toEqual({
			ok: false,
			error: "Há campos rejeitados. Nada foi alterado.",
		});
		expect(write).not.toHaveBeenCalled();
		expect(source.strength).toBe(16);
		expect((source.inventoryList as { quantity: number }[])[0]?.quantity).toBe(
			1,
		);
	});

	it("permissão negada não devolve proposta e não grava", async () => {
		const callModel = modelBatch([{ field: "strength", value: "18" }]);
		const d = turnDeps({
			message: "atualiza a ficha",
			callModel,
			canEditSheet: async () => false,
			loadSheet: async () => snapshot(),
		});
		const result = await handleIaMesaTurn(d.turn, d);
		expect(result.status).toBe(403);
		expect(result.body).toEqual({ ok: false, code: "forbidden" });
		expect(result.body.proposal).toBeUndefined();
		expect(callModel).toHaveBeenCalledTimes(1);

		const proposal = validateSheetBatch(
			{ characterId: "dante-1", changes: [{ field: "strength", value: "18" }] },
			snapshot(),
		);
		if (!proposal) throw new Error("proposta válida");
		const write = vi.fn();
		expect(
			commitSheetBatch({
				allowed: false,
				proposal,
				data: sheetData(),
				characterId: "dante-1",
				write,
			}),
		).toEqual({
			ok: false,
			error: "Você não pode editar esta ficha. Nada foi alterado.",
		});
		expect(write).not.toHaveBeenCalled();
	});

	it("só dono, mestre, editor ou dono da ficha, e só nesta campanha", () => {
		const character = {
			campaignId: "camp-1",
			userId: "other",
			createdBy: "other",
		};
		const base = {
			userId: "user-1",
			campaignId: "camp-1",
			campaignOwnerId: "gm",
			membershipRole: "player",
			character,
		};
		expect(canEditCampaignSheet({ ...base, campaignOwnerId: "user-1" })).toBe(
			true,
		);
		expect(canEditCampaignSheet({ ...base, membershipRole: "editor" })).toBe(
			true,
		);
		expect(canEditCampaignSheet({ ...base, membershipRole: "owner" })).toBe(
			true,
		);
		expect(
			canEditCampaignSheet({
				...base,
				character: { ...character, userId: "user-1" },
			}),
		).toBe(true);
		expect(
			canEditCampaignSheet({
				...base,
				character: { ...character, createdBy: "user-1" },
			}),
		).toBe(true);
		expect(canEditCampaignSheet(base)).toBe(false);
		expect(canEditCampaignSheet({ ...base, character: null })).toBe(false);
		expect(
			canEditCampaignSheet({
				...base,
				membershipRole: "editor",
				character: { ...character, campaignId: "outra" },
			}),
		).toBe(false);
	});
});

describe("propose_sheet_batch: limite de entrada", () => {
	it("acima de 20000 responde 413 e não chama o modelo", async () => {
		const callModel = vi.fn();
		const d = turnDeps({ message: "a".repeat(20_001), callModel });
		const result = await handleIaMesaTurn(d.turn, d);
		expect(result.status).toBe(413);
		expect(result.body).toEqual({ ok: false, code: "input_too_large" });
		expect(callModel).not.toHaveBeenCalled();
		expect(d.consume).not.toHaveBeenCalled();
		expect(d.loadContext).not.toHaveBeenCalled();
		expect(d.isAllowed).not.toHaveBeenCalled();
		expect(classifyHttpFailure(413, { code: "input_too_large" })).toEqual({
			ok: false,
			code: "input_too_large",
		});
	});

	it("20000 caracteres ainda chama o modelo", async () => {
		const callModel = vi.fn(async (_request: unknown) => ({
			content: [{ type: "text", text: "ok" }],
			usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
		}));
		const d = turnDeps({ message: "a".repeat(20_000), callModel });
		const result = await handleIaMesaTurn(d.turn, d);
		expect(result.status).toBe(200);
		expect(callModel).toHaveBeenCalledTimes(1);
		const request = callModel.mock.calls[0]?.[0] as unknown as {
			model: string;
		};
		expect(request.model).toBe(IA_MESA_MODEL_HAIKU);
	});

	it("normaliza o lote e tira campo fora da lista", () => {
		const result = normalizeResponse({
			ok: true,
			reply: "revise",
			proposal: {
				kind: "sheet_batch",
				characterId: "dante-1",
				characterName: "Dante",
				changes: [
					{ field: "strength", value: "18" },
					{ field: "notes", value: "segredo" },
				],
				diff: [
					{
						section: "Atributos",
						field: "strength",
						label: "FOR",
						before: "16",
						after: "18",
					},
				],
				rejections: [],
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok || result.proposal?.kind !== "sheet_batch") {
			throw new Error("lote não preservado");
		}
		expect(result.proposal.changes.map((change) => change.field)).toEqual([
			"strength",
		]);
		expect(result.proposal.rejections).toEqual([
			expect.objectContaining({
				field: "notes",
				reason: "Campo não editável.",
			}),
		]);
	});
});
