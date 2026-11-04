/**
 * Edição em lote da ficha. Uma tool call, schema fechado.
 * O servidor valida tipo, faixa e permissão e devolve o diff.
 * Nada aqui grava: `commitSheetBatch` só escreve se estiver tudo válido
 * e a chamada for explícita (o Aplicar do cliente).
 */

import {
	CHARACTER_NUMERIC_FIELD_KEYS,
	CHARACTER_NUMERIC_FIELDS,
	type CharacterNumericField,
	type CharacterRow,
	isEntityId,
	PATCH_DAMAGE_TYPES,
	rowItemIds,
	rowName,
} from "./ia-mesa-character.ts";

export const SHEET_BATCH_TOOL = "propose_sheet_batch" as const;

export const SHEET_BATCH_MAX_CHANGES = 40;

export const SHEET_SECTIONS = [
	"Atributos",
	"Combate",
	"Progresso",
	"Perícias",
	"Resistências",
	"Itens",
	"Ficha",
] as const;

export type SheetSection = (typeof SHEET_SECTIONS)[number];

/** Mesma ordem e os mesmos nomes da ficha (`DND5E_SKILLS`). */
export const SHEET_SKILLS = [
	{ id: "acrobatics", label: "Acrobacia" },
	{ id: "animalHandling", label: "Adestrar Animais" },
	{ id: "arcana", label: "Arcanismo" },
	{ id: "athletics", label: "Atletismo" },
	{ id: "performance", label: "Atuação" },
	{ id: "deception", label: "Enganação" },
	{ id: "history", label: "História" },
	{ id: "intimidation", label: "Intimidação" },
	{ id: "insight", label: "Intuição" },
	{ id: "investigation", label: "Investigação" },
	{ id: "medicine", label: "Medicina" },
	{ id: "nature", label: "Natureza" },
	{ id: "perception", label: "Percepção" },
	{ id: "persuasion", label: "Persuasão" },
	{ id: "sleightOfHand", label: "Prestidigitação" },
	{ id: "religion", label: "Religião" },
	{ id: "stealth", label: "Furtividade" },
	{ id: "survival", label: "Sobrevivência" },
] as const;

/** Mesmas chaves de `SAVING_THROWS_LIST` na ficha. */
export const SHEET_SAVES = [
	{ id: "strength", label: "Força" },
	{ id: "dexterity", label: "Destreza" },
	{ id: "constitution", label: "Constituição" },
	{ id: "intelligence", label: "Inteligência" },
	{ id: "wisdom", label: "Sabedoria" },
	{ id: "charisma", label: "Carisma" },
] as const;

const ITEM_FIELDS = [
	{ field: "item.add", label: "Novo item" },
	{ field: "item.remove", label: "Remover item" },
	{ field: "item.name", label: "Nome do item" },
	{ field: "item.quantity", label: "Quantidade" },
	{ field: "item.location", label: "Lugar do item" },
	{ field: "item.category", label: "Categoria do item" },
	{ field: "item.description", label: "Descrição do item" },
	{ field: "item.weapon", label: "Arma" },
] as const;

const NUMERIC_SECTION: Record<CharacterNumericField, SheetSection> = {
	strength: "Atributos",
	dexterity: "Atributos",
	constitution: "Atributos",
	intelligence: "Atributos",
	wisdom: "Atributos",
	charisma: "Atributos",
	level: "Progresso",
	xp: "Progresso",
	health: "Combate",
	healthMax: "Combate",
	tempHealth: "Combate",
	armorClass: "Combate",
	initiative: "Combate",
	speed: "Combate",
	proficiencyBonus: "Combate",
};

type SkillLevel = "none" | "proficient" | "expertise";

type FieldKind =
	| "number"
	| "skill"
	| "save"
	| "item-add"
	| "item-remove"
	| "item-name"
	| "item-quantity"
	| "item-location"
	| "item-category"
	| "item-description"
	| "item-weapon";

interface FieldSpec {
	field: string;
	section: SheetSection;
	label: string;
	kind: FieldKind;
	min?: number;
	max?: number;
	skillId?: string;
	saveId?: string;
}

const ITEM_LOCATIONS = ["equipped", "backpack", "mount_stash"] as const;
const ITEM_CATEGORIES = [
	"weapon",
	"armor",
	"potion",
	"gear",
	"treasure",
	"custom",
] as const;
const WEAPON_ABILITIES = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
] as const;

type ItemLocation = (typeof ITEM_LOCATIONS)[number];
type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const LOCATION_LABELS: Record<ItemLocation, string> = {
	equipped: "No corpo",
	backpack: "Mochila",
	mount_stash: "Montaria",
};

const DICE_RE = /^([1-9]\d?)d(4|6|8|10|12|20|100)$/i;

