/**
 * Regras e Automações de Cálculo de Ordem Paranormal RPG
 * Compatível com as regras oficiais da Jambô Editora e o C.R.I.S.
 */

export type OrdemClasse = "combatente" | "especialista" | "ocultista";

export type OrdemPatente =
	| "recruta"
	| "operador"
	| "agente_especial"
	| "oficial_operacoes"
	| "agente_elite";

export type OrdemElemento =
	| "sangue"
	| "morte"
	| "conhecimento"
	| "energia"
	| "medo";

export type GrauTreinamento =
	| "nao_treinado"
	| "treinado"
	| "veterano"
	| "expert";

export interface OrdemAtributos {
	agi: number; // Agilidade
	for: number; // Força
	int: number; // Intelecto
	pre: number; // Presença
	vig: number; // Vigor
}

export interface OrdemRecursos {
	pvMax: number;
	pvAtual: number;
	sanMax: number;
	sanAtual: number;
	peMax: number;
	peAtual: number;
}

/**
 * Retorna os incrementos de nível por 5% de NEX
 */
function getLevelSteps(nex: number): number {
	const clampedNex = Math.max(5, Math.min(99, nex));
	return Math.floor(clampedNex / 5);
}

/**
 * Calcula PV Máximo por Classe, Vigor e NEX%
 */
export function calculatePV(
	classe: OrdemClasse,
	vig: number,
	nex: number,
): number {
	const steps = getLevelSteps(nex);
	const baseVig = Math.max(0, vig);

	switch (classe) {
		case "combatente":
			// NEX 5%: 20 + VIG | +5% NEX: +6 + VIG
			return 20 + baseVig + (steps - 1) * (6 + baseVig);
		case "especialista":
			// NEX 5%: 16 + VIG | +5% NEX: +4 + VIG
			return 16 + baseVig + (steps - 1) * (4 + baseVig);
		case "ocultista":
			// NEX 5%: 12 + VIG | +5% NEX: +3 + VIG
			return 12 + baseVig + (steps - 1) * (3 + baseVig);
		default:
			return 12 + baseVig + (steps - 1) * (3 + baseVig);
	}
}

/**
 * Calcula Sanidade Máxima por Classe e NEX%
 */
export function calculateSAN(classe: OrdemClasse, nex: number): number {
	const steps = getLevelSteps(nex);

	switch (classe) {
		case "combatente":
			// NEX 5%: 12 | +5% NEX: +3
			return 12 + (steps - 1) * 3;
		case "especialista":
			// NEX 5%: 16 | +5% NEX: +4
			return 16 + (steps - 1) * 4;
		case "ocultista":
			// NEX 5%: 20 | +5% NEX: +5
			return 20 + (steps - 1) * 5;
		default:
			return 12 + (steps - 1) * 3;
	}
}

/**
 * Calcula PE (Pontos de Esforço) Máximo por Classe, Presença e NEX%
 */
export function calculatePE(
	classe: OrdemClasse,
	pre: number,
	nex: number,
): number {
	const steps = getLevelSteps(nex);
	const basePre = Math.max(0, pre);

	switch (classe) {
		case "combatente":
			// NEX 5%: 2 + PRE | +5% NEX: +2 + PRE
			return 2 + basePre + (steps - 1) * (2 + basePre);
		case "especialista":
			// NEX 5%: 3 + PRE | +5% NEX: +3 + PRE
			return 3 + basePre + (steps - 1) * (3 + basePre);
		case "ocultista":
			// NEX 5%: 4 + PRE | +5% NEX: +4 + PRE
			return 4 + basePre + (steps - 1) * (4 + basePre);
		default:
			return 2 + basePre + (steps - 1) * (2 + basePre);
	}
}

/**
 * Calcula Defesa Base = 10 + Agilidade + Bônus de Equipamento + Outros
 */
export function calculateDefesa(
	agi: number,
	bonusEquipamento = 0,
	outros = 0,
): number {
	return 10 + Math.max(0, agi) + bonusEquipamento + outros;
}

/**
 * Esquiva = Defesa Base + Bônus da Perícia Reflexos
 */
export function calculateEsquiva(
	defesaBase: number,
	bonusReflexos = 0,
): number {
	return defesaBase + bonusReflexos;
}

/**
 * Bloqueio = Redução de Dano (RD) igual ao bônus da Perícia Fortitude
 */
export function calculateBloqueio(bonusFortitude = 0): number {
	return Math.max(0, bonusFortitude);
}

/**
 * Limite de Espaço/Carga = 5 + Força (Mínimo 5)
 */
export function calculateLimiteCarga(forca: number): number {
	return 5 + Math.max(0, forca);
}

/**
 * Calcula a DT (Dificuldade de Teste) de Rituais = 10 + PE Gastos + Intelecto
 */
export function calculateDTRitual(peGastos: number, int: number): number {
	return 10 + Math.max(1, peGastos) + Math.max(0, int);
}

/**
 * Retorna o Círculo Máximo de Rituais acessível pelo NEX%
 */
export function getMaxRitualCircle(nex: number): number {
	if (nex >= 85) return 4;
	if (nex >= 55) return 3;
	if (nex >= 25) return 2;
	if (nex >= 5) return 1;
	return 0;
}

/**
 * Retorna o limite de Grau de Treinamento liberado pelo NEX%
 */
export function getMaxSkillTrainingDegree(nex: number): GrauTreinamento {
	if (nex >= 70) return "expert";
	if (nex >= 35) return "veterano";
	if (nex >= 5) return "treinado";
	return "nao_treinado";
}

/**
 * Converte Grau de Treinamento para o bônus numérico (+0, +5, +10, +15)
 */
export function trainingDegreeToBonus(degree: GrauTreinamento): number {
	switch (degree) {
		case "treinado":
			return 5;
		case "veterano":
			return 10;
		case "expert":
			return 15;
		default:
			return 0;
	}
}

/**
 * Simula a rolagem de dados para Ordem Paranormal.
 * Regra: Rola X d20 (X = valor do Atributo) e pega o MAIOR.
 * Regra de Atributo Zero: Se Atributo for 0, rola 2d20 e pega o MENOR.
 */
export function rollOrdemD20(
	attributeScore: number,
	bonus = 0,
): {
	dice: number[];
	selectedDie: number;
	total: number;
	isZeroAttributeRule: boolean;
} {
	if (attributeScore <= 0) {
		// Regra de Atributo 0: Rola 2d20 e pega o MENOR
		const d1 = Math.floor(Math.random() * 20) + 1;
		const d2 = Math.floor(Math.random() * 20) + 1;
		const selectedDie = Math.min(d1, d2);
		return {
			dice: [d1, d2],
			selectedDie,
			total: selectedDie + bonus,
			isZeroAttributeRule: true,
		};
	}

	const diceCount = Math.max(1, attributeScore);
	const dice: number[] = [];
	for (let i = 0; i < diceCount; i++) {
		dice.push(Math.floor(Math.random() * 20) + 1);
	}
	const selectedDie = Math.max(...dice);
	return {
		dice,
		selectedDie,
		total: selectedDie + bonus,
		isZeroAttributeRule: false,
	};
}
