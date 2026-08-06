import type { Character, Feat, Spell } from "../store/types";

export interface ArquivosSecretosToken {
	id: string;
	name: string;
	category: "agente" | "criatura" | "npc";
	edition: string; // e.g. "AS1", "AS2", "AS3"
	imageUrl: string;
	style?: "calamidade" | "hexatombe" | "padrao";
}

export interface ArquivosSecretosMedia {
	id: string;
	title: string;
	type: "pdf" | "audio" | "mapa" | "hq";
	edition: string;
	path: string;
	variant?: "dia" | "noite" | "master" | "mobile";
}

export interface ArquivosSecretosBestiaryEntry {
	id: string;
	name: string;
	edition: string;
	element: "Sangue" | "Morte" | "Conhecimento" | "Energia" | "Medo";
	role: string;
	description: string;
	tokenId?: string;
}

/**
 * Catálogo de Tokens e Mídias extraídos das pastas oficiais em public/Arquivos secretos/
 */
export const ARQUIVOS_SECRETOS_TOKENS: ArquivosSecretosToken[] = [
	// AS1 Tokens
	{
		id: "as1-agatha-calamidade",
		name: "Agatha (Calamidade)",
		category: "agente",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - token estilo Calamidade.png",
		style: "calamidade",
	},
	{
		id: "as1-agatha-hexatombe",
		name: "Agatha (Hexatombe)",
		category: "agente",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-giovanni",
		name: "Giovanni Opspor",
		category: "agente",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Giovanni Opspor - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-anulado",
		name: "Anulado",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Anulado - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-carrara",
		name: "Carrara",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Carrara - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-cleo",
		name: "Cleo",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Cleo - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-cristino",
		name: "Cristino",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Cristino - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-mosto",
		name: "Mosto",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Mosto - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-nando",
		name: "Nando",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Nando - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-tarrafa",
		name: "Tarrafa",
		category: "npc",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Tarrafa - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-transtornado-apostolo",
		name: "Transtornado Apóstolo do Sangue",
		category: "criatura",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado apóstolo do Sangue - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-transtornado-assecla",
		name: "Transtornado Assecla",
		category: "criatura",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado assecla - token estilo Hexatombe.png",
		style: "hexatombe",
	},
	{
		id: "as1-transtornado-investido",
		name: "Transtornado Investido",
		category: "criatura",
		edition: "AS1",
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado investido - token estilo Hexatombe.png",
		style: "hexatombe",
	},
];