const SKILL_ALIASES: Record<string, SkillLevel> = {
	none: "none",
	nenhuma: "none",
	nenhum: "none",
	"sem proficiência": "none",
	"sem proficiencia": "none",
	proficient: "proficient",
	proficiente: "proficient",
	expertise: "expertise",
	especialista: "expertise",
	"especialização": "expertise",
	especializacao: "expertise",
};

const SKILL_DISPLAY: Record<SkillLevel, string> = {
	none: "Sem proficiência",
	proficient: "Proficiente",
	expertise: "Especialista",
};

function sheetFields(): FieldSpec[] {
	const numeric = CHARACTER_NUMERIC_FIELD_KEYS.map((field) => {
		const spec = CHARACTER_NUMERIC_FIELDS[field];
		return {
			field,
			section: NUMERIC_SECTION[field],
			label: spec.label,
			kind: "number" as const,
			min: spec.min,
			max: spec.max,
		};
	});
	const skills = SHEET_SKILLS.map((skill) => ({
		field: `skill.${skill.id}`,
		section: "Perícias" as const,
		label: skill.label,
		kind: "skill" as const,
		skillId: skill.id,
	}));
	const saves = SHEET_SAVES.map((save) => ({
		field: `save.${save.id}`,
		section: "Resistências" as const,
		label: save.label,
		kind: "save" as const,
		saveId: save.id,
	}));
	const items: FieldSpec[] = ITEM_FIELDS.map((item) => ({
		field: item.field,
		section: "Itens",
		label: item.label,
		kind: itemKind(item.field),
	}));
	return [...numeric, ...skills, ...saves, ...items];
}

function itemKind(field: string): FieldKind {
	switch (field) {
		case "item.add":
			return "item-add";
		case "item.remove":
			return "item-remove";
		case "item.name":
			return "item-name";
		case "item.quantity":
			return "item-quantity";
		case "item.location":
			return "item-location";
		case "item.category":
			return "item-category";
		case "item.description":
			return "item-description";
		default:
			return "item-weapon";
	}
}

const FIELDS = sheetFields();
const FIELD_BY_KEY = new Map(FIELDS.map((field) => [field.field, field]));

export const SHEET_BATCH_FIELD_ENUM: readonly string[] = FIELDS.map(
	(field) => field.field,
);

const FIELD_RANK = new Map(
	SHEET_BATCH_FIELD_ENUM.map((field, index) => [field, index]),
);

export interface SheetDiffLine {
	section: SheetSection;
	field: string;
	label: string;
	before: string;
	after: string;
}

export interface SheetRejection {
	field: string;
	label: string;
	section: SheetSection;
	reason: string;
}

export interface SheetBatchProposal {
	kind: "sheet_batch";
	characterId: string;
	characterName: string;
	changes: { field: string; value: string }[];
	diff: SheetDiffLine[];
	rejections: SheetRejection[];
}

export interface SheetSnapshot {
	id: string;
	name: string;
	data: Record<string, unknown>;
	itemIds: string[];
}

export interface SheetEditPermission {
	userId: string;
	campaignId: string;
	campaignOwnerId: string | null;
	membershipRole: string | null;
	character: {
		campaignId: string;
		userId: string | null;
		createdBy: string | null;
	} | null;
}

/** Dono da ficha, dono/mestre da campanha ou editor. Fora da campanha, não. */
export function canEditCampaignSheet(input: SheetEditPermission): boolean {
	const character = input.character;
	if (!character || character.campaignId !== input.campaignId) return false;
	if (input.campaignOwnerId === input.userId) return true;
	if (
		input.membershipRole === "owner" ||
		input.membershipRole === "editor"
	) {
		return true;
	}
	return (
		character.userId === input.userId || character.createdBy === input.userId
	);
}

export function snapshotFromCharacterRow(row: CharacterRow): SheetSnapshot {
	const data =
		row.data && typeof row.data === "object" && !Array.isArray(row.data)
			? (row.data as Record<string, unknown>)
			: {};
	return {
		id: row.id,
		name: rowName(row),
		data,
		itemIds: rowItemIds(row),
	};
}

export function sheetBatchCharacterId(input: unknown): string | null {
	if (!input || typeof input !== "object" || Array.isArray(input)) return null;
	const id = (input as { characterId?: unknown }).characterId;
	return isEntityId(id) ? id : null;
}

export function sheetBatchInputSchema(): Record<string, unknown> {
	return {
		type: "object",
		additionalProperties: false,
		properties: {
			characterId: {
				type: "string",
				description: "id da ficha nesta campanha",
			},
			changes: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						field: {
							type: "string",
							enum: [...SHEET_BATCH_FIELD_ENUM],
						},
						value: { type: "string" },
					},
					required: ["field", "value"],
				},
			},
		},
		required: ["characterId", "changes"],
	};
}

