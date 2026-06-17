import type {
	Character,
	CustomTemplate,
	RpgSystem,
	SheetLayoutConfig,
	SheetModuleConfig,
	SheetModuleKind,
} from "./store/types";

export const SHEET_MODULE_LABELS: Record<SheetModuleKind, string> = {
	identity: "Identidade",
	abilities: "Atributos",
	combat: "Combate",
	sanity: "Sanidade",
	magic: "Magia",
	inventory: "Inventário",
	personality: "Personalidade",
	notes: "Notas",
	customText: "Texto livre",
	customStats: "Bloco de stats",
	custom_template_fields: "Ficha",
};

const SYSTEMS_WITH_SANITY = new Set<RpgSystem>([
	"coc",
	"ordem",
	"meltedlands",
	"ashesoftomorrow",
	"demonlord",
]);

const SYSTEMS_WITHOUT_MAGIC = new Set<RpgSystem>([
	"vampire",
	"coc",
	"ordem",
	"contosloop",
	"mausritter",
	"cyberpunkred",
	"fallout2d20",
	"wilderfeast",
	"gothrpg",
	"assassinscreed",
	"corespringnpc",
	"duna",
	"stalker",
	"fissura",
	"sacramento",
	"somdasseis",
]);

function moduleConfig(
	kind: SheetModuleKind,
	order: number,
	column: "main" | "side" = "main",
	overrides: Partial<SheetModuleConfig> = {},
): SheetModuleConfig {
	return {
		id: `${kind}-${order}`,
		kind,
		title: SHEET_MODULE_LABELS[kind],
		enabled: true,
		order,
		column,
		...overrides,
	};
}

export function createDefaultSheetLayout(
	system: RpgSystem = "dnd5e",
	options?: {
		showSpells?: boolean;
		showSanity?: boolean;
	},
): SheetLayoutConfig {
	if (system.startsWith("custom_")) {
		return {
			version: 1,
			template: system,
			modules: [
				moduleConfig("custom_template_fields" as any, 10, "main", {
					title: "Ficha do Personagem",
				}),
			],
		};
	}

	const showSanity = options?.showSanity ?? SYSTEMS_WITH_SANITY.has(system);
	const showSpells = options?.showSpells ?? !SYSTEMS_WITHOUT_MAGIC.has(system);
	const modules: SheetModuleConfig[] = [
		moduleConfig("identity", 10, "side", {
			fields: ["characterName", "race", "class", "background"],
		}),
		moduleConfig("abilities", 20, "main", {
			fields: [
				"strength",
				"dexterity",
				"constitution",
				"intelligence",
				"wisdom",
				"charisma",
			],
		}),
		moduleConfig("combat", 30, "main", {
			fields: ["health", "healthMax", "armorClass", "initiative", "speed"],
		}),
		moduleConfig("inventory", 40, "main", {
			fields: ["equipment", "currency"],
		}),
		moduleConfig("personality", 50, "side", {
			fields: ["personalityTraits", "ideals", "bonds", "flaws"],
		}),
		moduleConfig("notes", 60, "main", {
			fields: ["notes"],
		}),
	];

	if (showSanity) {
		modules.splice(
			3,
			0,
			moduleConfig("sanity", 35, "side", {
				fields: ["sanity", "sanityMax", "power", "size", "education"],
			}),
		);
	}

	if (showSpells) {
		modules.splice(
			4,
			0,
			moduleConfig("magic", 38, "main", {
				fields: ["spellcastingClass", "spellSaveDc", "spells", "spellSlots"],
			}),
		);
	}

	return {
		version: 1,
		template: system,
		modules: modules.sort((a, b) => a.order - b.order),
	};
}

export function normalizeSheetLayout(character: Character): SheetLayoutConfig {
	const fallback = createDefaultSheetLayout(character.system);
	const layout = character.sheetLayout;
	if (!layout || layout.version !== 1 || !Array.isArray(layout.modules)) {
		return fallback;
	}

	const knownFallbacks = new Map(
		fallback.modules.map((module) => [module.kind, module]),
	);
	const normalizedModules = layout.modules
		.filter((module): module is SheetModuleConfig => {
			return (
				typeof module?.id === "string" &&
				typeof module.title === "string" &&
				typeof module.order === "number"
			);
		})
		.map((module) => ({
			...(knownFallbacks.get(module.kind) ?? {}),
			...module,
			enabled: module.enabled !== false,
		}));

	for (const fallbackModule of fallback.modules) {
		if (
			!normalizedModules.some((module) => module.kind === fallbackModule.kind)
		) {
			normalizedModules.push(fallbackModule);
		}
	}

	return {
		version: 1,
		template: layout.template ?? character.system,
		modules: normalizedModules.sort((a, b) => a.order - b.order),
	};
}

