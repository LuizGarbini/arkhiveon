import { describe, expect, it } from "vitest";
import { SYSTEM_CONFIG } from "@/lib/systems";
import {
	buildCharacterFormDefaults,
	CHARACTER_NAME_REQUIRED_MESSAGE,
	type CharacterFormValues,
	sanitizeCharacterFormValues,
} from "./fields";

describe("Character Sheet Form & Domain Contract", () => {
	describe("buildCharacterFormDefaults", () => {
		it("builds defaults with placeholder NaN values when forCreation is true", () => {
			const defaults = buildCharacterFormDefaults(
				{ system: "dnd5e" },
				{ forCreation: true },
			);

			expect(defaults.system).toBe("dnd5e");
			expect(defaults.characterName).toBe("");
			expect(Number.isNaN(defaults.strength)).toBe(true);
			expect(Number.isNaN(defaults.health)).toBe(true);
			expect(Number.isNaN(defaults.level)).toBe(true);
			expect(defaults.sheetLayout.template).toBe("dnd5e");
			expect(defaults.sheetLayout.modules.length).toBeGreaterThan(0);
		});

		it("builds defaults with concrete standard values when not in creation placeholder mode", () => {
			const defaults = buildCharacterFormDefaults({ system: "dnd5e" });

			expect(defaults.system).toBe("dnd5e");
			expect(defaults.characterName).toBe("");
			expect(defaults.strength).toBe(10);
			expect(defaults.health).toBe(10);
			expect(defaults.healthMax).toBe(10);
			expect(defaults.level).toBe(1);
		});

		it("populates existing character data when editing", () => {
			const existing = {
				id: "char-123",
				system: "dnd5e" as const,
				characterName: "Galanodel",
				class: "Mago",
				level: 5,
				health: 28,
				healthMax: 28,
				customTemplateId: "template-uuid-456",
			};

			const defaults = buildCharacterFormDefaults(existing);
			expect(defaults.characterName).toBe("Galanodel");
			expect(defaults.class).toBe("Mago");
			expect(defaults.level).toBe(5);
			expect(defaults.health).toBe(28);
		});
	});

	describe("sanitizeCharacterFormValues", () => {
		it("converts NaN and empty numbers to zero when emptyToZero is true", () => {
			const raw: Partial<CharacterFormValues> = {
				characterName: "  Kaelen  ",
				health: Number.NaN,
				tempHealth: undefined,
				armorClass: 15,
			};

			const sanitized = sanitizeCharacterFormValues(
				raw as CharacterFormValues,
				{ emptyToZero: true },
			);

			expect(sanitized.characterName).toBe("Kaelen");
			expect(sanitized.health).toBe(0);
			expect(sanitized.tempHealth).toBe(0);
			expect(sanitized.armorClass).toBe(15);
		});
	});

	describe("Custom Template Persistence Contract", () => {
		it("ensures customTemplateId is correctly preserved alongside sheetLayout without mutating template type", () => {
			const selectedLayoutTemplateId = "custom-uuid-999";
			const baseSystem = "dnd5e" as const;

			const characterCreationPayload = {
				characterName: "Hero",
				system: baseSystem,
				sheetLayout: {
					version: 1 as const,
					template: baseSystem,
					modules: [],
				},
				customTemplateId: selectedLayoutTemplateId,
			};

			expect(characterCreationPayload.customTemplateId).toBe("custom-uuid-999");
			expect(characterCreationPayload.sheetLayout.template).toBe("dnd5e");
			expect(typeof characterCreationPayload.sheetLayout.template).toBe(
				"string",
			);
		});
	});

	describe("Name Validation Rule", () => {
		it("rejects empty or whitespace-only character names", () => {
			const validateName = (name?: string) => {
				if (!name || !name.trim()) {
					return CHARACTER_NAME_REQUIRED_MESSAGE;
				}
				return true;
			};

			expect(validateName("")).toBe(CHARACTER_NAME_REQUIRED_MESSAGE);
			expect(validateName("   ")).toBe(CHARACTER_NAME_REQUIRED_MESSAGE);
			expect(validateName(undefined)).toBe(CHARACTER_NAME_REQUIRED_MESSAGE);
			expect(validateName("Thorin")).toBe(true);
		});
	});

	describe("Magic Fields Visibility Across Systems", () => {
		const isMagicVisible = (systemKey: keyof typeof SYSTEM_CONFIG) => {
			const config = SYSTEM_CONFIG[systemKey];
			if (!config) return false;
			return Boolean(
				config.showSpells ||
					config.customFields?.some((field) => field.section === "magic"),
			);
		};

		it("shows magic for D&D 5e (showSpells: true)", () => {
			expect(isMagicVisible("dnd5e")).toBe(true);
			expect(isMagicVisible("dnd2024")).toBe(true);
		});

		it("shows magic for Vampire (showSpells: false with Disciplines custom field)", () => {
			expect(SYSTEM_CONFIG.vampire.showSpells).toBe(false);
			expect(isMagicVisible("vampire")).toBe(true);
		});

		it("shows magic for Ordem Paranormal (showSpells: false with Powers/Rituals custom field)", () => {
			expect(SYSTEM_CONFIG.ordem.showSpells).toBe(false);
			expect(isMagicVisible("ordem")).toBe(true);
		});
	});
});