export function sheetBatchAnthropicTool(): {
	name: typeof SHEET_BATCH_TOOL;
	description: string;
	strict: true;
	input_schema: Record<string, unknown>;
} {
	return {
		name: SHEET_BATCH_TOOL,
		description:
			"Propõe um lote de alterações numa ficha existente. Não salva nada: o usuário vê o diff e aplica. Chame uma única vez com todas as mudanças. changes é uma lista de {field, value}. field só pode ser um valor do enum. value é texto: número inteiro para atributos, PV, CA e deslocamento; none, proficient ou expertise para skill.*; true ou false para save.*; item.add = nome|quantidade|lugar|categoria; item.remove = id do item; item.quantity = id|quantidade; item.name = id|nome; item.location = id|lugar; item.category = id|categoria; item.description = id|texto; item.weapon = id|1d8|slashing|strength|1.",
		strict: true,
		input_schema: sheetBatchInputSchema(),
	};
}

type Op =
	| { type: "number"; field: string; value: number }
	| { type: "skill"; id: string; value: SkillLevel }
	| { type: "save"; id: string; value: boolean }
	| {
			type: "item-add";
			name: string;
			quantity: number;
			location: ItemLocation;
			category: ItemCategory;
			description?: string;
	  }
	| { type: "item-quantity"; itemId: string; quantity: number }
	| { type: "item-name"; itemId: string; name: string }
	| { type: "item-location"; itemId: string; location: ItemLocation }
	| { type: "item-category"; itemId: string; category: ItemCategory }
	| { type: "item-description"; itemId: string; description: string }
	| {
			type: "item-weapon";
			itemId: string;
			weapon: {
				damageDice: string;
				damageType: string;
				ability: string;
				magicBonus?: number;
			};
	  }
	| { type: "item-remove"; itemId: string };

type Interpreted =
	| { kind: "reject"; rejection: SheetRejection }
	| { kind: "noop" }
	| { kind: "ok"; change: { field: string; value: string }; diff: SheetDiffLine; op: Op };

function isSection(value: unknown): value is SheetSection {
	return (
		typeof value === "string" &&
		(SHEET_SECTIONS as readonly string[]).includes(value)
	);
}

function asText(value: unknown): string | null {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	return null;
}

function cleanPiece(value: string, max: number): string {
	const stripped = Array.from(value)
		.filter((ch) => {
			const code = ch.charCodeAt(0);
			return code >= 32 || code === 9 || code === 10;
		})
		.join("")
		.trim();
	return stripped.length > max ? stripped.slice(0, max) : stripped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function rejection(
	spec: { field: string; label: string; section: SheetSection },
	reason: string,
): Interpreted {
	return {
		kind: "reject",
		rejection: {
			field: spec.field,
			label: spec.label,
			section: spec.section,
			reason,
		},
	};
}

function currentNumber(data: Record<string, unknown>, field: string): number | null {
	const value = data[field];
	if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
	if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
		return Number(value.trim());
	}
	return null;
}

function skillLevelOf(data: Record<string, unknown>, id: string): SkillLevel {
	const raw = isRecord(data.skillProficiencies)
		? data.skillProficiencies[id]
		: undefined;
	return typeof raw === "string" && raw in SKILL_DISPLAY
		? (raw as SkillLevel)
		: "none";
}

function saveOf(data: Record<string, unknown>, id: string): boolean {
	const raw = isRecord(data.savingThrowProficiencies)
		? data.savingThrowProficiencies[id]
		: undefined;
	return raw === true;
}

function findItem(
	data: Record<string, unknown>,
	id: string,
): Record<string, unknown> | null {
	if (!Array.isArray(data.inventoryList)) return null;
	for (const item of data.inventoryList) {
		if (!isRecord(item)) continue;
		if (item.id === id) return item;
	}
	return null;
}

function itemLabel(item: Record<string, unknown>): string {
	return typeof item.name === "string" && item.name.trim()
		? item.name.trim()
		: "Item";
}

function oneOf<T extends string>(
	list: readonly T[],
	value: string,
): T | null {
	return (list as readonly string[]).includes(value) ? (value as T) : null;
}

function splitId(value: string): { id: string; rest: string } | null {
	const idx = value.indexOf("|");
	if (idx <= 0) return null;
	const id = value.slice(0, idx).trim();
	if (!isEntityId(id)) return null;
	return { id, rest: value.slice(idx + 1).trim() };
}

