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
		id: "v1.6.157-equipamento-sem-numero",
		version: "1.6.157",
		date: "19/11/2026",
		title: "Item equipado sem número avisa, e o bônus aparece na conta",
		description:
			"Um item No Corpo que só descreve o bônus no texto não mudava a CA, e o slot ficava em silêncio. Agora o slot e o painel Com este equipamento dizem “Sem número na ficha” e abrem o cadastro do item já na aba Bônus. Quando o número está no cadastro, a CA, a iniciativa e o deslocamento sobem, e o Resumo da mesa e o painel mostram de onde veio — por exemplo, Capa do Vento +3. O mesmo item na mochila continua sem somar.",
		bullets: [],
	},
	{
		id: "v1.6.156-vtt-recursos-ficha",
		version: "1.6.156",
		date: "17/11/2026",
		title: "Inspiração, destino e dados bônus na ficha da mesa",
		description:
			"No resumo da ficha aberta na mesa, o bloco Recursos ganha Inspiração, Pontos de destino e Dados bônus, ao lado dos dados de vida. Dá para gastar ou somar na hora, sem confirmação, e nenhum deles desce de zero. Quem já podia mexer nos dados de vida mexe nestes. O jogador só altera a própria ficha. A ficha completa continua lendo os mesmos campos.",
		bullets: [],
	},
	{
		id: "v1.6.155-vtt-cenas-pastas",
		version: "1.6.155",
		date: "17/11/2026",
		title: "Pastas na barra de cenas",
		description:
			"O mestre agrupa as cenas em pastas para a barra não virar uma faixa enorme. A pasta recolhe; dentro dela ficam as cenas, e dá para mover uma cena pelo menu “Mover para pasta”. Cena sem pasta continua na raiz. Quem não organiza a mesa segue vendo só as cenas que já podia ver. Apagar a pasta devolve as cenas para a raiz, sem apagar o mapa.",
		bullets: [],
	},
	{
		id: "v1.6.154-tipos-item-capa",
		version: "1.6.154",
		date: "17/11/2026",
		title: "Capa e os outros tipos voltam no cadastro do item",
		description:
			"O seletor de categoria do item passa a oferecer todos os tipos que o produto já usava: Elmo, Capa, Luvas, Botas e Consumível, além dos que já apareciam. Capa, elmo, luvas e botas vão para o slot certo do equipamento. Um item antigo salvo como “capa” continua válido.",
		bullets: [],
	},
	{
		id: "v1.6.153-vtt-iniciais-arrasto",
		version: "1.6.153",
		date: "17/11/2026",
		title: "Iniciais do token não estouram ao arrastar",
		description:
			"Ao arrastar um personagem que tem foto, a mesa não cobre mais o retrato com as iniciais enormes. Quem não tem foto continua com as duas letras dentro do disco, parado ou andando, perto ou longe do zoom.",
		bullets: [],
	},
	{
		id: "v1.6.152-vtt-giro-toque",
		version: "1.6.152",
		date: "16/11/2026",
		title: "Girar o token no celular, arrastando a alça",
		description:
			"No celular e no tablet, o token selecionado ganha uma alça na direção para onde ele olha. Arrastar a alça gira o personagem no mesmo lugar, sem andar. Perto de 15° e de 45° ela gruda, para acertar a frente, o lado e a diagonal. Vários tokens selecionados giram juntos. Q e E continuam no teclado, e o painel do token diz isso por escrito.",
		bullets: [],
	},
	{
		id: "v1.6.151-vtt-setas-sem-travar",
		version: "1.6.151",
		date: "15/11/2026",
		title: "Setas do teclado sem travar nem voltar para trás",
		description:
			"Alternar cima e baixo (ou direita e esquerda) rápido com as setas fazia o token travar, pular e até voltar para o lugar antigo. Agora o passo desliza em uma fração de segundo (e some se o sistema pede menos movimento), um passo novo continua de onde o token está, e rajadas de setas não reconstroem mais todos os tokens da mesa nem refazem a visão a cada toque. Por trás: o que você mandou gravar sai em ordem, uma gravação por token de cada vez, e a última posição sempre é gravada; o eco da própria gravação não puxa mais o token para trás. O histórico de movimentos continua com uma linha por movimento, e o arrasto com o mouse segue igual.",
		bullets: [],
	},
	{
		id: "v1.6.150-vtt-pings-ondas",
		version: "1.6.150",
		date: "15/11/2026",
		title: "Pings em ondas de energia, na cor de quem chamou",
		description:
			"O ping no mapa agora é uma onda de energia com brilho médio: um halo no chão, dois ou três anéis, o símbolo com sombra e uma etiqueta com o nome de quem pingou. A cor da pessoa entra na onda (perigo, a caminho, ajuda e o chamado do mestre misturam essa cor com a do tipo; atenção e destacar ficam na cor dela). Atenção ondula devagar, perigo pulsa rápido, a caminho mostra chevrons, ajuda faz um pulso duplo e destacar põe setas em volta do personagem. O ping entra suave e some aos poucos, lê em mapa claro e escuro e cresce junto com o zoom. Quem pediu menos movimento no sistema vê só o aparecer e o sumir, sem onda. A roda do Ctrl acompanha o arrasto no mesmo instante: aparece quando o ponteiro sai do centro, a opção acende sem redesenhar a roda, e soltar mostra o ping na hora. No celular, a lista de tipos ganhou o mesmo acabamento.",
		bullets: [],
	},
	{
		id: "v1.6.141-foto-na-mesa-recorte",
		version: "1.6.141",
		date: "15/11/2026",
		title: "Foto na mesa com recorte e botões no tamanho certo",
		description:
			"A escolha da foto na mesa deixou de ser uma faixa de ponta a ponta. Agora são botões do tamanho do texto, ao lado da prévia, e Enviar e recortar abre o enquadramento em círculo antes de subir a imagem.",
		bullets: [],
	},
	{
		id: "v1.6.140-foto-na-mesa",
		version: "1.6.140",
		date: "15/11/2026",
		title: "Escolha a foto que os outros veem na mesa",
		description:
			"Em Minha conta, a seção Foto na mesa deixa você escolher o que aparece no canto da mesa: a foto do Google (quando a conta tem uma), uma imagem que você envia, ou só as iniciais. A prévia usa a cor do seu cursor. A escolha fica salva na conta e vale nos outros aparelhos. Quem está na mesa vê a troca ao vivo. O envio redimensiona a imagem neste aparelho antes de subir, o botão fica desabilitado enquanto envia, e se falhar o aviso aparece ao lado dele. Uma foto mandada por outro cliente só entra se for um endereço https do armazenamento deste projeto ou da foto do Google.",
		bullets: [],
	},
	{
		id: "v1.6.132-vtt-roda-de-ping-ctrl-arrastar",
		version: "1.6.132",
		date: "15/11/2026",
		title: "Roda de ping: Ctrl + apertar e arrastar, igual no Windows e no Mac",
		description:
			"A roda de ping só abria se você apertasse o botão com Ctrl e ficasse parado um instante; quem apertava e já arrastava (o jeito natural com mouse, no Windows) caía na caixa de seleção e a roda não aparecia, enquanto no Mac, onde o trackpad costuma segurar um instante antes de arrastar, funcionava. Agora a roda abre no mesmo momento em que você aperta o botão com Ctrl no mapa vazio, em qualquer sistema: arraste até o tipo e solte para pingar, solte no centro para usar o tipo escolhido, Esc cancela. O desenho da roda aparece um instante depois (ou assim que você arrasta), então um Ctrl+clique rápido continua mandando o ping do tipo escolhido sem piscar a roda. Atenção, muda um atalho: a caixa de seleção que soma à seleção agora é Shift+arrastar (ou Cmd+arrastar no Mac); Ctrl+arrastar abre a roda. Ctrl+clique em um token continua somando à seleção.",
		bullets: [],
	},
	{
		id: "v1.6.131-vtt-cursores-e-historico",
		version: "1.6.131",
		date: "15/11/2026",
		title: "Cursores bonitos, cada um na sua cor, e histórico que fica salvo",
		description:
			"O cursor dos outros integrantes ganhou ponteiro com contorno e sombra e uma etiqueta com o nome na cor da pessoa (texto sempre legível), que desliza suave e acompanha o zoom. Cada um tem agora uma cor própria por padrão (antes era sorteada e várias pessoas ficavam iguais), e quem chega depois cede se alguém já usa a mesma. Pelo botão da cor, ao lado do avatar, você escolhe a cor do seu cursor, ping e régua entre 12 opções, uma cor livre, ou volta para a automática; a escolha fica salva neste navegador e todos veem. Um novo interruptor, ao lado dela, oculta os cursores com nome dos outros só para você (é uma preferência sua, salva neste navegador): pings, réguas, moldes e tokens arrastados continuam aparecendo, e o seu cursor segue sendo enviado. No histórico de movimentos, a tabela do banco finalmente existe em produção, então as linhas ficam salvas e outros mestres veem tudo em tempo real. Também foram corrigidos: recarregar com mais de 1000 linhas mostrava só as mais antigas, a ordem usava o relógio de cada computador, encaixar o token no centro da mesma casa virava uma linha de 0 m, linhas apagadas por outro mestre continuavam na tela e falha ao gravar não avisava.",
		bullets: [],
	},
	{
		id: "v1.6.130-vtt-paredes-livres",
		version: "1.6.130",
		date: "15/11/2026",
		title: "Paredes livres da grade, com ímã nas pontas, e dá para arrastar",
		description:
			"Na ferramenta Parede o traço agora segue o ponteiro com precisão de pixel do mapa, sem prender na grade (as coordenadas são guardadas com até 2 casas decimais). O painel ganhou o interruptor Encaixar na grade, desligado por padrão e lembrado neste navegador; segurar Shift inverte na hora (ligado vira livre, desligado encaixa). Perto da ponta de outra parede (uns 10 px de tela, qualquer zoom) o ponto gruda exatamente nela, com um anel discreto no encaixe, para as paredes se unirem sem fresta e a visão não vazar; Alt desliga o ímã (e, na ferramenta Parede, Alt+clique não vira ping). Também dá para arrastar o que já foi desenhado: arrastar o corpo de uma parede move todas as selecionadas juntas (porta e janela mantêm tipo e estado, e o ícone acompanha o meio do vão); arrastar um vértice (os quadradinhos das selecionadas) move só aquela ponta, junto com as paredes que dividem exatamente o mesmo ponto. A prévia aparece ao vivo, a gravação é uma só ao soltar (com volta e aviso se o servidor recusar), Esc cancela o arrasto e um clique sem arrastar só seleciona. Ctrl/⌘+Z e Shift+Ctrl+Z desfazem e refazem os movimentos. Com paredes selecionadas, as setas empurram 1 px (Shift: 10 px, Alt: uma casa) e um lote de toques vira uma gravação só. A visão dos jogadores recalcula com a geometria nova.",
		bullets: [],
	},
	{
		id: "v1.6.106-vtt-pings-de-varios-tipos",
		version: "1.6.106",
		date: "15/11/2026",
		title: "Pings de vários tipos, roda do Ctrl e ping do mestre",
		description:
			"O ping agora tem tipos: Atenção (o de sempre), Perigo, A caminho, Ajuda e Destacar personagem, cada um com símbolo, cor e som próprios. No computador, segure Ctrl e o botão do mouse no mapa vazio: abre uma roda em volta do cursor (como no LoL), mova até o tipo e solte; soltar no centro usa o tipo escolhido, e um Ctrl+clique rápido pinga na hora. Arrastar com Ctrl continua sendo a caixa de seleção. Destacar põe setas em volta de um personagem (o que você aponta ou o selecionado) e só aparece para quem vê aquele token. O mestre ganha Todos aqui: leva a câmera de todos até aquele ponto com um movimento suave, mantendo o zoom de cada um; só vale se quem mandou é o mestre ou co-mestre (um jogador que force esse tipo manda um ping comum). A ferramenta Ping tem um painel para escolher o tipo. No celular, segure o botão de ping na barra e arraste o dedo até o tipo para escolher; um toque rápido segue só ligando a ferramenta.",
		bullets: [],
	},
	{
		id: "v1.6.105-vtt-girar-token",
		version: "1.6.105",
		date: "15/11/2026",
		title: "Girar tokens no mesmo lugar",
		description:
			"Com um ou vários tokens selecionados, Q gira para a esquerda e E para a direita, 45° por toque; com Shift, 15° para acertar o ângulo. Cada token gira no próprio lugar, sem andar, e só o ângulo é gravado. Vale as mesmas regras das setas: não age digitando, e token travado ou que você não controla fica parado. O painel do token ganhou o botão de girar para a esquerda ao lado do da direita.",
		bullets: [],
	},
	{
		id: "v1.6.104-vtt-regua-fixa",
		version: "1.6.104",
		date: "15/11/2026",
		title: "Régua fixa ao trocar de ferramenta",
		description:
			'Antes, sair da ferramenta Régua apagava a medição, então não dava para medir o caminho e depois arrastar o token ao longo dele. Agora a medição fica fixada no mapa quando você troca de ferramenta (inclusive para os outros jogadores), com um selo "Régua fixada" e a distância acima do zoom. Limpe com o X do selo, ou meça de novo com a régua para substituir.',
		bullets: [],
	},
	{
		id: "v1.6.103-vtt-ping-preso",
		version: "1.6.103",
		date: "15/11/2026",
		title: "Corrigido: o ping ficava preso na tela",
		description:
			'Depois de selecionar tokens, alguns jogadores ficavam só pingando: todo clique virava ping, mesmo com a seta de selecionar ativa, e não dava para clicar nos personagens até recarregar a página. A causa era o Alt (ou o Espaço) ficar "apertado" na memória do app quando o navegador perdia o foco da janela (Alt+Tab, Cmd+Tab, menu do navegador) e o aviso de que a tecla foi solta se perdia. Agora o app confere o Alt no próprio clique e solta Alt e Espaço quando a janela perde o foco.',
		bullets: [],
	},
	{
		id: "v1.6.102-vtt-setas-do-teclado",
		version: "1.6.102",
		date: "15/11/2026",
		title: "Mover tokens com as setas do teclado",
		description:
			"Com um ou vários tokens selecionados (ferramenta Selecionar), as setas do teclado movem uma casa por toque, além de poder arrastar. Vários tokens andam juntos, mantendo a formação. As regras são as mesmas do arrasto: o token vira para onde andou, o jogador não atravessa parede nem janela (aparece o aviso e nada é gravado), o mestre passa, e token travado ou que você não controla fica parado. Segurar a seta repete, no máximo umas 7 casas por segundo, porque cada casa é gravada e entra no histórico de movimentos. Não vale enquanto você digita num campo ou com a Biblioteca, a ficha ou um diálogo em foco. Na grade hexagonal cada toque vai para o hexágono vizinho mais alinhado com a seta.",
		bullets: [],
	},
	{
		id: "v1.6.101-vtt-janelas",
		version: "1.6.101",
		date: "15/11/2026",
		title: "Janelas na mesa: abre e vê, mas ninguém passa",
		description:
			"Na ferramenta Parede o mestre agora escolhe Janela, além de Parede e Porta (ou seleciona paredes que já existem e usa Virar janela). A janela nasce fechada e bloqueia a vista; o jogador clica no ícone dela (com o personagem a até 1,5 casa) para abrir e ver o que há atrás. Diferente da porta, a janela nunca deixa o jogador passar, nem aberta: se ele tentar arrastar o token por ela, o token volta e aparece um aviso. Só o mestre move o token para o outro lado, para decidir caso a caso quais janelas dão para atravessar (com um teste, por exemplo). O ícone da janela é ciano, para não confundir com o da porta.",
		bullets: [],
	},
	{
		id: "v1.6.100-vtt-areas-de-luz",
		version: "1.6.100",
		date: "15/11/2026",
		title: "Áreas de luz na cena: dia, penumbra e escuridão",
		description:
			"A luz da cena deixou de ser uma só. A nova ferramenta Luz (atalho L) deixa o mestre marcar áreas dentro do mapa, em círculo, retângulo ou polígono, cada uma com luz do dia, penumbra ou escuridão, e escolher a luz padrão da cena (também com Penumbra). O alcance de visão de cada personagem passa a depender da luz do lugar onde ele está: na penumbra a visão normal cai à metade, no escuro só vale a visão no escuro (sem ela, a casa ao lado), e quem tem visão no escuro enxerga a penumbra por inteiro. Se duas áreas se sobrepõem, vale a criada por último, então dá para acender uma tocha dentro de uma sala escura. Clique numa área no modo Selecionar para trocar a luz dela ou apagar. Só o mestre vê o contorno das áreas, e a luz só vale com a Exploração ligada (o painel avisa e liga por você).",
		bullets: [],
	},
	{
		id: "v1.6.99-vtt-porta-icone",
		version: "1.6.99",
		date: "15/11/2026",
		title: "Porta vira um ícone",
		description:
			"A porta deixou de ser desenhada como um risco de madeira no vão. Agora é só um ícone no meio dele: uma porta fechada (laranja) ou entreaberta (amarela). O ícone é a única parte clicável, então clicar no vão longe dele não abre mais. Abrir revela o outro lado e fechada bloqueia, como antes. O jogador só vê o ícone das portas que já revelou, e o mestre vê o vão em traço fino na camada dele, para saber o tamanho da porta.",
		bullets: [],
	},
	{
		id: "v1.6.98-vtt-escurecer-explorado",
		version: "1.6.98",
		date: "15/11/2026",
		title: "O mestre escurece de novo o que o grupo já explorou",
		description:
			"Corrigido: o pincel, o retângulo e o círculo de Ocultar da névoa não faziam efeito sobre áreas que os jogadores já tinham explorado, porque a memória do mapa aparecia por cima. Agora cobrir um trecho apaga o que o grupo lembrava ali (na tela de todos e no servidor), e eles precisam explorar de novo. Cobrir o mapa todo apaga a memória inteira.",
		bullets: [],
	},
	{
		id: "v1.6.97-vtt-fichas-ilimitadas",
		version: "1.6.97",
		date: "15/11/2026",
		title: "Fichas abertas e minimizadas sem limite",
		description:
			"Antes a mesa guardava só 3 fichas: ao abrir a 4ª, a mais antiga era descartada, mesmo minimizada. Agora dá para abrir e minimizar quantas fichas quiser, inclusive todas. Os cartões minimizados ocupam sempre uma vaga livre da doca no canto inferior esquerdo, sem cair um em cima do outro, e quando a coluna enche seguem numa nova coluna ao lado.",
		bullets: [],
	},
	{
		id: "v1.6.96-vtt-barra-do-mestre",
		version: "1.6.96",
		date: "15/11/2026",
		title: "Barra do mestre: limpar magias e mesa sem poluição",
		description:
			"O mestre ganhou uma barra sempre à vista no canto da mesa com Limpar magias, que tira de uma vez todos os moldes de magia em campo, inclusive os dos jogadores (aparece só quando há moldes). Os contornos roxos que enchiam a mesa não eram magias: eram os cones de visão de cada personagem, que agora só aparecem para o token selecionado. A mesma barra tem Explorado (realce do que o grupo já viu) e Cones de todos, para quem quiser ver todos os cones de uma vez.",
		bullets: [],
	},
	{
		id: "v1.6.95-vtt-portas",
		version: "1.6.95",
		date: "15/11/2026",
		title: "Portas na mesa e paredes só na camada do mestre",
		description:
			"O mestre agora desenha portas, além de paredes: na ferramenta Parede, escolha Parede ou Porta, ou selecione paredes que já existem e use Virar porta. A porta nasce fechada e bloqueia a vista e o movimento como uma parede; o jogador clica nela (com o personagem a até 1,5 casa) para abrir e então vê o que há do outro lado; clicar de novo fecha. As portas aparecem para todos. As paredes continuam bloqueando a visão do jogador, mas agora só o mestre as vê, e só na camada do mestre: ao escolher a ferramenta Parede a mesa vai sozinha para essa camada.",
		bullets: [],
	},
	{
		id: "v1.6.94-vtt-mestre-ve-exploracao",
		version: "1.6.94",
		date: "15/11/2026",
		title: "O mestre vê o que os jogadores já exploraram",
		description:
			"Com o modo Exploração ligado, o mestre agora vê no mapa, em realce, tudo o que o grupo já explorou e, em contorno, o cone de visão que cada personagem tem neste momento. Só o mestre vê esse realce. Dá para ligar e desligar no painel da névoa, em Ver exploração dos jogadores (vem ligado).",
		bullets: [],
	},
	{
		id: "v1.6.93-faccoes-imagem",
		version: "1.6.93",
		date: "15/11/2026",
		title: "Imagens das facções aparecem e o envio voltou a funcionar",
		description:
			'A imagem da facção ou do patrono agora aparece na lista de Puxar Patrono / Facção e no cartão da ficha, com o ícone de sempre quando não há imagem (ou ela não carrega). Também corrigi o erro ao enviar imagens ("O arquivo não é a imagem que o tipo informa"): em navegadores que não geram WebP, como o Safari, o app declarava o tipo errado e o servidor recusava. Agora o tipo é sempre o da imagem de verdade. Vale para facções, NPCs, itens, locais e qualquer outro envio de imagem.',
		bullets: [],
	},
	{
		id: "v1.6.92-vtt-visao-cone",
		version: "1.6.92",
		date: "15/11/2026",
		title: "Visão em cone, que só abre ao mover de verdade",
		description:
			"No modo Exploração, o personagem agora enxerga em cone de 120° para onde está olhando, mais 1 casa em volta de si; as paredes continuam bloqueando a vista e o que o cone já viu fica na memória do mapa. Ele passa a olhar para onde andou na última vez que se moveu, e o dono ou o mestre também pode girá-lo no menu do token. Uma pequena seta no token mostra a direção. Arrastar o personagem não revela mais o mapa: a visão só muda quando você solta o token (soltar no mesmo lugar não revela nada), e enquanto arrasta um fantasma do token aparece sobre a névoa para você ver onde está soltando.",
		bullets: [],
	},
	{
		id: "v1.6.91-vtt-luz-visao-escuro",
		version: "1.6.91",
		date: "15/11/2026",
		title: "Visão no escuro e luz da cena",
		description:
			"A ficha agora tem Visão (na luz) e Visão no escuro. Na mesa, o mestre escolhe se a cena é Clara ou Escura no painel da névoa (com o modo Exploração ligado): na escura, cada personagem só enxerga até a sua visão no escuro e, sem ela, apenas a casa ao lado. Na clara vale o maior alcance entre os dois. Dá para editar a visão direto no resumo da ficha, na mesa: mestre, co-mestre e quem criou a ficha. Também corrigi um defeito em que a visão de dois personagens próximos se sobrepunha e deixava a área escurecida mesmo dentro do alcance.",
		bullets: [],
	},
	{
		id: "v1.6.90-vtt-memoria-exploracao",
		version: "1.6.90",
		date: "15/11/2026",
		title: "O mapa lembra o que o grupo já explorou",
		description:
			"No modo Exploração, o que qualquer personagem já viu fica marcado no mapa em penumbra, mesmo depois que ele se afasta, e continua assim ao recarregar a mesa. A memória é do grupo: se um jogador descobre uma sala, todos passam a vê-la como explorada, e as paredes continuam bloqueando o que fica atrás delas. O mestre pode apagar tudo no painel da névoa, em Esquecer o que já foi explorado.",
		bullets: [],
	},
	{
		id: "v1.6.89-vtt-visao",
		version: "1.6.89",
		date: "15/11/2026",
		title: "A visão do personagem revela o mapa",
		description:
			"No modo Exploração, o jogador agora só enxerga o mapa até onde o personagem enxerga, e as paredes bloqueiam a vista: atrás de uma parede fica a sombra, e monstros escondidos ali não aparecem. A ficha ganhou o campo Visão (na mesma unidade do deslocamento); ele manda no alcance do token e aparece no resumo da ficha na mesa. Vazio, vale o alcance do token (6 casas). Também corrigi o travamento ao arrastar tokens com a névoa ligada: a névoa deixou de ser redesenhada a cada movimento do mouse.",
		bullets: [],
	},
	{
		id: "v1.6.88-vtt-templates-delete",
		version: "1.6.88",
		date: "13/11/2026",
		title: "Moldes de magia saem um a um",
		description:
			"Na mesa, cada molde mostra o nome da magia e quem o colocou. Dá para selecionar um no mapa e excluir só ele, pelo botão ou pela tecla Delete. Quem colocou apaga o seu; mestre e co-mestre apagam qualquer um. Limpar tudo continua com os seus, e mestre ou co-mestre limpam a mesa inteira. O molde não fica salvo no banco: some da sessão.",
		bullets: [],
	},
	{
		id: "v1.6.87-vtt-regua",
		version: "1.6.87",
		date: "13/11/2026",
		title: "Régua da mesa fica na tela ao soltar",
		description:
			"A medida da régua continua no mapa quando o clique ou o arrasto termina. Ela permanece até Esc, a troca de ferramenta ou o duplo clique que fixa o caminho.",
		bullets: [],
	},
	{
		id: "v1.6.86-vtt-ping",
		version: "1.6.86",
		date: "13/11/2026",
		title: "Ping da mesa pulsa e não trava em rajada",
		description:
			"O ping na mesa volta a pulsar e some sozinho. Vários pings seguidos deixam de empilhar na tela e no som: o excesso é ignorado e só os mais recentes continuam visíveis.",
		bullets: [],
	},
	{
		id: "v1.6.85-municao-ficha",
		version: "1.6.85",
		date: "09/11/2026",
		title: "Munição: efeitos no cadastro e disparo na ficha",
		description:
			"Itens de Munição ganharam a aba Efeitos. No inventário, a quantidade de munição vinculada só muda pela chamada de servidor. Na ficha, armas com a propriedade Munição disparam, gastam 1 unidade e rolam o dano mesclado. Sem a migration no servidor, a quantidade permanece só leitura e o disparo avisa que está indisponível.",
		bullets: [],
	},
	{
		id: "v1.6.84-municao-rpc",
		version: "1.6.84",
		date: "09/11/2026",
		title: "Munição: consumo no servidor, ainda sem botão na mesa",
		description:
			"Gastar munição passou a ser uma chamada de servidor com registro do disparo. A quantidade no inventário não volta atrás com o save antigo da ficha. A tela de ataque ainda não dispara o gasto; isso vem depois da migration ser aplicada.",
		bullets: [],
	},
	{
		id: "v1.6.83-municao-regras",
		version: "1.6.83",
		date: "09/11/2026",
		title: "Munição consumível: regras, ainda sem gasto na mesa",
		description:
			"A lista de categorias inclui Munição. Dano próprio, adicionais e condições em texto já existem nas regras, mas a aba de efeitos e o disparo que gasta 1 unidade ainda não estão na tela. Estoque de munição só muda por chamada de servidor; sem ela, a quantidade permanece só leitura.",
		bullets: [],
	},
	{
		id: "v1.6.82-quem-pode-ver",
		version: "1.6.82",
		date: "07/11/2026",
		title: "O mestre escolhe quem vê ficha, NPC e imagem",
		description:
			"Na ficha e no NPC, o mestre escolhe toda a mesa, só co-mestres, só jogadores ou pessoas marcadas. Na imagem, além de co-mestres e jogadores, dá para marcar uma pessoa. O mestre e quem criou sempre veem. Esconder de verdade no servidor começa quando a migration 0061 estiver aplicada; até lá a tela já respeita a escolha e avisa se marcar uma pessoa na imagem ainda não for possível.",
		bullets: [],
	},
	{
		id: "v1.6.81-transferir-mestre-f2",
		version: "1.6.81",
		date: "07/11/2026",
		title: "Transferir a mesa para outro mestre",
		description:
			"O mestre pode passar a campanha a um jogador ou co-mestre que já está na mesa. A confirmação diz quem recebe a mesa e que você vira co-mestre sem poder desfazer sozinho. As imagens privadas e os segredos de mestre desta mesa passam para essa pessoa. A ação fica desligada até a migration ser aplicada e o recurso ser ligado de propósito; se o servidor ainda não tiver a chamada, a tela avisa que a transferência está indisponível e não muda os papéis.",
		bullets: [],
	},
	{
		id: "v1.6.80-vtt-persistencia-grid-p2b",
		version: "1.6.80",
		date: "06/11/2026",
		title: "Ajustes do grid e névoa sem perder a intenção mais recente",
		description:
			"Os controles da mesa passam a guardar os ajustes mais recentes por cena enquanto o servidor responde. Uma falha mantém o valor local e oferece tentativa explícita de salvar. A escala espera os ajustes pendentes e, se o resultado ficar incerto, lê a cena antes de permitir continuar sem repetir a multiplicação.",
		bullets: [],
	},
	{
		id: "v1.6.79-vtt-dados-botao",
		version: "1.6.79",
		date: "06/11/2026",
		title: "Botão de rolar dados inteiro na mesa",
		description:
			"O painel de rolagens e chat agora aproveita a altura disponível da tela e permite rolar o conteúdo quando necessário, sem cortar o botão Rolar. O botão mantém a área mínima de toque também no celular, sem mudar a rolagem dos dados ou os resultados.",
		bullets: [],
	},
	{
		id: "v1.6.78-vtt-escala-p2a2",
		version: "1.6.78",
		date: "06/11/2026",
		title: "Base segura para escalar a cena sem perder ajustes",
		description:
			"Ainda sem ligar à interface ou chamar o banco, preparamos a coordenação que espera os ajustes do grid e da névoa terminarem antes de escalar uma cena. Durante a escala, novos ajustes dessa cena são recusados, sem bloquear as outras. Uma falha conhecida restaura escala, tokens e paredes; se o resultado ficar incerto, a recuperação lê o estado atual em vez de repetir a multiplicação.",
		bullets: [],
	},
	{
		id: "v1.6.77-vtt-persistencia-grid-p2a",
		version: "1.6.77",
		date: "06/11/2026",
		title: "Base para não perder ajustes do grid e do modo de névoa",
		description:
			"Ainda sem ligar à interface, preparamos a base para salvar ajustes de grid e do modo de névoa sem perder a edição mais recente por cena. Uma falha permanente mantém a intenção local até a tentativa explícita de salvar novamente. A barreira de escala não entra nesta fatia.",
		bullets: [],
	},
	{
		id: "v1.6.76-transferir-mestre-f1",
		version: "1.6.76",
		date: "06/11/2026",
		title: "Transferência de mestre: regras no servidor",
		description:
			"Preparamos a regra do banco para o mestre atual transferir a campanha a um membro existente: o antigo mestre permanece como co-mestre e o convidado só recebe o cargo pela chamada autorizada. Ninguém vira dono por convite ou edição direta, o dono não sai da própria campanha, e falhas preservam todos os papéis. Esta fatia não abre a interface nem aplica a migration: antes de aplicá-la, campanhas legadas divergentes exigem reparo manual confirmado.",
		bullets: [],
	},
	{
		id: "v1.6.75-vtt-publicacao-atomica",
		version: "1.6.75",
		date: "06/11/2026",
		title: "Uma só operação para exibir uma cena aos jogadores",
		description:
			"Ao exibir uma cena da preparação, o servidor agora publica a escolhida e desativa a anterior em uma única operação. Uma falha no meio não deixa a mesa sem cena em jogo. Erros de permissão ou conexão aparecem em aviso e não mudam a cena antes da confirmação; somente mestre ou editor pode publicar.",
		bullets: [],
	},
	{
		id: "v1.6.74-vtt-persistencia-fila-p1",
		version: "1.6.74",
		date: "06/11/2026",
		title: "Base testável para não perder edições da mesa",
		description:
			"Preparamos, sem ligar à interface ou ao banco, o motor que preserva a edição mais recente de cada token, grid e névoa ao salvar em ordem, coalescer gestos e reconectar. Ele mostra erro por entidade e mantém pendências só na memória desta aba, com aviso ao trocar de usuário. Criar token continua exigindo conexão; a regra de duas contas locais será provada em outra fatia.",
		bullets: [],
	},
	{
		id: "v1.6.73-visao-s6a-los",
		version: "1.6.73",
		date: "06/11/2026",
		title: "Visão S6a: linha de visão bloqueada por paredes",
		description:
			"Lógica pura de raycast ponto a ponto sobre as paredes da mesa (hasLineOfSight), com testes. Ainda sem UI, alcance nem névoa dinâmica.",
		bullets: [],
	},
	{
		id: "v1.6.72-impeccable-trial",
		version: "1.6.72",
		date: "06/11/2026",
		title: "Trial do detector Impeccable",
		description:
			"Instalamos o impeccable como devDependency e o script pnpm impeccable:detect cobre o chat de IA da mesa e a edição em lote da ficha. A varredura em fonte nessas áreas não apontou finding primário; o Designer compara com a revisão dele.",
		bullets: [],
	},
	{
		id: "v1.6.71-escala-plus-disabled",
		version: "1.6.71",
		date: "06/11/2026",
		title: "Escala do mapa: + no teto com opacity do DS",
		description:
			"No ajuste do grid, o botão + da escala no teto usa o mesmo disabled:opacity-50 (e data-disabled) do design system que o − no piso.",
		bullets: [],
	},
	{
		id: "v1.6.69-escala-do-mapa",
		version: "1.6.69",
		date: "05/11/2026",
		title: "Escala do mapa de 25% a 400%",
		description:
			"No ajuste do grid, o mestre muda a escala do desenho do mapa (25% a 400%) com botões −/+ e o controle deslizante. Tokens e paredes acompanham pela função do servidor. A escala não passa do limite de 4096 px da imagem: em mapa já no teto, o máximo é 100%.",
		bullets: [],
	},
	{
		id: "v1.6.68-ficha-lote-p2",
		version: "1.6.68",
		date: "05/11/2026",
		title: "Edição em lote: 413 sem retry e texto mais claro",
		description:
			"Se o texto for grande demais (413), o assistente avisa e não mostra Tentar de novo. O modo lote diz que texto longo vira proposta. A espera compacta não repete o aviso de carregando. Se salvar o lote falhar, aparece a mensagem do erro.",
		bullets: [],
	},
	{
		id: "v1.6.67-convite-email-limite",
		version: "1.6.67",
		date: "05/11/2026",
		title: "Convite: e-mail largo e um só card de limite",
		description:
			"Na aba de jogadores, o campo de e-mail passa a ocupar o espaço que sobra ao lado do papel e do botão Convidar. O card de limite de jogadores aparece uma vez só.",
		bullets: [],
	},
	{
		id: "v1.6.66-offset-do-grid",
		version: "1.6.66",
		date: "02/11/2026",
		title: "O grid pode sair do canto e a célula aceita decimal",
		description:
			"No ajuste do grid, o mestre define o deslocamento X e Y em pixels, com botões de 1 px, para as linhas caírem em cima do desenho do mapa. Contar os quadrados do mapa (colunas por linhas) calcula o tamanho da célula. O campo da célula aceita décimos, de 10 a 400. Quem joga não vê esse painel. Mudar o tamanho do desenho do mapa, junto com tokens e paredes, fica numa função do servidor que só o mestre pode chamar.",
		bullets: [],
	},
	{
		id: "v1.6.65-celula-do-grid-10-a-400",
		version: "1.6.65",
		date: "02/11/2026",
		title: "Célula do grid de 10 a 400 px, com campo e botões − e +",
		description:
			"No ajuste do grid, o mestre digita o tamanho da célula em pixels (de 10 a 400) ou usa os botões − e + e o novo controle deslizante. Enquanto arrasta, só o mestre vê o grid mudar; ao soltar, a mesa recebe o novo tamanho. Se a gravação falhar, o tamanho volta ao anterior com um aviso. “Escala” agora se chama “Distância por célula” (padrão 1,5 m). Com o grid desativado, o painel ainda mostra o tamanho da célula, que vale para a régua e os tokens. No celular, o painel vira uma barra embaixo da tela, sem cobrir o grid.",
		bullets: [],
	},
	{
		id: "v1.6.64-esperas-da-ia",
		version: "1.6.64",
		date: "04/11/2026",
		title: "Duas esperas no assistente da mesa",
		description:
			'Pergunta curta mostra os três pontos. Texto longo ou pedido de edição da ficha mostra "Lendo o prompt" com barras mais visíveis. Perguntas sobre a ficha não ativam mais a espera de edição.',
		bullets: [],
	},
	{
		id: "v1.6.63-convite-select-ds",
		version: "1.6.63",
		date: "02/11/2026",
		title: "O papel no convite usa o seletor do app",
		description:
			"Na aba de jogadores, a escolha entre Jogador (Ver) e Co-Mestre (Editar) agora abre o mesmo seletor do resto do app, e não a lista do sistema. Dá para escolher pelo teclado, o foco aparece no campo, e enquanto o convite está sendo enviado o seletor fica travado. O convite continua saindo com o papel escolhido.",
		bullets: [],
	},
	{
		id: "v1.6.62-espera-da-ia-compacta",
		version: "1.6.62",
		date: "02/11/2026",
		title: "Espera do assistente em uma linha",
		description:
			"Enquanto o assistente da mesa responde, a espera aparece numa linha só, com três pontos. Quando a resposta chega, ou se der erro ou acabar o limite do dia, essa espera some e não fica uma mensagem vazia.",
		bullets: [],
	},
	{
		id: "v1.6.61-edicao-lote-ficha",
		version: "1.6.61",
		date: "02/11/2026",
		title: "Alterar a ficha em lote pelo assistente",
		description:
			"Dá para colar um resumo de build e pedir várias mudanças de uma vez. O assistente mostra quantas alterações valem e, à parte, os campos rejeitados — esses não entram na conta. A lista segue agrupada por seção, com o valor antigo riscado e o novo ao lado. Nada é salvo até você aplicar, e a gravação entra toda de uma vez: o painel só diz que aplicou depois que o salvamento termina. Se falhar, a ficha volta ao que era e dá para tentar de novo. Com um lote em revisão, o campo de texto recolhe para a lista caber; a pergunta enviada fica na conversa. Texto acima de 1.200 caracteres liga o modo edição em lote, indicado abaixo do campo com o contador de 20.000: o texto colado fica no campo durante a revisão, no erro ou se for grande demais, e só limpa depois de aplicar. No chat normal o campo limpa no envio.",
		bullets: [],
	},
	{
		id: "v1.6.60-rascunho-vazio-e-erro-ao-salvar",
		version: "1.6.60",
		date: "02/11/2026",
		title: "Rascunho vazio some, e erro ao salvar deixa a janela aberta",
		description:
			"Campo obrigatório em branco, ou valor igual ao que já está salvo, não fica guardado. Abrir de novo mostra o valor salvo. Se a gravação falhar ao fechar ou no botão Salvar, a janela continua aberta, o aviso aparece embaixo do campo e dá pra tentar de novo. Esse aviso é sempre uma frase simples, sem o texto técnico do servidor. Falha ao renomear ou ao salvar o módulo não abre o aviso geral de “Falha ao sincronizar”. Formulário inválido ainda fecha e guarda o rascunho. O X continua descartando, como Cancelar.",
		bullets: [],
	},
	{
		id: "v1.6.59-ia-mesa-ux",
		version: "1.6.59",
		date: "02/11/2026",
		title: "O assistente da mesa avisa o limite e trava o envio",
		description:
			"Quando o limite do dia acaba, o aviso no painel fica neutro e mostra a hora em que volta, no horário de São Paulo. O campo esvazia, fica desabilitado e mostra só esse motivo. A pergunta entra na conversa na hora e o campo limpa no envio; enquanto a resposta carrega não dá para enviar de novo. Se a chave ou o modelo falhar, o aviso diz que não deu para responder agora e que nada foi enviado, e “Tentar de novo” reenvia a pergunta que já está na conversa. Campanha ainda não liberada continua com o aviso de que o assistente não está disponível nela. O painel vazio diz “Pergunte sobre regras, a cena ou a ficha.”",
		bullets: [],
	},
	{
		id: "v1.6.58-assistente-claude",
		version: "1.6.58",
		date: "02/11/2026",
		title: "Assistente da mesa no Claude, com limite do dia",
		description:
			"O assistente da mesa passa a responder pelo Claude. Pergunta do dia a dia usa o modelo rápido; mudar uma ficha usa o modelo mais cuidadoso. Cada mesa tem um limite de pedidos por dia. Quando acaba, o aviso aparece no próprio painel, com o dia e a hora em que volta, e o campo de envio fica desabilitado. Se a IA não estiver disponível, o texto que você digitou continua lá e dá para tentar de novo. O botão só aparece nas campanhas liberadas.",
		bullets: [],
	},
	{
		id: "v1.6.56-vinculo-de-itens-na-ficha",
		version: "1.6.56",
		date: "30/10/2026",
		title:
			"Regra de quem vincula itens da campanha na ficha, agora no servidor",
		description:
			"O servidor passa a conferir quem pode vincular ou desvincular itens da campanha numa ficha. Mestre, co-mestres e editores vinculam em qualquer ficha da mesa. O jogador vincula só na ficha que ele criou. Quem não está na campanha não vincula nada. Item secreto do mestre só o mestre ou co-mestre vincula.",
		bullets: [],
	},
	{
		id: "v1.6.55-dialog-salva-ao-fechar",
		version: "1.6.55",
		date: "30/10/2026",
		title: "Renomear o personagem salva ao fechar",
		description:
			"Na ficha, ao renomear o personagem, clicar fora da janela ou apertar Esc salva o nome. Se o nome ficar vazio, ele vira um rascunho e volta quando você abre de novo.",
		bullets: [],
	},
	{
		id: "v1.6.54-imagens-sem-acesso-anonimo",
		version: "1.6.54",
		date: "30/10/2026",
		title: "Reforço de segurança nas imagens",
		description:
			"Fechamos uma porta técnica: quem não está logado não consegue mais nem perguntar ao servidor quem pode ver cada imagem. Para quem está logado, nada muda.",
		bullets: [],
	},
	{
		id: "v1.6.53-quem-ve-a-imagem",
		version: "1.6.53",
		date: "30/10/2026",
		title: "Escolha quem vê cada imagem",
		description:
			"Na Biblioteca de imagens, quem subiu a imagem decide quem vê. Ela é pública por padrão. Ao tirar o “Pública”, você marca livremente “Co-mestres” e “Jogadores”: os dois, só um deles ou nenhum (aí só o mestre vê). As imagens que já eram privadas continuam como estavam: co-mestres veem, jogadores não. O jogador também pode subir e esconder as próprias imagens, mas o mestre sempre vê tudo da mesa.",
		bullets: [],
	},
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
