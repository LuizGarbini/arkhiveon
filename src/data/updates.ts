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
		id: "v1.6.52-imagens-publicas-por-padrao",
		version: "1.6.52",
		date: "30/10/2026",
		title: "Imagens de itens e NPCs entram públicas na Biblioteca",
		description:
			"A imagem que você sobe num item ou NPC agora entra na Biblioteca de imagens como pública para a mesa. Antes ela entrava privada e só o mestre via. Se quiser esconder, é só tornar privada na Biblioteca, como antes. A imagem também fica ligada à Biblioteca, então renomear ou privar lá vale para o item ou NPC.",
		bullets: [],
	},
	{
		id: "v1.6.51-pv-da-ficha-na-mesa",
		version: "1.6.51",
		date: "30/10/2026",
		title: "PV do token segue a ficha",
		description:
			"Na mesa, o token ligado a uma ficha mostra e altera o PV da ficha, e quem está na outra sessão vê a mudança na hora, sem recarregar. O número que aparece é o que foi salvo, já limitado ao máximo. Se a rede ou o servidor falhar, aparece “Não foi possível salvar os PV” com “Tentar de novo”, que refaz a mesma gravação. O aviso de permissão só aparece quando a conta não pode alterar aquele PV. Enquanto salva, os botões ficam travados para um clique duplo não aplicar o dano duas vezes. No celular, abrir a ficha fecha o menu do token e a ficha ocupa a largura da tela, sem o trilho atrás. Os botões −5, −1, +1 e +5 e a barra usam o mesmo estilo no menu e na ficha. Na ficha do mestre o PV aparece num lugar só. O jogador vê e muda só o PV atual; o mestre também pode mudar o máximo. Token sem ficha, e fichas de Ordem, continuam com o PV no próprio token.",
		bullets: ["O dono da ficha agora consegue mudar o próprio PV."],
	},
	{
		id: "v1.6.50-feed-da-mesa",
		version: "1.6.50",
		date: "30/10/2026",
		title: "Rolagens e chat na mesa",
		description:
			"A mesa agora tem um feed com as rolagens e as mensagens, no computador e no celular. Quem rola um dado, a mesa vê o resultado. Se o mestre rolar em segredo, os jogadores veem só que ele rolou, sem o número. O mestre pode começar uma sessão nova e o feed fica em branco para todo mundo. O que já tinha sido rolado não é apagado, mas a mesa passa a ver só a sessão nova. No celular, o feed abre embaixo e o mapa continua livre para mover e aproximar.",
		bullets: [],
	},
	{
		id: "v1.6.49-foto-na-iniciativa",
		version: "1.6.49",
		date: "29/10/2026",
		title: "Foto na ordem de iniciativa",
		description:
			"Na ordem de iniciativa, quem tem foto aparece com ela ao lado do nome, no computador e no celular. Quem não tem foto continua só com o nome. O jogador não vê a foto de um token oculto nem de um token da camada do mestre.",
		bullets: [],
	},
	{
		id: "v1.6.48-ordem-de-iniciativa",
		version: "1.6.48",
		date: "26/10/2026",
		title: "Ordem de iniciativa na mesa",
		description:
			"A mesa mostra a ordem de iniciativa. O mestre adiciona os tokens selecionados, ajusta o número, passa a vez e encerra o combate. O jogador acompanha a fila. Quando a vez é de um token que ele não vê, aparece só “Vez do mestre”. No celular, a ordem abre na folha de baixo, sem escurecer o mapa: dá para mover e aproximar a mesa com a ordem aberta.",
		bullets: [
			"Atalho C abre o combate. Um anel na cor da mesa marca o token da vez.",
			"A iniciativa vem da ficha (zero conta). Sem ficha, o mestre digita o valor.",
			"No empate, a Destreza decide; se continuar empatado, vale a ordem do arraste.",
			"Se não salvar, a ordem volta ao que estava e aparece um aviso.",
		],
	},
	{
		id: "v1.6.47-rolagens-da-mesa",
		version: "1.6.47",
		date: "26/10/2026",
		title: "Dados e chat da mesa passam pelo servidor",
		description:
			"A rolagem da mesa agora acontece no servidor. Quem está na campanha vê o feed. Numa rolagem secreta, a mesa vê que o mestre rolou, sem a fórmula e sem o resultado; o total fica só com o mestre. O chat segue a mesma regra de quem participa da campanha. Quando o mestre começa ou limpa a sessão, o feed que o jogador vê recomeça. O que já tinha sido rolado continua guardado para o mestre. Nada é apagado.",
		bullets: [],
	},
	{
		id: "v1.6.46-tipos-do-banco-combate",
		version: "1.6.46",
		date: "26/10/2026",
		title: "Tipos do banco atualizados para o combate",
		description:
			"Os tipos gerados do banco agora incluem a ordem de iniciativa da mesa (combatentes, rodada e vez). Nada muda no que você vê ou faz no app; é a base para as próximas telas de combate.",
		bullets: [],
	},
	{
		id: "v1.6.45-mesa-ordem-iniciativa",
		version: "1.6.45",
		date: "26/10/2026",
		title: "A mesa guarda a ordem de iniciativa",
		description:
			"A base da mesa virtual ficou pronta para a ordem de iniciativa. Cada token na cena pode ficar na fila com a iniciativa, a destreza e a ordem em que entrou. A cena guarda a rodada e de quem é a vez. Na cena ativa, a fila do jogador traz só o token que está à mostra. Token oculto ou da camada do mestre fica de fora. Só o mestre muda a fila, a rodada e a vez.",
		bullets: [],
	},
	{
		id: "v1.6.43-publicar-cena",
		version: "1.6.43",
		date: "26/10/2026",
		title: "Publicar cena num passo só",
		description:
			"Publicar cena agora acontece num passo só no servidor (preparação; entra no ar quando a migração for aplicada).",
		bullets: [],
	},
	{
		id: "v1.6.42-campanha-escolhe-mundo",
		version: "1.6.42",
		date: "25/10/2026",
		title: "Nova campanha pede o mundo",
		description:
			"Ao criar uma campanha, você escolhe o mundo numa lista que começa vazia, com os mundos seus e os que você já mestra. Dá para criar um mundo novo ali mesmo: ele volta escolhido no campo e o mundo da barra lateral continua o mesmo. Se a conta ainda não tem mundo, o campo mostra só como criar o primeiro e “Criar Campanha” espera esse mundo. Se faltar o mundo, o aviso entra no lugar da explicação. A janela fica sólida, para o texto não se misturar com o que está atrás. Em Mundos > Novo, a campanha não abre sozinha: o aviso “Mundo criado” traz o botão para abrir a nova campanha já naquele mundo.",
		bullets: [],
	},
	{
		id: "v1.6.41-painel-topo-sem-pulo",
		version: "1.6.41",
		date: "25/10/2026",
		title: "O topo do painel não pula ao carregar",
		description:
			"Na Visão geral, os selos do sistema e do papel e o botão Registrar Sessão já ocupam o lugar final enquanto a mesa carrega, então a página não desce quando os dados chegam. No celular, o nome da campanha reserva duas linhas desde o início, mesmo quando ainda não chegou ou é curto. O aviso de conexão lenta fica na mesma faixa o tempo todo, com a mesma altura e o mesmo respiro, então o topo não desce quando ele aparece nem quando a carga termina. O aviso de falha usa essa faixa, e “Tentar de novo” só no erro. Se a troca de mesa falhar ou demorar, ou se os dados da mesa não chegarem em cerca de 10 segundos já na primeira abertura, o aviso aparece; se os dados chegarem depois, eles entram e o aviso sai. Tentar de novo refaz a carga. No menu, a seção de facções mostra o nome quando a carga falha, em vez de ficar só no ícone. No celular, o banner do Discord reserva a altura do título quebrado para a fonte não empurrar o card.",
		bullets: [],
	},
	{
		id: "v1.6.40-painel-lento-missoes",
		version: "1.6.40",
		date: "25/10/2026",
		title: "Painel não assusta quando a rede está lenta",
		description:
			"Se a conexão demorar, o painel continua no rascunho e mostra só “Conexão lenta, ainda carregando…”, em vez de dizer que a mesa está indisponível. O aviso de erro só aparece se a carga realmente falhar ou passar de um minuto, e o texto cabe inteiro no celular. Em Missões, a lista ou o vazio aparecem na hora, sem o rascunho que encolhia a seção, e “Nova Missão” fica fixo ao lado de “Ver todas”.",
		bullets: [],
	},
	{
		id: "v1.6.39-painel-carregando-sem-pulos",
		version: "1.6.39",
		date: "24/10/2026",
		title: "Painel carrega sem tela preta e sem pulos",
		description:
			"Ao abrir o painel, o menu lateral, o topo e o destaque da mesa aparecem na hora, sem a tela preta “Carregando campanhas…”. Enquanto os dados chegam, cada seção mostra um rascunho com o mesmo formato do conteúdo real, então nada pula de lugar quando tudo carrega. O rascunho só aparece se a carga demorar, pisca de leve num só ritmo e fica parado para quem pediu menos movimento no sistema. No menu, “Plano” e os nomes ficam fixos e só os valores aparecem como uma barrinha; a sua inicial no avatar já aparece desde o começo.",
		bullets: [],
	},
	{
		id: "v1.6.38-painel-falha-base",
		version: "1.6.38",
		date: "24/10/2026",
		title: "Painel avisa direito quando a conexão cai",
		description:
			"Se não der para buscar suas campanhas, seu plano ou seus convites, o painel mostra um único aviso com “Tentar de novo”, em vez de ficar carregando sem fim ou mostrar uma mensagem técnica. O menu lateral e o topo do painel não mostram mais “Plano Free”, um papel errado (como “Co-Mestre”) nem nomes genéricos do mundo antes de saber os dados de verdade, e o botão Registrar Sessão só aparece com a mesa carregada.",
		bullets: [],
	},
	{
		id: "v1.6.37-painel-itens-mochila",
		version: "1.6.37",
		date: "24/10/2026",
		title: "Itens e Mochila com nomes mais claros",
		description:
			"No painel, o card do topo (agora sem subtítulo) e o atalho do Grimório se chamam “Itens”, porque contam os itens do mundo que a sua mesa vê. A Mochila do Grupo deixou de mostrar uma contagem que voltava a zero ao recarregar a página e agora mostra só “Abrir”, igual ao atalho da Mesa Virtual.",
		bullets: [],
	},
	{
		id: "v1.6.36-painel-falha-carga",
		version: "1.6.36",
		date: "24/10/2026",
		title: "Painel avisa quando os dados não carregam",
		description:
			"Se os dados da mesa não carregarem, o painel mostra um único aviso no topo com o botão “Tentar de novo”, em vez de dizer que está tudo vazio ou oferecer para criar o primeiro registro. As seções ficam em espera, sem zeros, e os registros do menu e o mundo mostram “—”. Se só a atividade recente falhar, aparece uma linha discreta nela com o mesmo botão. Ao tentar de novo, os blocos de carregamento voltam até os dados chegarem.",
		bullets: [],
	},
	{
		id: "v1.6.35-painel-escopo-campanha",
		version: "1.6.35",
		date: "24/10/2026",
		title: "Cards do painel só com a sua mesa",
		description:
			"Os cards de NPCs e itens do painel agora contam e listam só o que a campanha ativa vê, igual aos números do topo. Os registros do menu lateral mostram um bloco cinza enquanto carregam, e o “Ver todas” cabe numa linha no celular. Ao recarregar, o painel mostra blocos de carregamento em vez de telas vazias e zeros até os dados chegarem.",
		bullets: [],
	},
	{
		id: "v1.6.34-campanha-so-em-mundo-seu",
		version: "1.6.34",
		date: "24/10/2026",
		title: "Mundos mais protegidos",
		description:
			"Uma campanha só pode ser criada ou movida para um mundo seu ou para um mundo em que você já é mestre ou co-mestre de alguma campanha. Ninguém de fora consegue pendurar campanhas no seu mundo.",
		bullets: [],
	},
	{
		id: "v1.6.33-painel-sem-cortes",
		version: "1.6.33",
		date: "24/10/2026",
		title: "Painel sem textos cortados",
		description:
			"Os atalhos do Grimório mostram o nome inteiro, o banner do Discord cabe no celular e tocar no “—” de um número abre o aviso sem sair do painel.",
		bullets: [],
	},
	{
		id: "v1.6.32-painel-numeros-mundo-compartilhado",
		version: "1.6.32",
		date: "24/10/2026",
		title: "Números do painel mais confiáveis",
		description:
			"Os números do painel agora contam só o que você vê nas listas, aparecem como um bloco cinza enquanto carregam e viram “—” se a carga falhar. O seletor avisa quando o mundo é compartilhado com outras mesas.",
		bullets: [],
	},
	{
		id: "v1.6.31-token-so-o-mestre",
		version: "1.6.31",
		date: "23/10/2026",
		title: "Token do jogador mais protegido",
		description:
			"Na mesa, o jogador continua movendo e cuidando do próprio token, mas só o mestre troca de cena, de ficha, quem controla, a camada, o oculto e a trava.",
		bullets: [],
	},
	{
		id: "v1.6.30-paredes-f1",
		version: "1.6.30",
		date: "21/10/2026",
		title: "Paredes na mesa (só o mestre vê)",
		description:
			"Nova ferramenta Parede (W): clique ponto a ponto para desenhar paredes no mapa, encaixando nos cantos da grade.",
		bullets: [
			"Esc, Enter ou duplo clique terminam a parede; Backspace desfaz o último ponto.",
			"Clique numa parede para selecionar e apague com Delete. Ctrl/⌘+Z desfaz e Ctrl/⌘+Shift+Z refaz.",
			"Segure Shift para desenhar sem encaixar na grade.",
			"Só o mestre vê as paredes. No celular dá para vê-las, mas desenhar fica para o computador.",
		],
	},
	{
		id: "v1.6.29-nova-versao-web",
		version: "1.6.29",
		date: "20/10/2026",
		title: "Aviso de nova versão no navegador",
		description:
			"Quando sair uma versão nova do Arkhiveon, aparece um aviso discreto no rodapé com Atualizar e Depois. Nada recarrega sozinho.",
		bullets: [
			"Abas abertas há muito tempo não ficam mais com a versão antiga sem saber.",
		],
	},
	{
		id: "v1.6.27-webgl-contextos",
		version: "1.6.27",
		date: "21/10/2026",
		title: "Ir e voltar entre mesa e painel sem travar",
		description:
			"Os fundos animados do painel e o d20 liberam a placa de vídeo ao sair da tela, então ir e voltar entre a mesa e o painel não acumula mais peso.",
		bullets: [],
	},
	{
		id: "v1.6.25-mesa-abre-pelo-painel",
		version: "1.6.25",
		date: "20/10/2026",
		title: "A mesa abre direto pelo painel",
		description: "A mesa abre direto pelo painel, sem precisar recarregar.",
		bullets: [
			"Enquanto a mesa carrega, o painel continua com o menu lateral, em vez de aparecer pela metade.",
		],
	},
	{
		id: "v1.6.23-status-icones",
		version: "1.6.23",
		date: "21/10/2026",
		title: "Ícones nos status dos tokens",
		description:
			"Os status dos tokens na mesa trocaram os emojis por ícones mais limpos, iguais em qualquer aparelho.",
		bullets: [
			"Envenenado, Caído, Cego, Atordoado, Invisível, Em Chamas e Concentração agora têm ícones próprios, no token e no menu.",
			"Cada status mantém a cor de sempre na borda.",
			'Com mais status do que cabem, aparece um "+N". Passe o mouse para ver a lista completa ou, no celular, toque no token.',
		],
	},
	{
		id: "v1.6.22-combate-base",
		version: "1.6.22",
		date: "21/10/2026",
		title: "Base do combate na mesa",
		description:
			"Preparamos as regras de iniciativa e turnos do combate na mesa. O painel chega numa próxima versão.",
		bullets: [
			"A ordem segue a iniciativa; no empate, vence quem tem mais Destreza.",
			"A iniciativa vem da ficha; sem ela, rola d20 + Destreza, e o mestre pode ajustar o valor.",
			"Depois do último da rodada, começa a rodada seguinte.",
		],
	},
	{
		id: "v1.6.21-pacote-visual",
		version: "1.6.21",
		date: "21/10/2026",
		title: "Busca da Biblioteca mais clara",
		description:
			'Quando a busca da Biblioteca da mesa não acha nada, ela diz "Nada encontrado para" o que você digitou e oferece limpar a busca.',
		bullets: [
			"No painel da campanha, passar o mouse no retrato destaca só o retrato, não o card inteiro.",
			"Nos cards das listas, nomes longos não passam mais por baixo dos botões do canto.",
			"Os botões do menu do token mostram a dica no estilo do app, e a miniatura do mapa não cobre mais o aviso.",
		],
	},
	{
		id: "v1.6.19-status-token-s2",
		version: "1.6.19",
		date: "20/10/2026",
		title: "Status do token mais fáceis de ver e de aplicar",
		description:
			'No celular, o token mostra um ícone de status maior e um "+N"; segure o dedo no token para ver a lista inteira.',
		bullets: [
			'No menu do token, escolha um status em "Adicionar status…" ou toque no chip para tirar.',
			"O status aparece na hora; se não salvar, ele volta e você recebe um aviso.",
			"Ao abrir a mesa, o mapa começa ao lado da barra de ferramentas, sem tokens escondidos atrás dela.",
		],
	},
	{
		id: "v1.6.18-ficha-flutuante",
		version: "1.6.18",
		date: "20/10/2026",
		title: "Ficha do personagem flutuando na mesa",
		description:
			"Dê dois cliques no token para abrir a ficha, com retrato, numa janela por cima do mapa, sem sair da mesa.",
		bullets: [
			"Arraste a janela pelo topo e mude o tamanho pelo canto; ela abre onde você deixou da última vez.",
			"Abra até 3 fichas ao mesmo tempo para comparar.",
			"No celular, a ficha sobe de baixo; arraste para baixo ou toque fora para fechar.",
			"Com o foco no mapa, os atalhos continuam valendo; dentro da ficha, Esc fecha.",
		],
	},
	{
		id: "v1.6.17-status-token",
		version: "1.6.17",
		date: "20/10/2026",
		title: "Status aparecem no token da mesa",
		description:
			'Token com status (Envenenado, Caído, Em Chamas…) ganha borda na cor do status e até 3 ícones; o resto vira "+N". Passe o mouse para ver os nomes.',
		bullets: [
			"Aplicar e remover continua pelo menu do token (botão direito).",
			"Sem status, o token fica como sempre.",
		],
	},
	{
		id: "v1.6.15-atalhos-foco",
		version: "1.6.15",
		date: "20/10/2026",
		title: "Digitar na mesa não aciona mais atalhos",
		description:
			"Atalhos da mesa (V, H, R, G, T, F e Espaço) não disparam enquanto você digita num campo nem com a Biblioteca, a ficha ou outra janela aberta por cima da mesa.",
		bullets: [
			'Ex.: digitar "g" na busca da Biblioteca não vira mais ping.',
			"Feche o painel e os atalhos voltam a funcionar.",
		],
	},
	{
		id: "v1.6.14-painel-tela-cheia",
		version: "1.6.14",
		date: "20/10/2026",
		title: "Fotos do painel da campanha abrem em tela cheia",
		description:
			"No painel da campanha, toque na foto de um personagem, NPC ou item (e na tabela do grupo) para ver a imagem em tela cheia.",
		bullets: [
			"Clicar no nome continua abrindo a página, como antes.",
			"Quem não tem foto (só as iniciais) continua igual.",
		],
	},
	{
		id: "v1.6.13-mapa-tela-cheia",
		version: "1.6.13",
		date: "20/10/2026",
		title: "Mestre pode ver o mapa da cena em tela cheia",
		description:
			'Na Biblioteca da mesa, aba Mapa, o mestre abre o mapa da cena em tela cheia tocando na miniatura ou em "Ver mapa em tela cheia".',
		bullets: [
			"Só o mestre vê essa opção: o mapa em tela cheia não tem névoa, então os jogadores continuam vendo o mapa só pela mesa.",
		],
	},
	{
		id: "v1.6.11-tela-cheia-token",
		version: "1.6.11",
		date: "20/10/2026",
		title: "Retrato do token em tela cheia",
		description: "Retrato do token abre em tela cheia pelo menu do token.",
		bullets: [
			"Toque no retrato ou em Ver imagem em tela cheia; fechar a imagem mantém o menu aberto.",
		],
	},
	{
		id: "v1.6.10-tela-cheia-entidades",
		version: "1.6.10",
		date: "20/10/2026",
		title: "Imagens de itens, lore, locais e facções em tela cheia",
		description:
			"Na página de um item, lore, local ou facção, toque na imagem para vê-la em tela cheia, como já acontece na ficha e no NPC.",
		bullets: [
			"Quem pode editar encontra o botão Trocar imagem dentro da tela cheia.",
		],
	},
	{
		id: "v1.6.9-tela-cheia-cards",
		version: "1.6.9",
		date: "20/10/2026",
		title: "Imagens dos cards em tela cheia",
		description:
			"Nas listas de fichas, NPCs, itens, lore, locais e facções, o novo botão de tela cheia no canto do card abre a imagem grande sem sair da lista.",
		bullets: [
			"Clicar no resto do card continua abrindo a página, como antes.",
			"Cards sem imagem própria (ou com imagem privada que você não pode ver) não mostram o botão.",
		],
	},
	{
		id: "v1.6.8-nevoa-cobrir-tudo",
		version: "1.6.8",
		date: "20/10/2026",
		title: "Cobrir Tudo funciona de primeira",
		description:
			"Cobrir Tudo ativa a névoa e o tamanho do pincel bate com o botão.",
		bullets: [
			"Se a névoa estiver desligada, Cobrir Tudo e Revelar Tudo ligam a névoa e avisam na tela.",
			"O tamanho do pincel aparece sempre como diâmetro: P 40px, M 80px e G 160px.",
		],
	},
	{
		id: "v1.6.7-tokens-casas-livres",
		version: "1.6.7",
		date: "20/10/2026",
		title: "Tokens novos em casas livres",
		description: "Tokens novos aparecem em casas livres, não mais empilhados.",
		bullets: [
			"Cada token criado pela Biblioteca da mesa vai para a casa livre mais perto do centro da tela, no grid quadrado ou hexagonal.",
		],
	},
	{
		id: "v1.6.5-ficha-salvamento-seguro",
		version: "1.6.5",
		date: "20/10/2026",
		title: "Ficha não perde mais itens ao salvar junto",
		description:
			"Quando o mestre e o jogador mexem na mesma ficha ao mesmo tempo, um não apaga mais o que o outro salvou — como um item novo na mochila.",
		bullets: [
			"Se a ficha não puder ser salva, aparece um aviso na hora em vez de a mudança sumir depois.",
			'Sem internet, o aviso pede para conferir a conexão e tem o botão "Tentar de novo".',
		],
	},
	{
		id: "v1.6.4-pontos-de-destino",
		version: "1.6.4",
		date: "20/10/2026",
		title: "Pontos de Destino na ficha",
		description:
			"A faixa Recursos da mesa, no topo da ficha, agora tem Pontos de Destino: quanto sobra, o total e uma barrinha.",
		bullets: [
			"Use o − quando gastar um ponto na mesa e o + quando ganhar de volta.",
			"Toque no total (o número depois da barra) para mudar. Cada ficha começa com 10.",
			"Queimar tira 1 ponto do total de vez. O app pergunta antes, para ninguém queimar sem querer.",
			"O mestre e quem só vê a ficha enxergam os pontos, mas não mexem.",
		],
	},
	{
		id: "v1.6.4-pontos-divinos",
		version: "1.6.4",
		date: "20/10/2026",
		title: "Pontos Divinos na ficha",
		description:
			"Ao lado do Destino, a ficha ganhou os Pontos Divinos, com o ícone de sol. Funcionam do mesmo jeito: gastar, ganhar, mudar o total e queimar.",
		bullets: [
			"Aparecem em todas as fichas, na faixa Recursos da mesa.",
			"Toda ficha começa com 0 de 10. Toque no total para seguir a regra da sua mesa.",
			"Queimar também pede confirmação antes.",
			"Quem ainda usa o app de celular antigo (APK) deve atualizar: a versão velha pode zerar os Pontos Divinos ao mexer na faixa.",
		],
	},
	{
		id: "v1.6.3-aviso-imagem-privada",
		version: "1.6.3",
		date: "20/10/2026",
		title: "Aviso ao usar uma imagem privada da galeria",
		description:
			"Quando você escolhe uma imagem privada da sua galeria para uma página, o app avisa antes de aplicar: todos que podem ver a página também vão ver a imagem.",
		bullets: [],
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