function strictInt(
	text: string,
	min: number,
	max: number,
): { ok: true; value: number } | { ok: false; reason: "format" | "range" } {
	if (!/^-?\d+$/.test(text)) return { ok: false, reason: "format" };
	const value = Number(text);
	if (!Number.isSafeInteger(value)) return { ok: false, reason: "format" };
	if (value < min || value > max) return { ok: false, reason: "range" };
	return { ok: true, value };
}

function interpret(
	field: string,
	rawValue: unknown,
	data: Record<string, unknown>,
): Interpreted {
	const spec = FIELD_BY_KEY.get(field);
	const fallback = {
		field: field.slice(0, 80) || "campo",
		label: field.slice(0, 80) || "Campo",
		section: "Ficha" as const,
	};
	const text = asText(rawValue);
	if (text === null || text === "") {
		return rejection(spec ?? fallback, "Valor inválido.");
	}
	if (text.length > 600) {
		return rejection(spec ?? fallback, "Valor longo demais.");
	}
	if (!spec) return rejection(fallback, "Campo não editável.");

	if (spec.kind === "number") {
		const parsed = strictInt(text, spec.min ?? 0, spec.max ?? 0);
		if (!parsed.ok) {
			return rejection(
				spec,
				parsed.reason === "format"
					? `${spec.label} tem que ser um número inteiro.`
					: `${spec.label} tem que ficar entre ${spec.min} e ${spec.max}.`,
			);
		}
		const previous = currentNumber(data, spec.field);
		if (previous === parsed.value) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: String(parsed.value) },
			diff: {
				section: spec.section,
				field: spec.field,
				label: spec.label,
				before: previous === null ? "—" : String(previous),
				after: String(parsed.value),
			},
			op: { type: "number", field: spec.field, value: parsed.value },
		};
	}

	if (spec.kind === "skill" && spec.skillId) {
		const level = SKILL_ALIASES[text.toLowerCase()];
		if (!level) {
			return rejection(
				spec,
				`${spec.label} aceita sem proficiência, proficiente ou especialista.`,
			);
		}
		const previous = skillLevelOf(data, spec.skillId);
		if (previous === level) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: level },
			diff: {
				section: spec.section,
				field: spec.field,
				label: spec.label,
				before: SKILL_DISPLAY[previous],
				after: SKILL_DISPLAY[level],
			},
			op: { type: "skill", id: spec.skillId, value: level },
		};
	}

	if (spec.kind === "save" && spec.saveId) {
		const token = text.toLowerCase();
		const yes = token === "true" || token === "sim" || token === "1" || token === "proficiente";
		const no =
			token === "false" ||
			token === "não" ||
			token === "nao" ||
			token === "0" ||
			token === "none";
		if (!yes && !no) {
			return rejection(spec, `${spec.label} aceita sim ou não.`);
		}
		const value = yes;
		const previous = saveOf(data, spec.saveId);
		if (previous === value) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: value ? "true" : "false" },
			diff: {
				section: spec.section,
				field: spec.field,
				label: spec.label,
				before: previous ? "Proficiente" : "Sem proficiência",
				after: value ? "Proficiente" : "Sem proficiência",
			},
			op: { type: "save", id: spec.saveId, value },
		};
	}

	return interpretItem(spec, text, data);
}

