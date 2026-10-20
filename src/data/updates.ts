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
		id: "v1.6.3-mesa-abre-pelo-painel",
		version: "1.6.3",
		date: "20/10/2026",
		title: "A mesa abre direto pelo painel",
		description: "A mesa abre direto pelo painel, sem precisar recarregar.",
		bullets: [
			"Enquanto a mesa carrega, o painel continua com o menu lateral, em vez de aparecer pela metade.",
		],
	},
	{
		id: "v1.6.2-vtt-ficha-atributos",
		version: "1.6.2",
		date: "20/10/2026",
		title: "Atributos certos na mesa virtual",
		description:
			"Na mesa virtual, o painel da ficha agora mostra os mesmos modificadores de atributo da ficha do personagem, e as rolagens saem com o bônus certo.",
		bullets: [
			"Fichas antigas com atributo em branco aparecem com 10 (+0), igual à ficha.",
		],
	},
	{
		id: "v1.6.1-atributo-de-ataque",
		version: "1.6.1",
		date: "11/10/2026",
		title: "Armas com qualquer atributo",
		description:
			"Agora a arma pode usar qualquer um dos seis atributos no acerto e no dano — não só Força ou Destreza.",
		bullets: [
			"No cadastro da arma (aba Ataque), o campo Atributo virou uma lista com Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma.",
			"Exemplo: a Lâmina do Pacto do bruxo pode somar Carisma; uma arma de mago, Inteligência.",
			"Acuidade agora é uma propriedade da arma (em Propriedades), e não mais uma opção de atributo.",
			"Armas antigas marcadas como Acuidade passam a usar Destreza. Se o personagem é mais forte que ágil, é só trocar para Força.",
			"Vale também para armas cadastradas direto no Inventário da ficha.",
		],
	},
	{
		id: "v1.6.0-itens-na-ficha",
		version: "1.6.0",
		date: "11/10/2026",
		title: "Itens da campanha direto na ficha",
		description:
			"Os itens da aba Itens agora têm números de verdade (dano, CA, bônus) e podem ser ligados à ficha do personagem, sem cadastrar tudo de novo no Inventário.",
		bullets: [
			"Cadastro de item mais completo: abas de Ataque, Defesa e Bônus para armas, armaduras, escudos e anéis.",
			"Agora dá pra ligar um item da aba Itens à ficha do personagem: abra o Inventário, toque em Da campanha, escolha o item e onde ele fica (No Corpo, Mochila ou Montaria).",
			'Antes de confirmar, a janela já mostra o que muda: por exemplo "Acerto +6 · Dano 1d8+4".',
			"O item fica ligado de verdade: se o mestre mudar o item na aba Itens, a ficha acompanha sozinha. Tirou o item? É só Desvincular.",
			"Armadura, escudo e anéis contam: a CA e a Iniciativa passam a somar o que você está usando, e as armas ligadas aparecem em Ataques.",
			'Toque em Acerto, Dano, CA ou Iniciativa e a ficha explica a conta em uma frase, tipo "Sua CA é 15 porque você veste Couro batido (base 12) e soma toda a sua Destreza +3".',
			"Cada jogador liga itens só na própria ficha; o mestre pode em qualquer uma.",
			"Itens antigos e o inventário que você já tinha continuam do mesmo jeito.",
		],
	},
	{
		id: "v1.5.0-worldbuilding",
		version: "1.5.0",
		date: "20/07/2026",
		title: "Mundos, Facções e Mural!",
		description:
			"O Arkhiveon agora organiza a sua mesa em Mundos: a ambientação onde vivem NPCs, locais, lore, facções e notícias. Campanhas ficam dentro do Mundo, e você troca de Mundo e de campanha pelo seletor no topo. Contas novas começam criando o Mundo e a primeira campanha; se o seu ainda se chama “Mundo Padrão”, pedimos um nome de verdade na primeira vez.",
		bullets: [
			"Mundos: um lugar só para a ambientação — NPCs, locais, itens, lore, facções e o mural ficam no Mundo e podem ser usados em várias campanhas.",
			"Seletor de Mundo e campanha: troque de ambientação ou de mesa sem perder o fio, direto pelo cabeçalho.",
			"Facções: crie grupos, guildas e organizações com reputação e vínculos com a campanha.",
			"Mural de notícias: publique avisos e acontecimentos do Mundo para a mesa acompanhar.",
			"Primeiros passos: contas novas criam o Mundo com o nome que quiserem e depois a primeira campanha.",
			"Contas antigas: se o Mundo ainda se chama “Mundo Padrão”, pedimos para você escolher um nome de verdade (só uma vez).",
			"Fotos nas fichas: dá para trocar a imagem de NPCs, locais e lore direto pelo cabeçalho da ficha.",
			"Listas mais claras: cards de NPCs, locais, itens, lore e facções com o mesmo visual e espaço para a arte.",
		],
	},
	{
		id: "v1.4.0-dynamic-dice",
		version: "1.4.0",
		date: "02/07/2026",
		title: "Dados 3D e Correções Sólidas!",
		description:
			"Agora a sua mesa virtual ganhou vida! Adicionamos suporte para rolagens de dados 3D na tela, que se adaptam automaticamente ao sistema de RPG que você está jogando. Além disso, fizemos melhorias internas importantes na sincronização e nas fichas.",
		bullets: [
			"Novos dados 3D: D6, D10, D20 e D100! O sistema escolhe o dado certo dependendo se você joga D&D, Vampiro, Call of Cthulhu ou Ordem.",
			"Fim das notificações duplicadas: O sistema de mensagens em tempo real ficou mais inteligente e não vai mais piscar notificações repetidas para edições que você mesmo acabou de fazer.",
			"Status Universais: Os atributos das fichas agora se inicializam perfeitamente para todos os sistemas, consertando um problema onde jogos focados em D6 (números menores) apareciam bugados.",
		],
	},
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
