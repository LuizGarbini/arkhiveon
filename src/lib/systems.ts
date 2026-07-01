/**
 * Configuração por sistema de RPG.
 *
 * Define quais abas e campos do formulário de personagem devem aparecer,
 * permitindo um formulário único e dinâmico em vez de um formulário por
 * sistema. Adicionar um novo sistema é só adicionar uma entrada aqui.
 */

import type { LucideIcon } from "lucide-react";
import {
	Atom,
	Biohazard,
	Bird,
	BookHeart,
	Cat,
	CircleDot,
	Cog,
	Crosshair,
	Crown,
	Dices,
	Eye,
	Flame,
	Ghost,
	Globe,
	Guitar,
	Heart,
	Hexagon,
	Joystick,
	Moon,
	Mountain,
	Music,
	Radiation,
	Scroll,
	Shield,
	Skull,
	Sparkles,
	Star,
	Sword,
	Swords,
	Target,
	TreePine,
	Wand2,
	Zap,
} from "lucide-react";
import type { RpgSystem } from "./store";
import { RPG_SYSTEMS } from "./store";

export type CharacterSection =
	| "identity"
	| "abilities"
	| "combat"
	| "personality"
	| "magic"
	| "notes"
	| "sanity"
	| "inventory";

export interface SystemAttribute {
	key: string;
	label: string;
}

export interface CustomField {
	key: string;
	label: string;
	type: "text" | "textarea" | "number";
	section: CharacterSection;
	hint?: string;
}

export interface SystemConfig {
	value: RpgSystem;
	label: string;
	tagline: string;
	description: string;
	Icon: LucideIcon;
	accent: string; // tailwind text color (ex: "text-amber-300")
	bgAccent: string; // tailwind bg gradient
	sections: CharacterSection[];
	attributes: SystemAttribute[];
	customFields?: CustomField[];
	defaultLevel: number;
	speedUnit: string;
	showSpells: boolean;
	showSanity: boolean;
	showFeats: boolean;
	defaultDice?: "d20" | "d100" | "d10" | "d6";
}

// Helper to build a config entry with sensible defaults
function sys(
	partial: Pick<
		SystemConfig,
		| "value"
		| "label"
		| "tagline"
		| "description"
		| "Icon"
		| "accent"
		| "bgAccent"
	> &
		Partial<SystemConfig>,
): SystemConfig {
	return {
		sections: [
			"identity",
			"abilities",
			"combat",
			"personality",
			"magic",
			"notes",
		],
		attributes: [
			{ key: "strength", label: "FOR" },
			{ key: "dexterity", label: "DES" },
			{ key: "constitution", label: "CON" },
			{ key: "intelligence", label: "INT" },
			{ key: "wisdom", label: "SAB" },
			{ key: "charisma", label: "CAR" },
		],
		defaultLevel: 1,
		speedUnit: "m",
		showSpells: true,
		showSanity: false,
		showFeats: true,
		defaultDice: "d20",
		...partial,
	};
}