function interpretItem(
	spec: FieldSpec,
	text: string,
	data: Record<string, unknown>,
): Interpreted {
	if (spec.kind === "item-add") {
		const parts = text.split("|");
		const name = cleanPiece(parts[0] ?? "", 80);
		if (!name) return rejection(spec, "Nome do item está vazio.");
		if ((parts[0] ?? "").trim().length > 80) {
			return rejection(spec, "Nome do item passa de 80 caracteres.");
		}
		const quantityText = parts[1];
		let qty = 1;
		if (quantityText !== undefined && quantityText.trim() !== "") {
			const parsed = strictInt(quantityText.trim(), 1, 9999);
			if (!parsed.ok) {
				return rejection(
					spec,
					parsed.reason === "format"
						? "Quantidade tem que ser um número inteiro."
						: "Quantidade tem que ficar entre 1 e 9999.",
				);
			}
			qty = parsed.value;
		}
		const locationText = parts[2];
		const location =
			locationText === undefined || locationText.trim() === ""
				? "backpack"
				: oneOf(ITEM_LOCATIONS, locationText.trim());
		if (!location) return rejection(spec, "Lugar do item inválido.");
		const categoryText = parts[3];
		const category =
			categoryText === undefined || categoryText.trim() === ""
				? "gear"
				: oneOf(ITEM_CATEGORIES, categoryText.trim());
		if (!category) return rejection(spec, "Categoria do item inválida.");
		const description = cleanPiece(parts.slice(4).join("|"), 600);
		const after = `${qty !== 1 ? `${name} ×${qty}` : name} · ${LOCATION_LABELS[location]}`;
		return {
			kind: "ok",
			change: {
				field: spec.field,
				value: `${name}|${qty}|${location}|${category}|${description}`,
			},
			diff: {
				section: "Itens",
				field: spec.field,
				label: name,
				before: "—",
				after,
			},
			op: {
				type: "item-add",
				name,
				quantity: qty,
				location,
				category,
				...(description ? { description } : {}),
			},
		};
	}

	if (spec.kind === "item-remove") {
		if (!isEntityId(text)) return rejection(spec, "Valor inválido.");
		const item = findItem(data, text);
		if (!item) return rejection(spec, "Item não encontrado nesta ficha.");
		return {
			kind: "ok",
			change: { field: spec.field, value: text },
			diff: {
				section: "Itens",
				field: spec.field,
				label: itemLabel(item),
				before: itemLabel(item),
				after: "—",
			},
			op: { type: "item-remove", itemId: text },
		};
	}

	const pair = splitId(text);
	if (!pair) return rejection(spec, "Valor inválido.");
	const item = findItem(data, pair.id);
	if (!item) return rejection(spec, "Item não encontrado nesta ficha.");
	const label = itemLabel(item);

	if (spec.kind === "item-quantity") {
		const parsed = strictInt(pair.rest, 0, 9999);
		if (!parsed.ok) {
			return rejection(
				spec,
				parsed.reason === "format"
					? "Quantidade tem que ser um número inteiro."
					: "Quantidade tem que ficar entre 0 e 9999.",
			);
		}
		const previous = currentNumber(item, "quantity") ?? 1;
		if (previous === parsed.value) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: `${pair.id}|${parsed.value}` },
			diff: {
				section: "Itens",
				field: spec.field,
				label,
				before: String(previous),
				after: String(parsed.value),
			},
			op: { type: "item-quantity", itemId: pair.id, quantity: parsed.value },
		};
	}

	if (spec.kind === "item-name") {
		const name = cleanPiece(pair.rest, 80);
		if (!name) return rejection(spec, "Nome do item está vazio.");
		if (pair.rest.length > 80) {
			return rejection(spec, "Nome do item passa de 80 caracteres.");
		}
		if (label === name) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: `${pair.id}|${name}` },
			diff: {
				section: "Itens",
				field: spec.field,
				label,
				before: label,
				after: name,
			},
			op: { type: "item-name", itemId: pair.id, name },
		};
	}

	if (spec.kind === "item-location") {
		const location = oneOf(ITEM_LOCATIONS, pair.rest);
		if (!location) return rejection(spec, "Lugar do item inválido.");
		const previous = oneOf(
			ITEM_LOCATIONS,
			typeof item.location === "string" ? item.location : "",
		);
		if (previous === location) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: `${pair.id}|${location}` },
			diff: {
				section: "Itens",
				field: spec.field,
				label,
				before: previous ? LOCATION_LABELS[previous] : "—",
				after: LOCATION_LABELS[location],
			},
			op: { type: "item-location", itemId: pair.id, location },
		};
	}

	if (spec.kind === "item-category") {
		const category = oneOf(ITEM_CATEGORIES, pair.rest);
		if (!category) return rejection(spec, "Categoria do item inválida.");
		const previous = typeof item.category === "string" ? item.category : "";
		if (previous === category) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: `${pair.id}|${category}` },
			diff: {
				section: "Itens",
				field: spec.field,
				label,
				before: previous || "—",
				after: category,
			},
			op: { type: "item-category", itemId: pair.id, category },
		};
	}

	if (spec.kind === "item-description") {
		const description = cleanPiece(pair.rest, 600);
		if (!description) return rejection(spec, "Descrição do item está vazia.");
		const previous =
			typeof item.description === "string" ? item.description : "";
		if (previous === description) return { kind: "noop" };
		return {
			kind: "ok",
			change: { field: spec.field, value: `${pair.id}|${description}` },
			diff: {
				section: "Itens",
				field: spec.field,
				label,
				before: previous ? clip(previous) : "—",
				after: clip(description),
			},
			op: { type: "item-description", itemId: pair.id, description },
		};
	}

	const bits = pair.rest.split("|").map((bit) => bit.trim());
	const damageDice = (bits[0] ?? "").toLowerCase();
	const damageType = bits[1] ?? "";
	const ability = bits[2] ?? "";
	if (!DICE_RE.test(damageDice)) return rejection(spec, "Dado de dano inválido.");
	if (!(PATCH_DAMAGE_TYPES as readonly string[]).includes(damageType)) {
		return rejection(spec, "Tipo de dano inválido.");
	}
	if (!(WEAPON_ABILITIES as readonly string[]).includes(ability)) {
		return rejection(spec, "Atributo da arma inválido.");
	}
	let magicBonus: number | undefined;
	if (bits[3] !== undefined && bits[3] !== "") {
		const magic = strictInt(bits[3], 0, 3);
		if (!magic.ok) {
			return rejection(
				spec,
				magic.reason === "format"
					? "Bônus mágico tem que ser um número inteiro."
					: "Bônus mágico tem que ficar entre 0 e 3.",
			);
		}
		if (magic.value > 0) magicBonus = magic.value;
	}
	const after = `${damageDice} ${damageType}${magicBonus ? ` +${magicBonus}` : ""}`;
	return {
		kind: "ok",
		change: {
			field: spec.field,
			value: `${pair.id}|${damageDice}|${damageType}|${ability}${magicBonus ? `|${magicBonus}` : ""}`,
		},
		diff: {
			section: "Itens",
			field: spec.field,
			label,
			before: weaponBefore(item),
			after,
		},
		op: {
			type: "item-weapon",
			itemId: pair.id,
			weapon: {
				damageDice,
				damageType,
				ability,
				...(magicBonus ? { magicBonus } : {}),
			},
		},
	};
}