export const ARQUIVOS_SECRETOS_MEDIA: ArquivosSecretosMedia[] = [
	// PDFs
	{
		id: "pdf-as1",
		title: "Arquivos Secretos 01 (v1.2)",
		type: "pdf",
		edition: "AS1",
		path: "/Arquivos secretos/AS1/Arquivos Secretos 01 (v1.2).pdf",
	},
	{
		id: "pdf-as2",
		title: "Arquivos Secretos 02",
		type: "pdf",
		edition: "AS2",
		path: "/Arquivos secretos/AS2/Arquivos-Secretos-02.pdf",
	},
	{
		id: "pdf-as2-hq",
		title: "Arquivos Secretos 02 - HQ Kemi",
		type: "hq",
		edition: "AS2",
		path: "/Arquivos secretos/AS2/Arquivos Secretos 02 - HQ Kemi.pdf",
	},
	{
		id: "pdf-as3",
		title: "Arquivos Secretos 03 (v1.1)",
		type: "pdf",
		edition: "AS3",
		path: "/Arquivos secretos/AS3/Arquivos-Secretos-3-v1-1.pdf",
	},
	{
		id: "pdf-as6",
		title: "Arquivos Secretos 06 (v1.1)",
		type: "pdf",
		edition: "AS6",
		path: "/Arquivos secretos/AS6/Arquivos-Secretos-06-v1.1.pdf",
	},
	{
		id: "pdf-as6-hq",
		title: "Arquivos Secretos 06 - HQ Experimento 19-15",
		type: "hq",
		edition: "AS6",
		path: "/Arquivos secretos/AS6/AS-06-HQ-Experimento-19-15.pdf",
	},
	{
		id: "pdf-as7-hq",
		title: "Arquivos Secretos 07 - HQ Vampyre",
		type: "hq",
		edition: "AS7",
		path: "/Arquivos secretos/AS7/AS_07_hq_vampyre_gratuito.pdf",
	},

	// Áudios / Trilhas
	{
		id: "audio-agatha",
		title: "Agatha - Trilha Sonora",
		type: "audio",
		edition: "AS1",
		path: "/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - Trilha Sonora.mp3",
	},
	{
		id: "audio-transtornados",
		title: "Combate contra os Transtornados",
		type: "audio",
		edition: "AS1",
		path: "/Arquivos secretos/AS1/Agente de Elite - Extras/Combate contra os Transtornados Masterização - Trilha Sonora.mp3",
	},
	{
		id: "audio-energia-batalha",
		title: "Energia Batalha Master",
		type: "audio",
		edition: "AS4",
		path: "/Arquivos secretos/AS4/AS 04 - Extras v1.1/Energia Batalha Master WAV.wav",
	},

	// Mapas
	{
		id: "mapa-galpao-dia",
		title: "Galpão dos Transtornados (Dia)",
		type: "mapa",
		edition: "AS1",
		path: "/Arquivos secretos/AS1/Agente de Elite - Extras/Mapa galpão dos Transtornados dia.jpg",
		variant: "dia",
	},
	{
		id: "mapa-galpao-noite",
		title: "Galpão dos Transtornados (Noite)",
		type: "mapa",
		edition: "AS1",
		path: "/Arquivos secretos/AS1/Agente de Elite - Extras/Mapa galpão dos Transtornados noite.jpg",
		variant: "noite",
	},
	{
		id: "mapa-backrooms",
		title: "Backrooms - O Outro Lado",
		type: "mapa",
		edition: "AS5",
		path: "/Arquivos secretos/AS5/Extras/BackRooms.jpg",
	},
];

/**
 * Rituais Oficiais de Ordem Paranormal (1º ao 4º Círculo)
 */
