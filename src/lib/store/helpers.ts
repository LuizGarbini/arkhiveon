import type { ActivityEntry } from "./types";
import { RPG_SYSTEMS } from "./types";

export const MAX_ACTIVITY = 200;

export const generateEntry = <T extends object>(
	defaults: T,
	data: Partial<T>,
): T & { id: string; createdAt: number } => ({
	...defaults,
	...data,
	id: crypto.randomUUID(),
	createdAt: Date.now(),
});

export function pushLog(
	log: ActivityEntry[],
	entry: Omit<ActivityEntry, "id" | "timestamp"> & {
		id?: string;
		timestamp?: number;
	},
): ActivityEntry[] {
	const next: ActivityEntry = {
		...entry,
		id: entry.id || crypto.randomUUID(),
		timestamp: entry.timestamp || Date.now(),
	} as ActivityEntry;
	return [next, ...log].slice(0, MAX_ACTIVITY);
}

export function entityNameOf(e: object, fallback = "Sem nome"): string {
	const o = e as Record<string, unknown>;
	const candidates = [o.characterName, o.name, o.title];
	for (const c of candidates) {
		if (typeof c === "string" && c.trim()) return c.trim();
	}
	return fallback;
}

export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getAttributeExtraInfo(
	score: number,
	system: string,
): string | null {
	if (
		[
			"dnd5e",
			"dnd2024",
			"pathfinder",
			"tormenta20",
			"generic",
			"cosmere",
		].includes(system)
	) {
		const mod = Math.floor((score - 10) / 2);
		return mod >= 0 ? `+${mod}` : `${mod}`;
	}
	if (system === "coc") {
		const half = Math.floor(score / 2);
		const fifth = Math.floor(score / 5);
		return `${half} / ${fifth}`;
	}
	return null;
}