function weaponBefore(item: Record<string, unknown>): string {
	if (!isRecord(item.weapon)) return "—";
	const dice = typeof item.weapon.damageDice === "string" ? item.weapon.damageDice : "";
	const type = typeof item.weapon.damageType === "string" ? item.weapon.damageType : "";
	if (!dice) return "—";
	const magic =
		typeof item.weapon.magicBonus === "number" && item.weapon.magicBonus > 0
			? ` +${item.weapon.magicBonus}`
			: "";
	return `${dice} ${type}${magic}`.trim();
}

function clip(text: string): string {
	return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function seenKey(field: string, value: string): string | null {
	if (field === "item.add") return null;
	if (field.startsWith("item.")) {
		const id = field === "item.remove" ? value : value.split("|")[0]?.trim();
		return `${field}:${id || value}`;
	}
	return field;
}

function collect(
	entries: unknown[],
	data: Record<string, unknown>,
): {
	changes: { field: string; value: string }[];
	diff: SheetDiffLine[];
	rejections: SheetRejection[];
	ops: Op[];
} {
	const changes: { field: string; value: string }[] = [];
	const diff: SheetDiffLine[] = [];
	const rejections: SheetRejection[] = [];
	const ops: Op[] = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		if (!isRecord(entry) || typeof entry.field !== "string") {
			rejections.push({
				field: "campo",
				label: "Campo",
				section: "Ficha",
				reason: "Alteração inválida.",
			});
			continue;
		}
		const text = asText(entry.value) ?? "";
		const key = seenKey(entry.field, text);
		if (key && seen.has(key)) {
			const spec = FIELD_BY_KEY.get(entry.field);
			rejections.push({
				field: entry.field,
				label: spec?.label ?? entry.field,
				section: spec?.section ?? "Ficha",
				reason: "Campo repetido.",
			});
			continue;
		}
		if (key) seen.add(key);
		const parsed = interpret(entry.field, entry.value, data);
		if (parsed.kind === "reject") rejections.push(parsed.rejection);
		else if (parsed.kind === "ok") {
			changes.push(parsed.change);
			diff.push(parsed.diff);
			ops.push(parsed.op);
		}
	}
	diff.sort(
		(a, b) => (FIELD_RANK.get(a.field) ?? 999) - (FIELD_RANK.get(b.field) ?? 999),
	);
	return { changes, diff, rejections: dedupeRejections(rejections), ops };
}

/**
 * Valida o lote contra a ficha. Campo inválido entra em `rejections`
 * e o resultado não deve ser gravado enquanto essa lista não estiver vazia.
 * Payload que não é um lote devolve null.
 */
export function validateSheetBatch(
	args: unknown,
	snapshot: SheetSnapshot,
): SheetBatchProposal | null {
	if (!isRecord(args)) return null;
	if (!isEntityId(args.characterId) || args.characterId !== snapshot.id) {
		return null;
	}
	if (!Array.isArray(args.changes) || args.changes.length === 0) return null;
	const overflow = args.changes.length > SHEET_BATCH_MAX_CHANGES;
	const collected = collect(
		args.changes.slice(0, SHEET_BATCH_MAX_CHANGES),
		snapshot.data,
	);
	if (overflow) {
		collected.rejections.push({
			field: "changes",
			label: "Proposta",
			section: "Ficha",
			reason: "A proposta passa de 40 campos.",
		});
	}
	if (
		collected.changes.length === 0 &&
		collected.diff.length === 0 &&
		collected.rejections.length === 0
	) {
		return null;
	}
	return {
		kind: "sheet_batch",
		characterId: snapshot.id,
		characterName: snapshot.name || "Personagem",
		changes: collected.changes,
		diff: collected.diff,
		rejections: collected.rejections,
	};
}

