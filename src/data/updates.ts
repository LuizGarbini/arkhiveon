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
		id: "v1.3.6-character-card",
		version: "1.3.6",
		date: "10/07/2026",
		title: "Novo card de personagem!",
		description:
			"Redesenhamos o card da lista de personagens com visual full-bleed inspirado em capa de livro, mantendo ações rápidas e edição de imagem.",
		bullets: [
			"Retrato em tela cheia com gradientes para leitura do nome e das estatísticas.",
			"Fallback por classe com presets quando o personagem ainda não tem foto.",
			"Ações de editar, excluir e trocar imagem acessíveis no próprio card.",
			"Alinhamento da busca e do grid com as bordas do cabeçalho da página.",
		],
	},
	{
		id: "v1.3.5-realtime-notifications",
		version: "1.3.5",
		date: "09/07/2026",
		title: "Notificações em Tempo Real Otimizadas!",
		description:
			"Melhoramos a estabilidade da sincronização colaborativa. Agora os jogadores recebem alertas visuais e atualizações em tempo real instantaneamente assim que o mestre ou co-mestre cria algo na campanha.",
		bullets: [
			"Sincronização reativa inteligente do WebSocket que se adapta dinamicamente ao trocar de campanha.",
			"Alertas de Toast e incremento visual instantâneo no sino de notificações quando novos itens são criados na campanha.",
			"Correção de compatibilidade RLS com o mecanismo Realtime do Supabase, garantindo a entrega perfeita dos eventos para todos os membros.",
			"Novo indicador visual (ícone de Brilhos roxo) no menu de notificações para sinalizar criações colaborativas.",
		],
	},
	{
		id: "v1.3.0-feats-dnd35",
		version: "1.3.0",
		date: "30/06/2026",
		title: "Talentos, Poderes e D&D 3.5!",
		description:
			"Agora você pode escolher, criar e buscar talentos, poderes ou vantagens diretamente na sua ficha. Além disso, adicionamos suporte oficial ao sistema D&D 3.5 com magias e talentos clássicos já integrados no compêndio.",
		bullets: [
			"Sistema estruturado de Talentos/Poderes adaptado dinamicamente para cada sistema (ex: Vantagens em 3DeT, Qualidades e Defeitos em Vampiro).",
			"Suporte completo ao sistema D&D 3.5 com compêndio inicial de 30 magias e 30 talentos clássicos do SRD.",
			"Criação de Talentos customizados (Homebrews) salvos diretamente na sua conta.",
			"Automação do talento Robusto (Tough) no D&D, que adiciona vida máxima (+2 HP por nível) automaticamente na sua ficha.",
			"Correção colaborativa: contagem de registros do plano do usuário agora se baseia no dono da campanha ativa, não impedindo colaboradores de criar fichas.",
		],
	},
	{
		id: "v1.2.0-upload",
		version: "1.2.0",
		date: "29/06/2026",
		title: "Imagens e Avatares Mais Rápidos",
		description:
			"Melhoramos o envio de fotos para que você consiga subir retratos de personagens e capas de campanhas instantaneamente, mesmo em conexões lentas ou no celular.",
		bullets: [
			"Upload inteligente com compressão de imagem automática em segundo plano.",
			"Mais estabilidade e segurança ao guardar seus arquivos na nuvem.",
			"Visualização imediata da imagem logo após o envio.",
		],
	},
	{
		id: "v1.1.5-transitions",
		version: "1.1.5",
		date: "25/06/2026",
		title: "Navegação Suave e Transições Animadas",
		description:
			"Adicionamos pequenas animações e efeitos fluidos para deixar a navegação pelo Arkhiveon muito mais gostosa e intuitiva.",
		bullets: [
			"As abas dos formulários agora deslizam suavemente acompanhando o seu clique.",
			"Feedback visual inteligente (campo treme na tela se você esquecer de preencher algo obrigatório).",
			"Números de vida e atributos atualizam com efeitos visuais discretos e elegantes.",
		],
	},
	{
		id: "v1.1.0-pdf-export",
		version: "1.1.0",
		date: "24/06/2026",
		title: "Carregamento de Fichas Mais Leve",
		description:
			"Otimizamos a abertura das fichas de personagens para que a página principal carregue muito mais rápido, economizando internet.",
		bullets: [
			"Abertura das fichas praticamente instantânea.",
			"O gerador de PDFs agora só é carregado se você realmente clicar para exportar a ficha.",
		],
	},
	{
		id: "v1.0.5-spotify-security",
		version: "1.0.5",
		date: "22/06/2026",
		title: "Segurança e Proteção de Acesso",
		description:
			"Atualizamos nossas regras de segurança interna para blindar seu login e garantir que suas integrações (como o Spotify) fiquem 100% protegidas.",
		bullets: [
			"Proteção extra para sua conta contra invasões e scripts maliciosos.",
			"Conexão mais limpa e estável com serviços externos.",
		],
	},
	{
		id: "v1.0.0-launch",
		version: "1.0.0",
		date: "19/06/2026",
		title: "Bem-vindo ao Arkhiveon!",
		description:
			"Seja muito bem-vindo! O Arkhiveon é o seu novo grimório digital para mestrar e jogar RPG de mesa de forma organizada.",
		bullets: [
			"Fichas customizadas para múltiplos sistemas (D&D 5e, Chamado de Cthulhu, Ordem Paranormal e mais).",
			"Diário de sessões, NPCs, grimório de magias e anotações de lore compartilhadas.",
			"Sincronização em tempo real entre mestre e jogadores.",
		],
	},
];