export const ORDEM_SPELLS_SEED: Spell[] = [
	{
		id: "ordem-cicatrizacao",
		system: "ordem",
		name: "Cicatrização",
		level: 1,
		school: "Sangue",
		casting_time: "Padrão",
		range: "Toque",
		components: "Gesto e Palavra",
		duration: "Instantânea",
		description:
			"Acelera a regeneração do corpo do alvo. Restaura 2d8+2 Pontos de Vida (PV).",
	},
	{
		id: "ordem-amaldicoar-arma",
		system: "ordem",
		name: "Amaldiçoar Arma",
		level: 1,
		school: "Sangue",
		casting_time: "Padrão",
		range: "Toque",
		components: "Gesto",
		duration: "Cena",
		description:
			"Incapaz de ser evitada, a arma banhada com sangue paranormal causa +1d6 de dano de Sangue adicional em todos os ataques efetuados.",
	},
	{
		id: "ordem-decadencia",
		system: "ordem",
		name: "Decadência",
		level: 1,
		school: "Morte",
		casting_time: "Padrão",
		range: "Toque",
		components: "Gesto",
		duration: "Instantânea",
		description:
			"Acelera a decomposição do alvo tocado. Causa 2d8+2 de dano de Morte e o alvo fica esgotado se falhar no teste de Fortitude.",
	},
	{
		id: "ordem-esconder-olhos",
		system: "ordem",
		name: "Esconder dos Olhos",
		level: 1,
		school: "Conhecimento",
		casting_time: "Padrão",
		range: "Pessoal",
		components: "Gesto",
		duration: "Sustentada",
		description:
			"Apaga a imagem do agente da percepção das mentes ao redor, tornando-o invisível a criaturas e pessoas.",
	},
	{
		id: "ordem-terceiro-olho",
		system: "ordem",
		name: "Terceiro Olho",
		level: 1,
		school: "Conhecimento",
		casting_time: "Padrão",
		range: "Pessoal",
		components: "Concentração",
		duration: "Cena",
		description:
			"Abre a visão paranormal do agente, permitindo enxergar auras paranormais, rituais ativos e rastros de entidades no ambiente.",
	},
	{
		id: "ordem-chamas-kaos",
		system: "ordem",
		name: "Chamas do Kaos",
		level: 1,
		school: "Energia",
		casting_time: "Padrão",
		range: "Curto",
		components: "Gesto",
		duration: "Instantânea",
		description:
			"Conjura labaredas roxas e imprevisíveis de Energia. Causa 3d6 de dano de Fogo/Energia e pode incendiar o alvo.",
	},
	{
		id: "ordem-eletrocussao",
		system: "ordem",
		name: "Eletrocussão",
		level: 1,
		school: "Energia",
		casting_time: "Padrão",
		range: "Curto",
		components: "Gesto",
		duration: "Instantânea",
		description:
			"Descarrega um arco elétrico de Energia sobre a vítima. Causa 3d6 de dano de Eletricidade e deixa o alvo vulnerável por 1 rodada.",
	},
	{
		id: "ordem-velocidade-mortal",
		system: "ordem",
		name: "Velocidade Mortal",
		level: 2,
		school: "Morte",
		casting_time: "Padrão",
		range: "Pessoal",
		components: "Gesto",
		duration: "Sustentada",
		description:
			"Distorce a percepção temporal do agente. O agente recebe +1 Ação Padrão adicional em cada um dos seus turnos.",
	},
	{
		id: "ordem-paradoxo",
		system: "ordem",
		name: "Paradoxo",
		level: 2,
		school: "Morte",
		casting_time: "Padrão",
		range: "Curto",
		components: "Gesto",
		duration: "Instantânea",
		description:
			"Cria uma esfera de colapso temporal em um ponto no espaço. Todas as criaturas na área sofrem 6d6 de dano de Morte.",
	},
	{
		id: "ordem-invocar-nevoa",
		system: "ordem",
		name: "Invocar Névoa",
		level: 2,
		school: "Energia",
		casting_time: "Padrão",
		range: "Médio",
		components: "Gesto",
		duration: "Cena",
		description:
			"Invoca uma névoa densa e estática em uma área de 6m de raio. Bloqueia a visão e concede camuflagem total a quem estiver dentro.",
	},
	{
		id: "ordem-deflagracao",
		system: "ordem",
		name: "Deflagração",
		level: 3,
		school: "Energia",
		casting_time: "Padrão",
		range: "Médio",
		components: "Gesto e Palavra",
		duration: "Instantânea",
		description:
			"Provoca uma explosão caótica de plasma em área. Causa 10d6 de dano de Energia e derruba todos os alvos afetados.",
	},
	{
		id: "ordem-forma-monstruosa",
		system: "ordem",
		name: "Forma Monstruosa",
		level: 3,
		school: "Sangue",
		casting_time: "Padrão",
		range: "Pessoal",
		components: "Gesto",
		duration: "Cena",
		description:
			"Transforma o agente em uma abominação de músculos e garras de Sangue. Concede +10 em Força e +50 Pontos de Vida Temporários.",
	},
	{
		id: "ordem-lamina-medo",
		system: "ordem",
		name: "Lâmina do Medo",
		level: 4,
		school: "Medo",
		casting_time: "Padrão",
		range: "Toque",
		components: "Gesto e Palavra",
		duration: "Instantânea",
		description:
			"Invoca uma lâmina de Medo puro que rasga a própria realidade. Ignora totalmente a Defesa e Redução de Dano (RD) da vítima.",
	},
];

/**
 * Poderes Paranormais e Habilidades para Ordem Paranormal
 */