export function reviewSheetBatch(
	snapshot: SheetSnapshot,
	proposal: SheetBatchProposal,
): { diff: SheetDiffLine[]; rejections: SheetRejection[] } {
	if (snapshot.id !== proposal.characterId) {
		return {
			diff: [],
			rejections: [
				...proposal.rejections,
				{
					field: "characterId",
					label: "Ficha",
					section: "Ficha",
					reason: "Esta proposta é de outra ficha.",
				},
			],
		};
	}
	const again = validateSheetBatch(
		{ characterId: proposal.characterId, changes: proposal.changes },
		snapshot,
	);
	return {
		diff: again?.diff ?? [],
		rejections: dedupeRejections([
			...proposal.rejections,
			...(again?.rejections ?? []),
		]),
	};
}

/** Uma linha por campo. Servidor e cliente podem rejeitar o mesmo field com motivos diferentes. */
function dedupeRejections(list: SheetRejection[]): SheetRejection[] {
	const seen = new Set<string>();
	const out: SheetRejection[] = [];
	for (const item of list) {
		if (seen.has(item.field)) continue;
		seen.add(item.field);
		out.push(item);
	}
	return out;
}

function cloneItems(data: Record<string, unknown>): Record<string, unknown>[] {
	if (!Array.isArray(data.inventoryList)) return [];
	return data.inventoryList.flatMap((item) => (isRecord(item) ? [{ ...item }] : []));
}

function foldOps(
	data: Record<string, unknown>,
	ops: Op[],
	newId: () => string,
): { changes: Record<string, unknown>; before: Record<string, unknown> } {
	const changes: Record<string, unknown> = {};
	const before: Record<string, unknown> = {};
	let items: Record<string, unknown>[] | null = null;
	let skills: Record<string, string> | null = null;
	let saves: Record<string, boolean> | null = null;

	const ensureItems = () => {
		if (!items) {
			items = cloneItems(data);
			before.inventoryList = cloneItems(data);
		}
		return items;
	};

	for (const op of ops) {
		if (op.type === "number") {
			changes[op.field] = op.value;
			before[op.field] = currentNumber(data, op.field);
			continue;
		}
		if (op.type === "skill") {
			if (!skills) {
				const current = isRecord(data.skillProficiencies)
					? data.skillProficiencies
					: {};
				skills = {};
				for (const [key, value] of Object.entries(current)) {
					if (typeof value === "string") skills[key] = value;
				}
				before.skillProficiencies = { ...skills };
			}
			skills[op.id] = op.value;
			continue;
		}
		if (op.type === "save") {
			if (!saves) {
				const current = isRecord(data.savingThrowProficiencies)
					? data.savingThrowProficiencies
					: {};
				saves = {};
				for (const [key, value] of Object.entries(current)) {
					if (typeof value === "boolean") saves[key] = value;
				}
				before.savingThrowProficiencies = { ...saves };
			}
			saves[op.id] = op.value;
			continue;
		}
		const list = ensureItems();
		if (op.type === "item-add") {
			list.push({
				id: newId(),
				name: op.name,
				quantity: op.quantity,
				weightLbs: 0,
				location: op.location,
				category: op.category,
				...(op.description ? { description: op.description } : {}),
			});
			continue;
		}
		if (op.type === "item-remove") {
			const next = list.filter((item) => item.id !== op.itemId);
			list.length = 0;
			list.push(...next);
			continue;
		}
		const index = list.findIndex((item) => item.id === op.itemId);
		if (index < 0) continue;
		const current = list[index];
		if (!current) continue;
		if (op.type === "item-quantity") {
			list[index] = { ...current, quantity: op.quantity };
		} else if (op.type === "item-name") {
			list[index] = { ...current, name: op.name };
		} else if (op.type === "item-location") {
			list[index] = { ...current, location: op.location };
		} else if (op.type === "item-category") {
			list[index] = { ...current, category: op.category };
		} else if (op.type === "item-description") {
			list[index] = { ...current, description: op.description };
		} else if (op.type === "item-weapon") {
			const previous = isRecord(current.weapon) ? current.weapon : {};
			list[index] = {
				...current,
				weapon: { ...previous, ...op.weapon },
			};
		}
	}
	if (skills) changes.skillProficiencies = skills;
	if (saves) changes.savingThrowProficiencies = saves;
	if (items) changes.inventoryList = items;
	return { changes, before };
}

function defaultId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `item-${Date.now()}`;
}