export function getAttributeFullName(keyOrLabel: string): string {
	const map: Record<string, string> = {
		// Keys
		STRENGTH: "Força",
		DEXTERITY: "Destreza",
		CONSTITUTION: "Constituição",
		INTELLIGENCE: "Inteligência",
		WISDOM: "Sabedoria",
		CHARISMA: "Carisma",
		AGILITY: "Agilidade",
		PRESENCE: "Presença",
		VIGOR: "Vigor",
		STAMINA: "Vigor",
		MANIPULATION: "Manipulação",
		COMPOSURE: "Autocontrole",
		WITS: "Raciocínio",
		RESOLVE: "Determinação",
		SIZE: "Tamanho",
		APPEARANCE: "Aparência",
		POWER: "Poder",
		EDUCATION: "Educação",
		INTELLECT: "Intelecto",

		// Display labels
		FOR: "Força",
		DES: "Destreza",
		CON: "Constituição",
		INT: "Inteligência",
		SAB: "Sabedoria",
		CAR: "Carisma",
		VIG: "Vigor",
		AGI: "Agilidade",
		PRE: "Presença",
		MAN: "Manipulação",
		AUT: "Autocontrole",
		RAC: "Raciocínio",
		PER: "Perseverança / Percepção",
		TAM: "Tamanho",
		POD: "Poder",
		EDU: "Educação",
		APA: "Aparência",
		HAB: "Habilidade",
		RES: "Resistência",
		PIS: "Pistoleiro",
		BRO: "Bronco",
		FRI: "Frio",
		STR: "Força (Strength)",
		DEX: "Destreza (Dexterity)",
		WIS: "Sabedoria (Wisdom)",
		CHA: "Carisma (Charisma)",
		END: "Resistência (Endurance)",
		LCK: "Sorte (Luck)",

		// General fields / Combat / Resources
		"HP ATUAL": "Pontos de Vida Atuais",
		"HP MÁXIMO": "Pontos de Vida Máximos",
		"HP TEMPORÁRIO": "Pontos de Vida Temporários",
		"CA / DEFESA": "Classe de Armadura / Defesa Geral",
		INICIATIVA: "Bônus de Iniciativa para a ordem de turnos",
		"DESLOCAMENTO (M)": "Velocidade de Movimento (metros)",
		"DESLOCAMENTO (FT)": "Velocidade de Movimento (pés)",
		"BÔNUS DE PROFICIÊNCIA": "Bônus adicionado a jogadas proficientes",
		"DADOS DE VIDA (HIT DICE)": "Dados para recuperar vida no descanso curto",
		"TESTES CONTRA MORTE (SUCESSOS)":
			"Três sucessos estabilizam seu personagem",
		"TESTES CONTRA MORTE (FALHAS)": "Três falhas causam a morte definitiva",
		"SALVAGUARDAS PROFICIENTES": "Testes de resistência onde você soma bônus",
		"PERÍCIAS TREINADAS": "Perícias nas quais você tem treinamento especial",
		IDIOMAS: "Idiomas falados e compreendidos",
		"OUTRAS PROFICIÊNCIAS":
			"Armas, armaduras, ferramentas e veículos que sabe usar",
		NEX: "Nível de Exposição Paranormal",
		PE: "Pontos de Esforço",
		DEFESA: "Defesas (Passiva, Esquiva, Bloqueio)",
		RITUAIS: "Fórmulas mágicas ou rituais paranormais",
		PODERES: "Poderes sobrenaturais ou habilidades de classe",
		"NÍVEL DE EXPOSIÇÃO PARANORMAL (NEX %)": "Grau de exposição ao paranormal",
		"PONTOS DE ESFORÇO ATUAL": "Pontos de Esforço atuais",
		"PE MÁXIMO": "Pontos de Esforço máximos",
		"SORTE ATUAL": "Pontos de Sorte para gastar ou testar",
		"PONTOS DE MAGIA": "Pontos de Magia para feitiços",
		"TAXA DE MOVIMENTO": "Deslocamento tático no combate",
		DISCIPLINAS: "Poderes sobrenaturais de vampiro",
		"FOME (OU PONTOS DE SANGUE)": "Nível de fome de sangue",
		"POTÊNCIA DE SANGUE (OU GERAÇÃO)": "Força mística do sangue de vampiro",
		HUMANIDADE: "Conexão moral com a humanidade do vampiro",
		CONCEITO: "Ideia central ou arquétipo do personagem",
		ALINHAMENTO: "Tendência ética e moral",
		NÍVEL: "Nível de poder do personagem",
		"PONTOS DE EXPERIÊNCIA (XP)": "Pontos acumulados para subir de nível",
		"CLASSE & NÍVEL": "Sua classe e nível atual",
		RAÇA: "Raça ou espécie do personagem",
		ANTECEDENTE: "Histórico de vida anterior",
		ARQUETIPO: "Arquétipo do personagem",
	};

	const clean = keyOrLabel.trim().toUpperCase().replace(/\s+/g, " ");
	if (map[clean]) return map[clean];

	if (clean.startsWith("DESLOCAMENTO")) {
		if (clean.includes("FT")) return map["DESLOCAMENTO (FT)"];
		return map["DESLOCAMENTO (M)"];
	}

	const lower = keyOrLabel.toLowerCase();
	const keyMatches = Object.keys(map);
	const match = keyMatches.find((k) => k.toLowerCase() === lower);
	if (match) return map[match];

	return keyOrLabel;
}

export function systemLabel(value: string): string {
	return RPG_SYSTEMS.find((s) => s.value === value)?.label || value;
}

function appendPostgrestContext(
	message: string,
	error: Record<string, unknown>,
): string {
	const parts = [message];
	const code = error.code;
	const details = error.details;
	const hint = error.hint;
	if (typeof code === "string" && code.trim()) parts.push(`[${code}]`);
	if (typeof details === "string" && details.trim()) parts.push(details);
	if (typeof hint === "string" && hint.trim()) parts.push(`hint: ${hint}`);
	return parts.join(" — ");
}

/** Human-readable sync error; never returns "[object Object]". */
export function remoteErrorMessage(error: unknown): string {
	if (typeof error === "string" && error.trim()) return error;
	if (error instanceof Error) {
		return error.message || error.name || "Erro desconhecido";
	}
	if (typeof error === "object" && error !== null) {
		const record = error as Record<string, unknown>;
		if (
			"message" in record &&
			record.message != null &&
			record.message !== ""
		) {
			return appendPostgrestContext(String(record.message), record);
		}
		try {
			const json = JSON.stringify(error);
			if (json && json !== "{}") return json;
		} catch {
			// ignore circular / non-serializable
		}
	}
	return "Falha ao sincronizar com o Supabase.";
}
