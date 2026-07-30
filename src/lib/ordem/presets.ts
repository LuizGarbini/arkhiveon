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
