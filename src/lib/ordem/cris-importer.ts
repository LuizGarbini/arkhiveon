import type { Character } from "../store/types";
import {
	calculateDefesa,
	calculatePE,
	calculatePV,
	calculateSAN,
	type OrdemClasse,
} from "./calculations";

export interface CrisExportJson {
	nome?: string;
	agentName?: string;
	name?: string;
	playerName?: string;
	jogador?: string;
	nex?: number | string;
	classe?: string;
	trilha?: string;
	origem?: string;
	patente?: string;
	atributos?: {
		agi?: number;
		for?: number;
		int?: number;
		pre?: number;
		vig?: number;
		agilidade?: number;
		forca?: number;
		intelecto?: number;
		presenca?: number;
		vigor?: number;
	};
	pv?: { max?: number; atual?: number; current?: number };
	san?: { max?: number; atual?: number; current?: number };
	pe?: { max?: number; atual?: number; current?: number };
	pericias?: Record<string, number | string>;
	rituais?: Array<{
		nome?: string;
		name?: string;
		circulo?: number;
		elemento?: string;
		execucao?: string;
		alcance?: string;
		alvo?: string;
		duracao?: string;
		resistencia?: string;
		efeito?: string;
	}>;
	inventario?: Array<{
		nome?: string;
		name?: string;
		categoria?: number | string;
		espaco?: number;
		espacos?: number;
		descricao?: string;
	}>;
	fotoUrl?: string;
	imageUrl?: string;
}

/**
 * Converte um arquivo JSON do C.R.I.S. para a estrutura de Character do RPG Notes
 */
export function parseCrisCharacterJson(jsonInput: unknown): Partial<Character> {
	const raw = (jsonInput ?? {}) as CrisExportJson;

	const characterName = raw.nome || raw.agentName || raw.name || "Novo Agente";
	const playerName = raw.jogador || raw.playerName || "";

	const rawNex = Number.parseInt(String(raw.nex ?? "5"), 10);
	const nex = Number.isNaN(rawNex) ? 5 : Math.max(5, Math.min(99, rawNex));

	const rawClasse = (raw.classe || "combatente").toLowerCase();
	let classe: OrdemClasse = "combatente";
	if (rawClasse.includes("ocultista")) classe = "ocultista";
	else if (rawClasse.includes("especialista")) classe = "especialista";

	const agi = raw.atributos?.agi ?? raw.atributos?.agilidade ?? 1;
	const forca = raw.atributos?.for ?? raw.atributos?.forca ?? 1;
	const int = raw.atributos?.int ?? raw.atributos?.intelecto ?? 1;
	const pre = raw.atributos?.pre ?? raw.atributos?.presenca ?? 1;
	const vig = raw.atributos?.vig ?? raw.atributos?.vigor ?? 1;

	const pvMax = raw.pv?.max ?? calculatePV(classe, vig, nex);
	const pvAtual = raw.pv?.atual ?? raw.pv?.current ?? pvMax;

	const sanMax = raw.san?.max ?? calculateSAN(classe, nex);
	const sanAtual = raw.san?.atual ?? raw.san?.current ?? sanMax;

	const peMax = raw.pe?.max ?? calculatePE(classe, pre, nex);
	const peAtual = raw.pe?.atual ?? raw.pe?.current ?? peMax;

	const defesa = calculateDefesa(agi);

	const customFields: Record<string, unknown> = {
		nex,
		origem: raw.origem || "",
		patente: raw.patente || "recruta",
		atributos: { agi, for: forca, int, pre, vig },
		defesa,
		pericias: raw.pericias || {},
		rituais: raw.rituais || [],
		inventario: raw.inventario || [],
	};

	return {
		characterName,
		playerName,
		system: "ordem",
		race: raw.origem || "Agente da Ordem",
		class: classe,
		subclass: raw.trilha || "",
		level: Math.max(1, Math.floor(nex / 5)),
		health: pvAtual,
		healthMax: pvMax,
		sanity: sanAtual,
		sanityMax: sanMax,
		effort: peAtual,
		effortMax: peMax,
		imageUrl: raw.fotoUrl || raw.imageUrl || "",
		notes: `Ficha importada do C.R.I.S.\nPatente: ${raw.patente || "Recruta"}\nNEX: ${nex}%`,
		customFields,
	};
}
