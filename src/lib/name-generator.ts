// Gerador temático de nomes contextual para personagens de RPG

export interface NameGeneratorConfig {
	system: string;
	race?: string;
	class?: string;
	attributes?: Record<string, number>;
}

const FIRST_NAMES: Record<string, string[]> = {
	elf: [
		"Aerith",
		"Legolas",
		"Eldrin",
		"Faelar",
		"Galadriel",
		"Celeborn",
		"Tauriel",
		"Thranduil",
		"Haldir",
		"Arwen",
		"Elrond",
		"Luthien",
		"Finarfin",
		"Aredhel",
		"Elessar",
		"Valandil",
	],
	dwarf: [
		"Gimli",
		"Thorin",
		"Balin",
		"Dwalin",
		"Bruenor",
		"Bofur",
		"Gloin",
		"Dain",
		"Thrain",
		"Borin",
		"Kili",
		"Fili",
		"Durin",
		"Thror",
		"Fundin",
		"Gamil",
	],
	halfling: [
		"Bilbo",
		"Frodo",
		"Samwise",
		"Pippin",
		"Merry",
		"Peregrin",
		"Meriadoc",
		"Bungo",
		"Drogo",
		"Paladin",
		"Saradoc",
		"Rufus",
		"Esmeralda",
		"Lobelia",
	],
	orc: [
		"Grommash",
		"Garrosh",
		"Thrall",
		"Durotan",
		"Orgrim",
		"Kargath",
		"Gul'dan",
		"Saurfang",
		"Drek'Thar",
		"Broxigar",
		"Kilrogg",
		"Maim",
		"Grom",
		"Nazgrel",
	],
	tiefling: [
		"Damakos",
		"Akmenos",
		"Kallista",
		"Lerissa",
		"Therai",
		"Zanna",
		"Malphas",
		"Iados",
		"Melech",
		"Mordai",
		"Crius",
		"Pelaias",
		"Aza",
		"Bryseis",
	],
	fantasy_human: [
		"Roderick",
		"Alistair",
		"Valerius",
		"Beatrice",
		"Isolde",
		"Kaelen",
		"Lyra",
		"Tristan",
		"Rowena",
		"Cedric",
		"Gareth",
		"Evelyn",
		"Alden",
		"Genevieve",
		"Percival",
		"Garrick",
	],
	modern_pt: [
		"Arthur",
		"Thiago",
		"Elizabeth",
		"César",
		"Joui",
		"Alex",
		"Daniel",
		"Kaiser",
		"Moura",
		"Beatriz",
		"Sofia",
		"Lucas",
		"Mariana",
		"Rafael",
		"Helena",
		"Gustavo",
		"Mateus",
		"Clara",
	],
	modern_en: [
		"Thomas",
		"Sarah",
		"Michael",
		"Elizabeth",
		"Arthur",
		"John",
		"Eleanor",
		"Charles",
		"James",
		"Margaret",
		"Edward",
		"William",
		"Robert",
		"Mary",
		"Dorothy",
		"Richard",
	],
};

const LAST_NAMES: Record<string, string[]> = {
	elf: [
		"Folha Lunar",
		"Sussurro Solar",
		"Estrela Cadente",
		"Vento Verde",
		"Orvalho Suave",
		"Brisa Divina",
		"Flor da Noite",
		"Orvalho da Manhã",
		"Coração de Carvalho",
		"Espada de Prata",
	],
	dwarf: [
		"Martelo Forte",
		"Escudo de Pedra",
		"Barba de Bronze",
		"Mina de Ouro",
		"Punho de Ferro",
		"Yelmo de Aço",
		"Quebra-Gemas",
		"Ferreiro da Montanha",
		"Pilar de Rocha",
		"Machado Duplo",
	],
	halfling: [
		"Bolseiro",
		"Brandibuque",
		"Tûk",
		"Jardineiro",
		"Pé-Leve",
		"Cerejeira",
		"Baga-do-Bosque",
		"Toca-Funda",
		"Folha-de-Fumo",
		"Colina-Verde",
	],
	orc: [
		"Quebra-Crânios",
		"Olho de Sangue",
		"Mão Negra",
		"Garra de Lobo",
		"Grito de Guerra",
		"Presa Rígida",
		"Destruidor de Portões",
		"Pele de Ferro",
		"Sede de Sangue",
	],
	tiefling: [
		"Tormento",
		"Cinzas",
		"Cisma",
		"Pecado",
		"Rancor",
		"Heresia",
		"Pesadelo",
		"Sombra",
		"Vingança",
		"Ruína",
	],
	fantasy_human: [
		"Ravenwood",
		"Stoneheart",
		"Ashcroft",
		"Blackwood",
		"Winterborn",
		"Kingsley",
		"Pendleton",
		"Sterling",
		"Oakheart",
		"Windward",
		"Stormborn",
		"Fairfax",
	],
	modern_pt: [
		"Mendes",
		"Santos",
		"Oliveira",
		"Silva",
		"Costa",
		"Souza",
		"Lima",
		"Rocha",
		"Ferraz",
		"Teixeira",
		"Simas",
		"Fritz",
		"Carvalho",
		"Gomes",
		"Barbosa",
	],
	modern_en: [
		"Vance",
		"Miller",
		"Higgins",
		"Carter",
		"Winchester",
		"Ashcroft",
		"Sterling",
		"Blackwood",
		"Watson",
		"Holmes",
		"Parker",
		"White",
	],
};

