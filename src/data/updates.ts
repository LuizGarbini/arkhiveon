export interface UpdateEntry {
	id: string;
	version: string;
	date: string;
	title: string;
	description: string;
	bullets: string[];
	mediaUrl?: string;
	mediaType?: "image" | "video";
}

export const CHANGELOG_DATA: UpdateEntry[] = [
	{
		id: "v1.2.0-upload",
		version: "1.2.0",
		date: "29/06/2026",
		title: "Envio de Imagens Otimizado e Mais Seguro",
		description: "Reformulamos o sistema de upload de arquivos para processamento direto no servidor Deno, eliminando vulnerabilidades de cota e tornando o carregamento mais leve.",
		bullets: [
			"Upload direto para o servidor com compressão em segundo plano no navegador.",
			"Validação instantânea de cota de armazenamento antes do envio.",
			"Mais velocidade de upload em conexões móveis ou lentas."
		]
	},
	{
		id: "v1.1.5-transitions",
		version: "1.1.5",
		date: "25/06/2026",
		title: "Transições e Micro-animações Fluidas",
		description: "Adicionamos animações refinadas nas abas de formulários e caixas de diálogos para tornar a navegação pela plataforma premium e dinâmica.",
		bullets: [
			"Efeito de slide direcional nas abas baseado na direção do clique.",
			"Efeito de tremor nos campos com preenchimento inválido.",
			"Animação de pop-in para números que sofrem atualizações."
		]
	},
	{
		id: "v1.1.0-pdf-export",
		version: "1.1.0",
		date: "24/06/2026",
		title: "Carregamento Otimizado de PDFs",
		description: "Carregamento sob demanda da biblioteca de PDF para poupar megabytes no carregamento inicial da página.",
		bullets: [
			"Abertura instantânea da ficha de personagem.",
			"Mecanismo de 'lazy loading' do gerador de PDFs."
		]
	},
	{
		id: "v1.0.5-spotify-security",
		version: "1.0.5",
		date: "22/06/2026",
		title: "Segurança Aprimorada do Spotify",
		description: "Remoção de tokens sensíveis de autenticação do armazenamento local, mantendo-os estritamente em memória temporária.",
		bullets: [
			"Prevenção contra roubo de tokens via XSS.",
			"Autenticação mais limpa e em conformidade com as diretrizes do Spotify."
		]
	},
	{
		id: "v1.0.0-launch",
		version: "1.0.0",
		date: "19/06/2026",
		title: "Lançamento Oficial do Arkhiveon!",
		description: "Seja bem-vindo ao Arkhiveon! A plataforma completa para organizar suas campanhas de RPG de mesa.",
		bullets: [
			"Fichas customizadas para D&D 5e, Call of Cthulhu, Ordem Paranormal e mais.",
			"Diário de sessões, NPCs, grimório de magias e diário de lore da campanha.",
			"Sincronização em tempo real entre mestre e jogadores."
		]
	}
];