export function enabledSheetModules(character: Character) {
	return normalizeSheetLayout(character).modules.filter(
		(module) => module.enabled,
	);
}

export function createCustomSheetModule(
	kind: Extract<SheetModuleKind, "customText" | "customStats">,
	order: number,
): SheetModuleConfig {
	return moduleConfig(kind, order, kind === "customStats" ? "side" : "main", {
		id: `${kind}-${crypto.randomUUID()}`,
		title: kind === "customText" ? "Novo texto livre" : "Novo bloco de stats",
		content: "",
		fields: [],
	});
}

function columnOf(module: SheetModuleConfig): "main" | "side" {
	return module.column === "side" ? "side" : "main";
}
export function normalizeModuleOrders(
	modules: SheetModuleConfig[],
): SheetModuleConfig[] {
	const main = modules.filter((module) => columnOf(module) === "main");
	const side = modules.filter((module) => columnOf(module) === "side");

	return [
		...main.map((module, index) => ({
			...module,
			column: "main" as const,
			order: (index + 1) * 10,
		})),
		...side.map((module, index) => ({
			...module,
			column: "side" as const,
			order: (index + 1) * 10 + 500,
		})),
	];
}

export function applyModuleDrag(
	modules: SheetModuleConfig[],
	activeId: string,
	overId: string,
): SheetModuleConfig[] {
	const active = modules.find((module) => module.id === activeId);
	if (!active) return modules;

	const isColumnTarget = overId === "column-main" || overId === "column-side";
	const targetColumn: "main" | "side" = isColumnTarget
		? overId === "column-side"
			? "side"
			: "main"
		: columnOf(modules.find((module) => module.id === overId) ?? active);

	const updated = { ...active, column: targetColumn };
	const without = modules.filter((module) => module.id !== activeId);

	const mainList = without
		.filter((module) => columnOf(module) === "main")
		.sort((a, b) => a.order - b.order);
	const sideList = without
		.filter((module) => columnOf(module) === "side")
		.sort((a, b) => a.order - b.order);

	const targetList = targetColumn === "main" ? [...mainList] : [...sideList];

	if (isColumnTarget) {
		targetList.push(updated);
	} else {
		const overIndex = targetList.findIndex((module) => module.id === overId);
		if (overIndex === -1) {
			targetList.push(updated);
		} else {
			targetList.splice(overIndex, 0, updated);
		}
	}

	if (targetColumn === "main") {
		return normalizeModuleOrders([...targetList, ...sideList]);
	}
	return normalizeModuleOrders([...mainList, ...targetList]);
}

export function isLayoutTemplate(template: CustomTemplate) {
	return Boolean(template.sheetLayout?.modules?.length);
}

export function cloneSheetLayout(
	layout: SheetLayoutConfig,
	baseSystem: RpgSystem,
): SheetLayoutConfig {
	return {
		version: 1,
		template: baseSystem,
		modules: layout.modules.map((module) => ({
			...module,
			id:
				module.kind === "customText" || module.kind === "customStats"
					? `${module.kind}-${crypto.randomUUID()}`
					: module.id,
		})),
	};
}

export function createSavedSheetTemplate(input: {
	name: string;
	description?: string;
	baseSystem: RpgSystem;
	modules: SheetModuleConfig[];
	author?: string;
}): CustomTemplate {
	const sheetLayout = normalizeModuleOrders(input.modules);
	return {
		id: `custom_${crypto.randomUUID()}`,
		name: input.name.trim(),
		description: input.description?.trim() ?? "",
		author: input.author?.trim() ?? "Campanha",
		createdAt: Date.now(),
		baseSystem: input.baseSystem,
		sheetLayout: {
			version: 1,
			template: input.baseSystem,
			modules: sheetLayout,
		},
	};
}

export function isCustomSheetModule(module: SheetModuleConfig) {
	return module.kind === "customText" || module.kind === "customStats";
}