export const SYSTEM_CONFIG: Record<RpgSystem, SystemConfig> = {
	dnd5e: sys({
		value: "dnd5e",
		label: "D&D 5ª Edição (2014)",
		tagline: "Heróis e dragões",
		description:
			"Template completo para D&D 5e clássico com atributos, perícias, saving throws, spell slots e inventário.",
		Icon: Swords,
		accent: "text-amber-300",
		bgAccent: "from-amber-500/15 to-rose-500/5",
		speedUnit: "ft",
	}),
	dnd2024: sys({
		value: "dnd2024",
		label: "D&D 2024",
		tagline: "Nova geração",
		description:
			"Template para D&D 2024 (5.5e) com Heroic Inspiration, Weapon Mastery, Species e novas mecânicas.",
		Icon: Sparkles,
		accent: "text-yellow-300",
		bgAccent: "from-yellow-500/15 to-amber-500/5",
		speedUnit: "ft",
	}),
	dnd35: sys({
		value: "dnd35",
		label: "D&D 3.5",
		tagline: "O clássico do D20",
		description:
			"Template completo para D&D 3.5 com atributos clássicos, magias e talentos sob regras OGL.",
		Icon: Swords,
		accent: "text-orange-300",
		bgAccent: "from-orange-500/15 to-amber-500/5",
		speedUnit: "m",
	}),
	vampire: sys({
		value: "vampire",
		label: "Vampiro: A Máscara",
		tagline: "Seres da noite",
		description:
			"Template para Vampire: The Masquerade com atributos físicos, sociais e mentais, disciplinas e recursos.",
		Icon: Moon,
		accent: "text-violet-300",
		bgAccent: "from-violet-500/15 to-rose-500/5",
		defaultDice: "d10",
		attributes: [
			{ key: "strength", label: "FOR" },
			{ key: "dexterity", label: "DES" },
			{ key: "stamina", label: "VIG" },
			{ key: "charisma", label: "CAR" },
			{ key: "manipulation", label: "MAN" },
			{ key: "composure", label: "AUT" },
			{ key: "intelligence", label: "INT" },
			{ key: "wits", label: "RAC" },
			{ key: "resolve", label: "PER" },
		],
		customFields: [
			{
				key: "disciplines",
				label: "Disciplinas",
				type: "textarea",
				section: "magic",
			},
			{
				key: "bloodPotency",
				label: "Potência de Sangue (ou Geração)",
				type: "text",
				section: "combat",
			},
			{
				key: "hunger",
				label: "Fome (ou Pontos de Sangue)",
				type: "text",
				section: "combat",
			},
			{
				key: "humanity",
				label: "Humanidade",
				type: "number",
				section: "personality",
			},
		],
		showSpells: false,
	}),
	coc: sys({
		value: "coc",
		label: "Call of Cthulhu 7e",
		tagline: "Horror cósmico",
		description:
			"Template para Call of Cthulhu 7ª Edição com sanidade, perícias d100 e investigação.",
		Icon: Eye,
		accent: "text-cyan-300",
		bgAccent: "from-cyan-500/15 to-indigo-500/5",
		defaultDice: "d100",
		sections: [
			"identity",
			"abilities",
			"sanity",
			"combat",
			"personality",
			"notes",
		],
		attributes: [
			{ key: "strength", label: "FOR" },
			{ key: "constitution", label: "CON" },
			{ key: "size", label: "TAM" },
			{ key: "dexterity", label: "DES" },
			{ key: "appearance", label: "APA" },
			{ key: "intelligence", label: "INT" },
			{ key: "power", label: "POD" },
			{ key: "education", label: "EDU" },
		],
		customFields: [
			{ key: "luck", label: "Sorte Atual", type: "number", section: "sanity" },
			{
				key: "magicPoints",
				label: "Pontos de Magia",
				type: "number",
				section: "sanity",
			},
			{
				key: "moveRate",
				label: "Taxa de Movimento",
				type: "number",
				section: "combat",
			},
		],
		showSpells: false,
		showSanity: true,
	}),
	tormenta20: sys({
		value: "tormenta20",
		label: "Tormenta 20",
		tagline: "Arton em chamas",
		description:
			"Template para Tormenta 20 com atributos, perícias e poderes do sistema brasileiro.",
		Icon: Crosshair,
		accent: "text-rose-300",
		bgAccent: "from-rose-500/15 to-fuchsia-500/5",
	}),
	ordem: sys({
		value: "ordem",
		label: "Ordem Paranormal",
		tagline: "Outro lado da realidade",
		description:
			"Template completo para Ordem Paranormal v2 com origens, classes, trilhas, poderes, rituais e condições.",
		Icon: Skull,
		accent: "text-rose-300",
		bgAccent: "from-rose-500/15 to-zinc-500/5",
		defaultDice: "d100",
		sections: [
			"identity",
			"abilities",
			"sanity",
			"combat",
			"personality",
			"magic",
			"notes",
		],
		attributes: [
			{ key: "agility", label: "AGI" },
			{ key: "strength", label: "FOR" },
			{ key: "intellect", label: "INT" },
			{ key: "presence", label: "PRE" },
			{ key: "vigor", label: "VIG" },
		],
		customFields: [
			{
				key: "nex",
				label: "Nível de Exposição Paranormal (NEX %)",
				type: "number",
				section: "identity",
			},
			{ key: "trilha", label: "Trilha", type: "text", section: "identity" },
			{ key: "origem", label: "Origem", type: "text", section: "identity" },
			{
				key: "pe",
				label: "Pontos de Esforço Atual",
				type: "number",
				section: "sanity",
			},
			{ key: "peMax", label: "PE Máximo", type: "number", section: "sanity" },
			{
				key: "defesa",
				label: "Defesas (Passiva, Esquiva, Bloqueio)",
				type: "text",
				section: "combat",
			},
			{
				key: "poderes",
				label: "Poderes Paranormais",
				type: "textarea",
				section: "magic",
			},
			{ key: "rituais", label: "Rituais", type: "textarea", section: "magic" },
		],
		showSpells: false,
		showSanity: true,
	}),
	contosloop: sys({
		value: "contosloop",
		label: "Contos do Loop",
		tagline: "Crianças e mistérios",
		description:
			"Template completo para Tales from the Loop com arquétipos, criação de personagem, rolagem d6 e condições.",
		Icon: Joystick,
		accent: "text-teal-300",
		bgAccent: "from-teal-500/15 to-sky-500/5",
		defaultDice: "d6",
		showSpells: false,
	}),
	mausritter: sys({
		value: "mausritter",
		label: "Mausritter",
		tagline: "Ratinhos aventureiros",
		description:
			"Template para Mausritter com atributos, inventário em grid, condições e herança.",
		Icon: Cat,
		accent: "text-orange-300",
		bgAccent: "from-orange-500/15 to-yellow-500/5",
		showSpells: false,
	}),
	daggerheart: sys({
		value: "daggerheart",
		label: "Daggerheart",
		tagline: "Duality Dice",
		description:
			"Template completo para Daggerheart com Duality Dice (2d12), Hope, Stress, Domain Cards e todas as mecânicas.",
		Icon: Heart,
		accent: "text-pink-300",
		bgAccent: "from-pink-500/15 to-rose-500/5",
	}),
	cyberpunkred: sys({
		value: "cyberpunkred",
		label: "Cyberpunk RED",
		tagline: "Futuro sombrio",
		description:
			"Template para Cyberpunk RED com Stats, Skills categorizadas, Combate, Cyberware e Lifepath.",
		Icon: Zap,
		accent: "text-red-400",
		bgAccent: "from-red-500/15 to-yellow-500/5",
		defaultDice: "d10",
		showSpells: false,
	}),
	fallout2d20: sys({
		value: "fallout2d20",
		label: "Fallout RPG (2d20)",
		tagline: "Guerra nunca muda",
		description:
			"Sistema 2d20 da Modiphius para o universo Fallout com S.P.E.C.I.A.L., perícias, localização de dano e mais.",
		Icon: Radiation,
		accent: "text-lime-300",
		bgAccent: "from-lime-500/15 to-green-500/5",
		attributes: [
			{ key: "strength", label: "STR" },
			{ key: "perception", label: "PER" },
			{ key: "endurance", label: "END" },
			{ key: "charisma", label: "CHA" },
			{ key: "intelligence", label: "INT" },
			{ key: "agility", label: "AGI" },
			{ key: "luck", label: "LCK" },
		],
		showSpells: false,
	}),
	wilderfeast: sys({
		value: "wilderfeast",
		label: "Wilderfeast",
		tagline: "Caça a monstros",
		description:
			"Sistema de caça a monstros com Linhagens, Utensílios, Estilos e sistema de Focar/Agir Selvagem.",
		Icon: Bird,
		accent: "text-emerald-300",
		bgAccent: "from-emerald-500/15 to-lime-500/5",
		showSpells: false,
	}),
	gothrpg: sys({
		value: "gothrpg",
		label: "Guerra dos Tronos RPG",
		tagline: "Intriga e poder",
		description:
			"Sistema baseado em pool de d6 com habilidades, especialidades e mecânicas de bônus/penalidade.",
		Icon: Crown,
		accent: "text-amber-400",
		bgAccent: "from-amber-500/15 to-yellow-500/5",
		defaultDice: "d6",
		showSpells: false,
	}),
	cosmere: sys({
		value: "cosmere",
		label: "Cosmere RPG",
		tagline: "Guerra das Tempestades",
		description:
			"Sistema Cosmere v1.01 com 6 atributos, 18 perícias, Dado de Trama e mecânicas de Oportunidade/Complicação.",
		Icon: Globe,
		accent: "text-sky-300",
		bgAccent: "from-sky-500/15 to-blue-500/5",
	}),
	hogwarts: sys({
		value: "hogwarts",
		label: "Hogwarts: Um RPG (PbtA)",
		tagline: "Mundo bruxo",
		description:
			"Sistema PbtA para aventuras no mundo bruxo com Casas, feitiços, condições e movimentos 2d6.",
		Icon: Wand2,
		accent: "text-purple-300",
		bgAccent: "from-purple-500/15 to-indigo-500/5",
		defaultDice: "d6",
	}),
	avatarlegends: sys({
		value: "avatarlegends",
		label: "Avatar Legends",
		tagline: "Equilíbrio elemental",
		description:
			"Sistema PbtA no universo Avatar com Equilíbrio, Estatísticas, Técnicas e Trocas de combate.",
		Icon: Flame,
		accent: "text-orange-300",
		bgAccent: "from-orange-500/15 to-red-500/5",
		defaultDice: "d6",
	}),
	"3det": sys({
		value: "3det",
		label: "3DeT Victory",
		tagline: "Simples e versátil",
		description:
			"Sistema 3D&T Victory com atributos P/H/R, perícias, vantagens, desvantagens, arquétipos e técnicas.",
		Icon: Dices,
		accent: "text-blue-300",
		bgAccent: "from-blue-500/15 to-indigo-500/5",
		defaultDice: "d6",
		attributes: [
			{ key: "power", label: "POD" },
			{ key: "skill", label: "HAB" },
			{ key: "resistance", label: "RES" },
		],
	}),
	assassinscreed: sys({
		value: "assassinscreed",
		label: "Assassin's Creed RPG",
		tagline: "Nada é verdade",
		description:
			"Sistema Match da CapyCat Games com dados simbólicos d6, Abordagens, Frustrações e Sincronia.",
		Icon: Target,
		accent: "text-slate-300",
		bgAccent: "from-slate-500/15 to-red-500/5",
		defaultDice: "d6",
		showSpells: false,
	}),
	corespring: sys({
		value: "corespring",
		label: "Corespring RPG",
		tagline: "Dado Rebelde",
		description:
			"Sistema Corespring com Dado Rebelde d12B, Estrelas Imperiais, combate por zonas e automação completa.",
		Icon: Star,
		accent: "text-indigo-300",
		bgAccent: "from-indigo-500/15 to-violet-500/5",
	}),
	corespringnpc: sys({
		value: "corespringnpc",
		label: "Corespring — Ameaça",
		tagline: "Ficha de NPC",
		description:
			"Ficha de Ameaça/NPC do Corespring com ações, reações, habilidades imperiais e painel de encontro.",
		Icon: Shield,
		accent: "text-indigo-400",
		bgAccent: "from-indigo-600/15 to-violet-500/5",
		showSpells: false,
	}),
	melodiaperdida: sys({
		value: "melodiaperdida",
		label: "Melodia Perdida",
		tagline: "Espada & Canção",
		description:
			"Um RPG de Espada & Canção com corações, canções mágicas d6, inventário 12 slots e relíquias.",
		Icon: Music,
		accent: "text-fuchsia-300",
		bgAccent: "from-fuchsia-500/15 to-pink-500/5",
		defaultDice: "d6",
	}),
	olddragon2e: sys({
		value: "olddragon2e",
		label: "Old Dragon 2e",
		tagline: "OSR brasileiro",
		description:
			"Ficha premium para Old Dragon 2ª Edição com atributos, JP, BA, magias, inventário e habilidades.",
		Icon: Scroll,
		accent: "text-amber-300",
		bgAccent: "from-amber-500/15 to-orange-500/5",
	}),
	skyfall: sys({
		value: "skyfall",
		label: "Skyfall RPG",
		tagline: "Azul noturno",
		description:
			"Ficha oficial Skyfall RPG (Azul Noturno & Ciano) com Atributos, Catarse, Sombra e Magias.",
		Icon: Sparkles,
		accent: "text-cyan-400",
		bgAccent: "from-cyan-500/15 to-blue-500/5",
	}),
	symbaroum: sys({
		value: "symbaroum",
		label: "Symbaroum",
		tagline: "Fantasia sombria",
		description:
			"RPG de fantasia sombria com d20 rolar-abaixo, Corrupção, floresta Davokar e as ruínas de Symbaroum.",
		Icon: TreePine,
		accent: "text-emerald-400",
		bgAccent: "from-emerald-500/15 to-green-500/5",
	}),
	ronin: sys({
		value: "ronin",
		label: "Ronin RPG (Puro Osso)",
		tagline: "Samurai sombrio",
		description:
			"RPG samurai sombrio compatível com Mörk Borg com 10 classes, sistema de Honra e Textos (magias).",
		Icon: Sword,
		accent: "text-zinc-300",
		bgAccent: "from-zinc-500/15 to-stone-500/5",
	}),
	duna: sys({
		value: "duna",
		label: "Duna: Aventuras no Imperium",
		tagline: "Arrakis espera",
		description:
			"Sistema 2d20 Modiphius no universo de Duna. Intriga política, duelos, espionagem e guerra em Arrakis.",
		Icon: Mountain,
		accent: "text-amber-400",
		bgAccent: "from-amber-600/15 to-orange-500/5",
		showSpells: false,
	}),
	stalker: sys({
		value: "stalker",
		label: "STALKER RPG 2ª Ed.",
		tagline: "A Zona te chama",
		description:
			"Ficção científica sombria com sistema FLOW (narrativo/sem dados) e sistema alternativo de pool d6.",
		Icon: Biohazard,
		accent: "text-yellow-400",
		bgAccent: "from-yellow-500/15 to-lime-500/5",
		defaultDice: "d6",
		showSpells: false,
	}),
	fissura: sys({
		value: "fissura",
		label: "Fissura RPG",
		tagline: "Pilotos e Mekas",
		description:
			"Fichas oficiais de Fissura RPG para Piloto+Meka, Kaiju, Metamorfo e Alien. Sistema D10/D100.",
		Icon: Hexagon,
		accent: "text-violet-400",
		bgAccent: "from-violet-500/15 to-purple-500/5",
		defaultDice: "d100",
		showSpells: false,
	}),
	meltedlands: sys({
		value: "meltedlands",
		label: "Melted Lands",
		tagline: "Terror distópico",
		description:
			"RPG de terror distópico pós-apocalíptico. Sistema D6TOPIA com pool de d6, monitores de Sanidade e Sobrevivência.",
		Icon: Ghost,
		accent: "text-red-300",
		bgAccent: "from-red-500/15 to-orange-500/5",
		defaultDice: "d6",
		showSpells: false,
		showSanity: true,
		sections: [
			"identity",
			"abilities",
			"sanity",
			"combat",
			"personality",
			"notes",
		],
	}),
	savageworlds: sys({
		value: "savageworlds",
		label: "Savage Worlds SWADE",
		tagline: "Rápido e furioso",
		description:
			"Ficha para SWADE com Atributos d4–d12, Habilidades, Wounds, Fatigue, Bennies e Action Deck.",
		Icon: Dices,
		accent: "text-red-400",
		bgAccent: "from-red-600/15 to-amber-500/5",
	}),
	sacramento: sys({
		value: "sacramento",
		label: "Sacramento RPG",
		tagline: "Faroeste narrativo",
		description:
			"Faroeste narrativo com baralho francês, mão de pôquer e três atributos: Pistoleiro, Bronco e Frio.",
		Icon: CircleDot,
		accent: "text-yellow-300",
		bgAccent: "from-yellow-600/15 to-amber-500/5",
		attributes: [
			{ key: "gunslinger", label: "PIS" },
			{ key: "brute", label: "BRO" },
			{ key: "cold", label: "FRI" },
		],
		showSpells: false,
	}),
	somdasseis: sys({
		value: "somdasseis",
		label: "O Som das Seis",
		tagline: "Faroeste pós-guerra",
		description:
			"RPG de Faroeste pós-Guerra Civil. 1d6 vs. 7, Antecedentes, Habilidades, Tormentos e Cartas de Sina.",
		Icon: Guitar,
		accent: "text-amber-300",
		bgAccent: "from-amber-500/15 to-stone-500/5",
		defaultDice: "d6",
		showSpells: false,
	}),
	fabulaultima: sys({
		value: "fabulaultima",
		label: "Fabula Ultima",
		tagline: "JRPG de mesa",
		description:
			"RPG JRPG tributo a Final Fantasy. Atributos d6–d12, multiclasse, Laços, Pontos de Fabula e 6 disciplinas.",
		Icon: BookHeart,
		accent: "text-pink-300",
		bgAccent: "from-pink-500/15 to-fuchsia-500/5",
	}),
	ashesoftomorrow: sys({
		value: "ashesoftomorrow",
		label: "Ashes of Tomorrow",
		tagline: "Pós-apocalipse BR",
		description:
			"RPG pós-apocalíptico brasileiro. 3d6 contra limiares, 6 Semblantes, 8 círculos de Estresse.",
		Icon: Atom,
		accent: "text-emerald-300",
		bgAccent: "from-emerald-500/15 to-teal-500/5",
		defaultDice: "d6",
		showSanity: true,
		sections: [
			"identity",
			"abilities",
			"sanity",
			"combat",
			"personality",
			"notes",
		],
	}),
	l5r5e: sys({
		value: "l5r5e",
		label: "Legend of the Five Rings 5e",
		tagline: "Drama samurai",
		description:
			"Drama samurai em Rokugan. Roll & Keep (d6+d12), cinco Anéis elementais, Honor/Glory/Status.",
		Icon: Scroll,
		accent: "text-red-300",
		bgAccent: "from-red-500/15 to-amber-500/5",
	}),
	weirdwizard: sys({
		value: "weirdwizard",
		label: "Shadow of the Weird Wizard",
		tagline: "Fantasia heroica sombria",
		description:
			"Fantasia heroica sombria de Robert J. Schwalb com d20 + Dádivas/Reveses, trilhas e 33 tradições mágicas.",
		Icon: Wand2,
		accent: "text-teal-300",
		bgAccent: "from-teal-500/15 to-emerald-500/5",
	}),
	demonlord: sys({
		value: "demonlord",
		label: "Shadow of the Demon Lord",
		tagline: "Horror apocalíptico",
		description:
			"Horror cósmico apocalíptico com d20 + Dádivas/Reveses, Insanidade, Corrupção e magia Forbidden.",
		Icon: Skull,
		accent: "text-red-400",
		bgAccent: "from-red-600/15 to-violet-500/5",
		showSanity: true,
		sections: [
			"identity",
			"abilities",
			"sanity",
			"combat",
			"personality",
			"magic",
			"notes",
		],
	}),
	pathfinder: sys({
		value: "pathfinder",
		label: "Pathfinder 2e",
		tagline: "Tática e profundidade",
		description:
			"Variante d20 com 4 graus de proficiência, 3 ações por turno e magias.",
		Icon: BookHeart,
		accent: "text-emerald-300",
		bgAccent: "from-emerald-500/15 to-cyan-500/5",
		speedUnit: "ft",
	}),
	generic: sys({
		value: "generic",
		label: "Genérico / Outro",
		tagline: "Qualquer sistema",
		description:
			"Use os campos livres. Bom pra fichas próprias, sistemas indie ou conversão.",
		Icon: Cog,
		accent: "text-slate-300",
		bgAccent: "from-slate-500/15 to-zinc-500/5",
		attributes: [
			{ key: "a1", label: "A1" },
			{ key: "a2", label: "A2" },
			{ key: "a3", label: "A3" },
			{ key: "a4", label: "A4" },
			{ key: "a5", label: "A5" },
			{ key: "a6", label: "A6" },
		],
	}),
};

export const SYSTEM_LIST = RPG_SYSTEMS.map((s) => SYSTEM_CONFIG[s.value]);

export function getFeatsLabel(system: string): string {
	switch (system) {
		case "ordem":
		case "tormenta20":
			return "Poderes";
		case "vampire":
			return "Qualidades e Defeitos";
		case "savageworlds":
			return "Vantagens e Complicações";
		case "fabulaultima":
			return "Habilidades de Classe";
		default:
			return "Talentos";
	}
}