/**
 * Grava o lote inteiro numa única chamada de `write`, ou não grava nada.
 * Recusa permissão, campo rejeitado, ficha trocada e proposta vazia.
 */
export function commitSheetBatch(input: {
	allowed: boolean;
	proposal: SheetBatchProposal;
	data: Record<string, unknown>;
	characterId: string;
	write: (id: string, changes: Record<string, unknown>) => void;
	newId?: () => string;
}):
	| { ok: true; before: Record<string, unknown> }
	| { ok: false; error: string } {
	if (!input.allowed) {
		return {
			ok: false,
			error: "Você não pode editar esta ficha. Nada foi alterado.",
		};
	}
	if (input.proposal.characterId !== input.characterId) {
		return {
			ok: false,
			error: "Esta proposta é de outra ficha. Nada foi alterado.",
		};
	}
	if (input.proposal.rejections.length > 0) {
		return {
			ok: false,
			error: "Há campos rejeitados. Nada foi alterado.",
		};
	}
	const snapshot: SheetSnapshot = {
		id: input.characterId,
		name: input.proposal.characterName,
		data: input.data,
		itemIds: itemIdsOf(input.data),
	};
	const again = validateSheetBatch(
		{ characterId: input.characterId, changes: input.proposal.changes },
		snapshot,
	);
	if (!again || again.rejections.length > 0 || again.changes.length === 0) {
		return {
			ok: false,
			error: "A proposta não é mais válida. Nada foi alterado.",
		};
	}
	const collected = collect(again.changes, input.data);
	if (collected.rejections.length > 0 || collected.ops.length === 0) {
		return {
			ok: false,
			error: "A proposta não é mais válida. Nada foi alterado.",
		};
	}
	const folded = foldOps(input.data, collected.ops, input.newId ?? defaultId);
	if (Object.keys(folded.changes).length === 0) {
		return { ok: false, error: "Nada muda em relação à ficha atual." };
	}
	input.write(input.characterId, folded.changes);
	return { ok: true, before: folded.before };
}

function itemIdsOf(data: Record<string, unknown>): string[] {
	if (!Array.isArray(data.inventoryList)) return [];
	return data.inventoryList.flatMap((item) => {
		if (!isRecord(item) || !isEntityId(item.id)) return [];
		return [item.id];
	});
}

export function sanitizeSheetBatchProposal(
	raw: unknown,
): SheetBatchProposal | null {
	if (!isRecord(raw) || raw.kind !== "sheet_batch") return null;
	if (!isEntityId(raw.characterId)) return null;
	const characterName =
		typeof raw.characterName === "string" && raw.characterName.trim()
			? raw.characterName.trim().slice(0, 80)
			: "Personagem";
	const known = new Set<string>(SHEET_BATCH_FIELD_ENUM);
	const changes: { field: string; value: string }[] = [];
	const rejections: SheetRejection[] = [];
	if (Array.isArray(raw.rejections)) {
		for (const item of raw.rejections) {
			if (!isRecord(item)) continue;
			if (typeof item.field !== "string" || typeof item.reason !== "string") {
				continue;
			}
			rejections.push({
				field: item.field.slice(0, 80),
				label:
					typeof item.label === "string"
						? item.label.slice(0, 80)
						: item.field.slice(0, 80),
				section: isSection(item.section) ? item.section : "Ficha",
				reason: item.reason.slice(0, 200),
			});
		}
	}
	if (Array.isArray(raw.changes)) {
		for (const item of raw.changes) {
			if (!isRecord(item) || typeof item.field !== "string") continue;
			const value = asText(item.value);
			if (!value) continue;
			if (!known.has(item.field)) {
				rejections.push({
					field: item.field.slice(0, 80),
					label: item.field.slice(0, 80),
					section: "Ficha",
					reason: "Campo não editável.",
				});
				continue;
			}
			changes.push({ field: item.field, value: value.slice(0, 600) });
		}
	}
	const diff: SheetDiffLine[] = [];
	if (Array.isArray(raw.diff)) {
		for (const item of raw.diff) {
			if (!isRecord(item)) continue;
			if (typeof item.field !== "string" || !known.has(item.field)) continue;
			if (
				typeof item.label !== "string" ||
				typeof item.before !== "string" ||
				typeof item.after !== "string"
			) {
				continue;
			}
			diff.push({
				section: isSection(item.section) ? item.section : "Ficha",
				field: item.field,
				label: item.label.slice(0, 80),
				before: item.before.slice(0, 200),
				after: item.after.slice(0, 200),
			});
		}
	}
	if (changes.length === 0 && rejections.length === 0) return null;
	return {
		kind: "sheet_batch",
		characterId: raw.characterId,
		characterName,
		changes,
		diff,
		rejections,
	};
}
