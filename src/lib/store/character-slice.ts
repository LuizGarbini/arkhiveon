import type { StateCreator } from "zustand";
import {
	createRemoteActivity,
	createRemoteEntity,
	deleteRemoteEntity,
	updateRemoteEntity,
} from "../remote-store";
import {
	createDefaultSheetLayout,
	normalizeSheetLayout,
} from "../sheet-modules";
import {
	entityNameOf,
	generateEntry,
	pushLog,
	remoteErrorMessage,
} from "./helpers";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";
import type { Character, RPGState } from "./types";

export const characterDefaults: Omit<Character, "id" | "createdAt"> = {
	system: "dnd5e",
	characterName: "",
	playerName: "",
	race: "",
	class: "",
	subclass: "",
	background: "",
	alignment: "",
	level: 1,
	xp: 0,
	age: "",
	height: "",
	weight: "",
	eyes: "",
	hair: "",
	skin: "",
	appearance: "",
	strength: 10,
	dexterity: 10,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10,
	power: 10,
	size: 10,
	education: 10,
	sanity: 0,
	sanityMax: 0,
	health: 10,
	healthMax: 10,
	tempHealth: 0,
	armorClass: 10,
	initiative: 0,
	speed: 9,
	proficiencyBonus: 2,
	hitDice: "",
	deathSaves: { successes: 0, failures: 0 },
	savingThrows: "",
	skills: "",
	languages: "",
	proficiencies: "",
	spellcastingClass: "",
	spellAbility: "",
	spellSaveDc: 0,
	spellAttackBonus: 0,
	spells: "",
	spellSlots: "",
	equipment: "",
	currency: "",
	personalityTraits: "",
	ideals: "",
	bonds: "",
	flaws: "",
	notes: "",
	imageUrl: "",
	sheetLayout: createDefaultSheetLayout("dnd5e"),
	familyRelations: [],
	entityLinks: [],
	systemAttributes: {},
	systemFields: {},
	spellsList: [],
};

export interface CharacterSlice {
	characters: Character[];
	addCharacter: (
		character: Partial<Omit<Character, "id" | "createdAt">>,
	) => Character;
	updateCharacter: (id: string, character: Partial<Character>) => void;
	removeCharacter: (id: string) => void;
	transferCharacterToCampaign: (
		id: string,
		targetCampaignId: string,
	) => Promise<Character | null>;
	customTemplates: import("./types").CustomTemplate[];
	addTemplate: (template: import("./types").CustomTemplate) => void;
	updateTemplate: (
		id: string,
		template: Partial<import("./types").CustomTemplate>,
	) => void;
	removeTemplate: (id: string) => void;
}

export const createCharacterSlice: StateCreator<
	RPGState,
	[],
	[],
	CharacterSlice
> = (set, get) => ({
	characters: [],
	customTemplates: [],
	addTemplate: (template) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar template." });
			return;
		}
		const log = {
			action: "create" as const,
			entityKind: "customTemplate" as const,
			entityId: template.id,
			entityName: entityNameOf(template),
		};
		const originalTemplates = get().customTemplates;
		set((state) => ({
			customTemplates: [...state.customTemplates, template],
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("customTemplate", template, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				customTemplates: originalTemplates,
				activityLog: state.activityLog.filter(
					(l) => l.entityId !== template.id,
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	updateTemplate: (id, template) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar template." });
			return;
		}
		const originalTemplates = get().customTemplates;
		const existing = originalTemplates.find((t) => t.id === id);
		if (!existing) return;
		const updated = { ...existing, ...template };
		const log = {
			action: "update" as const,
			entityKind: "customTemplate" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			customTemplates: state.customTemplates.map((t) =>
				t.id === id ? updated : t,
			),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("customTemplate", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				customTemplates: originalTemplates,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeTemplate: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover template." });
			return;
		}
		const originalTemplates = get().customTemplates;
		const existing = originalTemplates.find((t) => t.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "customTemplate" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		set((state) => ({
			customTemplates: state.customTemplates.filter((t) => t.id !== id),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("customTemplate", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				customTemplates: originalTemplates,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	addCharacter: (character) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para criar personagem." });
			return {} as Character;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Character;
		}
		const created = generateEntry(characterDefaults, {
			...character,
			sheetLayout:
				character.sheetLayout ??
				createDefaultSheetLayout(character.system ?? characterDefaults.system),
		}) as Character;
		const log = {
			action: "create" as const,
			entityKind: "character" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalCharacters = get().characters;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			characters: [...state.characters, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("character", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				characters: originalCharacters,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateCharacter: (id, character) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar personagem." });
			return;
		}
		const originalCharacters = get().characters;
		const existing = originalCharacters.find((c) => c.id === id);
		if (!existing) return;
		const updated = { ...existing, ...character, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "character" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			characters: state.characters.map((c) => (c.id === id ? updated : c)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("character", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				characters: originalCharacters,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeCharacter: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover personagem." });
			return;
		}
		const originalCharacters = get().characters;
		const existing = originalCharacters.find((c) => c.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "character" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			characters: state.characters.filter((c) => c.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("character", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				characters: originalCharacters,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	transferCharacterToCampaign: async (id, targetCampaignId) => {
		const source = get().characters.find((character) => character.id === id);
		if (!source) return null;

		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return null;
		}

		const now = Date.now();
		const transferred: Character = {
			...source,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now,
			sheetLayout: normalizeSheetLayout(source),
			familyRelations: [],
			entityLinks: [],
		};
		const log = {
			action: "create" as const,
			entityKind: "character" as const,
			entityId: transferred.id,
			entityName: entityNameOf(transferred),
		};
		const activeCampaignId = get().activeCampaignId;
		const isActiveCampaign = activeCampaignId === targetCampaignId;
		const originalCharacters = get().characters;
		const originalCount = get().globalRecordsCount;

		if (isActiveCampaign) {
			set((state) => ({
				characters: [...state.characters, transferred],
				activityLog: pushLog(state.activityLog, log),
				globalRecordsCount: state.globalRecordsCount + 1,
				syncError: null,
			}));
		} else {
			set({ syncError: null });
		}

		try {
			await Promise.all([
				createRemoteEntity("character", transferred, targetCampaignId),
				createRemoteActivity(log, targetCampaignId),
			]);
			if (!isActiveCampaign) {
				set((state) => ({
					globalRecordsCount: state.globalRecordsCount + 1,
				}));
			}
			return transferred;
		} catch (error) {
			if (isActiveCampaign) {
				set((state) => ({
					characters: originalCharacters,
					globalRecordsCount: originalCount,
					activityLog: state.activityLog.filter(
						(l) => l.entityId !== transferred.id,
					),
					syncError: remoteErrorMessage(error),
				}));
			} else {
				set({ syncError: remoteErrorMessage(error) });
			}
			throw error;
		}
	},
});
