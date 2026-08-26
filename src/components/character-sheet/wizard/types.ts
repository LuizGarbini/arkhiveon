export type WizardStep =
	| "system"
	| "essential"
	| "layout"
	| "details"
	| "review";

export interface WizardStepDefinition {
	id: WizardStep;
	label: string;
	description: string;
}

export const WIZARD_STEPS: WizardStepDefinition[] = [
	{ id: "system", label: "Sistema", description: "Escolha o template" },
	{ id: "essential", label: "Essencial", description: "Nome e identidade" },
	{ id: "layout", label: "Layout", description: "Organize os módulos" },
	{ id: "details", label: "Detalhes", description: "Stats — opcional" },
	{ id: "review", label: "Revisão", description: "Salvar ficha" },
];

export const DETAILS_TABS = [
	{ id: "abilities", label: "Atributos" },
	{ id: "combat", label: "Combate" },
	{ id: "extra", label: "Inventário & notas" },
];