const MODERN_NICKNAMES: Record<string, string[]> = {
	ocultista: ["Profano", "Sombra", "Enigma", "Cinzas", "Cético", "Vazio", "Oculto"],
	mago: ["Místico", "Grimório", "Enigma", "Arcano"],
	combatente: ["Kaiser", "Bruto", "Escudo", "Fera", "Tanque", "Cão de Fila", "Garras"],
	guerreiro: ["Destemido", "Lâmina", "Bárbaro", "Aço", "Muralha"],
	especialista: ["Fritz", "Olho Clínico", "Gatilho", "Sombra", "Lince", "Arqueiro"],
	ladino: ["Fantasma", "Gato", "Sombra", "Silêncio", "Trapaceiro", "Ladino"],
	general: ["Corvo", "Lobo", "Raposa", "Anjo", "Cético", "Espirito", "Fênix"],
};

const FANTASY_EPITHETS: Record<string, string[]> = {
	strength: ["o Brutal", "o Rústico", "o Quebrador de Escudos", "o Punho de Aço"],
	intelligence: ["o Sábio", "o Astuto", "o Tecelão de Runas", "o Erudito"],
	dexterity: ["o Ágil", "o Pés Leves", "o Silencioso", "o Sombra"],
	wisdom: ["o Observador", "o Místico", "o Guardião", "o Guia"],
	charisma: ["o Lábia de Ouro", "o Encantador", "o Magnífico", "o Poeta"],
	constitution: ["o Robusto", "o Inquebrável", "o Imortal", "o Resiliente"],
};

export function generateThematicName({
	system,
	race,
	class: className,
	attributes,
}: NameGeneratorConfig): string {
	const sys = system.toLowerCase();
	const isModern = sys === "coc" || sys === "ordem" || sys === "vampire";

	let firstNamesList: string[] = [];
	let lastNamesList: string[] = [];

	if (isModern) {
		// Escolhe entre nomes em inglês e português com base no sistema
		const isPt = sys === "ordem" || Math.random() > 0.5;
		firstNamesList = isPt ? FIRST_NAMES.modern_pt : FIRST_NAMES.modern_en;
		lastNamesList = isPt ? LAST_NAMES.modern_pt : LAST_NAMES.modern_en;
	} else {
		// Sistemas de fantasia: define pela raça
		const rc = (race || "").toLowerCase();
		let raceKey = "fantasy_human";

		if (rc.includes("elf") || rc.includes("elfo")) raceKey = "elf";
		else if (rc.includes("anão") || rc.includes("dwarf") || rc.includes("anao")) raceKey = "dwarf";
		else if (rc.includes("halfling") || rc.includes("hobbit")) raceKey = "halfling";
		else if (rc.includes("orc") || rc.includes("goblin")) raceKey = "orc";
		else if (rc.includes("tiefling") || rc.includes("demônio") || rc.includes("demon")) raceKey = "tiefling";

		firstNamesList = FIRST_NAMES[raceKey] || FIRST_NAMES.fantasy_human;
		lastNamesList = LAST_NAMES[raceKey] || LAST_NAMES.fantasy_human;
	}

	const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

	const firstName = getRandom(firstNamesList);
	const lastName = getRandom(lastNamesList);

	if (isModern) {
		// 40% de chance de adicionar um apelido moderninho no meio
		if (Math.random() < 0.4) {
			const cls = (className || "").toLowerCase();
			let nickKey = "general";

			if (cls.includes("ocult") || cls.includes("mago")) nickKey = "ocultista";
			else if (cls.includes("combat") || cls.includes("guer")) nickKey = "combatente";
			else if (cls.includes("espec") || cls.includes("lad")) nickKey = "especialista";

			const nick = getRandom(MODERN_NICKNAMES[nickKey] || MODERN_NICKNAMES.general);
			return `${firstName} "${nick}" ${lastName}`;
		}
		return `${firstName} ${lastName}`;
	}

	// Fantasia: 35% de chance de adicionar um epíteto/título lendário com base nos atributos ou classe
	if (Math.random() < 0.35) {
		let bestAttr = "general";
		let maxVal = 13; // Apenas se tiver um atributo de destaque (14 ou mais)

		if (attributes) {
			for (const [key, val] of Object.entries(attributes)) {
				if (val > maxVal && FANTASY_EPITHETS[key]) {
					maxVal = val;
					bestAttr = key;
				}
			}
		}

		// Se não tiver atributo de destaque, tenta associar pela classe
		if (bestAttr === "general" && className) {
			const cls = className.toLowerCase();
			if (cls.includes("barb") || cls.includes("guer") || cls.includes("pal")) bestAttr = "strength";
			else if (cls.includes("mag") || cls.includes("bru") || cls.includes("dru")) bestAttr = "intelligence";
			else if (cls.includes("lad") || cls.includes("mon") || cls.includes("pat")) bestAttr = "dexterity";
			else if (cls.includes("cler") || cls.includes("bardo")) bestAttr = "charisma";
		}

		// Se mesmo assim não achou nada, escolhe um aleatório dos atributos
		if (bestAttr === "general") {
			const keys = Object.keys(FANTASY_EPITHETS);
			bestAttr = keys[Math.floor(Math.random() * keys.length)];
		}

		const epithet = getRandom(FANTASY_EPITHETS[bestAttr]);
		return `${firstName} ${lastName}, ${epithet}`;
	}

	return `${firstName} ${lastName}`;
}