export const ORDEM_FEATS_SEED: Feat[] = [
	{
		id: "ordem-aprender-ritual",
		system: "ordem",
		name: "Aprender Ritual",
		category: "Poder Paranormal",
		prerequisites: "Presença 2 ou Ocultismo Treinado",
		description:
			"Você aprende um ritual adicional de qualquer elemento, respeitando o círculo máximo liberado pelo seu NEX%.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
	{
		id: "ordem-sangue-ferro",
		system: "ordem",
		name: "Sangue de Ferro",
		category: "Poder de Sangue",
		prerequisites: "Vigor 2",
		description:
			"Seu corpo se fortalece com a vitalidade de Sangue. Você ganha +2 Pontos de Vida (PV) por nível de NEX%.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
	{
		id: "ordem-potencial-aprimorado",
		system: "ordem",
		name: "Potencial Aprimorado",
		category: "Poder Paranormal",
		prerequisites: "Presença 2",
		description:
			"Sua reserva paranormal aumenta. Você ganha +1 Ponto de Esforço (PE) por nível de NEX%.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
	{
		id: "ordem-campo-protetor",
		system: "ordem",
		name: "Campo Protetor",
		category: "Poder de Energia",
		prerequisites: "Agilidade 2",
		description:
			"Uma aura eletrostática envolve o agente, concedendo +5 na Defesa Base contra ataques físicos e paranormais.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
	{
		id: "ordem-visao-sombras",
		system: "ordem",
		name: "Visão nas Sombras",
		category: "Poder de Conhecimento",
		prerequisites: "Intelecto 2",
		description:
			"Você enxerga perfeitamente na escuridão paranormal e névoas densas sem sofrer penalidades de percepção.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
	{
		id: "ordem-presenca-perturbadora",
		system: "ordem",
		name: "Presença Perturbadora",
		category: "Poder de Morte",
		prerequisites: "Presença 3",
		description:
			"Inimigos que olharem diretamente para o agente durante a primeira rodada de combate entram em pânico e sofrem 1d6 de dano de Sanidade.",
		ability_increase: "",
		source: "Ordem Paranormal",
	},
];

/**
 * Agentes Prontos Pré-Construídos (Com Ficha Completa + Histórico + Avatar)
 */
export const ORDEM_PRESET_AGENTS: Array<
	Partial<Character> & { id: string; name: string }
> = [
	{
		id: "agente-agatha",
		name: "Agatha (Ocultista Graduada - NEX 40%)",
		characterName: "Agatha",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Agente de Saúde",
		class: "ocultista",
		subclass: "Graduado",
		level: 8,
		health: 40,
		healthMax: 40,
		sanity: 52,
		sanityMax: 52,
		effort: 40,
		effortMax: 40,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - token estilo Hexatombe.png",
		notes:
			"Ficha oficial de Agatha. Ocultista veterana da Ordem Paranormal especializada no estudo de Morte e Sangue. Investigou a seita dos Transtornados no Galpão abandonado durante a Operação Hexatombe.",
		customFields: {
			nex: 40,
			origem: "Agente de Saúde",
			patente: "agente_especial",
			atributos: { agi: 2, for: 1, int: 4, pre: 3, vig: 2 },
			defesa: 12,
		},
		spellsList: [
			ORDEM_SPELLS_SEED[0],
			ORDEM_SPELLS_SEED[1],
			ORDEM_SPELLS_SEED[2],
			ORDEM_SPELLS_SEED[3],
			ORDEM_SPELLS_SEED[7],
		],
		featsList: [ORDEM_FEATS_SEED[0], ORDEM_FEATS_SEED[2]],
	},
	{
		id: "agente-giovanni",
		name: "Giovanni Opspor (Combatente Aniquilador - NEX 40%)",
		characterName: "Giovanni Opspor",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Policial",
		class: "combatente",
		subclass: "Aniquilador",
		level: 8,
		health: 68,
		healthMax: 68,
		sanity: 30,
		sanityMax: 30,
		effort: 20,
		effortMax: 20,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Giovanni Opspor - token estilo Hexatombe.png",
		notes:
			"Ex-militar de forças especiais e Combatente de linha de frente. Especializado no uso de Acha Amaldiçoada pesada e combate contra ameaças fisicamente brutais.",
		customFields: {
			nex: 40,
			origem: "Policial",
			patente: "agente_especial",
			atributos: { agi: 3, for: 4, int: 1, pre: 1, vig: 3 },
			defesa: 13,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[1], ORDEM_FEATS_SEED[3]],
	},
	{
		id: "agente-carrara",
		name: "Carrara (Especialista Infiltrador - NEX 35%)",
		characterName: "Carrara",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Investigador",
		class: "especialista",
		subclass: "Infiltrador",
		level: 7,
		health: 48,
		healthMax: 48,
		sanity: 42,
		sanityMax: 42,
		effort: 35,
		effortMax: 35,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Carrara - token estilo Hexatombe.png",
		notes:
			"Agente furtivo e mestre em infiltração urbana. Especialista em resolver enigmas e desarmar dispositivos paranormais.",
		customFields: {
			nex: 35,
			origem: "Investigador",
			patente: "agente_especial",
			atributos: { agi: 4, for: 2, int: 3, pre: 2, vig: 2 },
			defesa: 14,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[4]],
	},
	{
		id: "agente-cleo",
		name: "Cleo (Ocultista Conduíte - NEX 35%)",
		characterName: "Cleo",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Acadêmico",
		class: "ocultista",
		subclass: "Conduíte",
		level: 7,
		health: 36,
		healthMax: 36,
		sanity: 58,
		sanityMax: 58,
		effort: 45,
		effortMax: 45,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Cleo - token estilo Hexatombe.png",
		notes:
			"Pesquisadora de fenômenos ocultos e Conduíte de Energia. Consegue conjurar rituais a distâncias estendidas e manipular o Outro Lado com precisão.",
		customFields: {
			nex: 35,
			origem: "Acadêmico",
			patente: "agente_especial",
			atributos: { agi: 2, for: 1, int: 4, pre: 4, vig: 2 },
			defesa: 12,
		},
		spellsList: [
			ORDEM_SPELLS_SEED[5],
			ORDEM_SPELLS_SEED[6],
			ORDEM_SPELLS_SEED[8],
		],
		featsList: [ORDEM_FEATS_SEED[0], ORDEM_FEATS_SEED[3]],
	},
	{
		id: "agente-cristino",
		name: "Cristino (Combatente Guerreiro - NEX 35%)",
		characterName: "Cristino",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Mercenário",
		class: "combatente",
		subclass: "Guerreiro",
		level: 7,
		health: 62,
		healthMax: 62,
		sanity: 32,
		sanityMax: 32,
		effort: 22,
		effortMax: 22,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Cristino - token estilo Hexatombe.png",
		notes:
			"Combatente pragmático e perito em combate corpo a corpo de curta distância com lâminas e escudos.",
		customFields: {
			nex: 35,
			origem: "Mercenário",
			patente: "agente_especial",
			atributos: { agi: 2, for: 4, int: 1, pre: 2, vig: 4 },
			defesa: 15,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[1]],
	},
	{
		id: "agente-mosto",
		name: "Mosto (Especialista Técnico - NEX 30%)",
		characterName: "Mosto",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Engenheiro",
		class: "especialista",
		subclass: "Técnico",
		level: 6,
		health: 44,
		healthMax: 44,
		sanity: 40,
		sanityMax: 40,
		effort: 30,
		effortMax: 30,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Mosto - token estilo Hexatombe.png",
		notes:
			"Técnico de suporte da Ordem. Carrega invenções, granadas e equipamentos de proteção contra radiação de Energia.",
		customFields: {
			nex: 30,
			origem: "Engenheiro",
			patente: "operador",
			atributos: { agi: 2, for: 2, int: 4, pre: 2, vig: 3 },
			defesa: 13,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[3]],
	},
	{
		id: "agente-nando",
		name: "Nando (Combatente Tropa de Choque - NEX 30%)",
		characterName: "Nando",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Lutador",
		class: "combatente",
		subclass: "Tropa de Choque",
		level: 6,
		health: 70,
		healthMax: 70,
		sanity: 28,
		sanityMax: 28,
		effort: 18,
		effortMax: 18,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Nando - token estilo Hexatombe.png",
		notes:
			"O tanque da equipe. Suporta quantidades colossais de dano físico e contém o avanço de criaturas paranormais agressivas.",
		customFields: {
			nex: 30,
			origem: "Lutador",
			patente: "operador",
			atributos: { agi: 1, for: 4, int: 1, pre: 2, vig: 5 },
			defesa: 16,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[1]],
	},
	{
		id: "agente-tarrafa",
		name: "Tarrafa (Ocultista Intuitivo - NEX 30%)",
		characterName: "Tarrafa",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Religioso",
		class: "ocultista",
		subclass: "Intuitivo",
		level: 6,
		health: 34,
		healthMax: 34,
		sanity: 60,
		sanityMax: 60,
		effort: 42,
		effortMax: 42,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Tarrafa - token estilo Hexatombe.png",
		notes:
			"Ocultista sensível à presença de Morte e Conhecimento. Possui alta sanidade e capacidade de resistir a ataques mentais.",
		customFields: {
			nex: 30,
			origem: "Religioso",
			patente: "operador",
			atributos: { agi: 1, for: 1, int: 3, pre: 5, vig: 2 },
			defesa: 11,
		},
		spellsList: [ORDEM_SPELLS_SEED[0], ORDEM_SPELLS_SEED[4]],
		featsList: [ORDEM_FEATS_SEED[5]],
	},
	{
		id: "agente-laila",
		name: "Laila Verdante (Ocultista Lâmina Paranormal - NEX 50%)",
		characterName: "Laila Verdante",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Experimento",
		class: "ocultista",
		subclass: "Lâmina Paranormal",
		level: 10,
		health: 48,
		healthMax: 48,
		sanity: 50,
		sanityMax: 50,
		effort: 50,
		effortMax: 50,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token-Laila-Verdante-borda.png",
		notes:
			"Agente de Elite dos Arquivos Secretos 06. Ocultista especialista em canalizar rituais através de lâminas em combate corpo a corpo.",
		customFields: {
			nex: 50,
			origem: "Experimento",
			patente: "oficial_operacoes",
			atributos: { agi: 3, for: 2, int: 4, pre: 3, vig: 3 },
			defesa: 15,
		},
		spellsList: [
			ORDEM_SPELLS_SEED[1],
			ORDEM_SPELLS_SEED[7],
			ORDEM_SPELLS_SEED[10],
		],
		featsList: [ORDEM_FEATS_SEED[0], ORDEM_FEATS_SEED[3]],
	},
	{
		id: "agente-alice",
		name: "Alice Cruzes (Especialista Médica - NEX 45%)",
		characterName: "Alice Cruzes",
		playerName: "Mestre / Jogador",
		system: "ordem",
		race: "Médico",
		class: "especialista",
		subclass: "Médico de Campo",
		level: 9,
		health: 54,
		healthMax: 54,
		sanity: 48,
		sanityMax: 48,
		effort: 38,
		effortMax: 38,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Alice-Cruzes---borda.png",
		notes:
			"Médica cirurgiã da Indústrias Panacea nos Arquivos Secretos 06. Especializada em estancar sangramentos graves e aplicar adrenalina no campo de batalha.",
		customFields: {
			nex: 45,
			origem: "Médico",
			patente: "agente_especial",
			atributos: { agi: 2, for: 1, int: 5, pre: 3, vig: 3 },
			defesa: 13,
		},
		spellsList: [],
		featsList: [ORDEM_FEATS_SEED[0]],
	},
];

export interface OrdemAmeaca {
	id: string;
	name: string;
	vd: number;
	elemento: "Sangue" | "Morte" | "Conhecimento" | "Energia" | "Medo" | "Físico";
	tipo: "Monstro" | "NPC Inimigo" | "Chefe" | "Mascote";
	pv: number;
	defesa: number;
	rd: number;
	imageUrl: string;
	description: string;
	ataques: string[];
}

/**
 * Ameaças Paranormais e Criaturas dos Arquivos Secretos (AS1 - AS7)
 */
export const ORDEM_AMEACAS_SEED: OrdemAmeaca[] = [
	{
		id: "ameaca-transtornado-apostolo",
		name: "Transtornado Apóstolo do Sangue",
		vd: 40,
		elemento: "Sangue",
		tipo: "Monstro",
		pv: 80,
		defesa: 16,
		rd: 5,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado apóstolo do Sangue - token estilo Hexatombe.png",
		description:
			"Cultista devotado ao Sangue com garras de carnes expostas e sede insaciável de combate.",
		ataques: ["Garra de Sangue (2d8+5)", "Mordida Feroz (1d10+4)"],
	},
	{
		id: "ameaca-transtornado-assecla",
		name: "Transtornado Assecla",
		vd: 20,
		elemento: "Sangue",
		tipo: "NPC Inimigo",
		pv: 40,
		defesa: 14,
		rd: 0,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado assecla - token estilo Hexatombe.png",
		description:
			"Iniciado da seita dos Transtornados. Ataca em bando com facas e porretes de ferro.",
		ataques: ["Faca de Ferro (1d6+2)"],
	},
	{
		id: "ameaca-transtornado-investido",
		name: "Transtornado Investido",
		vd: 60,
		elemento: "Sangue",
		tipo: "Monstro",
		pv: 130,
		defesa: 18,
		rd: 10,
		imageUrl:
			"/Arquivos secretos/AS1/Agente de Elite - Extras/Transtornado investido - token estilo Hexatombe.png",
		description:
			"Criatura colossal de músculos rubros deformados pela manifestação de Sangue.",
		ataques: ["Pancada Devastadora (3d10+8)", "Investida Brutal (2d12+6)"],
	},
	{
		id: "ameaca-seguranca-panacea-1",
		name: "Segurança Panacea (Fuzil)",
		vd: 30,
		elemento: "Físico",
		tipo: "NPC Inimigo",
		pv: 45,
		defesa: 15,
		rd: 5,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Segurança1-borda.png",
		description:
			"Guarda tático da Clínica Indústrias Panacea equipado com armadura pesada e fuzil.",
		ataques: ["Tiro de Fuzil (2d10+3)", "Cassetete Tático (1d8+2)"],
	},
	{
		id: "ameaca-seguranca-panacea-2",
		name: "Segurança Panacea (Escudo)",
		vd: 30,
		elemento: "Físico",
		tipo: "NPC Inimigo",
		pv: 55,
		defesa: 18,
		rd: 5,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Segurança-2-borda.png",
		description: "Agente de contenção com escudo balístico e escopeta militar.",
		ataques: ["Escopeta Calibre 12 (3d6+4)", "Golpe com Escudo (1d6+3)"],
	},
	{
		id: "ameaca-dr-neruda",
		name: "Dr. Neruda (Chefe Panacea)",
		vd: 120,
		elemento: "Energia",
		tipo: "Chefe",
		pv: 220,
		defesa: 22,
		rd: 10,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token-Dr.-Neruda-borda.png",
		description:
			"Diretor da Panacea fortificado por experimentos de Energia e injeções de adrenalina.",
		ataques: [
			"Bisturi Eletrocutante (3d8+6)",
			"Injeção Viral (2d10 dano de Energia)",
		],
	},
	{
		id: "ameaca-ketan-arjuna",
		name: "Ketan Arjuna",
		vd: 80,
		elemento: "Conhecimento",
		tipo: "Chefe",
		pv: 160,
		defesa: 20,
		rd: 8,
		imageUrl:
			"/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Ketan-Arjuna-borda.png",
		description:
			"Operativo de Elite corrompido por marcas paranormais de Conhecimento.",
		ataques: ["Lâmina de Conhecimento (3d10+5)", "Disparo de Sangue (2d8+4)"],
	},
	{
		id: "ameaca-coruja",
		name: "Coruja Paranormal (Mascote)",
		vd: 15,
		elemento: "Conhecimento",
		tipo: "Mascote",
		pv: 25,
		defesa: 16,
		rd: 2,
		imageUrl:
			"/Arquivos secretos/AS3/Arquivos-Secretos-3-Extras/Arquivos-Secretos-3-Extras/Tokens 003/Coruja hexatombe.png",
		description:
			"Mascote / Criatura de vigilância paranormal com penas pretas e olhos luminescentes.",
		ataques: ["Rasgão de Garras (1d6+2)"],
	},
	{
		id: "ameaca-tatupeba",
		name: "Tatupeba Hexatombe",
		vd: 80,
		elemento: "Morte",
		tipo: "Monstro",
		pv: 150,
		defesa: 21,
		rd: 12,
		imageUrl:
			"/Arquivos secretos/AS3/Arquivos-Secretos-3-Extras/Arquivos-Secretos-3-Extras/Tokens 003/Tatupeba hexatombe.png",
		description:
			"Criatura subterrânea de Morte com carapaça de lodo temporal empedrado.",
		ataques: ["Garra Escavadora (3d8+6)", "Baforada de Lodo (2d10 Morte)"],
	},
	{
		id: "ameaca-infectado-vampire",
		name: "Infectado Vampyrico",
		vd: 40,
		elemento: "Sangue",
		tipo: "Monstro",
		pv: 85,
		defesa: 17,
		rd: 5,
		imageUrl:
			"/Arquivos secretos/AS7/Extras/AS-07-Extras-v1.0-Elite/AS 07 - Extras v1.0 - Elite/tokens hexagonais corrigidos AS 05/Token-Infectado-02-Normal-hexagonal.png",
		description:
			"Vítima transformada da HQ Vampyre com presas sobrenaturais e velocidade sobre-humana.",
		ataques: [
			"Mordida Vampyrica (2d8+4 - Drena PV)",
			"Garras Infectadas (1d10+3)",
		],
	},
];

export interface OrdemEquipamento {
	id: string;
	name: string;
	categoria: "I" | "II" | "III" | "IV";
	tipo:
		| "Arma Especial"
		| "Item Operacional"
		| "Acessório Paranormal"
		| "Consumível";
	espaco: number;
	description: string;
	efeito: string;
}

/**
 * Equipamentos Especiais dos Arquivos Secretos
 */
export const ORDEM_ITEMS_SEED: OrdemEquipamento[] = [
	{
		id: "item-lanca-nitrogenio",
		name: "Lança Nitrogênio",
		categoria: "III",
		tipo: "Arma Especial",
		espaco: 2,
		description:
			"Lança-chamas modificado que dispara um jato pressurizado de nitrogênio líquido em congelamento.",
		efeito:
			"Causa 3d8 de dano de Frio/Energia em área de 6m e deixa alvos imóveis por 1 rodada.",
	},
	{
		id: "item-aplicador-adrenalina",
		name: "Aplicador de Adrenalina Panacea",
		categoria: "I",
		tipo: "Item Operacional",
		espaco: 1,
		description:
			"Injetor pneumático desenvolvido pela Indústrias Panacea para estímulo de emergência.",
		efeito: "Concede +1 Ação de Movimento adicional na rodada de uso.",
	},
	{
		id: "item-anel-invertido",
		name: "Anel Invertido",
		categoria: "II",
		tipo: "Acessório Paranormal",
		espaco: 1,
		description:
			"Anel gravado com sigilos de Conhecimento que repele influências mentais externas.",
		efeito: "Concede +2 na Defesa Base e Redução de Dano Mental (RD Mental) 5.",
	},
	{
		id: "item-marcapasso-paranormal",
		name: "Marcapasso Paranormal",
		categoria: "II",
		tipo: "Item Operacional",
		espaco: 1,
		description:
			"Dispositivo cirúrgico energizado por Sangue que mantém o coração batendo mesmo sob trauma grave.",
		efeito:
			"Impede o agente de entrar no estado 'Morrendo' na primeira vez que os PVs caírem a 0 na cena.",
	},
	{
		id: "item-estimulo-quimico",
		name: "Estímulo Químico Tático",
		categoria: "I",
		tipo: "Consumível",
		espaco: 1,
		description: "Ampola de combate utilizada pelos seguranças da Panacea.",
		efeito:
			"Concede +1d6 em rolagens de testes de Vigor e Fortitude por 3 rodadas.",
	},
];

export const ARQUIVOS_SECRETOS_BESTIARY: ArquivosSecretosBestiaryEntry[] = [
	{
		id: "transtornado-apostolo-sangue",
		name: "Transtornado Apóstolo do Sangue",
		edition: "AS1",
		element: "Sangue",
		role: "Ameaça ritualística",
		description:
			"Criatura voltada a pressão de combate, presença brutal e manifestação de Sangue.",
		tokenId: "as1-transtornado-apostolo",
	},
	{
		id: "transtornado-assecla",
		name: "Transtornado Assecla",
		edition: "AS1",
		element: "Sangue",
		role: "Lacaio de encontro",
		description:
			"Ameaça de apoio para cenas de perseguição, contenção e combate em grupo.",
		tokenId: "as1-transtornado-assecla",
	},
	{
		id: "transtornado-investido",
		name: "Transtornado Investido",
		edition: "AS1",
		element: "Sangue",
		role: "Executor",
		description:
			"Presença física mais agressiva para escalar uma cena de investigação para combate.",
		tokenId: "as1-transtornado-investido",
	},
];
