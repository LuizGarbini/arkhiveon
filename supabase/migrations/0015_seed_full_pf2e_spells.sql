-- Seeding Pathfinder 2e spells in Portuguese
delete from public.spells where system = 'pathfinder' and user_id is null;

insert into public.spells (user_id, system, name, level, school, casting_time, range, components, duration, description, is_homebrew) values
  (null, 'pathfinder', 'Jorro Ácido', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Você lança um globo de ácido que respinga em criaturas e objetos. Faça um ataque de magia. Se acertar, você causa 1d6 de dano de ácido mais 1 de dano de ácido de respingo. Em um sucesso crítico, o alvo também sofre 1 de dano persistente de ácido.

Elevada (3º) O dano inicial aumenta para 1d6 + o modificador de seu atributo de conjuração e o Dano Persistente aumenta para 2.
Elevada (5º) O dano inicial aumenta para 2d6 + o modificador de seu atributo de conjuração, o Dano Persistente aumenta para 3 e o dano de respingo aumenta para 2.
Elevada (7º) O dano inicial aumenta para 3d6 + o modificador de seu atributo de conjuração, o Dano Persistente aumenta para 4 e o dano de respingo aumenta para 3.
Elevada (9º) O dano inicial aumenta para 4d6 + o modificador de seu atributo de conjuração, o Dano Persistente aumenta para 5 e o dano de respingo aumenta para 4.', false),
  (null, 'pathfinder', 'Inspirar Coragem', 0, '', '1 ação', '', '', '1 rodada', 'Você inspira seus aliados com palavras ou tons de encorajamento. Você e todos os aliados na área recebem +1 de bônus de estado em rolagens de ataque, rolagens de dano e em salvamentos contra efeitos de medo.', false),
  (null, 'pathfinder', 'Pasmar', 0, '', '2 ações', '18 metros', '', '1 rodada', 'Você nubla a mente do alvo e pasma ele com um solavanco mental. O solavanco causa dano mental igual ao modificador de seu atributo de conjuração; o alvo deve tentar um salvamento básico de Vontade. Se falhar criticamente no salvamento, o alvo também fica atordoado 1.

---

Elevada (+2) O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Detectar Magia', 0, '', '2 ações', '', '', 'Instantânea', 'Você emite um pulso que registra a presença de magia. Você não recebe informação além da presença ou ausência de magia. Você pode escolher ignorar magia à qual tenha ciência da presença, como de itens mágicos e magias contínuas suas e de seus aliados.

 Você detecta alguma ilusão mágica somente se o efeito da ilusão tiver nível inferior ao nível de magia de sua detectar magia. Entretanto, itens que possuem uma aura de ilusão e não são enganosos em aparência (como uma an  poção de invisibilidade) geralmente são detectados normalmente.

 Elevada (3º)   Você descobre a escola de magia para o efeito de maior nível dentro da área detectada pela magia. Se vários efeitos forem igualmente fortes, o MJ determina qual você descobre. Elevada (4º) Como 3º nível, mas você também aponta a direção da magia de maior nível. Como esse é um sentido impreciso, você não descobre a localização exata, mas pode delimitar a fonte para um cubo a até 1,5 metros (ou o mais próximo se for maior do que isso).', false),
  (null, 'pathfinder', 'Lança Divina', 0, '', '2 ações', '18 metros', '', 'Instantânea', 'Você lança um feixe de energia divina. Escolha uma tendência que sua divindade possua (bem, caos, mal ou ordem). Você não pode conjurar esta magia se não tiver uma divindade ou se sua divindade for neutra verdadeira. Esta magia recebe o traço da tendência escolhida. Faça uma rolagem de ataque de magia contra a CA do alvo. Em um acerto, o alvo sofre dano do tipo de tendência escolhido igual a 1d4 + o modificador de seu atributo de conjuração (dobro do dano em um acerto crítico).

---

Elevada (+1) O dano aumenta em 1d4.', false),
  (null, 'pathfinder', 'Arco Elétrico', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Um arco de eletricidade salta de um alvo para outro. Você causa dano de eletricidade igual a 1d4 mais o modificador de seu atributo de conjuração.

---

Elevada (+1)O dano aumenta em 1d4.', false),
  (null, 'pathfinder', 'Som Fantasma', 0, 'Ilusão', '2 ações', '9 metros', '', 'Sustentada', 'Você cria uma ilusão auditiva de sons simples com um volume máximo igual a quatro humanos normais gritando. O som emana de um quadrado que você designar na distância. Você não pode criar palavras inteligíveis ou outros sons intrincados (como música).

---

Elevada (3º) A distância aumenta para 18 metros.

Elevada (5º)A distância aumenta para 36 metros.', false),
  (null, 'pathfinder', 'Proteção Proibitiva', 0, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você protege um aliado contra os ataques e magias hostis do inimigo alvo. O aliado alvo recebe +1 de bônus de estado na Classe de Armadura e jogadas de salvamento contra os ataques, magias e outros efeitos gerados pelo inimigo.

---

Elevada (6º) O bônus de estado aumenta para +2.', false),
  (null, 'pathfinder', 'Raio de Gelo', 0, '', '2 ações', '18 metros', '', 'Instantânea', 'Você emite um raio gélido. Faça uma rolagem de ataque de magia. O raio causa dano de frio igual a 1d4 + o modificador de seu atributo de conjuração.

---

Sucesso Crítico O alvo sofre o dobro do dano e sofre –3 metros de penalidade de estado nas Velocidades dele por 1 rodada.
Successo O alvo sofre o dano inteiro.

---

Elevada (+1)&nbspO dano aumenta em 1d4.', false),
  (null, 'pathfinder', 'Orientação', 0, '', '1 ação', '9 metros', '', 'Until the start of your next turn', 'Você pede por orientação divina, concedendo ao alvo +1 de bônus de estado a uma jogada de salvamento, rolagem de ataque, teste de Percepção ou teste de perícia realizado antes da duração acabar. O alvo escolhe em qual rolagem usar o bônus antes de rolar o dado. Se o alvo usar o bônus, a magia acaba. De qualquer forma, o alvo fica temporariamente imune por 1 hora.', false),
  (null, 'pathfinder', 'Produzir Chama', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Uma pequena bola de chamas aparece na palma de sua mão, e você ataca com ela em combate corpo a corpo ou à distância. Faça uma rolagem de ataque de magia contra a CA de seu alvo. Isto normalmente é um ataque à distância, mas você também pode desferir um ataque corpo a corpo contra uma criatura em seu alcance desarmado. Em um sucesso, você causa 1d4 de dano de fogo mais o modificador de seu atributo de conjuração. 

Em um sucesso crítico, o alvo sofre o dobro do dano e 1d4 de dano persistente de fogo.

---

Elevada (+1) IO dano aumenta em 1d4 e o dano persistente em um acerto crítico em 1d4.', false),
  (null, 'pathfinder', 'Unir Passados', 0, 'Adivinhação', '1 ação', 'Toque', 'S', '1 rodada', 'Você toca as testas dos alvos e os coloca em uma comunhão mental. Os alvos podem partilhar pensamentos e experiências, mas não palavras. Quando um dos alvos tentar  Recordar Conhecimento, um outro pode  Auxiliar o teste de perícia do primeiro alvo, utilizando qualquer  perícia Saber (mesmo que esse Saber normalmente não fosse ser aplicável) sem ter feito qualquer preparação para Auxiliar.

---

Elevada (+1) Você pode tocar um alvo adicional para incluí-lo nos efeitos da magia. Vários alvos podem fazer testes para Auxiliar o alvo que esteja tentando Recordar Conhecimento.', false),
  (null, 'pathfinder', 'Intuir Direção', 0, '', '2 ações', '', '', 'Instantânea', 'No olho de sua mente, você vê um caminho para o norte. Você imediatamente sabe em qual direção está o norte (se ele existir em sua localização atual).

---

Elevada (7º) Você pode saber a direção para um local familiar, como lar antigo ou taverna favorita.', false),
  (null, 'pathfinder', 'Luz', 0, '', '2 ações', '36 metros', '', 'Until your next daily preparations', 'O objeto brilha, emanando luz brilhante em um raio de 6 metros (e luz fraca nos próximos 6 metros) como uma tocha. Se você conjurar esta magia em um segundo objeto, a magia luz no primeiro objeto é encerrada.

---

Elevada (4°)O objeto emana luz brilhante em um raio de 18 metros
(e luz fraca nos próximos 18 metros).', false),
  (null, 'pathfinder', 'Luz', 0, '', '2 ações', '36 metros', '', 'Until your next daily preparations', 'O objeto brilha, emanando luz brilhante em um raio de 6 metros (e luz fraca nos próximos 6 metros) como uma tocha. Se você conjurar esta magia em um segundo objeto, a magia luz no primeiro objeto é encerrada.

---

Elevada (4°)O objeto emana luz brilhante em um raio de 18 metros
(e luz fraca nos próximos 18 metros).', false),
  (null, 'pathfinder', 'Mensagem', 0, 'Ilusão', '1 ação', '36 metros', '', 'See below', 'Você murmura palavras discretamente, mas em vez de saírem de sua boca, elas são transferidas diretamente aos ouvidos do alvo. Embora outros não possam ouvir suas palavras melhor do que um sussurro inaudível, o alvo pode ouvir suas palavras como se estivesse próximo de você. O alvo pode dar uma resposta breve como uma reação ou, se preferir, como uma ação livre no próximo turno dele, mas deve ser capaz de vê-lo e estar na distância desta magia para fazê-lo. Se ele responder, essa resposta é entregue diretamente em seus ouvidos, da mesma forma que a mensagem original.

Elevada (3º) A distância da magia aumenta para 150 metros.', false),
  (null, 'pathfinder', 'Prestidigitação', 0, '', '2 ações', '3 metros', '', 'Sustentada', 'Uma magia simples atende aos seus desejos. Você pode executar efeitos mágicos simples enquanto Sustentar a Magia. Cada vez que Sustentar a Magia, escolha uma dessas quatro opções.

Cozinhar Esfriar, esquentar ou temperar meio quilo de matéria não-viva.
Criar Cria um objeto temporário de Volume insignificante, feito de substância mágica solidificada. O objeto parece imperfeito e artificial, e é extremamente frágil — ele não pode ser utilizado como uma arma, componente de magia ou ferramenta.
CuidarColorir, limpar ou sujar um objeto de Volume leve ou menor. Você pode afetar um objeto de Volume 1 com 10 rodadas de concentração, e um objeto maior com 1 minuto por Volume.
Erguer; Lentamente  erguer um objeto desapossado de Volume leve ou menor a até 30 centímetros do chão. Prestidigitação não pode causar dano ou condições adversas.

Prestidigitação não pode causar dano ou condições adversas. Qualquer mudança real em um objeto (além do notado acima) persiste somente enquanto você Sustentar a Magia.', false),
  (null, 'pathfinder', 'Ler Aura', 0, '', '1 minuto', '9 metros', '', 'Instantânea', 'Você focaliza o objeto alvo, abrindo sua mente para perceber auras mágicas. Quando a conjuração é completada, você sabe se esse item é mágico e, se for, qual a escola de magia dele (página 297 e 298).

Se o objeto for ilusório, você o detecta somente se o nível do efeito for menor que o nível de sua magia ler aura.

---

Elevada (3º) Você pode afetar até 10 objetos.
Elevada (6º) Você pode afetar qualquer quantidade de objetos.', false),
  (null, 'pathfinder', 'Escudo Místico', 0, '', '1 ação', '', '', 'Until the start of your next turn', 'Você ergue um escudo de força mágica. Isto conta como usar a ação Erguer um Escudo, concedendo-lhe +1 de bônus de circunstância na CA até o início de seu próximo turno, mas ele não requer uma mão para ser usado.

Enquanto esta magia estiver em efeito, você pode usar a reação Bloqueio com Escudo usando seu escudo mágico. O escudo possui Dureza 5. Após usar Bloqueio com Escudo, a magia é encerrada e você não pode conjurá-la novamente por 10 minutos. Ao contrário de um Bloqueio com Escudo normal, você pode usar a reação desta magia contra a magia mísseis mágicos.

Elevar a magia aumenta a Dureza do escudo.

---

Elevada (3º) O escudo tem Dureza 10.

Elevada (5º) O escudo tem Dureza 15.

Elevada (7º) O escudo tem Dureza 20.

Elevada (9º) O escudo tem Dureza 25.', false),
  (null, 'pathfinder', 'Sigilo', 0, '', '2 ações', 'Toque', '', 'Unlimited (see below)', 'Você situa inofensivamente seu símbolo mágico único em uma criatura ou objeto alvo. A marca, que mede cerca de 2,5 centímetros de lado, pode ser visível ou invisível, e você pode mudá-la de um estado para o outro ao usar uma ação de Interagir para tocar o alvo. A marca pode ser apagada com 5 minutos de trabalho. Se estiver em uma criatura, ela desvanece naturalmente ao longo de uma semana. O tempo antes da marca desvanecer aumenta de acordo com o nível elevado dela.

---

Elevada (3º) O sigilo desvanece após 1 mês.
Elevada (5º) O sigilo desvanece após 1 ano.
Elevada (7º) O sigilo nunca desvanece.', false),
  (null, 'pathfinder', 'Refrão da Prata', 0, 'Abjuração', '1 ação', '', 'V', '1 rodada', 'A "Canção de Prata" era uma canção encantada usada pelos Corvos de Prata para combater as forças diabólicas. Você seleciona versos selecionados para replicar temporariamente alguns dos benefícios da música lendária, embora em uma escala muito menor.

Ataques de armas e desarmados por aliados na área são tratados como prata. Além disso, essa magia tenta neutralizar automaticamente qualquer porta dimensional lançada por um diabo dentro da área ou lançada por um diabo tentando entrar na área usando porta dimensional. Se um diabo tentar entrar na área usando porta dimensional e a magia é neutralizada, o diabo permanece onde começou.

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Estabilizar', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Energia positiva fecha as portas da morte. O alvo perde a condição morrendo, embora permaneça inconsciente com 0 Pontos de Vida.', false),
  (null, 'pathfinder', 'Emaranhapé', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Uma vinha coberta com uma seiva pegajosa aparece no ar, se lançando de sua mão para o alvo. Faça um ataque de magia contra o alvo.

---

Sucesso CríticoO alvo sofre a condição imobilizado  e –3 metros de penalidade de circunstância nas Velocidades dele por 1 rodada. Ele pode tentar Escapar contra sua CD de magia para remover a penalidade e a condição imobilizado .
SucessoO alvo sofre –3 metros de penalidade de circunstância nas Velocidades dele por 1 rodada. Ele pode tentar Escapar contra sua CD de magia para remover a penalidade.
 FalhaO alvo não é afetado.

---

Elevada (2º)O efeito dura por 2 rodadas.
 Elevada (4º)O efeito dura por 1 minuto.', false),
  (null, 'pathfinder', 'Mão Mística', 0, '', '2 ações', '9 metros', '', 'Sustentada', 'Você cria uma única mão mágica, invisível ou fantasmagórica, que pega o objeto alvo e se move lentamente até 6 metros. Você levita o objeto e pode movê-lo em qualquer direção. Quando Sustentar a Magia, você pode mover o objeto 6 metros adicionais. Se o objeto estiver no ar quando a magia acabar, ele cai.

---

Elevada (3º) Você pode afetar um objeto desapossado com Volume 1 ou menor.

Elevada (5º) A distância aumenta para 18 metros e você pode afetar um objeto desapossado de Volume 1 ou menor

Elevada (7º) A distância aumenta para 18 metros e você pode afetar um objeto desapossado de Volume 2 ou menor.', false),
  (null, 'pathfinder', 'Projétil Telecinético', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Você lança um objeto desapossado solto que esteja dentro da distância e possua Volume 1 ou menor no alvo. Faça um ataque de magia à distância contra o alvo. Se acertar, você causa dano contundente, cortante ou perfurante — conforme apropriado para o objeto arremessado — igual a 1d6 mais o modificador de seu atributo de conjuração. Nenhum traço específico ou propriedade mágica do item arremessado afeta o ataque ou o dano causado.

---
Sucesso Crítico  Você causa o dobro do dano.

Sucesso  Você causa o dano inteiro.

---
Elevada (+1)  O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Disrupção de Morto-Vivo', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Você perfura o alvo com energia. Você causa 1d6 de dano mais o modificador de seu atributo de conjuração. O alvo deve tentar um salvamento básico de Fortitude. Se a criatura falhar criticamente no salvamento, ela também fica enfraquecido 1 por 1 rodada.

---

Elevada (+1)O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Toque Gélido', 0, '', '2 ações', '9 metros', '', 'Instantânea', 'Você canaliza energia negativa, fazendo sua mão irradiar uma escuridão pálida. Seu toque enfraquece os vivos e desorienta mortos-vivos, possivelmente fazendo-os fugir. O efeito depende se o alvo é vivo ou morto-vivo.

Criatura Viva A magia causa dano negativo igual a 1d4 mais o modificador de seu atributo de conjuração. O alvo tenta um salvamento básico de Fortitude, mas também fica Enfraquecido 1 por 1 rodada em uma falha crítica.
Criatura Morta-Viva O alvo fica Desprevinido por 1 rodada em um salvamento falho de Fortitude. Em uma falha crítica, o alvo também fica Fleeing por 1 rodada a menos que obtenha sucesso em um salvamento de Vontade.

---

Elevada (+1) O dano negativo em criaturas vivas aumenta em 1d4.', false),
  (null, 'pathfinder', 'Inspirar Defesa', 0, '', '1 ação', '', '', '1 rodada', 'Você inspira seus aliados a se protegerem mais efetivamente. Você e todos os aliados na área recebem +1 de bônus de estado na CA e jogadas de salvamento, assim como resistência a dano físico igual à metade do nível da magia.', false),
  (null, 'pathfinder', 'Templo Triplo', 0, '', '1 ação', '', '', '1 rodada', 'Você dança em um ritmo animado, acelerando o movimento de seus aliados. Você e todos os aliados na área recebem +3 metros de bônus de estado em todas as Velocidades por 1 rodada.', false),
  (null, 'pathfinder', 'Lamento da Condenação', 0, '', '1 ação', '', '', '1 rodada', 'Adversários dentro da área ficam assustado 1. Eles não podem reduzir seus valores de assustado abaixo de 1 enquanto permanecerem na área.', false),
  (null, 'pathfinder', 'Casa das Paredes Imaginárias', 0, 'Ilusão', '1 ação', '', '', '1 rodada', 'Você faz mímicas criando um trecho de parede invisível de 3 metros por 3 metros de lado adjacente a você e dentro de seu alcance. A parede é sólida para criaturas que não a desacreditarem, mesmo criaturas incorpóreas. Você e seus aliados podem voluntariamente acreditar que a parede exista para tratá-la como sólida — para escalá-la, por exemplo. Uma criatura que desacreditar a ilusão fica temporariamente imune à sua casa das paredes imaginárias por 1 minuto. A parede não bloqueia criaturas que não virem sua performance visual, nem bloqueia objetos. A parede possui CA 10, Dureza igual ao dobro do nível da magia e PV igual a quatro vezes o nível da magia.', false),
  (null, 'pathfinder', 'Allegro', 0, '', '1 ação', '9 metros', '', '1 rodada', 'Você performa rapidamente, acelerando seu aliado. O aliado fica Acelerado e pode usar a ação adicional para Andar, Dar um Passo ou Golpear.', false),
  (null, 'pathfinder', 'Adaptar-se', 1, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Você faz mudanças sutis para se adaptar à situação. Escolha uma das seguintes opções que se aplicam a você.

Se você estiver na água, ganha uma velocidade de natação igual à metade da sua velocidade.
Se você estiver na água, poderá respirar água.
Se estiver muito escuro para você ver, você ganha visão no escuro.
Se você estiver em um ambiente de calor intenso ou frio intenso, você está protegido dos efeitos do calor intenso ou do frio intenso, e o feitiço dura 10 minutos.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Pés Ágeis', 1, '', '1 ação', '', '', 'Until the end of the current turn', 'As benções de seu deus tornam seus pés mais rápidos e seus movimentos mais fluidos. Você recebe +1,5 metros de bônus de estado em sua Velocidade e ignora terreno difícil. Como parte da conjuração de pés ágeis, você pode Andar ou Dar um Passo; ou até Escalar, Escavar, Nadar ou Voar se possuir a Velocidade apropriada.', false),
  (null, 'pathfinder', 'Memórias Ancestrais', 1, 'Adivinhação', '1 ação', '', 'V', '1 minuto', 'As memórias de conjuradores mortos há tempos lhe concedem conhecimento em uma perícia específica. Escolha qualquer perícia que não seja Saber, ou uma perícia de Saber relacionada ao império antigo do qual sua linhagem descende. Você se torna temporariamente treinado nessa perícia e pode obter outras memórias associadas com um ancestral que era treinado nessa perícia. Se você tentar uma tarefa ou atividade que dure além da duração desta magia, utilize o menor modificador de proficiência.

---

---
Elevada (6º)  Você se torna temporariamente especialista na perícia escolhida.', false),
  (null, 'pathfinder', 'Auréola Angelical', 1, 'Abjuração', '1 ação', '', 'V', '1 minuto', 'Você recebe uma auréola angelical com uma aura que aumenta a cura dos aliados pela magia curar. Magias de curar recebem +2 de bônus de estado na quantidade de Pontos de Vida curados a seus aliados na área.

---

Elevada (+1) O bônus de estado aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Aparência de Riqueza', 1, 'Ilusão', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você cria uma breve visão de riqueza imensa preenchendo a área da magia. Cada criatura a até 6 metros da área que puder ser seduzida por riqueza material deve tentar uma jogada de salvamento de Vontade. Uma criatura que entrar na área automaticamente desacredita a ilusão, e desacreditar a ilusão encerra qualquer condição Fascinado imposta pela magia. Enquanto você Sustentar a Magia, outras criaturas reagem ao tesouro como fariam a qualquer outra ilusão, mas não correm o risco de serem Fascinado.

---
Sucesso Crítico  A criatura desacredita a ilusão e não é afetada por ela.

Sucesso  A criatura fica Fascinado pela riqueza até ter completado a primeira ação dela no turno.

Falha  A criatura fica Fascinado pela ilusão.', false),
  (null, 'pathfinder', 'Ímpeto Atlético', 1, '', '1 ação', '', '', '1 rodada', 'Seu corpo se enche de poder e capacidade física. Você recebe +3 metros de bônus de estado na Velocidade e +2 de bônus de estado em testes de Atletismo. Como parte de Conjurar esta Magia, você pode usar Andar, Escalar, Nadar ou Saltar. Os bônus da magia se aplicam durante essa ação.', false),
  (null, 'pathfinder', 'Um Pouco de Sorte', 1, '', '2 ações', '9 metros', '', '1 minuto', 'Você inclina levemente a balança da sorte para proteger uma criatura do desastre. Quando o alvo tenta um teste de resistência, pode rolar duas vezes e usar o melhor resultado. Uma vez feito isso, a magia termina. Se você conjurar um pouco de sorte novamente, qualquer sorte anterior que ainda esteja em vigor termina. Depois que uma criatura é alvejada com um pouco de sorte, ela se torna temporariamente imune por 24 horas.', false),
  (null, 'pathfinder', 'Chamado do Túmulo', 1, 'Necromancia', '2 ações', '9 metros', 'S, V', 'Instantânea', 'Você dispara um raio de energia nauseante. Faça uma rolagem de ataque de magia.

---
Sucesso Crítico  O alvo fica Enjoado 2 e Lento 1 enquanto estiver Enjoado.

Sucesso  O alvo fica Enjoado 1.

Falha  O alvo não é afetado.', false),
  (null, 'pathfinder', 'Azagaia Carregada', 1, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Você lança uma azagaia de eletricidade que deixa um campo carregado em torno de seu alvo. Faça um teste de ataque de magia. A azagaia causa 1d6 de dano de eletricidade e 1 dano persistente de eletricidade.

Enquanto o alvo estiver sofrendo Dano Persistente com essa magia, as criaturas ganham um bônus de status +1 para jogadas de ataque com armas de metal ou efeitos de eletricidade contra o alvo, e o alvo recebe uma penalidade de status -1 para salvamentos contra efeitos de eletricidade.

Sucesso Crítico A azagaia causa dobro de dano, inicial e persistente.
Sucesso A azagaia causa dano total.

---

Elevada (+1) O dano inicial aumenta em 1d6 e o ​​Dano Persistente em 1.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Toque Cativante', 1, '', '1 ação', 'Toque', '', '10 minutos', 'Você infunde seu alvo com atração, fazendo-o agir mais amistosamente a você. O alvo tenta um salvamento de Vontade. Ele recebe +4 de bônus de circunstância neste salvamento se você ou seus aliados recentemente o ameaçaram ou foram hostis a ele.
Você pode Dispensar esta magia. Se você usar ações hostis contra o alvo, a magia é encerrada. Após a magia acabar, o alvo não necessariamente percebe que foi cativado a menos que a amizade dele com você ou as ações que você o tenha convencido a fazer sejam opostas às expectativas dele, o que poderia potencialmente lhe permitir convencer o alvo a continuar sendo seu amigo através de meios mundanos.

---
Sucesso Crítico  O alvo não é afetado e está ciente que você tentou cativá-lo.

Sucesso  O alvo não é afetado, mas pensa que sua magia era alguma outra coisa inofensiva em vez de toque cativante, a menos que identifique a magia (normalmente identificando
magias; veja a página 305).

Falha  A atitude do alvo se torna Amistosa em relação a você. Se ele já era Amistoso, fica Prestativo. Ele não pode usar ações hostis contra você.

Falha Crítica  O alvo fica Helpful em relação a você e não pode usar ações hostis contra você.

---
Elevada (4º)  Você pode afetar qualquer tipo de criatura, não apenas humanoides, desde que ele o ache atraente.', false),
  (null, 'pathfinder', 'Manto de Sombras', 1, '', '1 ação', 'Toque', '', '1 minuto', 'Você envolve o alvo em um manto de sombras rodopiantes que o torna mais difícil de ver. O manto reduz a luz brilhante dentro de uma emanação de 6 metros para luz fraca. Esta é uma forma de escuridão mágica e, por isso, pode sobrepor luz não mágica ou tentar neutralizar luz mágica conforme descrito na página 459.
O alvo pode usar a condição ocultado recebida pelas sombras para se Esconder, embora criaturas que estejam observando-o ainda possam seguir o movimento da aura, tornando mais difícil para o alvo ficar completamente indetectado. O alvo pode usar uma ação de Interagir para remover o manto e deixá-lo para trás como um chamariz, onde ele permanece reduzindo a iluminação pelo restante da duração da magia. Se alguém pegar o manto antes dele ser removido pelo alvo original, o manto evapora e a magia é encerrada.', false),
  (null, 'pathfinder', 'Contra Performance', 1, '', 'reação', '', '', 'Instantânea', 'AcionamentoVocê ou um aliado a até 18 metros rola uma jogada de salvamento contra um efeito auditivo ou visual.

---

Sua performance protege você e seus aliados. Role um teste de Performance de um tipo apropriado: uma performance auditiva se o acionamento for auditivo ou uma performance visual se o acionamento for visual. Você e aliados na área podem usar o melhor resultado entre seu teste de Performance e a jogada de salvamento.', false),
  (null, 'pathfinder', 'Brado de Destruição', 1, '', '2 ações', '', '', 'Instantânea', 'Sua voz estronda, esmagando o que estiver na sua frente. Cada criatura e objeto desapossado na área sofre 1d8 de dano sônico. Se você já tiver causado dano a um inimigo neste turno com um Golpe ou magia, aumente os dados de dano desta magia para d12s.

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Clarão Ofuscante', 1, '', '2 ações', '', '', 'Instantânea', 'Você ergue seu símbolo religioso e cria um clarão cegante de luz. Cada criatura na área deve tentar um salvamento de Fortitude.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura fica ofuscado por 1 rodada.

Falha  A criatura fica cego por 1 rodada e ofuscado por 1 minuto. A criatura pode gastar uma ação de Interagir esfregando os próprios olhos para encerrar a condição cego.

Falha Crítica  A criatura fica cego por 1 rodada e ofuscado por 1 hora.

---
Elevada (3º)  A área aumenta para um cone de 9 metros.', false),
  (null, 'pathfinder', 'Chamado da Morte', 1, '', 'reação', '', '', '1 minuto', 'AcionamentoUma criatura viva a até 6 metros de você morre, ou uma criatura morta-viva a até 6 metros de você é destruída.

---

Ver outra pessoa passar desde mundo para o próximo o revigora. Você recebe Pontos de Vida temporários igual ao nível da criatura acionadora mais o modificador de seu atributo de conjuração. Se a criatura acionadora for morta-viva, dobre a quantidade de Pontos de Vida temporários recebidos. Esses Pontos de Vida permanecem ativos pela duração da magia, que é encerrada previamente se todos os Pontos de Vida forem exauridos antes.', false),
  (null, 'pathfinder', 'Atraso de Consequência', 1, 'Abjuração', 'reação', '9 metros', 'S', '1 rodada', 'Acionamento Uma criatura ou objeto ao alcance é atingido por um ataque.

---

Você transpõe o momento em que o alvo seria ferido para mais tarde em seu fluxo de tempo. Role o dano normalmente, mas não reduza os Pontos de Vida ou aplique outros efeitos do ataque até que a duração da magia tenha passada. Quando a magia termina, o alvo é imediatamente afetado pelo ataque, recebendo dano e sendo afetado por quaisquer efeitos adicionais. Você pode dissipar esta magia.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Édito Diabólico', 1, 'Encantamento', '1 ação', '9 metros', 'V', '1 rodada', 'Você profere um édito diabólico exigindo que o alvo execute uma tarefa em particular e oferecendo recompensas por completá-la. Ele recebe +1 de bônus de estado em rolagens de ataque e testes de perícia relacionados à realização da tarefa. Se recusar-se a realizar a tarefa proclamada por você, em vez disso ele sofre –1 de penalidade de estado em todas as suas rolagens de ataque e testes de perícia.', false),
  (null, 'pathfinder', 'Pragas Divinas', 1, 'Necromancia', '2 ações', '4,5 metros', 'S, V', 'Instantânea', 'Sua divindade envia pragas destruidoras. O alvo deve tentar um teste de Fortitude. Ao lançar a magia, decida se a doença inflige a condição desajeitado, enfraquecido, ou estupefato.

Praga Divina (doença) Level 1; Estagio 1 desajeitado 1, enfraquecido 1, ou estupefato 1 (1 rodada); Estagio 2 lento 1 e desajeitado 1, enfraquecido 1, ou estupefato 1 (1 rodada); Estagio 3 desajeitado 1, enfraquecido 1, ou estupefato 1 e o alvo não pode se recuperar da condição até que seja curado (1 dia)

Sucesso O alvo não é afetado.
Falha O alvo é atingido por uma praga divina no estágio 1.
 Falha Crítica O alvo é atingido por uma praga divina no estágio 2.

---

Elevada (5º) A doença da praga divina ganha o traço virulento. O valor da condição para desajeitado, enfraquecido ou estupefato é 2 em vez de 1.', false),
  (null, 'pathfinder', 'Visão do Adivinho', 1, 'Adivinhação', '1 ação', '9 metros', 'V', 'Until the end of your next turn', 'Você vislumbra o futuro do alvo. Role um d20; quando o alvo tentar uma jogada de salvamento ou teste de perícia (que não sejam secretos), ele pode usar o número que você rolou em vez de fazer uma rolagem, encerrando a magia. Alternativamente, você pode revelar o resultado da rolagem de um teste secreto do alvo que tenha sido realizado durante a duração da magia (encerrando esta magia). Conjurar esta magia novamente encerra qualquer visão do adivinho ativa que você tiver conjurado, assim como qualquer visão do adivinho ativa no alvo.', false),
  (null, 'pathfinder', 'Barragem Dracônica', 1, 'Evocação', '2 ações', '', 'S, V', '1 minuto', 'Você forma energia em um pequeno dragão incorpóreo (ou criatura serpentina) que voa ao seu redor. O dragão específico é aleatório; role 1d6 na tabela abaixo para cada dragão evocado para determinar qual tipo de dragão você cria. Enquanto a magia persistir, você pode comandar um de seus dragões cuspir um míssil de energia em uma criatura que esteja a 18 metros usando uma única ação, que tem o traço concentração. Este é um ataque à distância que usa seu bônus de ataque mágico e causa 1d6 de dano mais seu modificador de atributo de conjuração, com o tipo de dano dependendo do dragão. O golpe de sopro que um dragão usar contribui para sua penalidade de ataque múltiplo. Depois que um dragão usa seu golpe de sopro, ele desaparece da existência; quando você não tem mais dragões, a magia termina.

Barragem Dracônica

d6
Dragão
Tipo de golpe de sopro

1
Cobre ou Negro
Acido

2
Prata ou Branco
Frio

3
Bronze ou Azul
Eletricidade

4
Latão, Ouro ou Vermelho
Fogo

5
Verde
Veneno

6
Sua escolha de dragão
Como o dragão

---

Elevada (+1) Você forma 1 dragão adicional, e o dano de Golpe aumenta em 1d6.', false),
  (null, 'pathfinder', 'Garras de Dragão', 1, 'Transmutação', '1 ação', '', 'V', '1 minuto', 'Garras afiadas crescem de seus dedos. Elas são ataques desarmados de acuidade que causam 1d4 de dano cortante e 1d6 de dano extra do tipo determinado pelo dragão de sua linhagem. 

Garras de Dragão

Tipo de Dragão
Tipo de Dano

Azul ou Bronze
Eletricidade

Branco ou Prata
Electricidade

Cobre ou Negro
Ácido

Latão, Ouro ou Vermelho
Fogo

Verde
Veneno

Suas escamas de mágica sanguínea brilham com uma energia tênue, concedendo-lhe resistência 5 ao mesmo tipo de dano.

---

Elevada (5º) O dano extra aumenta para 2d6 e a resistência aumenta para 10.

Elevada (9º) O dano extra aumenta para 3d6 e a resistência aumenta para 15.', false),
  (null, 'pathfinder', 'Ejetar Alma', 1, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Seu toque interrompe a conexão entre corpo e alma, possivelmente forçando a alma a sair completamente do corpo. O alvo deve tentar um teste de Fortitude. Você pode permitir que os aliados escolham o grau de sucesso em vez de fazer um teste de resistência.

Sucesso O alvo não é afetado.
Falha O alvo fica atordoado enquanto sua alma perde brevemente sua conexão com seu corpo.
 Falha Crítica A alma do alvo sai do seu corpo por 1 rodada. O corpo do alvo fica atordoado. Enquanto seu corpo fica atordoado dessa maneira, o alvo permanece plenamente consciente em forma de alma; simplesmente não pode mover conscientemente seu corpo (embora o corpo faça movimentos defensivos instintivos básicos). A alma do alvo tem o traço incorpóreo , é invísivel, e tem uma velocidade de voo de 18 metros. Ele não pode atacar, lançar feitiços ou tentar qualquer teste de habilidade que exija um corpo físico, e deve sempre manter a linha de efeito em seu corpo. Quando o corpo do alvo deixa de ser atordoado, a alma do alvo retorna instantaneamente ao corpo à medida que o alvo acorda.

---

Elevada (+3) Se um aliado voluntário optar por falhar criticamente, ele poderá permanecer em forma de alma por mais uma rodada.', false),
  (null, 'pathfinder', 'Arremesso Elemental', 1, 'Evocação', '1 ação', '9 metros', 'S', 'Instantânea', 'Com uma torção de seu pulso, você lança um pouco de matéria elemental em seu adversário. Faça uma rolagem de ataque de magia, causando 1d8 de dano contundente (ou dano de fogo, se seu elemento for fogo) em um sucesso, e o dobro do dano em um sucesso crítico. Esta magia possui o traço do seu elemento..

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Vazio Por Dentro', 1, 'Abjuração', '1 ação', '', 'V', 'Instantânea', 'Você injeta uma fatia do vazio em sua mente, momentaneamente refazendo-a em um lugar sombrio e vazio. Tente neutralizar um efeito de emoção afetando você.

---

Elevada (5º) Você pode tentar neutralizar verificações contra qualquer número de efeitos emocionais que o afetem.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Rosto na Multidão', 1, '', '1 ação', '', '', '1 minuto', 'Enquanto estiver em uma multidão de criaturas mais ou menos similares, sua aparência se torna branda e indefinida. Você recebe +2 de bônus de estado em testes de Dissimulação e Furtividade para passar despercebido pela multidão e ignora terreno difícil causado por multidões.

---

Elevada (3º) A magia adquire distância de 3 metros e pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Pó das Fadas', 1, 'Encantamento', '1 ação', '9 metros', 'S, V', '1 rodada', 'Você espalha pó mágico na área da magia, tornando mais fácil enganar quem está nela. Cada criatura na área deve tentar um salvamento de Vontade. Para cada ação adicional que usar Conjurando a Magia, o raio da explosão aumenta em 1,5 metros.
Sucesso A criatura não é afetada.
Falha A criatura não pode usar reações e sofre –2 de penalidade de estado em testes de Percepção e salvamentos de Vontade.
 Falha Crítica Como falha, e a criatura também sofre –1 de penalidade de estado em testes de Percepção e salvamentos de Vontade por 1 minuto.
Elevada (+3) O raio inicial aumenta em 1,5 metros.', false),
  (null, 'pathfinder', 'Raio de Fogo', 1, '', '2 ações', '18 metros', '', 'Until the end of the target''s next turn', 'Uma faixa de fogo dispara pelo ar. Faça uma rolagem de ataque de magia. O raio causa 2d6 de dano de fogo.

Sucesso Crítico O raio causa o dobro de dano e 1d4 de dano persistente de fogo..

SuccessoO raio causa o dano inteiro.

---

Heightened (+1) O dano inicial do raio aumenta em 2d6 e o dano persistente de fogo em um sucesso crítico aumenta em 1d4.', false),
  (null, 'pathfinder', 'Dardo de Força', 1, '', '1 ação', '9 metros', '', 'Instantânea', 'Você dispara um dardo de força infalível da ponta de seus dedos. Ele acerta automaticamente e causa 1d4+1 de dano de força ao alvo.
Elevada (+2) O dano aumenta em 1d4+1.', false),
  (null, 'pathfinder', 'Mandíbulas do Glutão', 1, 'Necromancia', '1 ação', '', 'S, V', '1 minuto', 'Sua boca se transforma em uma bocarra de sombras cheia de dentes pontiagudos. Estas mandíbulas são um ataque desarmado com o traço enérgica que causam 1d8 de dano perfurante. Se acertar com suas mandíbulas e causar dano, você ganha 1d6 Pontos de Vida temporários.

---

Elevada (+2) Os Pontos de Vida temporários aumentam em 1d6.', false),
  (null, 'pathfinder', 'Mão do Aprendiz', 1, '', '1 ação', '150 metros', '', 'Instantânea', 'Você arremessa uma arma corpo a corpo segurada na qual seja treinado contra o alvo. Faça uma rolagem de ataque de magia. Em um sucesso, você causa o dano da arma como se tivesse acertado com um Golpe corpo a corpo, mas adicionando o modificador de seu atributo de conjuração em vez de seu modificador de Força. Em um sucesso crítico, você causa o dobro do dano e adiciona o efeito de especialização de crítico da arma. Independentemente do resultado, a arma voa de volta para você e retorna à sua mão.', false),
  (null, 'pathfinder', 'Curar Animal', 1, '', '1 ação', 'Toque or 30 m (see text)', '', 'Instantânea', 'Você cura os ferimentos de um animal, restaurando 1d8 Pontos de Vida ao alvo. A quantidade de ações gastas Conjurando esta Magia determina o efeito dela. 

 somáticoA magia possui uma distância de toque.
 somatic, verbal A magia possui uma distância de 9 metros e restaura 8 Pontos de Vida adicionais ao alvo.

---

Elevada (+1) A quantidade de cura aumenta em 1d8 e a cura adicional para a versão de 2 ações aumenta em 8.', false),
  (null, 'pathfinder', 'Benção do Curandeiro', 1, '', '1 ação', '9 metros', '', '1 minuto', 'Suas palavras abençoam uma criatura com uma conexão
aprimorada à energia positiva. Quando o alvo recuperar
Pontos de Vida de uma magia de cura, ele recupera 1 Ponto
de Vida adicional. O alvo recupera Pontos de Vida adicionais por benção do curandeiro somente na primeira vez em que recuperar Pontos de Vida de uma determinada magia de cura, portanto, uma magia que curar a criatura repetidamente ao longo da duração restauraria Pontos de Vida adicionais somente uma vez.

---

Elevada (+1)A cura adicional aumenta em 2 Pontos de Vida.', false),
  (null, 'pathfinder', 'Arremessar Pedra', 1, '', '1 ação', '18 metros', '', 'Instantânea', 'Você evoca uma pedra mágica e a arremessa, com a presença de seu deus guiando sua mira. Faça uma rolagem de ataque de magia contra o alvo. A pedra causa dano contundente igual a 1d6 mais seu modificador de Força.

---
Successo Crítico A pedra causa o dobro do dano.

Successo A pedra causa o dano inteiro.

---
Elevada (+1)  O dano da pedra aumenta em 1d6.', false),
  (null, 'pathfinder', 'Hiperfoco', 1, 'Adivinhação', '2 ações', '9 metros', 'S, V', 'Varies', 'Você aguça os sentidos de uma criatura, embora objetos mais distantes se tornem nebulosos, indistintos ou mudos para ela. O alvo ganha um bônus de status +1 nas tentativas de Percepção com qualquer um de seus sentidos precisos. Além disso, quaisquer sentidos imprecisos que o alvo tenha são afiados para sentidos precisos (embora não recebam o bônus de status). No entanto, o alvo não pode perceber nada além de um alcance de 6 metros com qualquer um de seus sentidos. A duração é determinada pelo teste de Vontade do alvo. Você pode permitir que os aliados escolham o resultado em vez de fazer um teste de resistência.

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo é afetado por 1 rodada.
Falha O alvo é afetado por 1 minuto.
Falha Crítica Como um fracasso, mas o alvo não pode perceber nada além de um raio de 3 metros

---

Elevada (3º) Você pode atingir até 2 criaturas.
Elevada (6º) Você pode atingir até 4 criaturas. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Bruxaria Invejosa', 1, 'Necromancia', '1 ação', '9 metros', 'V', 'Até 1 minuto', 'Você usa a inveja inata de uma estriga para negar o maior atributo de um alvo. O alvo recebe uma condição adversa dependendo do maior atributo dele: Força (Enfraquecido); Destreza (Desajeitado); Constituição (Drenado); ou Inteligência, Sabedoria ou Carisma ({Estupefato). Em um empate, a criatura decide qual das condições associadas aos atributos empatados se aplica. O alvo deve tentar um salvamento de Vontade. No começo de cada um de seus turnos, o alvo pode tentar outro salvamento de Vontade, encerrando o efeito em um sucesso. 

---
Sucesso  O alvo não é afetado.

Falha  O valor da condição é 1.

Falha Crítica  O valor da condição é 2.', false),
  (null, 'pathfinder', 'Disparada de Ki', 1, 'Transmutação', '1 ação', '', 'V', 'Instantânea', 'Acelerado pelo seu ki, você se move com tanta velocidade que se torna um borrão de movimento. Mova-se duas vezes, usando duas ações Andar, duas ações Dar um Passo ou uma ação de Andar e uma ação de Dar um Passo (em qualquer ordem). Você recebe a condição ocultado durante este movimento e até o início de seu próximo turno.', false),
  (null, 'pathfinder', 'Golpe de Ki', 1, 'Transmutação', '1 ação', '', 'V', 'Instantânea', 'Você foca seu ki em ataques mágicos. Faça um Golpe desarmado ou Rajada de Golpes desarmada (isto não altera o limite de usar somente um floreio por turno). Você recebe +1 de bônus de estado em suas rolagens de ataque com os Golpes, e os Golpes causam 1d6 de dano extra. A cada vez que Golpear, você escolhe causar um dos seguintes tipos de dano: força, ordeiro (somente se você for ordeiro), negativo ou positivo.

---

Elevada (+4) O dano extra aumenta em 1d6.', false),
  (null, 'pathfinder', 'Lamento', 1, 'Encantamento', '2 ações', '30-foot cone', 'S, V', 'Instantânea', 'Você deixa escapar suas emoções negativas em um gemido gutural que abala o coração de seus inimigos e causa 1d8 de dano mental (teste básico de Vontade). Se você tiver quaisquer condições prejudiciais impostas por efeitos de emoção, lamento causa dano mental adicional igual ao nível de neutralização do efeito de nível mais alto.

---

Elevada (+1) O dano aumenta em 1d8. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Imposição de mãos', 1, 'Necromancia', '1 ação', 'Toque', 'S', 'Instantânea', 'Suas mãos são infundidas com energia positiva, curando uma criatura viva ou ferindo uma criatura morta-viva com um toque. Se usar imposição de mãos em um alvo vivo, você restaura 6 Pontos de Vida dele; se o alvo for um de seus aliados, ele também recebe +2 de bônus de estado na CA por 1 rodada. Contra um alvo morto-vivo, você causa 1d6 de dano e ele deve tentar um salvamento básico de Fortitude; se falhar, ele também sofre –2 de penalidade de estado na CA por 1 rodada.

---

Elevada (+1) A quantidade de cura aumenta em 6 e o dano a um alvo morto-vivo aumenta em 1d6.', false),
  (null, 'pathfinder', 'Composição Prolongada', 1, '', 'ação livre', '', '', 'Instantânea', 'Você acrescenta um floreio à sua composição para prolongar os benefícios dela. Se sua próxima ação for conjurar um truque mágico de composição com duração de 1 rodada, faça um teste de Performance. A CD normalmente é uma CD padrão do mesmo nível que o alvo de maior nível afetado por sua composição, mas o MJ pode determinar uma CD diferente baseado nas circunstâncias. O efeito depende do resultado do seu teste.

---
Successo Crítico  A composição dura 4 rodadas

Successo  A composição dura 3 rodadas.

Falha  composição dura 1 rodada, mas você não gasta o Ponto de Foco por conjurar esta magia.', false),
  (null, 'pathfinder', 'Etude do Mestre do Saber', 1, '', 'ação livre', '9 metros', '', 'Instantânea', 'Acionamento Você ou um aliado na distância faz um teste para Recordar Conhecimento

---

Efeito Você recorre aos mistérios profundos de sua musa, concedendo ao alvo uma maior habilidade de pensar e recordar informação. Role o teste de Recordar Conhecimento acionador duas vezes e use o melhor resultado.', false),
  (null, 'pathfinder', 'Receptáculo de Magia', 1, '', '1 ação', 'Toque', '', 'Sustentada até 1 minuto', 'Uma criatura se torna um receptáculo para a energia mágica pura enviada por sua divindade. O alvo recebe +1 de bônus de estado em jogadas de salvamento. Cada vez que Conjurar uma Magia usando seus espaços de magia, você automaticamente Sustenta esta Magia e concede resistência a dano de magias ao alvo de receptáculo de magia até o início de seu próximo turno. Esta resistência é igual ao nível da magia conjurada.', false),
  (null, 'pathfinder', 'Feixe Lunar', 1, '', '2 ações', '36 metros', '', 'Instantânea', 'Você irradia um raio de luz da lua. Faça uma rolagem de ataque de magia. O feixe de luz causa 1d6 de dano de fogo. Feixe lunar causa dano de prata para os propósitos de fraquezas, resistências e similares.

---
Sucesso Crítico O feixe causa o dobro do dano e o alvo fica Dazzled por 1 minuto.

Successo  O feixe causa dano inteiro e o alvo fica Dazzled ofuscado por 1 rodada.

---
Elevada (+1) O dano do raio aumenta em 1d6.', false),
  (null, 'pathfinder', 'Insígnia do Jurador', 1, 'Conjuração', 'ação livre', '', 'V', '1 hora', 'Acionamento Você faz uma promessa ou acordo.

---

Um indicador mágico garante a uma criatura que você confirmou sua parte de uma barganha. Ao lançar a magia, você cria uma pulseira, flor ou outra bugiganga. Se, enquanto a magia persistir, você completar os termos da promessa ou do acordo, a bugiganga desaparecerá com um toque agradável; se você violar os termos, a bugiganga se rompe com uma falha dissonante.

---

Elevada (3º) A duração é de 1 dia.
Elevada (5º) A duração é de 1 semana.
Elevada (7º) A duração é de 1 mês.
Elevada (9º) A duração é de 1 ano.

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Memória de Objetos', 1, 'Adivinhação', '2 ações', '', 'S, V', '1 minuto', 'Ao tocar em um objeto, você extrai a experiência daqueles que o criaram e o usaram. Se você tocar em uma arma, seu nível de proficiência nessa arma aumenta temporariamente para treinado (se ainda não estiver maior). Se você tocar em uma ferramenta, sua classificação de proficiência com a próxima verificação de pericia que você tentar com essa ferramenta (como um teste de Manufatura com o martelo de ferreiro) durante o período da magia aumenta temporariamente para treinado (se ainda não estiver maior). Essa magia não beneficia atividades que demoram mais de um minuto para serem concluídas.

---

Elevada (6º) Sua classificação de proficiência aumenta para especialista, em vez de treinado. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Empanturrar', 1, '', '2 ações', '9 metros', '', 'Instantânea', 'Enormes quantidades de comida e bebida enchem o alvo. Ele recebe uma refeição completamente nutritiva e deve tentar um salvamento de Fortitude.

Um alvo  Sickened por esta magia sofre –3 metros de penalidade de estado na Velocidade dele até que não esteja mais Sickened.

---

 Successo Crítico O alvo não é afetado.

Successo O alvo fica Sickened 1, mas se gastar uma ação para encerrar a condição, ele obtém sucesso automaticamente.

Failure O alvo fica Sickened 1.

Falha Crítica  O alvo fica Sickened 2.', false),
  (null, 'pathfinder', 'Tostar', 1, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Os ventos secos desidratam uma criatura. O alvo deve tentar um teste de Fortitude; se usada em uma criatura com a característica da água ou em uma criatura feita principalmente de líquido (como muitas limos), a criatura usa o resultado para um grau de sucesso pior que o resultado. Criaturas cujos corpos não contêm umidade significativa (como os elementais da terra) são imunes a tostar.

Se uma criatura afetada por tostar bebe um líquido, como um gole de água ou uma poção, a magia termina. Criaturas afetadas que têm o traço água ou são feitos principalmente de líquidos, bem como criaturas afetadas que não podem beber, podem encerrar o efeito como uma atividade de duas ações, que tem o traço concentração.

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo recebe uma penalidade de status -1 nos seus testes e CDs por 1 rodada.
Falha O alvo recebe uma penalidade de status -1 em seus testes e CDs por 1 minuto.
Falha Crítica O alvo recebe uma penalidade de status –2 em seus testes e CDs por 1 minuto e fica ofucado desde que tenha essa penalidade.

---

Elevada (4º) Você pode atingir até 4 criaturas.

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Mente Aperfeiçoada', 1, '', '1 ação', '', '', 'Instantânea', 'Você medita sobre a perfeição para remover todas as distrações de sua mente. Tente um novo salvamento de Vontade contra um efeito mental que esteja atualmente afetando-o e que tenha requerido um salvamento de Vontade. Use o resultado deste novo salvamento para determinar o resultado do efeito mental, a menos que o novo salvamento tenha um resultado pior do que o salvamento original, caso em que nada acontece. Você pode usar mente aperfeiçoada em um determinado efeito somente uma vez.', false),
  (null, 'pathfinder', 'Vantagem Física', 1, 'Transmutação', '1 ação', 'Toque', 'V', 'Until the end of the target''s next turn', 'Você aprimora temporariamente a condição física do alvo. O alvo recebe +2 de bônus de estado no próximo teste de Acrobatismo, teste de Atletismo, salvamento de Fortitude ou salvamento de Reflexos que ele realizar.', false),
  (null, 'pathfinder', 'A Prática Leva à Perfeição', 1, '', 'reação', '9 metros', '', 'Instantânea', 'Acionamento Você ou um aliado dentro do alcance falha em um teste de uma perícia na qual você ou eles são treinados.

---

O alvo ganha um bônus de status +2 no teste de disparo ou um bônus de +3 se o alvo tiver mestre ou melhor proficiência na habilidade. Esse bônus pode alterar o resultado da verificação do alvo.

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Sacrifício do Protetor', 1, '', 'reação', '9 metros', '', 'Instantânea', 'Acionamento Um aliado a até 9 metros sofre dano.

---

Você protege seu aliado sofrendo uma punição no lugar dele. Reduza o dano que o aliado acionador sofreria em 3 pontos. Você redireciona este dano para si, mas suas imunidades, fraquezas, resistências e habilidades similares não se aplicam. Você não é sujeitado a quaisquer condições ou outros efeitos de qualquer outra coisa que tenha causado dano ao seu aliado (como o veneno de uma mordida venenosa). Seu aliado ainda é sujeito a esses efeitos mesmo se você redirecionar todo o dano acionador para si.

---

Elevada (+1) O dano que você redireciona aumenta em 3 pontos.', false),
  (null, 'pathfinder', 'Lufada Empurrante', 1, '', '2 ações', '150 metros', '', 'Instantânea', 'Dando um empurrão no ar, você carrega o alvo com uma poderosa lufada de vento; ele deve tentar um salvamento de Fortitude.

---
Sucesso Crítico O alvo não é afetado.

Sucesso  O alvo é empurrado 1,5 metros para longe de você.

Falha  O alvo é empurrado 3 metros para longe de você.

Falha Crítica  O alvo é empurrado 3 metros para longe de você e é derrubado prostrada.', false),
  (null, 'pathfinder', 'Ler Destino', 1, '', '2 ações', '9 metros', '', 'Instantânea', 'Você tenta descobrir alguma informação sobre o destino do alvo a curto prazo, normalmente algo dentro do próximo dia, para as criaturas mais prosaicas, ou dentro da próxima hora ou menos para alguém que provavelmente terá várias experiências rápidas, como alguém que esteja ativamente se aventurando.

Você descobre uma palavra enigmática conectada ao destino da criatura nesse período de tempo. O destino é notoriamente inescrutável e a palavra não necessariamente deve ser levada ao pé da letra, portanto, o significado frequentemente só fica claro em retrospectiva. O MJ rola um teste simples secreto CD 6. Se o teste simples fracassar ou o destino da criatura for incerto demais, a magia resulta na palavra “inconclusivo”. De qualquer forma, a criatura fica temporariamente imune por 24 horas.', false),
  (null, 'pathfinder', 'Redigir', 1, 'Transmutação', '2 ações', '9 metros', 'S, M', '1 dia', 'Você menciona um nome específico de um ou mais documentos. Ao lançar o feitiço, dê um nome próprio, seja uma criatura, local ou objeto. Qualquer menção desse nome no documento fica embaçada, manchada ou completamente ilegível. Epítetos e referências inequívocas ao nome também são editados; por exemplo, editando o nome da deusa Sarenrae de um livro também removeria referências ao seu título "A Flor do Alvorecer".

---

Elevada (3º) Em vez de localizar um determinado nome, você pode substituí-lo por um nome diferente que escolher. Epítetos e referências são substituídos por outros semelhantes, relacionados ao nome da substituição. Qualquer pessoa que esteja lendo o texto pode tentar um teste de Percepção ou Sociedade contra a CD da sua magia para perceber o texto alterado, embora isso não lhes diga o que o original diz.
Elevada (4º) À sua escolha, a duração é ilimitada. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Adoçar a Ferroada', 1, '', '1 ação', 'Toque', '', 'Instantânea', 'Você inflige dor sobre o alvo e se regozija na angústia dele. Isto causa 1d4 de dano mental e 1d4 de dano persistente mental; o alvo deve tentar um salvamento de Vontade. Enquanto o alvo estiver sofrendo dano persistente desta magia, você recebe +1 de bônus de estado em rolagens de ataque e testes de perícia contra o alvo.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo sofre metade do dano e nenhum dano persistente.

Falha  O alvo sofre o dano inicial normal e o dano persistente.

Falha Crítica  O alvo sofre o dobro do dano inicial e do dano persistente.

---
Elevada (+1)  O dano inicial aumenta em 1d4 e o dano persistente aumenta em 1d4.', false),
  (null, 'pathfinder', 'Recordação Acadêmica', 1, '', 'reação', '', '', 'Instantânea', 'AcionamentoVocê faz um teste de Percepção para Buscar ou um teste de perícia para Recordar Conhecimento com uma perícia na qual seja treinado.

---

Fazendo uma breve oração enquanto concentra seus pensamentos, você descobre que sua divindade forneceu a quantidade certa de informação para sua situação. Role o teste acionador duas vezes e use o melhor resultado.', false),
  (null, 'pathfinder', 'Compartilhar Fardo', 1, 'Abjuração', 'reação', '', 'S', 'Instantânea', 'Acionamento Um aliado a 9 metros está prestes a tentar um teste de resistência contra um efeito emocional prejudicial, e você não precisaria resistir contra o efeito.

---

Você suporta um pouco da dor do seu aliado. Você e seu aliado usam o resultado um grau de sucesso melhor do que o resultado do teste de resistência do seu aliado, mesmo que o efeito desencadeador geralmente afete apenas um alvo.

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Palavras Tranquilizantes', 1, '', '1 ação', '9 metros', '', '1 minuto', 'Você tenta acalmar o alvo proferindo palavras tranquilizantes em um tom calmo e constante. O alvo recebe +1 de bônus de estado em jogadas de salvamento de Vontade. Este bônus aumenta para +2 contra efeitos de emoção.

Além disso, quando Conjurar esta Magia, você pode tentar neutralizar um efeito de emoção no alvo.

---

Elevada (5º) O bônus em salvamentos aumenta para +2, ou para +3 contra efeitos de emoção.', false),
  (null, 'pathfinder', 'Mudança Súbita', 1, '', 'reação', '', '', 'Until the end of your next turn', 'AcionamentoUm inimigo erra você com um ataque corpo a corpo.

---

Você se afasta rapidamente de um lugar perigoso e se cobre. Você Dá um Passo e fica ocultado.', false),
  (null, 'pathfinder', 'Sentido de Enxame', 1, 'Adivinhação', '1 minuto', '', 'S, V', 'Sustentada', 'Você amplia seus sentidos através de uma infinidade de criaturas rastejantes e voadoras. Você cria um enxame rastejante no seu quadrado. Você pode ouvir através do enxame como se estivesse usando seus sentidos auditivos normais. Na primeira vez em que você Sustenta a magia a cada rodada, você pode mover o enxame 3 metros ao longo do chão em qualquer direção. O enxame tem CA 15 e um bônus de +0 em seus testes. Qualquer dano causado ao enxame o destrói e termina a magia.

---

Elevada (3º) O enxame tem os benefícios da escalada de aranha.
Elevada (5º) O enxame tem uma velocidade de voo de 3 metros. Você pode ver através do enxame usando seus sentidos visuais.
 Elevada (7º) O enxame ganha um bônus de status de 3 metros para suas Velocidades.', false),
  (null, 'pathfinder', 'Surto de Tempestade', 1, '', '2 ações', '9 metros', '', 'Instantânea', 'Você envolve um adversário em uma tempestade rodopiante de ventos violentos, nuvens agitadas e relâmpagos crepitantes. A tempestade causa 1d12 de dano de eletricidade. O alvo deve tentar um salvamento básico de Reflexos. Em uma falha, o alvo também fica desajeitado 2 por 1 rodada e sofre 1 de dano persistente de eletricidade.

---

Elevada (+1) O dano inicial aumenta em 1d12 e o dano persistente de eletricidade em uma falha aumenta em 1.', false),
  (null, 'pathfinder', 'Membros Tentaculares', 1, 'Transmutação', '1 ação', '', 'S', '1 minuto', 'Seus braços se transformam em tentáculos longos e maleáveis, aumentando seu alcance para 3 metros quando estiver usando magias com a distância de toque e realizando Golpes desarmados com seus braços (como Golpes de punho e garras). Isto não muda o alcance de seus ataques com armas corpo a corpo. Pela duração, sempre que Conjurar uma Magia, você pode acrescentar uma ação adicional à conjuração dela para estender temporariamente o seu alcance para 6 metros para transmiti-la.

---

Elevada (+2) Quando acrescentar uma ação adicional à conjuração de uma magia para estender temporariamente seu alcance, seu alcance aumenta em 3 metros adicionais para transmitir essa magia.', false),
  (null, 'pathfinder', 'Surto da Maré', 1, '', '1 ação', '18 metros', '', 'Instantânea', 'Você invoca uma tremenda onda para mover um alvo que esteja em um corpo d''água ou no chão. O alvo deve tentar um salvamento de Fortitude.

---
Falha  Você move o alvo 1,5 metros em qualquer direção no chão ou 3 metros em qualquer direção através de um corpo de água.

Falha Crítica  Você move o alvo 3 metros em qualquer direção no chão ou 6 metros em qualquer direção através de um corpo de água.', false),
  (null, 'pathfinder', 'Toque da Corrupção', 1, 'Necromancia', '1 ação', 'Toque', 'S', 'Instantânea', 'O anti-paladino infunde o alvo com energia negativa. Se o alvo estiver vivo, isso causa 3d6 de dano negativo  (salvamento básico de Fortitude); em um teste de resistência falhado, o alvo também recebe uma penalidade de status -2 na CA por 1 rodada.

Se o alvo for uma criatura morta-viva disposta, o alvo recupera 18 Pontos de Vida e se for um dos aliados dos anti-paladino, também ganha um bônus de status +2 nas jogadas de dano por 1 rodada.

(Tradução não oficial - Gamemastery Guide)', false),
  (null, 'pathfinder', 'Toque de Obediência', 1, '', '1 ação', 'Toque', '', 'Varies', 'Seu toque imperioso erode a força de vontade do alvo, tornando-o mais fácil de controlar. O alvo tenta um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica estupefato 1 até o final de seu turno atual.

Falha  O alvo fica estupefato 1 até o final de seu próximo turno.

Falha Crítica  O alvo fica estupefato 1 por 1 minuto.', false),
  (null, 'pathfinder', 'Toque da Não-Morte', 1, '', '1 ação', 'Toque', '', 'Varies', 'Você ataca a força vital do alvo com não-morte, causando 1d6 de dano negativo. O alvo deve tentar um salvamento de Fortitude.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo sofre metade do dano.

Falha  O alvo sofre o dano inteiro e efeitos positivos o curam somente metade do normal por 1 rodada.

Falha Crítica  O alvo sofre o dobro do dano e efeitos positivos o curam somente metade do normal por 1 minuto.

---
Elevada (+1)  O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Benção da Não-Morte', 1, 'Necromancia', '1 ação', 'Toque', 'S', '1 minuto', 'Você infunde uma criatura com o toque do túmulo. Pela duração, magias de ferir tratam a criatura como morta-viva e magias de curar tratam a criatura como viva. Além disso, magias de ferir recebem +2 de bônus de estado na quantidade de Pontos de Vida curados ao alvo.

Se o alvo quiser evitar a magia, ele pode tentar um salvamento de Vontade para reduzir os efeitos.

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo cura metade da cura proporcionada por curar e sofre metade do dano proporcionado por ferir por 1 rodada.
Falha Efeitos conforme descrito no texto.

---

Elevada (+1) O bônus de estado na quantidade de Pontos de Vida curados ao alvo aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Unimpeded Stride', 1, '', '1 ação', '', '', 'Instantânea', 'Nada pode segurá-lo no lugar. Você imediatamente escapa de todos os efeitos mágicos que o tiverem imobilizado ou agarrado a menos que o efeito seja de um nível superior à sua magia deslocamento desimpedido. Depois, você Anda. Durante este movimento, você ignora terreno difícil e quaisquer penalidades de circunstância ou penalidades de estado em sua Velocidade.', false),
  (null, 'pathfinder', 'Aspecto Selvagem', 1, '', '2 ações', '', '', 'Varies', 'Você se infunde com essência primal e se transforma em outra forma. Você pode polimorfar em qualquer forma listada em forma de peste, que dura 10 minutos. Todas as outras formas de aspecto selvagem duram 1 minuto. Você pode adicionar mais formas à sua lista de aspecto selvagem com talentos de druida; seu talento pode conceder algumas ou todas as formas de uma determinada magia de polimorfia. Quando se transformar em uma forma concedida por uma magia, você recebe todos os efeitos da forma escolhida de uma versão da magia elevada para o nível de aspecto selvagem. Aspecto selvagem permite utilizar seu próprio treinamento de metamorfose mais facilmente do que a maioria das magias de polimorfia. Quando escolher utilizar seu próprio modificador de ataque enquanto estiver polimorfado em vez do modificador de ataque padrão da forma, você recebe +2 de bônus de estado em suas rolagens de ataque.

---

Elevada (2º) Você também pode usar aspecto selvagem para assumir as formas listadas em forma de animal.', false),
  (null, 'pathfinder', 'Morfia Selvagem', 1, '', '1 ação', '', '', '1 minuto', 'Você morfa seu corpo baseado em seu treinamento, escolhendo um dos efeitos a seguir baseado em seus talentos de ordem selvagem.

Se possuir Aspecto Selvagem, você pode morfar suas mãos em garras selvagens. Suas mãos se transformam em garras incrivelmente afiadas. Estas garras são um ataque desarmado no qual você é treinado e que causa 1d6 de dano cortante (acuidade, ágil) cada. Você ainda pode segurar e usar itens com suas mãos enquanto elas estiverem transformadas por esta magia, mas não pode segurar um item enquanto atacar. Se possuir Aspecto de Inseto, você pode transformar sua boca em mandíbulas selvagens, um ataque desarmado no qual você é treinado e que causa 1d8 de dano perfurante.
Se possuir Aspecto de Elemental, você pode morfar seu corpo para ser parcialmente composto por matéria elemental, concedendo-lhe resistência 5 a acertos críticos e dano de precisão.
Se possuir Aspecto de Planta, você pode morfar seus braços em vinhas longas, aumentando seu alcance para 3 metros (ou 4,5 metros com uma arma de alcance).
Se possuir Aspecto Altaneiro, você pode conjurar a magia como uma atividade de duas ações ( somático, verbal) para crescer asas em suas costas. Estas asas lhe permitem voar com uma Velocidade de voo de 9 metros.

---

Elevada (6º) Você pode escolher até dois dos aspectos da lista. Garras selvagens fazem ferimentos terríveis e grosseiros que também causam 2d6 de dano persistente de sangramento em um acerto, e mandíbulas selvagens são envenenadas, também causando 2d6 de dano persistente de veneno em um acerto.

Elevada (10º) Você pode escolher até três dos efeitos da lista. Garras selvagens causam 4d6 de dano persistente de sangramento em um acerto e mandíbulas selvagens causam 4d6 de dano persistente de veneno em um acerto.', false),
  (null, 'pathfinder', 'Véu de Confiança', 1, '', '1 ação', '', '', '1 minuto', 'Você se envolve em um véu de confiança. Você reduz o valor atual da sua condição assustado em 1, e sempre que ficaria assustado pela duração desta magia, reduza o valor em 1. 
Se você falhar criticamente em um salvamento contra medo, véu de confiança é encerrada imediatamente e você aumenta qualquer condição assustado recebida da falha crítica em 1 em vez de diminuí-la.', false),
  (null, 'pathfinder', 'Espinhos Vibrantes', 1, '', '1 ação', '', '', '1 minuto', 'Seu corpo brota um revestimento de galhos espinhentos que crescem com magia vital e ferem aqueles que lhe golpearem. Criaturas adjacentes que o acertarem com um ataque corpo a corpo, assim como todas as criaturas que o acertarem com ataques desarmados, sofrem 1 de dano perfurante a cada vez que o fizerem. Sempre que você conjurar uma magia positiva, o dano de seus espinhos aumenta para 1d6 até o início de seu próximo turno.

---

Elevada (+1) O dano aumenta em 1, ou em 1d6 após você conjurar uma magia positiva.', false),
  (null, 'pathfinder', 'Pesadelo Acordado', 1, '', '2 ações', '9 metros', '', 'Varies', 'Você preenche a mente da criatura com uma visão terrível dos pesadelos dela. O alvo deve tentar um salvamento de Vontade. Se o alvo estiver inconsciente quando você Conjurar esta Magia nele, ele imediatamente desperta antes de tentar o salvamento; e se falhar neste salvamento, ele sofre a condição fugindo por 1 rodada em adição aos efeitos notados acima.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica assustado 1.

Falha  O alvo fica assustado 2.

Falha Crítica  O alvo fica assustado 3.', false),
  (null, 'pathfinder', 'Terreno Distorcido', 1, 'Ilusão', '1 ação', '18 metros', 'S, V', '1 minuto', 'Você cria perigos ilusórios que cobrem todas as superfícies na área (tipicamente o chão). Qualquer criatura movendo-se pela ilusão trata os quadrados como terreno difícil. Uma criatura pode tentar desacreditar o efeito normalmente após usar uma ação de Buscar ou de alguma outra forma usar ações interagindo com a ilusão. Se obtiver sucesso em desacreditar, ela ignora o efeito pelo restante da duração. Para cada ação adicional que você usar conjurando a magia, o raio da explosão aumenta em 1,5 metros, até um máximo de 3 metros extras para 3 ações.

---

Elevada (4º) Você pode fazer a ilusão aparecer no ar em vez de uma superfície, fazendo-a funcionar como terreno difícil para criaturas voadoras.', false),
  (null, 'pathfinder', 'Surto de Arma', 1, '', '1 ação', 'Toque', '', 'Until the start of your next turn', 'Segurando sua arma erguida para cima, você a inunda com energia divina. Em seu próximo Golpe com essa arma antes do início de seu próximo turno, você recebe +1 de bônus de estado na rolagem de ataque e a arma causa um dado de dano adicional. Se a arma possuir uma runa impactante, esta magia aumenta a quantidade de dados da runa impactante em 1 (até um máximo de 3 dados danos de extras) em vez de ter seu efeito normal. 
Se a arma alvo sair de sua posse, surto de arma é encerrada imediatamente.', false),
  (null, 'pathfinder', 'Raio de Inverno', 1, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Você arremessa um sincelo oco cheio da ira do inverno. Faça um ataque de magia contra um alvo dentro do alcance. O raio causa 1d8 de dano de perfuração e se aloja no alvo. No final do próximo turno do alvo, o raio se despedaça, liberando um turbilhão de neve e gelo que causa 1d12 de dano de frio no alvo e em todas as criaturas adjacentes. O raio pode ser removido com uma ação de Interagir, que faz com que derreta inofensivamente sem detonar.
 
Sucesso Crítico O raio inicial causa dano total e é especialmente bem ancorado, executando 2 ações de Interagir para remover. A explosão do raio causa o dobro do dano.
Sucesso O raio e sua explosão causam dano total.

---

Elevada (+1) O dano inicial aumenta em 1d8 e o dano secundário aumenta em 1d12.', false),
  (null, 'pathfinder', 'Garra Seca', 1, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Seu toque apodrece material orgânico e deteriora objetos. Faça um teste de ataque de feitiço corpo a corpo. Seu toque causa 1d12 de dano negativo mais 1d4 de dano negativo persistente. Se uma criatura usar um item para bloquear Garra Seca, como na reação Bloqueio de Escudo, o item será automaticamente afetado, mas a criatura não sofrerá dano (mesmo se houver dano sobrando após a Dureza do escudo). Ao contrário do dano negativo normal, o dano negativo de garra seca danifica objetos, construções e similares, corroendo-os.

Sucesso Crítico Seu toque causa o dobro de dano (inicial e persistente). Se você mirar em um objeto, diminua sua Dureza em 4 por 1 minuto.
Sucesso Seu toque causa dano total. Se você atingir um objeto, diminua sua Dureza em 2 por 1 minuto.

---

Elevada (+1) O dano aumenta em 1d12 e o dano persistente aumenta em 1. Se você atingir um objeto, diminua sua Dureza em 1 ponto adicional em um sucesso e um sucesso crítico.', false),
  (null, 'pathfinder', 'Palavra da Verdade', 1, '', '1 ação', '', '', 'Sustentada até 1 minuto', 'Você profere uma afirmação que acredita ser verdade e que é livre de qualquer tentativa de dissimulação através de palavras enganosas, omissão e similares. A afirmação deve ter até 25 palavras. Um símbolo de sua divindade brilha sobre sua cabeça e qualquer pessoa que vir e ouvir sua afirmação sabe que você acredita que ela seja verdadeira.
Cada vez que você Sustentar a Magia, você pode repetir este efeito.', false),
  (null, 'pathfinder', 'Estrela Zênite', 1, 'Adivinhação', '2 ações', '18 metros', 'S, V', '1 dia', 'Você chama uma pequena estrela para orbitar uma criatura em uma auréola brilhante antes de disparar para o céu, onde ela marca a localização aproximada da criatura. O alvo deve tentar um teste de Fortitude.

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo fica ofuscado por uma rodada.
Falha O alvo está ofuscado por 1 rodada. Enquanto a magia persiste, desde que você possa ver o céu noturno e o alvo ser visível no mesmo céu noturno, você pode sentir a direção e a distância aproximadas da criatura usando uma única ação, que tem o traço concentração. Isso é exato o suficiente para rastrear a criatura, mas não indica o quadrado exato (por exemplo, para fazer um ataque). Você pode definir um número de estrelas zênites igual ao seu modificador de sabedoria; se você exceder esse número, a mais antiga estrela zênite é automaticamente dissipada.
 Falha Crítica Como falha, mas o alvo fica cego por 1 rodada.

---

Elevada (+1) A duração aumenta em 1 dia.
 Elevada (4º) Você ignora a condição ocultado contra alvos marcados por estrela zênite.', false),
  (null, 'pathfinder', 'Invocar o Juramento Carmesim', 2, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Brandindo sua arma e gritando a linha final do Juramento Carmesim, você libera uma explosão de energia destrutiva de rubi. Você deve estar com uma arma branca e executar o componente somático da magia balançando a arma em um arco descendente. Você causa dano corpo a corpo normal por sua arma, incluindo todos os bônus, penalidades, modificadores e propriedades apropriados, a cada criatura na área da magia; cada um deles deve fazer um teste básico de Fortitude. Uma criatura que falha criticamente nessa defesa também sofre qualquer efeito adicional que você normalmente infligiria com sua arma em um golpe crítico; se a criatura que falha criticamente em seu salvamento também é imune a acertos críticos, ela simplesmente falha em salvá-lo.

Você pode converter todo o dano físico dessa magia em dano positivo contra todas as criaturas mortas-vivas na área. 

(Tradução não oficial - Lost Omens: Character Guide)', false),
  (null, 'pathfinder', 'Luz da Revelação', 2, 'Adivinhação', '2 ações', '30-foot emanation', 'S, V', '5 minutos', 'Você lança uma aura luminosa, iluminando um raio de 9 metros com luz brilhante. Você e todos os aliados nesta área ganham um bônus de status +1 em testes de Percepção para detectar criaturas escondidas ou indetectadas, assim como objetos, portas e outros recursos escondidos. 

(Tradução não oficial - Lost Omens: Character Guide)', false),
  (null, 'pathfinder', 'Aspecto do Guerreiro Mágico', 2, 'Transmutação', '2 ações', '', 'S, V', '5 minutos', 'Você invoca o aspecto do animal de sua máscara, adquirindo características físicas reminiscentes desse animal. Você morfa levemente para essa criatura, obtendo as Velocidades e sentidos que receberia por usar forma animal para se transformar no tipo de animal que sua máscara representa; estas Velocidades especiais não podem ser aumentadas por bônus de estado ou bônus de item.', false),
  (null, 'pathfinder', 'Transformação do Guerreiro Mágico', 2, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Você se transforma no animal de sua máscara. Você recebe os efeitos de forma de animal, elevada para o maior nível de transformação do guerreiro mágico, e pode se transformar somente no tipo de animal que sua máscara representa.', false),
  (null, 'pathfinder', 'Golpe Perfeito', 2, 'Adivinhação', 'reação', '', 'V', 'Instantânea', 'Acionamento Você erra um Golpe com um ataque desarmado.

---

Você invoca a intuição de seu treinamento para recuperar a precisão. Rerrole a rolagem de ataque errada e use o novo resultado.', false),
  (null, 'pathfinder', 'Lâmina Solar', 2, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Você lança um raio de luz solar ardente de sua arma. Você deve estar empunhando uma espada ou lança para conjurar lâmina solar, e você executa o componente somático dessa magia com a arma. Faça um teste de ataque de magia. O raio causa 1d4 de dano de fogo. Se o alvo for mau, o raio causa 1d4 de dano bom adicional e se o alvo for morto-vivo, o raio causa um dano positivo adicional de 1d4 (ambos os efeitos se aplicam a criaturas que são más e mortos-vivos). Se você estiver em uma área com luz solar natural intensa, aumente o tamanho de cada dado de dano em um passo (de d4 para d6).

Sucesso Crítico O raio causa o dobro de dano.
Falha O raio causa dano total.

---

Elevada (+1) O dano aumenta em 1d4 fogo, 1d4 bom e 1d4 positivo (ou 1d6 de cada tipo de dano à luz solar intensa).', false),
  (null, 'pathfinder', 'Integridade Corporal', 2, 'Necromancia', '1 ação', '', 'V', 'Instantânea', 'Você se cura de uma das maneiras a seguir, escolhida por você quando conjurar a magia.

Você recupera 8 Pontos de Vida.
Você tenta curar uma doença ou veneno que esteja o afligindo; tente neutralizar a aflição.

---

Elevada (+1) Se você escolher recuperar Pontos de Vida, a quantidade de Pontos de Vida recuperados aumenta em 8.', false),
  (null, 'pathfinder', 'Sussurros Aberrantes', 3, 'Encantamento', '1 ação', '', 'V', '1 rodada', 'Você profere frases em um idioma desconhecido, atacando as mentes de quem esteja próximo. Cada alvo deve tentar um salvamento de Vontade. Independentemente do resultado do salvamento dele, cada alvo fica temporariamente imune por 1 minuto. Você pode aumentar a quantidade de ações necessárias para Conjurar a Magia (até um máximo de 3 ações no total). Para cada ação adicional, aumente o raio da emanação em 1,5 metros, até um raio máximo de 4,5 metros para 3 ações.

---
Sucesso O alvo não é afetado.

Falha O alvo fica Estupefato 2.

Falha Crítica O alvo fica Confuso.

---
Elevada (+3) O raio inicial aumenta em 1,5 metros.', false),
  (null, 'pathfinder', 'Asas Angelicais', 3, 'Evocação', '2 ações', '', 'S, V', '3 rodadas', 'Asas de luz pura nascem em suas costas, concedendo-lhe uma Velocidade de voo igual à sua Velocidade. Suas asas emanam luz brilhante em um raio de 9 metros. Se ainda estiver voando quando a duração desta magia acabar, você flutua até o chão como em queda suave.

---

Elevada (5º) A duração aumenta para 1 minuto.', false),
  (null, 'pathfinder', 'Sopro de Dragão', 3, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Você expele energia de sua boca, causando 5d6 de dano. A área, tipo de dano e salvamento dependem do tipo de dragão de sua linhagem.

Sopro de Dragão

Tipo de Dragão
Área e Tipo de Dano
Salvamento

Cobre ou negro
Linha de ácido de 18 metros
Reflexos

Azul ou bronze
Linha de eletricidade de 18 metros
Reflexos

Latão
Linha de fogo de 18 metros
Reflexos

Verde
Cone de veneno de 9 metros
Fortitude

Ouro ou vermelho
Cone de fogo de 9 metros
Reflexos

Branco ou prata
Cone de frio de 9 metros
Reflexos

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Drenar Vida', 3, 'Necromancia', '1 ação', '9 metros', 'S', 'Instantânea', 'Você fecha sua mão e drena a energia vital de outra criatura para si. Isto causa 3d4 de dano negativo; o alvo deve tentar um salvamento básico de Fortitude. Você ganha Pontos de Vida temporários iguais ao dano sofrido pelo alvo, após o salvamento dele e aplicando sua mágica sanguínea (se aplicável). Se o alvo possuir menos Pontos de Vida do que o dano causado, você recebe Pontos de Vida temporários iguais aos Pontos de Vida remanescentes dele. Os Pontos de Vida temporários duram por 1 minuto.

---

Elevada (+1) O dano aumenta em 1d4.', false),
  (null, 'pathfinder', 'Proteção de Cristal Eletrificada', 3, 'Evocação', '2 ações', 'Toque', 'S', 'Instantânea', 'Você cria um perigo de runa trinco elétrico no alvo, criando um bloqueio cristalino especial no objeto. Você também pode substituir seu CD de feitiço por qualquer um dos CDs listados em perigo. Você pode ter apenas um desses perigos ativos de cada vez, e se você lançar essa magia enquanto uma runa trinco elétrico está ativada, o perigo mais antigo descarrega sem causar danos.

---

Elevada (+2) O dano do perigo aumenta em 1d12.', false),
  (null, 'pathfinder', 'Movimento Elemental', 3, 'Evocação', '2 ações', '', 'S, V', '1 minuto', 'Você recorre ao seu elemento para se impulsionar, aprimorando sua Velocidade dependo de seu elemento. Esta magia possui o traço do seu elemento.

---

ÁguaVocê recebe uma Velocidade de natação igual à sua Velocidade e pode respirar embaixo d’água.
ArVocê recebe uma Velocidade de voo igual à sua Velocidade.
Fogo Você recebe uma Velocidade de voo igual à sua Velocidade.
Terra Você recebe uma Velocidade de escavação de 3 metros.
Elevada (6º) Você também recebe +3 metros de bônus de estado em suas Velocidades.

Elevada (9º) O bônus de estado aumenta para +6 metros.', false),
  (null, 'pathfinder', 'Abraçar o Fosso', 3, 'Transmutação', '1 ação', '', 'V', '1 minuto', 'Chifres de diabo crescem em seu crânio e sua pele adquire características estéticas do diabo responsável por sua linhagem diabólica. Você adquire resistência 5 a fogo, mal e veneno, e resistência 1 a dano físico (exceto prata). Você pode sofrer dano bondoso mesmo que não seja maligno e adquire fraqueza 5 a dano bondoso.

---

Elevada (+2) TA resistência a fogo, mal e veneno aumenta em 5 pontos, a resistência a dano físico (exceto prata) aumenta em 2 pontos e a fraqueza a dano bondoso aumenta em 5 pontos.', false),
  (null, 'pathfinder', 'Prolongar Magia', 3, 'Adivinhação', '1 ação', '', 'V', 'Instantânea', 'Você recorre ao conhecimento do sangue de seus ancestrais para prolongar sua magia. Se sua próxima ação for Conjurar uma Magia com duração de 1 minuto em um único alvo e a magia não for do maior nível de magia que você é capaz de conjurar, a duração dela se torna 10 minutos em vez de 1 minuto. Você pode ter somente uma magia ativa prolongada desta forma ao mesmo tempo.', false),
  (null, 'pathfinder', 'Desaparecimento Feérico', 3, 'Encantamento', '1 ação', '', 'S', 'Until the end of your next turn', 'Você fica invisível e ignora terreno difícil natural (como um matagal). Qualquer ação hostil que você usar encerra esta invisibilidade, mas você ainda ignora terreno difícil natural.

---

Elevada (5º)Se você usar uma ação hostil, a invisibilidade não é encerrada.', false),
  (null, 'pathfinder', 'Fisionomia Horrorosa', 3, 'Ilusão', '2 ações', '', 'S, V', 'Instantânea', 'Você transforma sua aparência brevemente na fisionomia horrorosa de uma estriga, instilando medo em seus inimigos. Adversários na área devem tentar um salvamento de Vontade.

---
Successo O adversário não é afetado.

Failure  O adversário fica assustado 1.

Critical Failure  O adversário fica assustado 2.

---
Elevada (5º)  Adversários na área ficam assustado 1 em um sucesso, @JournalEntry[Frightened] 2 em uma falha e assustado 3 e fugindo por 1 rodada em uma falha crítica. Eles ainda não são afetados em um sucesso crítico.', false),
  (null, 'pathfinder', 'Rajada de Ki', 3, 'Evocação', '1 ação', '', 'S, V', 'Instantânea', 'Você libera seu ki como uma rajada poderosa de energia que causa 2d6 de dano de força. Se usar 2 ações para conjurar rajada de ki, aumente o tamanho do cone para 9 metros e o dano para 3d6. Se usar 3 ações para conjurar rajada de ki, aumente o tamanho do cone para 18 metros e o dano para 4d6. Cada criatura na área deve tentar uma jogada de salvamento de Fortitude.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e é empurrada 1,5 metros.

Falha Crítica  A criatura sofre o dobro do dano e é empurrada 3 metros.

---
Elevada (+1)  O dano aumenta em 1d6, ou em 2d6 se você usar 2 ou 3 ações.', false),
  (null, 'pathfinder', 'Litania contra a Ira', 3, 'Evocação', '1 ação', '9 metros', 'V', '1 rodada', 'Sua litania confronta o pecado da ira, punindo o alvo por atacar criaturas bondosas. O alvo deve tentar um salvamento de Vontade. Uma criatura particularmente irada, como um demônio da ira, usa o resultado de um grau de sucesso pior do que o resultado da jogada de salvamento dela. O alvo fica temporariamente imune a todas as suas litanias por 1 minuto.

---
Successo Crítico  O alvo não é afetado.

Successo  primeira vez que usar uma ação ação que cause dano a pelo menos uma criatura bondosa, o alvo sofre 3d6 de dano bondoso.

Falha Crítica  A cada vez que usar uma ação que cause dano a pelo menos uma criatura bondosa, o alvo sofre 3d6 de dano bondoso.

Critical Failure  O alvo fica Enfeebled 2.A cada vez que o alvo usar uma ação que cause dano a pelo menos uma criatura bondosa, ele sofre 3d6 de dano bondoso.

---
Elevada (+1)  O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Emaranhar', 2, '', '2 ações', '36 metros', '', '1 minuto', 'Plantas na área emaranham criaturas. A área conta como terreno difícil. Cada rodada em que uma criatura começar o turno dela na área, ela deve tentar um salvamento de Reflexos. Em uma falha, ela sofre –3 metros de penalidade de circunstância em suas Velocidades até sair da área e, em uma falha crítica, também fica imobilizado por 1 rodada. Criaturas podem tentar Escapar contra a CD de emaranhar para remover estes efeitos.', false),
  (null, 'pathfinder', 'Pântano da Preguiça', 3, 'Conjuração', '1 ação', '36 metros', 'S, V', '1 minuto', 'O chão na área fica pantanoso e fétido. A área é terreno difícil. O lodo no fundo do charco se anima como bestas diminutas que possuem uma aparência demoníaca. Elas não funcionam como criaturas normais, mas enxameiam sobre criaturas no pântano e exalam um fedor nocivo. O pântano causa 1d6 de dano de veneno; criaturas que encerrarem os turnos delas na área devem tentar um salvamento básico de Fortitude. Você pode aumentar a quantidade de ações para Conjurar a Magia. Para cada ação adicional, aumente o raio da explosão em 1,5 metros.
Elevada (+2) O dano aumenta em 1d6 e o raio inicial aumenta em 1,5 metros.', false),
  (null, 'pathfinder', 'Revelação da Chama que Não Cintila', 3, 'Abjuração', '1 ação', '', 'V', '2 rodadas', 'Você ilumina seu adversário com uma chama reveladora. O MJ realiza um teste secreto de neutralização contra cada ilusão afetando a criatura. Em um sucesso, você suprimi a ilusão pela duração desta magia (em vez de encerrar o efeito).', false),
  (null, 'pathfinder', 'Impulso da Onda que Não Quebra', 3, 'Evocação', '1 ação', '', 'V', 'Instantânea', 'Você libera uma onda poderosa de sua mão que empurra seus adversários para trás. Cada criatura na área deve tentar uma jogada de salvamento de Fortitude. Se uma criatura empurrada por impulso da onda que não quebra for empurrada contra uma barreira sólida ou contra outra criatura, ela para nesse ponto e sofre 3d6 de dano.

Sucesso A criatura não é afetada.
Falha A criatura é empurrada 3 metros.
 Falha Crítica A criatura é empurrada 6 metros.

---

Elevada (+1) O dano por empurrar uma criatura contra uma barreira sólida ou contra outra criatura aumenta em 1d6.', false),
  (null, 'pathfinder', 'Disparada do Vento que Não se Curva', 3, 'Evocação', '1 ação', '', 'V', 'Instantânea', 'Você se desloca como um vento impetuoso. Movimente-se duas vezes: Ande duas vezes, Dê um Passo duas vezes ou Ande e Dê um Passo (em qualquer ordem). Você pode Andar ou Dar um Passo no ar durante este movimento, movendo-se para cima em um ângulo de no máximo 45º graus; se encerrar seu movimento no ar, você cai após realizar uma ação ou quando seu turno acabar, o que ocorrer primeiro. Uma muralha de vento aparece em todos os espaços que você sair durante este movimento, durando por 1 rodada.

---

Elevada (5º) A muralha de vento dura 3 rodadas.', false),
  (null, 'pathfinder', 'Blindagem do Ferro que Não se Retorce', 3, 'Abjuração', '1 ação', '', 'V', 'Instantânea', 'Você envia correntes de ki protetor à superfície de seu corpo que lhe resguarda de ferimentos, pelo menos até seus inimigos as dissiparem. Você recebe 15 Pontos de Vida temporários, que duram por até 3 rodadas.

---

Elevada (+1) Os Pontos de Vida temporários aumentam em 5.', false),
  (null, 'pathfinder', 'Passo Abundante', 4, 'Conjuração', '1 ação', '15 m or more', 'S', 'Instantânea', 'Você se move tão rápido que ultrapassa as fronteiras planares. Você se teleporta a um lugar em sua linha de visão, a uma distância máxima igual à sua Velocidade.', false),
  (null, 'pathfinder', 'Ablação Adaptativa', 4, 'Abjuração', 'reação', '', 'S', '1 minuto', 'Acionamento Você sofre dano de ácido, frio, eletricidade, fogo ou sônico.

---

Você muda para se adaptar aos comprimentos de onda místicos do dano de energia, protegendo-se de mais danos. Você ganha resistência 5 ao tipo de energia de disparo; você ganha essa resistência depois de receber o dano desencadeante; portanto, ela se aplica apenas a danos futuros que você sofrer durante a duração.

---

Elevada (+2) Aumente a resistência em 5.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Floreio Artístico', 4, '', '2 ações', '4,5 metros', '', '10 minutos', 'Você transforma o alvo para que corresponda à sua visão artesanal e artística. Se você possuir proficiência especialista em Manufatura, o item concede +1 de bônus de item em rolagens de ataque se for uma arma ou em testes de perícia se for uma ferramenta. O alvo é uma bela e impressionante peça de sua nova qualidade, mas o efeito é obviamente temporário, de forma que seu valor monetário não é alterado. Quando conjurar esta magia, qualquer floreio artístico anterior que você tiver conjurado é encerrado.

---

Elevada (7º) Se você possuir proficiência mestre em Manufatura, o item concede +2 de bônus de item em vez de +1.

Elevada (10º) Se você possuir proficiência lendária em Manufatura, o item concede +3 de bônus de item em vez de +1.', false),
  (null, 'pathfinder', 'Asterismo', 4, 'Evocação', '3 ações', '45 metros', 'S, V, M', '1 minuto', 'Linhas de luz estelar ardente formam uma constelação ao seu redor. Desenhe cinco linhas, uma de cada vez; cada linha deve ancorar em você ou em uma criatura ou objeto já conectado a uma linha anterior e deve terminar em uma criatura ou objeto a até 9 metros de sua âncora (possivelmente permitindo que asterismo estender-se a toda a faixa de 45 metros). Uma criatura que começa seu turno em uma dessas linhas ou entra em uma dessas linhas no seu turno recebe 4d6 de dano de fogo (salvamento de reflexo básico). Uma criatura pode receber esse dano apenas uma vez por turno, mesmo que se mova por várias linhas. Alvos que fazem parte do asterismo não sofrem danos. Se a distância entre dois alvos (ou você e um alvo) exceder 9 metros, a linha de luz das estrelas entre os dois intervalos e todas as linhas que agora não tenham mais um caminho direto para você também serão interrompidas. Você pode dispensar a magia.

---

Elevada (+1) O dano aumenta em 1d6.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Engarrafar Tempestade', 4, 'Evocação', 'reação', '', 'S', '1 minuto', 'acionamentoVocê sofreria dano de eletricidade.

---

Quando um raio é direcionado a você, você armazena a carga com segurança dentro de si, liberando-a quando for a hora certa. Você ganha resistência elétrica 10 contra o efeito desencadeante. Se você evitar danos dessa maneira, a qualquer momento durante a duração da magia, poderá realizar uma única ação, com a característica de ataque, para gastar a carga e fazer um ataque corpo a corpo em um alvo adjacente ou um ataque à distância em um alvo em um raio de 18 metros. Esse ataque causa dano de eletricidade igual ao dano evitado por engarrafar tempestade. Se você conjurar engarrafar tempestade uma segunda vez antes que a duração original termine, ou se você não fizer esse ataque, a carga armazenada se dissipa inofensivamente.

---

Elevada (7º) A resistência aumenta para 15, e você pode fazer imediatamente o teste de ataque concedido por engarrafar tempestade como parte da reação usada para lançar a magia.
 Elevada (10º) A resistência aumenta para 20, e você pode fazer imediatamente o teste de ataque concedido por engarrafar tempestade como parte da reação usada para lançar a magia.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Adoração Atraente', 4, '', '2 ações', '', '', '1 minuto', 'Você fica intensamente fascinante e criaturas ficam distraídas por você enquanto permanecerem dentro da área. Você pode excluir qualquer criatura que quiser do efeito.
Quando uma criatura entrar na área pela primeira vez, ela deve tentar uma jogada de salvamento de Vontade. Se uma criatura sair e reentrar na área, ela usa os resultados do salvamento original dela.

---
Sucesso Crítico  A criatura não é afetada e fica temporariamente imune por 1 hora.

Sucesso   A criatura fica Fascinado por você pela próxima ação dela e fica temporariamente imune por 1 hora.

Falha  A criatura fica Fascinado por você.

Falha Crítica   A criatura fica Fascinado por você e a atitude dela em relação a você melhora em um passo.

---
Elevada (+1)  Aumente o tamanho da emanação em 4,5 metros.', false),
  (null, 'pathfinder', 'Chicotada de Comando', 4, '', '1 ação', '30 metros', '', 'Until the end of the target''s next turn', 'Com a ameaça de mais dor, você compele uma criatura que tenha ferido recentemente. Você emite um comando ao alvo, com os efeitos da magia comando.', false),
  (null, 'pathfinder', 'Vantagem Competitiva', 4, '', '1 ação', '', '', 'Sustentada até 1 minuto', 'Sua competitividade o leva a provar-se contra a oposição. Você recebe +1 de bônus de estado em rolagens de ataque e testes de perícia. Se um inimigo a até 6 metros obtiver um sucesso crítico em uma rolagem de ataque ou teste de perícia, seu bônus de estado aumenta para +3 em rolagens de ataque ou neste teste de perícia específico (o que o adversário tiver obtido um sucesso crítico) por 1 rodada.

---

---
Elevada (7°)  Aumenta o bônus base para +2 e o bônus aumentado após um inimigo obter um sucesso crítico para +4.', false),
  (null, 'pathfinder', 'Soberba Delirante', 4, '', '2 ações', '9 metros', '', 'Varies', 'Você deixa o alvo com excesso de confiança, levando-o a atribuir falhas a fatores externos. Se o alvo falhar em uma rolagem de ataque ou teste de perícia, ele sofre –1 de penalidade de estado em rolagens de ataque e testes de perícia até o final do turno dele (ou até o final do próximo turno dele, se tiver feito a rolagem fora do turno dele). Se a criatura falhar uma segunda vez enquanto sofrer esta penalidade, a penalidade aumenta para –2. A duração depende do salvamento de Vontade do alvo. Após tentar o salvamento, o alvo fica temporariamente imune por 24 horas.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  A duração é de 1 rodada.

Falha  A duração é de 10 minutos.

Falha Crítica  A duração é de 24 horas.', false),
  (null, 'pathfinder', 'Aura Destrutiva', 4, '', '2 ações', '', '', '1 minuto', 'Areias rodopiantes de devastação divina o envolvem, enfraquecendo as defesas de tudo que tocam. Reduza as resistências das criaturas na área (incluindo você) em 2.

---

Elevada (+2) Reduza as resistências em 2 pontos adicionais.', false),
  (null, 'pathfinder', 'Pó de Diamante', 4, 'Evocação', '2 ações', '', 'S, V', '1 minuto', 'Você super-resfria o ar próximo, formando uma nuvem de cristais de gelo dançando em uma emanação ao seu redor. Uma criatura que não você que entre na área ou termine seu turno na área sofre 2d6 de dano de frio. Uma criatura pode receber esse dano apenas uma vez por turno. Os cristais dispersam e refratam a luz; se um efeito de luz entra na área de pó de diamante, qualquer criatura afetada ganha um bônus de status +2 em CA e salva contra ela. Enquanto a magia persistir, você pode ativar ou desativar essa aura usando uma única ação, que tem o traço concentração . Você pode dissipar está magia.

---

Elevada (+2) O dano aumenta em 1d6.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Passos Dimensionais', 4, 'Conjuração', '1 ação', '6 metros', 'S', 'Instantânea', 'Você se teleporta para um local a até 6 metros de distância em sua linha de visão.

---

Elevada (+1) A distância que você pode se teleportar aumenta em 1,5 metros.', false),
  (null, 'pathfinder', 'Dispersar no Ar', 4, '', 'reação', '', '', 'Instantânea', 'Acionamento Você sofre dano de um inimigo ou de um perigo.

---

 Após sofrer o dano acionador, você se transforma em ar. Até o final do turno atual, você não pode ser atacado ou mirado, não ocupa um espaço, não pode agir e quaisquer auras ou emanações que tiver são suprimidas. Ao final do turno, você se reforma em qualquer espaço que puder ocupar a até 4,5 metros de onde estava quando foi dispersado. Quaisquer auras ou emanações que você tiver são restauradas desde que a duração delas não tenham acabado enquanto você estava dispersado.', false),
  (null, 'pathfinder', 'Porta para o Além', 4, 'Conjuração', '2 ações', '1,5 metro', 'S, V', '1 minuto', 'Golpeando no ar, você cria rachaduras em um espaço adjacente desocupado que leva a algum lugar fora da realidade. O ar corre pelas fendas, atraindo criaturas grandes ou menores e objetos de massa leve ou menos em direção ao centro. Criaturas grandes ou menores na área devem tentar um teste de Fortitude no início do turno; criaturas que se movem para a área devem fazer o teste ao entrar.

As rachaduras da porta do lado de fora são muito finas para que qualquer coisa deslize completamente, mas efeitos descompressivos causam 4d6 de dano cortante a qualquer criatura ou objeto que termina sua vez no espaço da porta. Você não é afetado por sua própria porta para o além. Você pode Dissipar a magia.

Sucesso A criatura não é afetada.

Falha A criatura é puxada 3 metros em direção à porta.

Falha Crítica A criatura é puxada 6 metros em direção à porta.

---

Elevada (+1) O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Aguaceiro', 4, '', '2 ações', '36 metros', '', '1 minuto', 'Você invoca um aguaceiro torrencial que extingue chamas não-mágicas. Criaturas na área ficam ocultado e recebem resistência a fogo 10. Criaturas fora da área ficam ocultado para aquelas dentro da área. Criaturas com fraqueza a água que encerrarem seus turnos dentro da área sofrem dano igual às suas fraquezas.

---

Elevada (+1) A resistência a fogo aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Aura Pavorosa', 4, 'Encantamento', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'Você emite uma aura de terror. Adversários na área ficam assustado 1 e incapazes de reduzir a condição.', false),
  (null, 'pathfinder', 'Chamado do Sonhador', 4, 'Ilusão', '2 ações', '9 metros', '', 'Until the end of the target''s next turn', 'O alvo fica distraído e sugestionável, inundado por devaneios vívidos.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  A atenção do alvo vacila. Ele fica desprevenido e fascinado pelos devaneios.

Falha  Como sucesso, exceto que você aparece no sonho e faz uma sugestão para o alvo se aproximar de você, correr (como se tivesse a condição fugindo), Largar o que estiver segurando, se prostrado ou ficar no lugar. A criatura segue este curso de ação como a primeira ação dela após você Conjurar a Magia.

Falha Crítica  Como falha, mas o alvo segue o curso da ação por quantas ações forem possíveis pela duração da magia e não faz nada além disso.', false),
  (null, 'pathfinder', 'Tempestade de Poeira', 4, 'Conjuração', '2 ações', '36 metros', 'S, V', '1 minuto', 'Você convoca uma tempestade rodopiante de poeira. A tempestade de poeira obscurece a visão, com efeito similar à bruma obscurecente. A poeira também torna o ar irrespirável; criaturas na área devem prender sua respiração, embora usar um lenço ou peça de tecido similar sobre a boca aumente o tempo que a criatura pode segurar a respiração por 5 rodadas. Criaturas entrando ou começando o turno na  tempestade de poeira sofrem 1d6 de dano cortante. Criaturas com o traço água ou que sejam feitas primáriamente de líquido tomam o dobro de dano.

---

Elevada (+2) O dano é aumentado em 1d6.', false),
  (null, 'pathfinder', 'Desafio Zeloso', 4, 'Abjuração', '2 ações', '9 metros', 'S, V', '1 minuto', 'Ao desafiar um inimigo, você desvia parte da atenção de seus aliados. O alvo recebe -1 de penalidade no status para rolagens de ataque, rolagens de dano e testes de habilidade contra outras criaturas que não você, e você recebe -1 de penalidade no status de rolagens de ataque, rolagens de dano e testes de habilidade contra criaturas que não sejam o alvo. Cada vez que uma criatura que não seja você usa uma ação hostil que afeta o inimigo desafiado, o inimigo pode tentar um salvamento de Vontade. Em caso de sucesso, o inimigo não recebe mais a penalidade contra aquela criatura. Você pode dissipar a magia, e ela termina automaticamente se você ou o alvo for derrotado.

---

Elevada (+3) As penalidades de status aumentam em 1.', false),
  (null, 'pathfinder', 'Interstício Ectoplasmático', 4, 'Necromancia', '2 ações', '9 metros', 'S, V', 'Sustentada até 1 minuto', 'Você força os planos material e etéreo a se sobreporem parcialmente, criando uma zona que faz com que entidades incorpóreas e espirituais assumam muitos dos aspectos das criaturas corporais. Dentro do interstício ectoplasmático, criaturas incorpóreas creatures não podem passar por objetos sólidos ou criaturas corporais e podem manipular e tentar testes baseados em Força contra criaturas e objetos físicos. Um PJ incorpóreo ou outra criatura com um modificador de Força normal simplesmente usa esse modificador, mas se a criatura tiver um modificador de Força de –5, como a maioria dos monstros incorpóreos, usa um modificador de +4, aumentando seu modificador de Atletismo para 9 adequadamente. Ataques contra criaturas que estão dentro do interstício superam as resistências como se fossem armas com a runa toque fantasma.', false),
  (null, 'pathfinder', 'Tempestade Elemental', 4, 'Evocação', '1 ação', '', 'V', 'Instantânea', 'Sua conjuração o envolve em uma tempestade de energia elemental. Se a sua próxima ação for Conjurar uma Magia de seus espaços de magia de mago que seja da escola de evocação e cause dano de ácido, eletricidade, fogo ou frio, uma emanação de energia de 3 metros o envolve assim que conjurar a magia. Adversários na área sofrem 1d6 de dano por nível da magia conjurada; esse dano é do mesmo tipo causado pela magia conjurada (escolha somente um tipo de dano se ela causar vários tipos). Combine o dano de tempestade elemental e da outra magia contra adversários que sofrerem dano de ambas antes de aplicar quaisquer bônus, penalidades, resistências, fraquezas e similares.', false),
  (null, 'pathfinder', 'Poder de Tolerância', 4, '', 'reação', '', '', 'Instantânea', 'Acionamento Um ataque ou efeito causaria dano a você.

---

 Seu poder próprio se mistura ao poder divino para protegê-lo. Você adquire resistência igual a 8 mais seu modificador de Força contra todo o dano do ataque ou efeito acionador.

---

Elevada (+1) resistência aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Absorção de Energia', 4, '', 'reação', '', '', 'Instantânea', 'GatilhoUm efeito causaria dano ácido, frio, elétrico ou de fogo a você.

---

Você adquire resistência 15 a dano de ácido, eletricidade, fogo ou frio contra o efeito acionador (um tipo à sua escolha). A resistência se aplica somente ao dano inicial do efeito acionador.

---

Elevada (+1) A resistência aumenta em 5 pontos.', false),
  (null, 'pathfinder', 'Perigos Efêmeros', 4, 'Ilusão', '3 ações', '18 metros', 'S, V, M', '1 minuto', 'Você cria perigos ilusórios, como lâminas giratórias ou uma poça de ácido, em quatro espaços de 3 por 3 metros dentro do alcance. Os perigos são apenas uma projeção mental, e uma criatura recebe um teste de Vontade cada vez que toca em um perigo ou ocupa um espaço no início de seu turno. Dependendo do resultado, a criatura sofre 4d6 de dano mental e pode ter dificuldade em se mover pela área. Uma criatura pode receber esse dano apenas uma vez por turno, mesmo que se mova por vários perigos. Escolha esmagamento, cortante, perfurante, ácido, frio, eletricidade, fogo ou dano sônico ao conjurar perigos efêmeros; resistências e fraquezas a esses tipos de dano se aplicam se o alvo pensar que sim, conforme julgado pelo GM. Você pode escolher livremente a aparência e o tipo de dano de cada perigo, desde que a aparência reflita o tipo de dano causado (por exemplo, um risco que cause dano penetrante pode assumir a forma de pontas afiadas).

Sucesso Crítico A criatura não é afetada pelos perigos e não precisa mais fazer teste de Vontade contra eles.
Sucesso A criatura percebe que os perigos não são reais, mas ainda recebe metade do dano; no próximo teste de Vontade contra os perigos, a criatura continua a usar esse resultado, a menos que tenha um sucesso crítico.
Falha O alvo sofre dano total e trata o quadrado como terreno difícil.
Falha Crítica O alvo sofre o dobro de dano e não pode passar por um quadrado que contém um perigo.

---

Elevada (+1) O dano aumenta em 1d6. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Erradicar a Não-Morte', 4, '', '2 ações', '', '', 'Instantânea', 'Um enorme dilúvio de energia vital despedaça todos os mortos-vivos. Cada criatura morta-viva na área sofre 4d12 de dano positivo.

---

Elevada (+1) O dano aumenta em 1d12.', false),
  (null, 'pathfinder', 'Campo Inculto', 4, 'Necromancia', '2 ações', '18 metros', 'S, V', 'Sustentada até 1 minuto', 'Uma luz amarela doentia preenche a área, pois forças entrópicas impedem a cura. Quando uma criatura dentro da área recupera Pontos de Vida, como um efeito de cura ou uma habilidade como cura rápida ou regeneração, ela deve fazer um teste de Vontade.

Sucesso Crítico A criatura recupera o número total de pontos de vida que seriam restaurados pelo efeito de cura e fica temporariamente imune por 1 minuto.
Sucesso A criatura recupera o número total de pontos de vida que seriam restaurados.
Falha A criatura recupera apenas metade do número de pontos de vida que seriam restaurados.
Falha Crítica A criatura não recupera Pontos de Vida do efeito curativo. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Barreira de Chamas', 4, '', 'reação', '18 metros', '', 'Instantânea', 'Você rapidamente deflete as chamas que iam na direção do alvo. O alvo adquire resistência a fogo 15 contra o efeito acionador.

---

Elevada (+2) A resistência aumenta em 5 pontos.', false),
  (null, 'pathfinder', 'Fonte de Serenidade', 4, 'Abjuração', '2 ações', '9 metros', 'S, V', '1 minuto', 'Um farol divino irradia serenidade, tranquilizando aliados próximos. Aliados dentro da área ganham um bônus de status +1 em testes de resistência contra efeitos de emoção. Um aliado pode tocar na fonte como uma ação do Interagir; se o fizerem, a magia tenta neutralizar um efeito emocional que afeta o aliado da escolha dele, após o qual esse efeito emocional fica temporariamente imune por 1 dia. Se a magia for bem-sucedido no teste de neutralização, ela removerá o efeito emocional de seu aliado, embora não de outras criaturas que o efeito possa estar afetando.

---

Elevada (+4) O bônus aumenta em 1. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Choque de Miasma', 4, 'Necromancia', '2 ações', '9 metros', 'S, V', '1 minuto', 'Você multiplica a doença dentro de uma criatura, atraindo uma névoa infecciosa para fora do seu corpo, onde pode se espalhar para outras criaturas. O alvo deve fazer um teste de Vontade. Se o alvo estiver disposto, ele pode optar por assumir os efeitos de uma falha crítica.

Sucesso Crítico O alvo recebe o benefício de uma defesa bem-sucedida contra a doença de nível mais baixo que a afeta.
Sucesso O alvo não é afetado.
Falha Uma doença escolhida aleatoriamente que afeta o alvo preenche o ar em uma emanação de 4,5 metros centralizada no alvo. Durante a duração da magia, qualquer criatura que entre ou termine seu turno dentro da área é exposta a essa doença.
Falha Crítica Como falha, exceto o miasma contém todas as doenças que afetam o alvo. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Transcrição Fantasmagórica', 4, 'Ilusão', '2 ações', '9 metros', 'S, M', '1 minuto', 'Letras brilhantes se reúnem no ar, fornecendo uma transcrição do discurso do alvo em todos os idiomas que você fala. Pela duração do feitiço, quaisquer palavras proferidas em voz alta pelo alvo são escritas em letras à sua frente. Ao lançar o feitiço, você pode escolher se essas letras são visíveis para todas as criaturas ou apenas para certas criaturas que você especificar. Quaisquer palavras que o alvo fale silenciosamente são grafadas de maneira semelhante, permitindo que o alvo se comunique silenciosamente ou em áreas onde o som não é transmitido. Isso ainda permite que o alvo forneça componentes de conjuração verbal nessas áreas, mas somente se você optar por tornar as letras visíveis para todas as criaturas. Além disso, qualquer uma das habilidades auditivas do alvo pode afetar criaturas, mesmo em áreas onde o som não carrega desde que você tenha tornado os glifos visíveis para eles e eles tenham uma linha de visão para o alvo; neste caso, eles ganham o traço visual. Você pode dissipar a magia.', false),
  (null, 'pathfinder', 'Vislumbrar a Verdade', 4, '', '1 ação', '', '', '1 rodada', 'Intuição divina lhe permite ver as coisas como elas realmente são. O MJ faz um teste secreto de neutralização contra cada ilusão que esteja pelo menos parcialmente na área. Em vez de neutralizar a ilusão, você pode ver através dela (por exemplo, se o teste for bem-sucedido contra a magia disfarce ilusório, você vê a forma verdadeira da criatura, mas disfarce ilusório não é encerrada).

A área se move com você pela duração da magia e o MJ faz um teste secreto de neutralização a cada vez que uma nova ilusão estiver dentro da área.

---

Elevada (7º)Você pode permitir que todos, não apenas você, vejam através das ilusões contra as quais você obtiver sucesso.', false),
  (null, 'pathfinder', 'Manto de Invisibilidade', 4, 'Ilusão', '2 ações', '', '', '1 minuto', 'Você fica Invisível, com as mesmas restrições da magia invisibilidade de 2º nível. 

---

Elevada (6º) A duração aumenta para 10 minutos.

Elevada (8º) A duração aumenta para 1 hora.', false),
  (null, 'pathfinder', 'Invisibilidade', 2, 'Ilusão', '2 ações', 'Toque', '', '10 minutos', 'Coberto em ilusão, o alvo fica invisível. Isto o torna indetectado para todas as outras criaturas, embora as criaturas possam tentar encontrar o alvo para torná-lo escondido para elas em vez de indetectado (página 466). Se o alvo usar uma ação hostil, a magia é encerrada após essa ação hostil ser completada.

---

Elevada (4º) A magia dura 1 minuto, mas não é encerrada se o alvo usar uma ação hostil.', false),
  (null, 'pathfinder', 'Conhecer o Inimigo', 4, '', 'reação', '', '', 'Instantânea', 'Acionamento Você rola iniciativa e pode ver uma criatura, você obtém sucesso em uma rolagem de ataque contra uma criatura ou uma criatura falha em uma jogada de salvamento contra uma de suas magias.

---

Use a ação Recordar Conhecimento, rolando o teste de perícia apropriado para identificar as habilidades da criatura acionadora. Você pode rolar seu teste duas vezes e usar o melhor resultado.', false),
  (null, 'pathfinder', 'Sifonar Vida', 4, 'Necromancia', 'reação', '', 'V', 'Instantânea', 'Acionamento Você gasta um de seus espaços de magia de mago para conjurar uma magia de mago da escola de necromancia.

---

Você usa parte do poder da magia para se curar, recuperando 1d8 Pontos de Vida por nível da magia.', false),
  (null, 'pathfinder', 'Tremor Localizado', 4, '', '2 ações', '', '', 'Instantânea', 'Você faz a terra tremer, derrubando criaturas próximas. Escolha se a área da magia é uma emanação de 4,5 metros ou um cone de 4,5 metros quando conjurá-la. Cada criatura de pé sobre o chão sólido na área pode sofrer 4d6 de dano contundente e deve tentar uma jogada de salvamento de Reflexos.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e cai Prostrada.

Falha Crítica  A criatura sofre o dobro do dano e cai Prostrada.

---
Elevada (+1)  O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Golpe de Sorte', 4, '', 'reação', '', '', 'Instantânea', 'AcionamentoVocê falha (mas não falha criticamente) em uma jogada de salvamento.

---

Rerrole a jogada de salvamento e use o melhor resultado. Você fica temporariamente imune por 10 minutos.', false),
  (null, 'pathfinder', 'Sustento Maligno', 4, '', '2 ações', 'Toque', '', '1 minuto', 'Você embute uma semente de energia negativa em um morto-vivo, restaurando o vigor sobrenatural dele. O alvo recebe cura acelerada 7. Esta cura surge de energia negativa, portanto, ela cura os mortos-vivos em vez de causar dano a eles.

---

Elevada (+1) A cura acelerada aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Forma de Louva-a-Deus', 4, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Você se torna um louva-a-deus. Você recebe os benefícios de forma de inseto, elevada para o nível de forma de louva-a-deus, e pode transformar-se somente em um louva-a-deus.', false),
  (null, 'pathfinder', 'Farol Místico', 4, '', '1 ação', '9 metros', '', 'Until the start of your next turn', 'A próxima magia de dano ou cura que o alvo conjurar antes do início de seu próximo turno causa dano ou recupera Pontos de Vida como se a magia fosse elevada 1 nível acima do nível real dela. Exceto por isso, a magia funciona com o nível real dela. Após o alvo conjurar a magia, farol místico é encerrada.', false),
  (null, 'pathfinder', 'Fartura da Natureza', 4, '', '1 ação', '', '', 'Instantânea', 'Uma fruta ou vegetal maduro do tamanho da sua palma
aparece em sua mão. Você escolhe o tipo específico de comida. Uma criatura pode consumi-la com uma ação de Interagir para recuperar 3d10+12 Pontos de Vida e ser nutrida como se tivesse comido uma refeição. Se não for ingerida, a comida apodrece e se desfaz em pó após 1 minuto.

---

Elevada (+1) A quantidade de Pontos de Vida restaurados aumenta em 6.', false),
  (null, 'pathfinder', 'Tristeza Transbordante', 4, 'Encantamento', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'A tristeza flui de você para as criaturas próximas, apagando qualquer outro pensamento que eles tenham. A primeira vez que uma criatura começa sua vez na área ou entra na área, deve fazer um teste de Vontade. Se mais tarde sair e entrar novamente na área, utilizará o mesmo efeito de antes.

Sucesso Crítico A criatura não é afetada
Sucesso A criatura recebe uma penalidade de status -1 nas checagens de pericia e de Percepção enquanto permanecer na área.
Falha Enquanto a criatura estiver na área, qualquer efeito emocional reage, qualquer efeito emocional de nível mais baixo que o normal tristeza trasnbordante são suprimidos e, sempre que a criatura tenta usar uma ação emocional ou lançar uma magia emocional, ela deve ter sucesso em um teste simples de CD 11 ou a ação ou a magia é interrompida.
Falha Crítica Como falha, mas a criatura não pode usar ações emocionais ou magias. 

---

Elevada (+2) Ao lançar magia, você pode aumentar a área em 1,5 metros. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Metais Preciosos', 4, '', '1 ação', 'Toque', '', '1 minuto', 'Sua divindade abençoa metais básicos para transformá-los em metais preciosos. O item alvo se transforma de seu metal normal para aço, cobre, ferro, ferro frio, ouro ou prata (os detalhes para estes metais são encontrados nas páginas 588 a 589). Um item transmutado desta forma causa dano de acordo com seu novo material. Por exemplo, uma espada de aço transmutada em ferro frio causaria dano adicional a uma criatura com fraqueza a ferro frio.

Esta mudança é claramente mágica e temporária, portanto, o valor monetário do item não é alterado; você não poderia transmutar moedas de cobre em ouro e usar essas moedas para comprar algo ou usá-las como custo para uma magia.

---

Elevada (8º) Acrescente adamante (página 588) e mitral (página 589) à lista de metais que você pode transformar os itens.', false),
  (null, 'pathfinder', 'Esfera do Protetor', 4, '', '2 ações', '', '', 'Sustentada até 1 minuto', 'Uma aura protetiva emana de você, protegendo você e seus aliados. Você adquire resistência 3 a todo dano. Seus aliados também adquirem esta resistência enquanto estiverem na área.

---

Elevada (+1) A resistência aumenta em 1 ponto.', false),
  (null, 'pathfinder', 'Censurar a Morte', 4, '', '1 ação', '', '', 'Instantânea', 'Você salva criaturas das garras da morte. Você pode gastar de 1 a 3 ações Conjurando esta Magia, afetando uma quantidade de criaturas igual à quantidade de ações gastas. Cada alvo recupera 3d6 Pontos de Vida. Se o alvo tinha a condição morrendo, voltar de morrendo devido a esta cura não aumenta a condição ferido dele.

---

Elevada (+1) Aumente a cura em 1d6.', false),
  (null, 'pathfinder', 'Lembrar dos Perdidos', 4, 'Adivinhação', '2 ações', '', 'S, V', 'Instantânea', 'Você invoca os perdidos e esquecidos, atacando a mente de seus inimigos com as memórias daqueles que morreram com uma queixa por eles. Inimigos na área recebem 6d6 de dano mental (salvamento básico de Vontade) e ficam assustado 1 em uma falha crítica. Se você souber o nome de alguém assassinado ou gravemente prejudicado por um inimigo na área, poderá cantar o nome dessas vítimas ao lançar a magia para melhorar a clareza das visões, aumentando o dano ao inimigo correspondente de 6d6 para 6d10; você pode fazer isso para vários inimigos se conhecer as vítimas de cada inimigo. As visões são pessoais para cada inimigo na área, e você não pode usar esse feitiço para discernir um assassino, adivinhando um nome. Uma criatura que realmente conhece ninguém que tenha morrido com qualquer tipo de queixa é imune a esse efeito.

---

Elevada (+1) O dano aumenta em 2d6 (ou 2d10 em um inimigo quando você nomeia uma vítima específica). 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Dor Retributiva', 4, '', 'reação', '9 metros', '', 'Instantânea', 'Acionamento Uma criatura na distância causa dano a você.

---

Você vingativamente reflete sua dor sobre seu atormentador. O alvo sofre dano mental igual à metade do dano que ele causou em você quando acionou esta magia.', false),
  (null, 'pathfinder', 'Rugido da Wyrm', 4, 'Encantamento', '2 ações', '', 'S, V', 'Varies', 'Você canaliza o poder dos dragões em sua voz, soltando um rugido que gera respeito na humanidade dos dragões, mas que instila medo na maioria das outras criaturas. O rugido impressionante concede a você um bônus de circunstância de +2 para em testes de Diplomacia por 10 minutos contra dragões que estavam na área no momento do lançamento. Todos os inimigos dentro da área, exceto os dragões, devem fazer um teste de salvamento de Vontade; para esses inimigos, rugido da wyrm é um efeito de medo.

Rugido da wyrm afeta criaturas não-dragão com laços profundos com a espécie de dragão (como um bárbaro com o instinto dracônico, um feiticeiro com a linhagem dracônica, ou um membro de uma cultura que reverencia os dragões) como se eles tivessem o traço dragão. O MJ decide se uma criatura está alinhada o suficiente com a espécie de dragão para ser afetada dessa maneira.

Sucesso Crítico A criatura não é afetada.
Sucesso A criatura fica assustada 1.
Falha A criatura fica assustada 2.
Falha Crítica A criatura fica assustada 3 e fugindo por 1 rodada. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Clarividência', 4, '', '1 minuto', '150 metros', '', '10 minutos', 'Você cria um olho flutuante invísivel em um local na distância (mesmo se estiver fora de sua linha de visão ou linha de efeito). Esse olho não pode se mover, mas você pode ver através dele como se estivesse usando seus sentidos visuais normais.', false),
  (null, 'pathfinder', 'Salvaguardar Segredo', 4, '', '2 ações', '9 metros', '', '1 hora', 'Você garante que um segredo permaneça a salvo de espionagem. Escolha uma informação que pelo menos um dos alvos conheça; você pode mirar uma criatura somente se ela permanecer na distância durante todo o minuto no qual você Conjurar a Magia. A magia concede a quem conhece a informação escolhida +4 de bônus de estado em testes de perícia (geralmente de Dissimulação) para ocultar este conhecimento e em jogadas de salvamento contra magias que especificamente tentem obter este conhecimento deles e contra efeitos que os forçariam a revelá-lo.

Se Conjurar esta Magia novamente, qualquer salvaguardar segredo que você tiver conjurado anteriormente é encerrada.', false),
  (null, 'pathfinder', 'Pesadelo Compartilhado', 4, '', '2 ações', '9 metros', '', 'Varies', 'Fundido sua mente com a do alvo, você troca visões desorientadoras dos pesadelos um do outro. Um de vocês fica confuso, mas isso depende do salvamento de Vontade do alvo.

---
Sucesso Crítico  Você fica confuso por 1 rodada.

Sucesso  No início de seu próximo turno, você gasta sua primeira ação com a condição confuso e depois age normalmente.

Falha  Como sucesso, mas o alvo é afetado em vez de você e deve gastar a primeira ação em cada turno dele com a condição confuso. A duração é de 1 minuto.

Falha Crítica  O alvo fica confuso por 1 minuto.', false),
  (null, 'pathfinder', 'Forma Mutável', 4, '', '1 ação', '', '', '1 minuto', 'Você recebe uma das habilidades a seguir à sua escolha. Você pode Dispensar esta magia.  

Você recebe +6 metros de bônus de estado em sua Velocidade.
Você adquire uma Velocidade de escalada ou de natação igual à metade de sua Velocidade.
Você adquire visão no escuro.
Você cresce um par de garras. Elas são ataques desarmados de acuidade e ágeis que causam 1d8 de dano cortante.
Você adquire faro de 18 metros (impreciso).', false),
  (null, 'pathfinder', 'Estase', 4, 'Transmutação', '2 ações', '9 metros', 'S, V', 'Varies', 'O fluxo de tempo congela em torno de um objeto ou criatura, mantendo-o no lugar. O alvo deve tentar um salvamento de Vontade (um objeto desapossado falha automaticamente no salvamento).

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo fica atordoado 1 à medida que o tempo engrossa ao seu redor.
Falha O tempo deixa de passar para o alvo por 1 rodada. É invulnerável a todos os danos, não pode ser alvejado ou afetado por nada, e nenhuma rodada decorre por durações, condições, aflições e outros efeitos cronometrados. Enquanto estiver em estase, o alvo não pode ser movido e permanece fixo, desafiando a gravidade, se necessário.
 Falha Crítica Como fracasso, mas o alvo é mantido em estase por 3 rodadas. No final de cada um dos seus turnos, ele pode fazer um teste de salvamento de Vontade para reduzir a duração restante em 1 rodada ou finalizá-la inteiramente em um sucesso crítico. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Voo dos Ventos Tempestuosos', 4, '', '2 ações', '', '', '1 minuto', 'Ventos poderosos o carregam suavemente pelo ar, concedendo-lhe uma Velocidade de voo igual à sua Velocidade. Se ainda estiver voando quando a duração desta magia acabar, você flutua até o chão como em queda suave.

---

Elevada (6º) Quando voar usando voo dos ventos tempestuosos, você não considera voar contra o vento como terreno difícil.', false),
  (null, 'pathfinder', 'Forma Enxame', 4, 'Transmutação', '2 ações', '', 'S, V', '5 minutos', 'Você se desfaz em um enxame de criaturas minúsculas. Enquanto estiver em forma de enxame, você tem o traço enxame e você ganha resistência 5 ao dano cortante e penetrante e fraqueza 5 à dano de área e dano de respingo. Você pode caber em espaços de apenas alguns centímetros de largura, movendo suas criaturas constituintes através do espaço. Você não ganha a capacidade da mente enxame, por isso ainda é afetado normalmente por efeitos mentais. Como um enxame, você não pode falar, lançar feitiços, usar ações manipuladoras que exijam suas mãos, ativar seus itens mágicos ou fazer qualquer um de seus ataques com seu corpo normal. Você pode Dispensar a magia.

---

Elevada (+2) Aumente suas resistências e fraquezas cada uma em 5.', false),
  (null, 'pathfinder', 'Seguir o Rumo', 4, '', '2 ações', 'Toque', '', 'Instantânea', 'Quando alguém tiver passado da conta, você pode ajudá-lo a superar mais rápido a aflição ou intensificar a miséria que ele está sofrendo. Esta magia tenta progredir uma aflição de doença, uma aflição de veneno ou dano persistente de veneno afetando o alvo. Se o alvo estiver afetado por mais de um destes, você pode escolher dentre os que estiver ciente; caso contrário, o MJ escolhe aleatoriamente. Um alvo involuntário pode tentar um salvamento de Vontade para anular seguir o rumo.

O efeito desta magia depende se você está tentando encerrar uma aflição ou dano persistente de veneno e se está tentando ajudar ou prejudicar a recuperação do alvo.

Aflição O alvo imediatamente tenta a próxima jogada de salvamento dele contra a aflição. Você pode conceder à criatura +2 de bônus de estado ou –2 de penalidade de estado à sua escolha na jogada de salvamento dela contra a aflição.
Veneno Persistente Você pode fazer o alvo sofrer o dano persistente de veneno imediatamente quando Conjurar esta Magia (além de sofrê-lo ao final do próximo turno dele). Quer você decida ou não em fazê-lo, o alvo faz um teste simples adicional contra o dano persistente de veneno. Você pode determinar que a CD desse teste simples seja 5 ou 20 em vez da CD normal.

---

Elevada (7º) Você pode tentar progredir qualquer quantidade de aflições selecionáveis e dano persistente de veneno do alvo.', false),
  (null, 'pathfinder', 'Tentar a Sorte', 4, '', 'reação', '36 metros', '', 'Instantânea', 'Acionamento Você ou um aliado na distância tenta uma jogada de salvamento.

---

Você distorce as forças do destino para tornar um momento calmo ou desastroso, sem meio termo. O alvo recebe +1 de bônus de estado na jogada de salvamento acionadora. Se o resultado da jogada de salvamento for um sucesso, trate-o como um sucesso crítico. Se for uma falha, trate-o como uma falha crítica, e essa falha crítica não pode ser reduzida por habilidades que normalmente reduzem falhas críticas, como evasão aprimorada. Se a habilidade acionadora não tiver possibilidade de sucesso crítico ou falha crítica, tentar a sorte falha, mas você não gasta o Ponto de Foco por Conjurar esta Magia.

---

Elevada (8º) O bônus na jogada de salvamento é +2.', false),
  (null, 'pathfinder', 'Trabalhador Incansável', 4, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você suprime sua escolha de uma das seguintes condições que afetam o alvo: desajeitado, sobrecarregado, enfraquecido, ou fatigado. Se você não remover o efeito que causou a condição, a condição retornará após o término da duração da magia.', false),
  (null, 'pathfinder', 'Toque da Lua', 4, '', '1 ação', 'Toque', '', '1 minuto', 'Você toca o alvo e um símbolo da lua aparece na testa dele, brilhando com uma tênue luz da lua. O alvo brilha com luz fraca em um raio de 6 metros. Ele também recebe um benefício baseado em uma fase da lua, começando com a lua nova e mudando para a próxima fase ao final de cada um dos turnos dele.

Lua Nova O alvo não recebe qualquer benefício.
Lua Crescente O alvo recebe +1 de bônus de estado em rolagens de ataque e +4 de bônus de estado em rolagens de dano.
Lua Cheia O alvo recebe +1 de bônus de estado em rolagens de ataque, CA e jogadas de salvamento e +4 de bônus de estado em rolagens de dano.
Lua Crescente O alvo recebe +1 de bônus de estado na CA e jogadas de salvamento. Após esta fase, retorne para a lua nova.', false),
  (null, 'pathfinder', 'Trajeto do Viajante', 4, '', '2 ações', '', '', '5 minutos', 'Você acrescenta poder aos seus músculos, permitindo-lhe escalar paredes ou nadar com facilidade. Quando conjurar esta magia, você adquire uma Velocidade de escalada ou uma Velocidade de natação. A Velocidade é igual à sua Velocidade em terra.

---

Elevada (5º) Você pode escolher adquirir uma Velocidade de voo.', false),
  (null, 'pathfinder', 'Gêmeo do Enganador', 4, 'Ilusão', '2 ações', '9 metros', '', '1 minuto', 'Você raramente se satisfaz estando em um só lugar. Escolha um local a até 30 metros do alvo que o alvo possa ver. Você cria uma ilusão sua nesse local que somente o alvo pode ver e que imita todas as suas ações. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo acredita que você está no local designado e não pode vê-lo em seu local real. O alvo automaticamente desacredita a ilusão quando você usar uma ação que não fizer sentido para a posição da ilusão ou se ele atacar, tocar, Buscar ou de alguma outra forma interagir com a ilusão. Se você usar uma ação hostil contra o alvo, a magia é encerrada.

Falha  Como sucesso, mas o alvo deve obter sucesso em um salvamento de Vontade para desacreditar a ilusão quando um dos eventos listados ocorrer.

Falha Crítica  Como sucesso, mas o alvo deve obter sucesso crítico em um salvamento de Vontade para desacreditar a ilusão quando um dos eventos listados ocorrer.', false),
  (null, 'pathfinder', 'Unidade', 4, '', 'reação', '9 metros', '', 'Instantânea', 'Você forma uma defesa unificada. Cada aliado pode usar seu modificador de jogada de salvamento em vez do próprio modificador contra a magia acionadora. Cada aliado decide individualmente qual modificador usar.', false),
  (null, 'pathfinder', 'Postura dos Ventos Selvagens', 4, 'Evocação', '1 ação', '', 'S', 'Until you leave the stance', 'Você assume a postura dos ventos correntes, enviando ondas de energia à distância. Você pode realizar Golpes desarmados de estampido do vento como Golpes à distância contra alvos a até 9 metros. Eles causam 1d6 de dano contundente; pertencem ao grupo pugilato; e possuem os traços ágil, desarmado, não-letal e propulsivo. Golpes de estampido do vento ignoram ocultação e toda cobertura.

Enquanto estiver na postura dos ventos selvagens, você recebe +2 de bônus de circunstância na CA contra ataques à distância.', false),
  (null, 'pathfinder', 'Palavra de Liberdade', 4, '', '1 ação', '9 metros', '', '1 rodada', 'Você profere uma palavra de poder libertadora que livra uma criatura. Você suprime uma das seguintes condições à sua escolha: confuso, assustado, agarrado, ou paralisado. O alvo não é afetado pela condição escolhida e, se você suprimir a condição agarrado o alvo automaticamente se liberta de qualquer efeito o afetando quando você Conjurar a Magia.

Se você não remover o efeito que gerou a condição, ela retorna após a magia acabar. Por exemplo, se uma magia estiver deixando o alvo confuso por 1 minuto, palavra de liberdade permitiria o alvo agir normalmente por 1 rodada, mas a condição confuso retornaria após esse período.', false),
  (null, 'pathfinder', 'Entusiasmo pela Batalha', 4, '', 'reação', '3 metros', '', 'Instantânea', 'Você alimenta a ira justa dentro de si e de um aliado. Você e o aliado alvo rolam um d20 cada e usam o maior resultado para suas rolagens de iniciativa. Vocês ainda utilizam seus próprios modificadores de Percepção ou outras estatísticas para determinarem seus resultados.', false),
  (null, 'pathfinder', 'Ira Abissal', 5, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Você evoca a energia de um reino abissal. Os tipos do dano da magia (um de energia e um físico) são baseados no resultado da rolagem na tabela abaixo. 

Ira Abissal 

1D4
Reino 
Manifestação
Tipo de Dano

1
Céus
Relâmpagos e detritos voadores
Contundente e eletricidade 2

2
Profundezas
Ácido e conchas demoníacas
Ácido e cortante

3
Gélido
Ar frígido e gelo
Contundente e frio

4
Vulcânico
Rochas vulcânicas afiadas e magma
Fogo e perfurante

Você causa 4d6 de dano de cada um dos tipos de dano correspondentes em cada criatura no cone (8d6 de dano total).

---

Elevada (+1) O dano para cada tipo aumenta em 1d6.', false),
  (null, 'pathfinder', 'Contramedida Arcana', 5, 'Abjuração', 'reação', '36 metros', 'S', 'Instantânea', 'AcionamentoUma criatura dentro do alcance que você pode ver Conjurar uma Magia.

---

Você mina a magia alvo, tornando mais fácil defender-se dela. Você reduz o nível da magia em 1, e os alvos da magia minada por você recebem +2 de bônus de estado em quaisquer jogadas de salvamento, testes de perícia, CA ou CD contra ela. Você não pode reduzir o nível da magia abaixo do nível mínimo dela. Por exemplo: um cone de frio de 5º nível permaneceria como 5º nível, mas uma bola de fogo de 5º nível se tornaria de 4º nível. Os alvos da magia minada ainda recebem todos os outros benefícios defensivos, mesmo se você não reduzir o nível da magia.', false),
  (null, 'pathfinder', 'Marca Celestial', 5, 'Necromancia', '1 ação', '9 metros', 'S', '1 rodada', 'Um símbolo ardente aparece no alvo, marcando-o para a justiça divina. Você e seus aliados recebem +1 de bônus de estado em rolagens de ataque e testes de perícia contra ele. A qualquer momento em que uma criatura bondosa causar dano a ela, a criatura bondosa causa 1d4 de dano bondoso adicional. O alvo fica temporariamente imune por 1 minuto.

---

Elevada (+2) O dano bondoso aumenta em 1 ponto.', false),
  (null, 'pathfinder', 'Asas de Dragão', 5, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Asas de couro nascem em suas costas, concedendo-lhe uma Velocidade de voo de 18 metros ou igual à sua Velocidade, o que for mais rápido. Se ainda estiver voando quando a duração desta magia acabar, você flutua até o chão como em queda suave. Você pode aumentar o custo de Pontos de Foco em 1 para recebem os benefícios de garras de dragão enquanto as asas durarem.

---

Elevada (8°) A duração aumenta para 10 minutos.', false),
  (null, 'pathfinder', 'Rajada Elemental', 5, 'Evocação', '2 ações', '30 m (burst only)', 'S, V', 'Instantânea', 'Você reúne energia elemental e a lança contra seus adversários em um dos vários formatos listados à sua escolha, causando 8d6 de dano contundente (ou dano de fogo, se seu elemento for fogo).
Esta magia possui o traço do seu elemento.
Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Glamour Feérico', 5, 'Ilusão', '2 ações', '9 metros', 'S, V', '10 minutos', 'Você invoca o glamour de fadas para cobrir uma área ou os alvos em ilusão. Esta magia gera o efeito de cena ilusória sobre a área ou o efeito de véu sobre as criaturas, elevando o nível de magia desse efeito a 1 nível inferior ao nível de glamour feérico, utilizando a distância e duração de glamour feérico.', false),
  (null, 'pathfinder', 'Túmulo Ávido', 5, 'Necromancia', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Centenas de braços esqueléticos brotam do chão, agarrando-se a criaturas na área e tentando segurá-las no lugar. Os braços esqueléticos causam 6d6 de dano cortante. Cada criatura na área deve tentar um salvamento de Reflexos.

---

Successo Crítico A criatura não é afetada.

Successo  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e –3 de penalidade de circunstância nas Velocidades dela por 1 rodada.
Falha Crítica  A criatura sofre o dobro do dano e fica Immobilized por 1 rodada ou até Escapar.

---
Elevada (+1)  O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Erupção de Fogo Infernal', 5, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Você invoca uma erupção de fogo infernal que irrompe de baixo para cima, causando 4d6 de dano de fogo e 4d6 de dano maligno.

---

Elevado (+1) O dano de fogo aumenta em 1d6 e o dano maligno aumenta em 1d6.', false),
  (null, 'pathfinder', 'Litania contra a Preguiça', 5, 'Evocação', '1 ação', '9 metros', 'V', '1 rodada', 'Sua litania confronta o pecado da preguiça, interferindo com a habilidade do alvo de reagir. O alvo deve tentar um salvamento de Vontade. Uma criatura particularmente preguiçosa, como um demônio da preguiça, usa o resultado de um grau de sucesso pior do que o resultado da jogada de salvamento dela. O alvo fica temporariamente imune a todas as suas litanias por 1 minuto.

Sucesso Crítico O alvo não é afetado.

Successo O alvo não pode usar reações.

Falha O alvo não pode usar reações e fica Slowed 1.

Falha Crítica O alvo não pode usar reações e fica Slowed 2.', false),
  (null, 'pathfinder', 'Anatomia Inusitada', 5, 'Transmutação', '1 ação', '', 'S', '1 minuto', 'Você transforma sua carne e órgãos em um amálgama bizarro de pele reluzente, escamas grossas, tufos de pelo e protuberâncias tumorosas. Isto possui três efeitos:

Você adquire resistência 10 a dano de precisão e resistência 10 a dano extra de acertos críticos. Se a resistência for maior que o dano extra sofrido, ela reduz o dano extra para 0, mas não reduz o dano inteiro do ataque.
Você adquire visão no escuro.
Ácidos escorrem de sua pele. Qualquer criatura que o acertar com um ataque desarmado ou com um ataque usando uma arma corpo a corpo que não seja de alcance sofre 2d6 de dano de ácido.

---

Elevada (+2) A resistência aumenta em 5 pontos e o dano de ácido aumenta em 1d6.', false),
  (null, 'pathfinder', 'Salto do Vento', 5, 'Transmutação', '1 ação', '', 'V', '1 minuto', 'Você adquire uma Velocidade de voo igual à sua Velocidade. Você deve encerrar seu turno sobre chão sólido ou cai.

---

Elevada (6º) Ao final de seu turno, você pode fazer um teste de Acrobatismo CD 30 para encontrar apoio no próprio ar. Se obtiver sucesso, você não cai.', false),
  (null, 'pathfinder', 'Você é Meu', 5, 'Encantamento', '2 ações', '9 metros', 'S, V', '1 rodada', 'Você manipula as emoções do alvo, potencialmente controlando-o por um breve instante. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado..

Sucesso  O alvo fica atordoado 1.

Falha  No próximo turno do alvo, ele fica atordoado 1 e você o controla parcialmente, fazendo-o realizar uma ação única à sua escolha. Se possuir ações restantes, ele pode agir normalmente.

Falha Crítica  O alvo fica controlado por 1 rodada.

---
Elevada (7º)  Em uma falha, o alvo fica controlado for 1 round. Em uma falha crítica, o alvo fica controlado por até 1 minuto; ele recebe um novo salvamento de Vontade ao final de cada um dos turnos dele e encerra a magia em um sucesso.', false),
  (null, 'pathfinder', 'Sacrifício do Campeão', 6, 'Abjuração', 'reação', '9 metros', 'S', 'Instantânea', 'AcionamentoUm aliado é atingido por um Golpe ou um aliado falha em uma jogada de salvamento contra um efeito que não afeta você.

---

Você forma um vínculo com um aliado, permitindo-lhe sofrer ferimentos no lugar deles. Todos os efeitos do acerto ou salvamento fracassado são aplicados a você em vez do aliado. Por exemplo: se o alvo falhar criticamente em uma jogada de salvamento contra uma bola de fogo, você sofreria o dobro do dano. Estes efeitos ignoram quaisquer resistências, imunidades ou outras habilidades que você tiver que poderiam de alguma forma mitigá-los, embora as habilidades do alvo se apliquem antes de você sofrer o efeito.', false),
  (null, 'pathfinder', 'Convocações Primais', 6, '', 'ação livre', '', '', 'Instantânea', 'Você melhora uma criatura convocada com o poder dos elementos. Se sua próxima ação for conjurar convocar animall ou convocar planta ou fungo, escolha água, ar, fogo ou terra e a criatura convocada recebe as habilidades correspondentes ao elemento escolhido. 

Ar A criatura adquire uma Velocidade de voo de 18 metros.
Terra A criatura adquire uma Velocidade de escavação de 6 metros, reduz a Velocidade em terra dela em 3 metros (mínimo 1,5 metros) e adquire resistência 5 a dano físico.
Fogo Os ataques da criatura causam 1d6 de dano de fogo extra e ela adquire resistência 10 a fogo e fraqueza 5 a água e frio.
Água A criatura adquire uma Velocidade de natação de 18 metros, pode gastar 1 ação após um ataque corpo a corpo para tentar Empurrar (ignorando penalidade por ataques múltiplos) e adquire resistência 5 a fogo.', false),
  (null, 'pathfinder', 'Litania da Retidão', 7, 'Evocação', '1 ação', '9 metros', 'V', '1 rodada', 'Sua litania denuncia um malfeitor, deixando-o suscetível aos poderes do bem. O alvo adquire fraqueza 7 a bem e fica temporariamente imune a todas as suas litanias por 1 minuto.

---

Elevada (+1) A fraqueza aumenta em 1 ponto.', false),
  (null, 'pathfinder', 'Balada Tranquilizante', 7, '', '2 ações', '9 metros', '', 'Instantânea', 'Você se inspira em sua musa para tranquilizar seus aliados. Escolha um dos três efeitos a seguir:

A magia tenta neutralizar efeitos de medo nos alvos.
A magia tenta neutralizar efeitos impondo paralisia ao alvo.
A magia restaura 7d8 Pontos de Vida aos alvos.

---

Elevada (+1) Quando usada para curar, balada tranquilizante restaura 1d8 Pontos de Vida a mais.', false),
  (null, 'pathfinder', 'Silvados Impaladores', 8, '', '3 ações', '', '', 'Sustentada até 1 minuto', 'O solo na área se transforma em uma massa de silvados perigosos que agridem e impedem seus adversários. A cada rodada em que Sustentar a Magia, você pode selecionar um dos efeitos a seguir para ocorrer na área. 

Enredar Os silvados se amontoam ao redor de seus adversários, tentando segurá-los no lugar. Um adversário na área (ou voando a no máximo 6 metros acima da área) deve tentar um salvamento de Reflexos. Em uma falha, ele sofre –3 metros de penalidade de circunstância em todas as Velocidades por 1 rodada e, em uma falha crítica, ele fica Imobilizado por 1 rodada a menos que Escape. 
Impedir Os silvados se contorcem e crescem, tornando a área inteira terreno difícil.
Muralha Uma muralha de espinhos aparece na área, durando por 1 rodada. A muralha é terreno difícil maior em vez de terreno difícil.  

Além disso, uma vez por rodada, você pode direcionar os silvados para empalarem qualquer alvo na área (ou voando a até 6 metros acima da área) à sua vista ao usar uma ação única que possui os traços concentração e manuseio. Faça uma rolagem de ataque de magia. Em um sucesso, o alvo sofre 10d6 de dano perfurante e sofre –3 metros de penalidade de circunstância em todas as Velocidades por 1 rodada; em um sucesso crítico, o alvo fica Imobilizado por 1 rodada a menos que Escape.', false),
  (null, 'pathfinder', 'Palma Vibrante', 8, 'Necromancia', '2 ações', '', 'S, V', '1 month', 'Faça um Golpe corpo a corpo desarmado. Se você acertar e o alvo estiver vivo, a qualquer momento da duração, você pode gastar uma ação única com os traços auditivo e concentração para proferir uma palavra de morte que poderia matá-lo instantaneamente. O alvo tenta um salvamento de Fortitude.

Se você conjurar palma vibrante novamente, os efeitos de qualquer palma vibrante que tiver conjurado previamente são encerrados.

---

Sucesso Crítico O alvo sobrevive, a magia acaba e o alvo fica temporariamente imune por 24 horas.

Sucesso  O alvo fica atordoado 1 e sofre 40 de dano, a magia acaba e o alvo fica temporariamente imune por 24 horas.

Falha  O alvo fica atordoado 3 e sofre 80 de dano. A duração da magia continua, mas o alvo fica temporariamente imune por 24 horas contra ser morto por palma vibrante.

Falha Crítica O alvo morre.

---

Elevada (+1) O dano aumenta em 10 em uma falha ou em 5 em um sucesso.', false),
  (null, 'pathfinder', 'Corpo Vazio', 9, 'Conjuração', '2 ações', '', 'S, V', '1 minuto', 'Você se torna etéreo, recebendo os efeitos de passeio etéreo, mas não precisa se concentrar.', false),
  (null, 'pathfinder', 'Senhor da Tempestade', 9, '', '2 ações', '', '', 'Sustentada até 1 minuto', 'O céu acima de você escurece em questão de segundos, espiralando com nuvens ameaçadoras pontuadas por clarões de relâmpagos. A cada rodada, quando Sustentar a Magia, você pode selecionar um dos efeitos a seguir para ocorrer na área.

Calmaria Nenhum efeito adicional.
Névoa Névoa pesada ocupa o local, ocultando a área com os efeitos de bruma obscurecente.
Chuva Chuva torrencial cai do céu, apagando chamas comuns. Criaturas na área sofrem –2 de penalidade de circunstância em testes de Acrobatismo e Percepção.
Vento Ventos poderosos sopram a área em todas as direções. Ataques à distância sofrem –4 de penalidade de circunstância e todo voo é considerado contra o vento e conta como mover-se por terreno difícil.

Além disso, uma vez por rodada, você pode usar uma ação única que possui os traços concentração e manuseio para invocar um relâmpago golpeando qualquer alvo à sua vista na distância. Você causa 10d6 de dano de eletricidade ao alvo; ele deve tentar um salvamento básico de Reflexos. Em uma falha, ele também fica surdo por 1 rodada.', false),
  (null, 'pathfinder', 'Companheiro em Ápice', 10, 'Transmutação', '2 ações', '9 metros', 'S, V', '1 minuto', 'Você se concentra nas energias de todos os membros da espécie de seu companheiro animal, transformando seu companheiro animal em sua forma de batalha no ápice. Seu companheiro animal obtém as seguintes estatísticas e habilidades enquanto estiver em sua forma máxima.

Seu companheiro animal se torna Enorme e seus ataques têm alcance de 5 metros. Ele deve ter espaço suficiente para expandir ou a magia é perdida.
30 pontos de vida temporários.
Visão no escuro.
Os dados de dano do seu companheiro animal aumentam em um passo, e o ataque ganha o traço mortal d12.
+3 metros de bônus em suas velocidades.
Ignora terrenos difíceis e terrenos mais difíceis.

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Aria Fatal', 10, '', '1 ação', '9 metros', '', 'Instantânea', 'Você performa uma música tão perfeita que o alvo pode morrer de alegria ou tristeza. Uma vez mirada por esta magia, a criatura fica temporariamente imune por 1 minuto. O efeito da magia depende do nível e Pontos de Vida atuais do alvo.. 

---
16º ou inferior O alvo morre instantaneamente. 

17º Se o alvo tiver 50 Pontos de Vida ou menos, ele morre instantaneamente; caso contrário, ele cai para 0 Pontos de Vida e fica morrendo morrendo 1. 

18º ou Superior  O alvo sofre 50 de dano. Se isto deixá-lo com 0 Pontos de Vida, ele morre instantaneamente..', false),
  (null, 'pathfinder', 'Desafio do Herói', 10, 'Necromancia', 'ação livre', '', 'V', 'Instantânea', 'AcionamentoUm ataque levaria você a 0pontos de vida.

---

Você brada em desafio, preenchendo-se com uma súbita explosão curativa. Logo antes de aplicar o dano do ataque, você recupera 10d4+20 Pontos de Vida. Se isto impediria o ataque de levá-lo a 0 Pontos de Vida, você não fica  inconsciente ou morrendo. De qualquer forma, enganar a morte é difícil, e você não pode usar desafio do herói novamente até Refocar ou até a próxima vez que fizer suas preparações diárias. Desafio do herói não pode ser usado contra efeitos com o traço morte ou que não deixariam restos, como desintegrar.', false),
  (null, 'pathfinder', 'Canção dos Caídos', 10, 'Necromancia', '2 ações', '9 metros', 'V', 'Sustentada até 1 minuto', 'Você entoa um cântico ou uma elegia que ou desperta os mortos em ação ou lembra aos mortos-vivos que eles devem descansar.

Se você atingir criaturas mortas, os corpos se animam e podem continuar agindo como se estivessem vivos. Uma criatura animada dessa maneira possui 60 Pontos de Vida temporários. As criaturas animadas são lento 1 mas pode agir normalmente. As criaturas animadas com essa magia morrem novamente quando a magia termina.

Se você atingir criaturas mortas-vivas, cada morto-vivo deve tentar um salvamento básico de Vontade.

Sucesso Crítico O morto-vivo recebe 5d6 de dano positivo.
Sucesso O morto-vivo sofre 10d6 de dano positivo e fica lento 1 por 1 rodada.
Falha O morto-vivo recebe 100 de dano positivo e fica lento 1 por 1 minuto.
 Falha Crítica O mortos-vivo é destruído.

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Explosão Ácida', 1, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Você cria uma concha de ácido ao seu redor que explode imediatamente, causando 2d6 de dano ácido a cada criatura na área.

---

Elevada (+1) O dano aumenta em 2d6.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Agitar', 1, 'Encantamento', '2 ações', '9 metros', 'S, V', 'Varies', 'Você envia a mente e o corpo do alvo para o esgotamento, forçando-o a ficar inquieto e hiperativo. Durante a duração, o alvo deve caminhar pelo menos uma vez a cada turno ou sofrer 2d8 de dano mental nesse turno. A duração desse efeito depende do teste de salvamento de Vontade do alvo.

Sucesso Crítico A magia não tem efeito.
Sucesso A duração é de 1 rodada.
Falha A duração é de 2 rodadas.
 Falha Crítica A duração é de 4 rodadas.

---

Elevada (+1) O dano aumenta em 2d8.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Bolha de Ar', 1, '', 'reação', '18 metros', '', '1 minuto', 'Uma bolha de ar puro aparece ao redor da cabeça do alvo, permitindo-lhe respirar normalmente. O efeito se encerra assim que o alvo retornar a um ambiente onde é capaz de respirar normalmente.', false),
  (null, 'pathfinder', 'Alarme', 1, '', '10 minutos', 'Toque', '', '8 horas', 'Você protege uma área com um alarme que o alerta quando criaturas entrarem nela sem sua permissão. Quando conjurar alarme, selecione uma senha. Sempre que uma criatura corpórea Pequena ou maior entrar na área da magia sem falar a senha, alarme envia um alerta mental (quando a magia adquire o traço mental) ou emite um alarme audível com o som e volume de um sino de mão (quando a magia adquire o traço auditivo) à sua escolha. Ambas as opções lhe acordam automaticamente, e o sino permite todas as criaturas na área fazerem um teste de Percepção CD 15 para acordar. Uma criatura ciente do alarme deve obter sucesso em um teste de Furtividade contra a CD da magia ou ela aciona a magia quando mover-se para dentro da área.

---

Elevada (3º) Você pode especificar critérios para quais criaturas fazem o alarme soar — por exemplo, orcs ou pessoas mascaradas.', false),
  (null, 'pathfinder', 'Carga de Formiga', 1, '', '2 ações', 'Toque', '', '8 horas', 'Você reforça o sistema músculo-esquelético do alvo para suportar mais peso. O alvo pode carregar 3 Volumes a mais do que o normal antes de ficar Sobrecarregado e até um máximo de 6 Volumes a mais.', false),
  (null, 'pathfinder', 'Antecipar Perigo', 1, 'Adivinhação', '2 ações', '9 metros', 'S, V', '10 minutos', 'Você concede uma breve previsão ao alvo. O alvo ganha um bônus de status +1 na sua próxima jogada de iniciativa, até que a magia termine.

---

Elevada (+2) O bônus de status aumenta em 1, para um máximo de +4 no 7º nível.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Ruína', 1, '', '2 ações', '', '', '1 minuto', 'Você inunda a mente de seus inimigos com dúvida. Alvos que falharem em seus salvamentos de Vontade sofrem –1 de penalidade de estado em rolagens de ataque enquanto estiverem na área. Uma vez por turno, a partir do turno subsequente ao que conjurar ruína, você pode usar uma ação única que possui o traço concentração para aumentar o raio da emanação em 1,5 metros e forçar inimigos na área que não tenham sido afetados a tentarem outra jogada de salvamento. Ruína pode neutralizar benção.', false),
  (null, 'pathfinder', 'Confundir', 1, 'Encantamento', '2 ações', '9 metros', 'S, V', '1 rodada', 'Você semeia confusão na mente do seu alvo, fazendo com que suas ações e pensamentos se tornem desajeitados.

 Sucesso Crítico O alvo não é afetado.
Sucesso O alvo fica Desajeitado 1 e Estupefato 1.
Falha O alvo fica Desajeitado 2 e Estupefato 2.
 Falha Crítica O alvo fica Desajeitado 3, Estupefato 3, e Confuso.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Benção', 1, '', '2 ações', '', '', '1 minuto', 'Benções do além ajudam seus companheiros a golpearem certeiramente. Você e seus aliados na área recebem +1 de bônus de estado em rolagens de ataque. Uma vez por turno, a partir do turno subsequente ao que você conjurar benção, você pode usar uma ação única que possui o traço concentração para aumentar o raio da emanação em 1,5 metros. Benção pode neutralizar ruína.', false),
  (null, 'pathfinder', 'Mãos Flamejantes', 1, '', '2 ações', '', '', 'Instantânea', 'Chamas jorram de suas mãos. Você causa 2d6 de dano de fogo às criaturas na área.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Cativar', 1, '', '2 ações', '9 metros', '', '1 hora', 'Para o alvo, suas palavras são doces e sua aparência parece banhada em um nevoeiro onírico. Ele deve tentar um salvamento de Vontade, recebendo +4 de bônus de circunstância se você ou seus aliados o tiverem ameaçado recentemente ou usado ações hostis contra ele.

Você pode Dispensar esta magia. Se usar ações hostis contra o alvo, a magia é encerrada. Quando a magia acabar, o alvo não necessariamente percebe que foi cativado a menos que a amizade dele com você ou as ações que você o convenceu a tomar contrariem as expectativas dele, significando que você poderia potencialmente convencê-lo a continuar sendo seu amigo através de meios mundanos.

---

Sucesso Crítico O alvo não é afetado e fica ciente de que você tentou cativá-lo.

Sucesso O alvo não é afetado, mas pensa que sua magia foi alguma outra coisa inofensiva em vez de cativar, a não ser que ele identifique a magia (normalmente identificando magias; veja a página 305).

Falha A atitude do alvo se torna Amistosa em relação a você. Se ele já fosse Amistoso, ele fica Prestativo. Ele não pode usar ações hostis contra você.

Falha Crítica A atitude do alvo se torna Prestativo em relação a você e ele não pode usar ações hostis contra você.

---

Elevada (+4) A duração permanece até a próxima vez que você fizer suas preparações diárias.

Elevada (+8) A duração permanece até a próxima vez que você fizer suas preparações diárias e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Borrifo Arrepiante', 1, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Um cone de cacos de gelo explode em suas mãos estendidas e reveste o alvo em uma camada de gelo. Você causa 2d4 de dano de frio a criaturas na área; cada um deles deve tentar salvamento de Reflexo.

 Sucesso Crítico A criatura não sofre dano.
Sucesso A criatura sofre metade do dano.
Falha A criatura sofre dano total e recebe uma penalidade de status de -1,5 metros nas suas Velocidades por 2 rodadas.
 Falha Crítica A criatura sofre o dobro de dano e recebe uma penalidade de status de -3 metro nas suas Velocidades por 2 rodadas.

---

Elevada (+1) O dano aumenta em 2d4.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Purificar Comida e Bebida', 1, '', '2 ações', '3 metros', '', 'Instantânea', 'Você remove toxinas e contaminações de comida e bebida, tornando-as seguras para o consumo. Esta magia não impede contaminação futura, apodrecimento natural ou deterioração.', false),
  (null, 'pathfinder', 'Comando', 1, '', '2 ações', '9 metros', '', 'Until the end of the target''s next turn', 'Você emite um comando que é difícil de ignorar. Você pode comandar o alvo a se aproximar de você, correr (como se tivesse a condição fugindo), soltar o que estiver segurando, prostado ou levantar-se. Ele não pode Adiar ou usar quaisquer reações até ter obedecido ao seu comando. Os efeitos dependem do salvamento de Vontade do alvo.

---
Sucesso  A criatura não é afetada.

Falha  Como a primeira ação no turno dela, a criatura deve usar uma ação única para obedecer ao seu comando.

Falha Crítica  O alvo deve usar todas as ações no turno dele para obedecer ao seu comando.

---
Elevada (5º)  Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Criar Água', 1, '', '2 ações', '0 metros', '', 'Instantânea', 'Enquanto você junta suas mãos, água começa a jorrar delas. Você cria 8 litros de água. Se ninguém a beber, ela evapora após 1 dia.', false),
  (null, 'pathfinder', 'Detectar Tendência ', 1, 'Adivinhação', '2 ações', '', 'S, V', 'Instantânea', 'Seus olhos brilham enquanto você sente as tendências das auras. Escolha bem, caos, mal ou ordem. Você detecta auras dessa tendência. Você não recebe informações além da presença ou ausência dessa tendência. Você pode escolher não detectar criaturas ou efeitos dos quais tenha ciência de que possuem essa tendência.

 Somente criaturas de 6º nível ou superior — exceto conjuradores divinos, mortos-vivos e seres da Esfera Externa — possuem auras de tendência.

---

 Elevada (2º) Você descobre a localização e força de cada aura.', false),
  (null, 'pathfinder', 'Detectar Veneno', 1, '', '2 ações', '9 metros', '', 'Instantânea', 'Você detecta se uma criatura é venenosa ou peçonhenta ou se um objeto é venenoso ou se está envenenado. Você não tem certeza se o alvo é venenoso de várias formas nem descobre o tipo ou tipos de veneno. Certas substâncias, como chumbo e álcool, são venenos e, portanto, mascaram outros venenos. 

---

Elevada (2º) Você descobre a quantidade e tipos de veneno.', false),
  (null, 'pathfinder', 'Aura Mágica', 1, 'Ilusão', '1 minuto', '9 metros', '', 'Until your next daily preparations', 'Você altera a aparência da aura mágica de um item. Você pode fazer com que a aura do alvo aparente ser a de um item mágico comum do dobro do nível de aura mágica ou inferior, ou fazê-lo parecer estar sob os efeitos de uma magia à sua escolha do nível de Aura Mágica ou inferior. Se o alvo for mágico, você pode fazê-lo parecer inteiramente não-mágico.

Um conjurador usando detectar magia ou ler aura de um nível de magia igual ou superior pode tentar desacreditar a ilusão de aura mágica. Aura Mágica não mascara a aura de magias que sejam de 9º nível ou superior ou de itens que sejam de 19º nível ou superior.

---

Elevada (3º) Você pode afetar uma criatura em vez de um objeto. Quando o fizer, você pode ocultar as auras de todos os itens mágicos que tiver ou fazer a aura da criatura parecer como se estivesse sob o efeito de uma magia que você conhece.', false),
  (null, 'pathfinder', 'Leque de Cores', 1, 'Ilusão', '2 ações', '', '', '1 or more rodadas (see below)', 'Cores rodopiam pelo ar e afetam observadores de acordo com seus salvamentos de Vontade.

---
Sucesso Crítico   A criatura não é afetada.

Sucesso  A criatura fica ofuscado por 1 rodada..

Falha  A criatura fica atordoado 1, cego por 1 rodada e ofuscado por 1 minuto.

Falha Crítica  A criatura fica atordoado por 1 rodada e cego por 1 minuto.', false),
  (null, 'pathfinder', 'Suportar', 1, 'Encantamento', '1 ação', 'Toque', 'S', '1 rodada', 'Você envigora a mente da criatura tocada e a impulsiona a suportar mais. Concede a criatura tocada 5 Pontos de Vida temporários.

---

Elevada (+1) Aumenta os Pontos de Vida temporários em 5.', false),
  (null, 'pathfinder', 'Raio de Enfraquecimento', 1, '', '2 ações', '9 metros', '', 'Varies', 'Um raio com o poder de exaurir a força de um adversário sai de sua mão. Faça um ataque de magia à distância contra o alvo. Se você obtiver sucesso, o alvo tenta um salvamento de Fortitude para determinar o efeito da magia. Se obtiver sucesso crítico em sua rolagem de ataque, use o resultado para um grau de sucesso pior que o resultado do salvamento do alvo.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica enfraquecido 1.

Falha  O alvo fica enfraquecido 2.

Falha Crítica  O alvo fica enfraquecido 3.', false),
  (null, 'pathfinder', 'Trocar Imagem', 1, 'Ilusão', '2 ações', 'Toque', 'S, V', 'Varies', 'Para enganar os perseguidores, o Lacunafex desenvolveu os meios para trocar visões. Você troca aparências com o alvo, com os efeitos dependendo do resultado do teste de resistência de Vontade do alvo. Alvos dispostos e inconscientes obtêm automaticamente falha critica no teste.

Sucesso Crítico Sem efeito.
Sucesso Você assume a aparência do alvo, e eles assumem a sua. Isso tem os mesmos efeitos que a magia disfarce ilusório de 1° nível, exceto que o alvo não pode Dispensar o disfarce. A duração é de 1 minuto ou até Dispensado.
Falha Como sucesso, mas a duração é de 1 hora ou até Dispensado.
Falha Crítica Como sucesso, mas a duração é de 24 horas. 

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Medo', 1, '', '2 ações', '9 metros', '', 'Varies', 'Você planta medo no alvo e ele deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica assustado 1.

Falha  O alvo fica assustado 2.

Falha Crítica  O alvo fica assustado 3 e fugindo por 1 rodada.

---
Elevada (3º)  Você pode afetar até cinco criaturas.', false),
  (null, 'pathfinder', 'Passos Velozes', 1, '', '2 ações', '', '', '1 minuto', 'Você alonga seus passos além do que seria possível. Você recebe +3 metros de bônus de estado em sua Velocidade.', false),
  (null, 'pathfinder', 'Disco Flutuante', 1, 'Conjuração', '2 ações', '', 'S, V', '8 horas', 'Um disco de força mágica se materializa adjacente a você. Este disco mede 60 centímetros de diâmetro e o segue a 1,5 metros de distância, flutuando pouco acima do solo. Ele suporta até 5 Volumes de objetos (embora eles devam ser capazes de caber e se equilibrar sobre a superfície do disco). Quaisquer objetos sobre o disco caem no chão quando a magia acaba.

A magia acaba se uma criatura tentar subir no disco, se ele for sobrecarregado, se alguém tentar erguer ou forçar o disco acima do chão ou se você se mover a mais de 9 metros de distância do disco.', false),
  (null, 'pathfinder', 'Mísseis Mágicos', 1, '', '1 ação', '36 metros', '', 'Instantânea', 'Você lança um míssil de força em direção a uma criatura em sua visão. Ele acerta automaticamente e causa 1d4+1 de dano de força. Para cada ação adicional que você usar para Conjurar esta Magia, aumente a quantidade de mísseis disparados em um, até um máximo de três mísseis para 3 ações. Você escolhe o alvo para cada míssil individualmente. Se você disparar mais de um míssil no mesmo alvo, combine o dano antes de aplicar bônus ou penalidades ao dano, resistências, fraquezas e assim por diante.

---

Elevada (+2) Você dispara um míssil adicional com cada ação que gastar.', false),
  (null, 'pathfinder', 'Queda Suave', 1, '', 'reação', '18 metros', '', '1 minuto', 'Trigger: Uma criatura na distância está caindo.

---

Você faz o próprio ar atenuar uma queda. A queda do alvo desacelera para 18 metros por rodada e a parte caída durante a duração da magia não conta para calcular o dano de queda. Se o alvo alcançar o chão enquanto esta magia estiver em efeito, ele não sofre dano da queda. A magia acaba assim que o alvo aterrissar.', false),
  (null, 'pathfinder', 'Varíola Goblin', 1, '', '2 ações', 'Toque', '', 'Instantânea', 'Seu toque aflige o alvo com varíola goblin, uma coceira alergênica irritante. O alvo deve tentar um salvamento de Fortitude.

---

Varíola Goblin (doença); Level 1. Goblins e cães goblin são imunes. Estágio 1 enjoado 1 (1 rodada); Estágio 2 enjoado 1 and lento 1 (1 rodada); Estágio3 enjoado e a criatura não pode ter o valor de enjoado  reduzido abaixo de 1 (1 dia)

---

Successo Crítico O alvo não é afetado.
SuccessoO alvo fica enjoado 1.
FalhaO alvo é afligido com varíola goblin no estágio 1.
Falha Críticaalvo é afligido com varíola goblin no estágio 2.', false),
  (null, 'pathfinder', 'Lubrificar', 1, '', '2 ações', '9 metros', '', '1 minuto', 'Você conjura um lubrificante com efeitos baseados na escolha de área ou alvo.

Área [4 quadrados contíguos de 1,5 metros] Todo o chão sólido na área é coberto com lubrificante. Cada criatura de pé na superfície lubrificada deve obter sucesso em um salvamento de Reflexos ou em um teste de Acrobatismo contra sua CD de magia ou cai Prone. Criaturas usando uma ação para se mover na superfície lubrificada durante a duração da magia devem tentar um salvamento de Reflexos ou um teste de Acrobatismo para Equilibrar-se. Uma criatura que Der um Passo ou Rastejar não precisa fazer um teste ou salvamento
Alvo [1 objeto de Volume 1 ou menor] Se você conjurar a magia em um objeto desapossado, qualquer um que tentar pegá-lo deve obter sucesso em um teste de Acrobatismo ou em um salvamento de Reflexos contra sua CD de magia para fazê-lo. Se você mirar um objeto apossado, a criatura que possuir o objeto deve fazer um teste de Acrobatismo ou um salvamento de Reflexos. Em uma falha, o portador ou empunhador sofre –2 de penalidade de circunstância em todos os testes que envolverem usar o objeto; em uma falha crítica, o portador ou empunhador solta o item. O objeto cai em um quadrado adjacente à escolha do MJ. Se você conjurar esta magia em um objeto vestido, o portador recebe +2 de bônus de circunstância em salvamentos de Fortitude contra tentativas de agarrá-lo.', false),
  (null, 'pathfinder', 'Gavinhas Sombrias', 1, '', '2 ações', '', '', 'Instantânea', 'Gavinhas de escuridão se contorcem a partir das pontas de seusdedos e correm pelo ar. Você causa 2d4 de dano negativo e 1 de dano persistente de sangramento a criaturas vivas na linha. Cada criatura viva na linha deve tentar um salvamento de Fortitude.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre metade do dano negativo e nenhum dano persistente de sangramento.

Falha  A criatura sofre o dano inteiro.

Falha Crítica  A criatura sofre o dobro do dano negativo e o dobro do dano persistente de sangramento.

---
Elevada (+1)  O dano negativo aumenta em 2d4 e o dano persistente de sangramento aumenta em 1.', false),
  (null, 'pathfinder', 'Lufada de Vento', 1, '', '2 ações', '', '', 'Until the start of your next turn', 'Um vento violento surge da palma de sua mão, soprando do ponto onde você está quando conjura a magia até o lado oposto da linha. O vento extingue qualquer fogo não-mágico, dispersa névoa e bruma, sopra objetos de Volume leve ou menor e empurra objetos maiores. Criaturas Grandes ou menores na área devem tentar um salvamento de Fortitude. Criaturas Grandes ou menores que se moverem para dentro da lufada devem tentar um salvamento assim que o fizerem.
Sucesso Crítico A criatura não é afetada.
Sucesso A criatura não pode mover-se contra o vento.
Falha A criatura é derrubada prostrado. Se estiver voando, ela sofre os efeitos de falha crítica.
Falha Crítica A criatura é empurrada 9 metros na direção do vento, é derrubada prostrado e sofre 2d6 de dano contundente.', false),
  (null, 'pathfinder', 'Ferir', 1, '', '1 ação', 'varies', '', 'Instantânea', 'Você canaliza energia negativa para ferir os vivos ou curar os mortos-vivos. Se o alvo for uma criatura viva, você causa 1d8 de dano negativo a ele, que deve tentar um salvamento básico de Fortitude. Se o alvo for uma criatura morta-viva voluntária, você restaura essa quantidade aos Pontos de Vida dele. A quantidade de ações que você gasta para Conjurar esta Magia determina seus alvos, distância, área e outros parâmetros.

1 Ação (somático) A magia possui uma distância de toque.

2 Ações (verbal, somático) A magia possui uma distância de 9 metros. Se você estiver curando uma criatura morta-viva, aumente os Pontos de Vida restaurados em 8.

3 Ações (material, verbal, somático) Você dispersa energia negativa em uma emanação de 9 metros. Isto afeta todas as criaturas vivas e mortas-vivas na área.

---

Elevada (+1) A quantidade de cura ou dano aumenta em 1d8, e a cura extra para a versão de duas ações aumenta em 8.', false),
  (null, 'pathfinder', 'Curar', 1, '', '1 ação', 'varies', '', 'Instantânea', 'Você canaliza energia positiva para curar os vivos ou ferir os mortos-vivos. Se o alvo for uma criatura viva voluntária, você restaura 1d8 dos Pontos de Vida dele. Se o alvo for uma criatura morta-viva, você causa essa quantidade de dano positivo a ele, que deve tentar um salvamento básico de Fortitude. A quantidade de ações que você gasta para Conjurar esta Magia determina seus alvos, distância, área e outros parâmetros.

1 Ação (somático) A magia possui uma distância de toque.

2 Ações  (verbal, somático) A magia possui uma distância de 9 metros. Se você estiver curando uma criatura viva, aumente os Pontos de Vida restaurados em 8

3 Ações (material, somático, verbal) Você dispersa energia positiva em uma emanação de 9 metros. Isto afeta todas as criaturas vivas e mortas-vivas na área.

---

Elevado (+1) A quantidade de cura ou dano aumenta em 1d8, e a cura extra para a versão de duas ações aumenta em 8.', false),
  (null, 'pathfinder', 'Empurrão Hidráulico', 1, '', '2 ações', '18 metros', '', 'Instantânea', 'Você invoca uma rajada poderosa de água pressurizada que machuca o alvo e o empurra para trás. Faça uma rolagem de ataque de magia à distância.
Sucesso Crítico O alvo sofre 6d6 de dano contundente e é empurrado 3 metros para trás.
Sucesso O alvo sofre 3d6 de dano contundente e é empurrado 1,5 metros para trás.
Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Mau Agouro', 1, '', '2 ações', '9 metros', '', '1 rodada', 'O alvo é atingido pela desgraça, o que o desequilibra. O alvo deve fazer um teste de Vontade.

Sucesso O alvo não é afetado.
Falha Na primeira vez em que o alvo realizar uma jogada de ataque ou teste de pericia, ele deve rolar duas vezes e obter o pior resultado.
Falha Crítica Toda vez, pela duração, que o alvo realizar uma jogada de ataque ou teste de pericia, ele deve rolar duas vezes e obter o pior resultado. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Disfarce Ilusório', 1, 'Ilusão', '2 ações', '', 'S, V', '1 hora', 'Você cria uma ilusão que faz você parecer outra criatura do mesmo formato corporal e com altura e peso mais ou menos similares aos seus (até um máximo de 15 centímetros e 25 quilos de diferença). O disfarce normalmente é bom o suficiente para esconder sua identidade, mas não para personificar um indivíduo específico. A magia não muda sua voz, odor ou maneirismos. Você pode mudar a aparência de suas roupas e itens vestidos, como fazer sua armadura parecer um vestido. Itens segurados não são afetados, e qualquer item vestido que você remover retorna à aparência real dele.

Conjurar disfarce ilusório cria um disfarce para o uso de Dissimulação para Personificar; ela ignora qualquer penalidade de circunstância sofrida por disfarçar-se como uma criatura diferente, concedendo +4 de bônus de estado em testes de Dissimulação para impedir os outros de perceberem seu disfarce e permite que você adicione seu nível ao teste mesmo se for destreinado. Você pode Dispensar esta magia.

---

Elevada (2º)traço A magia também disfarça sua voz e cheiro, além de receber o traço auditivo.

Elevada (3º) Você pode parecer qualquer criatura do mesmo tamanho, mesmo que seja um indivíduo específico. Você deve ter visto um indivíduo para assumir a aparência dele. A magia também disfarça sua voz e odor, além de receber o traço auditivo', false),
  (null, 'pathfinder', 'Disfarce Ilusório', 1, 'Ilusão', '2 ações', '9 metros', '', '1 hora', 'Você cria uma ilusão que faz você parecer outra criatura do mesmo formato corporal e com altura e peso mais ou menos similares aos seus (até um máximo de 15 centímetros e 25 quilos de diferença). O disfarce normalmente é bom o suficiente para esconder sua identidade, mas não para personificar um indivíduo específico. A magia não muda sua voz, odor ou maneirismos. Você pode mudar a aparência de suas roupas e itens vestidos, como fazer sua armadura parecer um vestido. Itens segurados não são afetados, e qualquer item vestido que você remover retorna à aparência real dele.

Conjurar disfarce ilusório cria um disfarce para o uso de Dissimulação para Personificar; ela ignora qualquer penalidade de circunstância sofrida por disfarçar-se como uma criatura diferente, concedendo +4 de bônus de estado em testes de Dissimulação para impedir os outros de perceberem seu disfarce e permite que você adicione seu nível ao teste mesmo se for destreinado. Você pode Dispensar esta magia.

---

Elevada (2º)traço A magia também disfarça sua voz e cheiro, além de receber o traço auditivo.

Elevada (3º) Você pode parecer qualquer criatura do mesmo tamanho, mesmo que seja um indivíduo específico. Você deve ter visto um indivíduo para assumir a aparência dele. A magia também disfarça sua voz e odor, além de receber o traço auditivo', false),
  (null, 'pathfinder', 'Objeto Ilusório', 1, 'Ilusão', '2 ações', '150 metros', '', '10 minutos', 'Você cria uma imagem visual ilusória de um objeto estacionário. A imagem inteira deve caber dentro da área da magia. O objeto parece ser animado naturalmente, mas não faz sons ou gera cheiros. Por exemplo, uma cachoeira ilusória pode jorrar água, mas seria silenciosa. 

Qualquer criatura que tocar a imagem ou usar a ação Buscar para examiná-la pode tentar desacreditar sua ilusão.

---

Elevada (2º) Sua imagem emite os sons apropriados, gera cheiros normais e parece normal ao toque. A magia recebe o traço auditivo. A duração aumenta para 1 hora.

Elevada (3º) Como a versão de 2º nível, mas a duração é ilimitada.', false),
  (null, 'pathfinder', 'Gravar Mensagem', 1, 'Adivinhação', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você projeta vibrações psíquicas no objeto alvo, gravando uma mensagem curta ou um tema emocional de sua escolha. A sensação gravada é revelada a qualquer criatura que conjurar ler objeto (veja abaixo) no alvo, e substitui quaisquer eventos emocionais em que o item estava presente. Se o objeto estiver na área de uma magia retrocognição, a mensagem gravada aparece como um evento maior na linha do tempo, mas não interfere com outras visões.
Se o objeto for alvo de ler aura com um nível de magia mais elevado que gravar mensagem, o conjurador descobre que o objeto foi modificado. Quando você Conjurar esta Magia, quaisquer vibrações prévias gravadas em um objeto com conjurações anteriores de gravar mensagem desaparecem.', false),
  (null, 'pathfinder', 'Armas de Disrupção', 1, '', '1 ação', '9 metros', '', '1 minuto', 'Você infunde armas com energia positiva. Ataques com estas armas causam 1d4 de dano positivo extra a mortos-vivos.

---

Elevada (3º) O dano aumenta para 2d4.

Elevada (5º) Mire até três armas e o dano aumenta para 3d4.', false),
  (null, 'pathfinder', 'Item de Fachada', 1, 'Ilusão', '2 ações', 'Toque', '', '1 hora', 'Você faz o objeto alvo parecer e ser percebido por todos os sentidos como se estivesse em uma condição física muito melhor ou pior. Quando conjurar esta magia, decida se pretende fazer o item parecer decrépito ou perfeito. Um item com aparência decrépita parece quebrado e de má qualidade. Um item com aparência perfeita parece novíssimo e bastante polido ou bem mantido. Um item quebrado parece estar intacto e funcional. Itens destruídos não podem ser afetados por esta magia. Uma criatura que Interagir com o item pode tentar desacreditar a ilusão.

---

Elevada (2º) A duração é de 24 horas.

Elevada (3°) A duração é ilimitada.', false),
  (null, 'pathfinder', 'Salto', 1, '', '1 ação', '', '', 'Instantânea', 'Suas pernas recebem um surto de força, ficando prontas para saltar alto e longe. Você salta 9 metros em qualquer direção sem tocar o chão. Você deve aterrissar em um espaço de chão sólido a até 9 metros de distância ou então cai após usar sua próxima ação.

---

Elevada (3º) A distância se torna toque, o alvo muda para uma criatura tocada e a duração se torna 1 minuto, permitindo ao alvo saltar conforme a descrição sempre que usar a ação Saltar.', false),
  (null, 'pathfinder', 'Comando Libertador', 1, 'Encantamento', '1 ação', '18 metros', 'V', 'Instantânea', 'Você clama um grito libertador, exortando um aliado a se libertar de um efeito que os mantenha no lugar. Se o alvo está agarrado, imobilizado, ou restringido, pode usar imediatamente uma reação para tentar Escapar. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Trancar', 1, '', '2 ações', 'Toque', '', 'Until your next daily preparations', 'O mecanismo de tranca do alvo fica travado, mantido preso por restrições mágicas invisíveis. Quando trancar um alvo magicamente, você torna a CD de Atletismo e Ladroagem para abrí-lo igual à sua CD de magia ou a CD base da tranca com +4 de bônus de estado, o que for maior. Qualquer chave ou combinação capaz de abrir uma tranca afetada por esta magia fica incapaz de abri-la pela duração da magia, embora a chave ou combinação conceda +4 de bônus de circunstância em testes para abrir a porta.

Se o alvo for aberto, a magia é encerrada. Assumindo que o alvo não esteja barrado ou trancado de alguma forma adicional, você pode destrancá-lo e abri-lo com uma ação de Interagir em que toca o alvo. Fazer isto não encerra a magia. Você pode Dispensar esta magia a qualquer momento e a qualquer distância.

---

Elevada (2º) A duração aumenta para ilimitada, mas você deve gastar pó de ouro no valor de 6 po como custo adicional.', false),
  (null, 'pathfinder', 'Aura Mágica', 1, 'Ilusão', '1 minuto', 'Toque', 'S, V, M', 'Until the next time you make your daily preparations', 'Você altera a aparência da aura mágica de um item. Você pode fazer com que a aura do alvo aparente ser a de um item mágico comum do dobro do nível de aura mágica ou inferior, ou fazê-lo parecer estar sob os efeitos de uma magia à sua escolha do nível de Aura Mágica ou inferior. Se o alvo for mágico, você pode fazê-lo parecer inteiramente não-mágico.

Um conjurador usando detectar magia ou ler aura de um nível de magia igual ou superior pode tentar desacreditar a ilusão de aura mágica. Aura Mágica não mascara a aura de magias que sejam de 9º nível ou superior ou de itens que sejam de 19º nível ou superior.

---

Elevada (3º) Você pode afetar uma criatura em vez de um objeto. Quando o fizer, você pode ocultar as auras de todos os itens mágicos que tiver ou fazer a aura da criatura parecer como se estivesse sob o efeito de uma magia que você conhece.', false),
  (null, 'pathfinder', 'Emendar', 1, '', '10 minutos', 'Toque', '', 'Instantânea', 'Você repara o item alvo. Você restaura 5 Pontos de Vida por nível da magia ao alvo, potencialmente removendo a condição Broken se este reparo superar o Limiar de Broken do item. Você não pode substituir peças perdidas ou reparar um objeto que tenha sido completamente destruído.

---

Elevada (2º) Você pode afetar um objeto não-mágico de Volume 1 ou menor.

Heightened (3º)Você pode afetar um objeto não-mágico de Volume 2 ou menor, ou um objeto mágico de Volume 1 ou menor.', false),
  (null, 'pathfinder', 'Mensagem Rúnica', 1, 'Adivinhação', '5 minutos', 'Toque', 'S, V, M', '1 dia', 'Você grava uma mensagem com duração de até 5 minutos e inscreve uma runa especial em qualquer superfície plana ao seu alcance. A natureza da aparência da runa depende de você, mas é visível para todos e não deve ser inferior a 2 polegadas de diâmetro. Você também especifica um acionamento que criaturas devem encontrar para ativar a runa. Pela duração da magia, as criaturas que atendem aos critérios do gatilho podem tocar a runa para ouvir a mensagem gravada em sua cabeça, como se você estivesse falando com eles telepaticamente. Você sabe quando alguém está ouvindo a mensagem, mas você não sabe quem está ouvindo. Você pode Dispensar a magia. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Vínculo Mental', 1, '', '2 ações', 'Toque', '', 'Instantânea', 'Você vincula sua mente à mente do alvo e transmite mentalmente para ele, em instantes, uma quantidade de informações que poderia ser transmitida por outros meios em 10 minutos.', false),
  (null, 'pathfinder', 'Armadura Mística', 1, '', '2 ações', '', '', 'Until your next daily preparations', 'Você se protege com energia mágica cintilante, recebendo +1 de bônus de item na CA e um limite máximo de Destreza de +5. Enquanto usar armadura mística, você utiliza sua proficiência sem armadura para calcular sua CA.

---

Elevada (4º) Você recebe +1 de bônus de item em jogadas de salvamento.

Elevada (6º) O bônus de item na CA aumenta para +2 e você recebe +1 de bônus de item em jogadas de salvamento.

Elevada (8º) O bônus de item na CA aumenta para +2 e você recebe +2 de bônus de item em jogadas de salvamento.

Elevada (10º) bônus de item na CA aumenta para +3 e você recebe +3 de bônus de item em jogadas de salvamento.', false),
  (null, 'pathfinder', 'Anular Aroma', 1, 'Abjuração', '2 ações', 'Toque', 'S, V', '1 hora', 'O alvo perde o odor dele, impedindo criaturas de perceber passivamente a presença dele através do olfato, mesmo se possuírem faro preciso ou impreciso. Uma criatura que fizer um teste de Percepção para Buscar com olfato e outros sentidos pode perceber a falta de odor natural. Se o alvo possuir quaisquer habilidades que dependam do odor dele, como um cheiro avassalador, essas habilidades também são anuladas.

---

Elevada (5º) A distância aumenta para 9 metros e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Ler Objeto', 1, 'Adivinhação', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você coloca a mão em um objeto para descobrir uma informação sobre um evento emocional que ocorreu envolvendo o objeto dentro da última semana, conforme determinado pelo MJ. Se conjurar ler objeto no mesmo item novamente, você pode se concentrar em um único evento e obter informações adicionais sobre ele ou receber uma informação sobre outro evento emocional no intervalo de tempo aplicável. 

---

Elevada (2º) Você pode descobrir algo sobre um evento que ocorreu dentro do último mês.
Elevada (4º) Você pode descobrir algo sobre um evento que ocorreu dentro do último ano.
Elevada (6º) Você pode descobrir algo sobre um evento que ocorreu dentro da última década.
Elevada (8º) Você pode descobrir algo sobre um evento que ocorreu dentro do último século.
Elevada (9º) Você pode descobrir algo sobre um evento que ocorreu dentro de toda a história do objeto.', false),
  (null, 'pathfinder', 'Mortalha Penumbral', 1, 'Evocação', '2 ações', '9 metros', 'S, V', '10 minutos', 'Você envolve o alvo em uma mortalha de sombra. O alvo percebe a luz como um passo mais baixo do que realmente é (luz brilhante torna-se luz fraca, por exemplo), afetando sua capacidade de detectar criaturas e objetos de acordo. A mortalha também fornece ao alvo um bônus de status +1 em testes de resistência contra efeitos de luz. Embora esse efeito seja útil para criaturas sensíveis à luz, se a criatura não estiver disposta, ela pode fazer um teste de Reflexo para evitar a mortalha e reduzir o efeito.

Sucesso Crítico O alvo não é afetado.
Sucesso O efeito dura 1 rodada.
Falha O efeito dura sua duração normal. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Nuvem Pessoal de Chuva', 1, 'Evocação', '2 ações', '18 metros', 'S, V', '1 minuto', 'Você conjura uma nuvem de chuva de 1,5 metro de largura que segue o alvo por onde passa. Ela fica mais ou menos no comprimento de um braço, a menos que precise descer mais para caber sob o teto. A nuvem chove constantemente no alvo, mantendo-o molhado e umedecendo o chão após qualquer movimento. A chuva apaga chamas não mágicas. O alvo ganha resistência ao fogo 2. As criaturas com fraqueza na água recebem dano igual à sua fraqueza no final de cada turno. As criaturas podem fazer um teste de  Reflexo para evitar a nuvem.

---

Elevada (+1) A quantidade de resistência ao fogo aumenta em 2. 

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Forma de Peste', 1, '', '2 ações', '', '', '10 minutos', 'Você se transforma na forma de batalha de um animal Minúsculo. Quando conjurar esta magia, escolha felino, inseto, lagarto ou rato. Você pode decidir o tipo específico de animal (como rato ou louvaa-deus), mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire o traço animal.

Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir:

CA = 15 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
Velocidade 3 metros.
Fraqueza 5 a dano físico. (Se sofrer dano físico nesta forma, você sofre 5 de dano adicional.)
Visão na penumbra e faro impreciso (9 metros).
+10 de modificador de Acrobatismo e Furtividade, exceto se o seu próprio modificador for maior; –4 de modificador de Atletismo.

---

Elevado (4º) Você pode se transformar em uma criatura voadora, como um pássaro, o que lhe concede uma Velocidade de voo de 6 metros.', false),
  (null, 'pathfinder', 'Servo Invisível', 1, '', '3 ações', '18 metros', '', 'Sustentada', 'Você convoca um servo invisível, que pode ser comandado como parte de Sustentar a Magia. Ele o serve até os Pontos de Vida dele serem reduzidos a 0, momento em que a magia é encerrada, ou até você parar de Sustentar a Magia. O servo invisível adquire o traço convocado.

Servo Invisível [Criatura] [-1] [Sem Alinhamento] [Médio]

---

CA 13, Fort +0, Ref +4, Von +0 HP 4;

Imunidades doenças, mental, ataques não-mágicos, paralisia, veneno, precisão, inconsciente;

Resistências todo dano 5 (exceto força ou toque fantasma)

Velocidade voo 9 metros

Corpo de Força O corpo físico de um servo invisível é feito de força. Ele não pode usar ações de ataque. Ele pode mover e usar ações de Interagir para fazer coisas como carregar objetos, abrir portas destravadas ou destrancadas, segurar cadeiras e limpar. Ele não pode atravessar objetos sólidos.', false),
  (null, 'pathfinder', 'Dor Fantasma', 1, 'Ilusão', '2 ações', '9 metros', '', '1 minuto', 'Dor ilusória destrói o alvo, causando 2d4 de dano mental e 1d4 de dano persistente mental. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Successo O alvo sofre o dano inicial total, mas não sofre Persistent Damage,e a magia é encerrada imediatamente.

Falha  O alvo sofre o dano inicial total e o Persistent Damage,total, além de ficar Sickened 1. Se o alvo se recuperar de Sickened, o Persistent Damage acaba e a magia é encerrada.

Falha Crítica Como falha, mas o alvo fica Sickened 2.

---

Elevada (+1) O dano aumenta em 2d4 e o  Persistent Damage em 1d4.', false),
  (null, 'pathfinder', 'Proteção', 1, '', '2 ações', 'Toque', '', '1 minuto', 'Você protege uma criatura contra uma tendência específica. Escolha bem, caos, mal ou ordem quando conjurar esta magia. O alvo recebe +1 de bônus de estado na CA e em jogadas de salvamento contra criaturas e efeitos da tendência escolhida. Este bônus aumenta para +3 contra efeitos dessas criaturas que controlariam o alvo diretamente e contra ataques feitos por criaturas convocadas da tendência escolhida.

Esta magia adquire o traço oposto à tendência escolhida — se escolher caos, esta magia adquire o traço ordeiro, e vice-versa; se escolher mal, esta magia adquire o traço bem, e vice-versa.', false),
  (null, 'pathfinder', 'Presa Mágica', 1, '', '2 ações', 'Toque', '', '1 minuto', 'Escolha um dos ataques desarmados do alvo que cause apenas um dado de dano. Você pode fazer esse ataque desarmado brilhar com energia primal. O ataque desarmado se torna um ataque desarmado +1 impactante, recebendo +1 de bônus de item em rolagens de ataque e aumentando a quantidade de dados de dano para dois dados (se ele só causava um dado de dano).', false),
  (null, 'pathfinder', 'Arma Mágica', 1, '', '2 ações', 'Toque', '', '1 minuto', 'A arma cintila com magia e energia. O alvo se torna uma arma +1 impactante, recebendo +1 de bônus de item em rolagens de ataque e aumentando a quantidade de dados de dano para dois.', false),
  (null, 'pathfinder', 'Santuário', 1, '', '2 ações', 'Toque', '', '1 minuto', 'Você protege uma criatura com energia protetora que impede os ataques de inimigos. Criaturas que tentem atacar o alvo devem tentar um salvamento de Vontade a cada ataque. Se o alvo usar uma ação hostil, a magia acaba.

---
Sucesso Crítico  Santuário é encerrada.

Sucesso  A criatura pode tentar esse ataque e quaisquer outros ataques subsequentes contra o alvo neste turno.

Falha  A criatura não pode atacar o alvo e desperdiça a ação. Ela não pode tentar outros ataques contra o alvo neste turno.

Falha Crítica   A criatura desperdiça a ação e não pode tentar atacar o alvo pelo resto da duração de santuário.', false),
  (null, 'pathfinder', 'Esfregar na Areia', 1, 'Evocação', '2 ações', '18 metros', 'S, V', 'Sustentada for até 1 minuto', 'Você explode a área com areia que arrasta o solo e entra nos olhos das criaturas. Durante a duração da magia, qualquer terreno difícil baseado em planta menor que uma árvore fica solto, permitindo que cada metro quadrado de um metro e meio seja limpo com uma única ação de Interagir. além do que, além do mais, esfregar na areia tenta neutralizar emanharar e outros efeitos que criam ou manipulam terrenos baseados em plantas em sua área. A neutralização bem-sucedida de um efeito remove apenas a parte de sua área que se sobrepõe à área de esfregar com areia. Após uma dessas tentativas, o efeito é temporariamente imune a neutralização de esfregar com areia por 24 horas. Cada criatura na área quando você conjura esta magia ou que termina seu turno na área deve fazer um teste de salvamento de Reflexo.

Sucesso A criatura não é afetada.
Falha A criatura fica ofuscada por 1 minuto ou até que ele use uma ação de Interagir para tirar a areia dos olhos.
Falha Crítica Como fracasso, mas a criatura também é cega para sua próxima ação.

---

Elevada (3º) Uma vez por rodada quando você Sustentar a magia, você pode mover o centro da explosão para um local dentro do alcance.
Elevada (6º) Como a versão de 3º nível, exceto o alcance de 36 metros e a área é uma explosão de 6 metros.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Saber Compartilhado', 1, 'Adivinhação', '1 minuto', 'Toque', '', '10 minutos', 'Você compartilha seu conhecimento com as criaturas tocadas. Escolha uma pericia de Saber em que você é treinado. Os alvos se tornam treinados nessa pericia de Saber pela duração da magia.

---

Elevada (3º) A duração da magia é de 1 hora e você pode atingir até cinco criaturas.
 Elevada (5º) A duração da magia é de 8 horas, você pode atingir até cinco criaturas e compartilhar até duas pericias de Saber nas quais você é treinado. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Joia Estilhaçada', 1, 'Abjuração', '2 ações', 'Toque', 'S, V', '1 minuto', 'Uma grande gema flutua ao redor do alvo em um padrão irregular. A gema tem 5 pontos de vida. Cada vez que uma criatura atinge o alvo, o alvo faz um teste simples CD 11. Em caso de sucesso, a gema bloqueia o ataque; portanto, o ataque primeiro danifica a gema e depois aplica qualquer dano restante ao alvo. Se a gema for reduzida a 0 Pontos de Vida, ela será destruída, causando imediatamente a criatura que a destruiu 1d8 de dano cortante (salvamento básico de Reflexo), desde que a criatura esteja a menos de 3 metros do alvo.

---

Elevada (+1) A gema tem 5 pontos de vida adicionais, e o dano causado por sua detonação aumenta em 1d8. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Bastão de Abrunheiro', 1, 'Transmutação', '2 ações', 'Toque', 'S, V', '1 minuto', 'O alvo desenvolve vinhas e folhas, transbordando com energia primal. O alvo se torna uma arma +1 impactante enquanto estiver em suas mãos, concedendo +1 de bônus de item em rolagens de ataque e aumentando a quantidade de dados de dano dele para dois. Adicionalmente, enquanto você estiver em seu plano natal, aumente a quantidade de dados de dano da arma para três em todos os ataques que fizer usando o alvo contra aberrações, extraplanares e mortos-vivos.', false),
  (null, 'pathfinder', 'Onda de Choque', 1, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Você cria uma onda de energia que ondula pela terra. As criaturas terrestres na área afetada devem fazer um teste de salvamento de Reflexos para evitar tropeçar enquanto a onda de choque sacode o chão.
 
Sucesso Crítico A criatura não é afetada.
Sucesso A criatura fica desprevenida até o início de seu próximo turno.
Falha A criatura cai prostrada.
Falha Crítica Como falha, mais a criatura recebe 1d6 de dano.

---

Elevada (+1) A área aumenta em 1,5 metro (para um cone de 6 metros no 2º nível e assim por diante). 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Sono', 1, '', '2 ações', '9 metros', '', 'Instantânea', 'Cada criatura na área fica sonolenta e pode cair no sono. Uma criatura que ficar inconsciente por esta magia não cai prostrada nem solta o que estiver segurando. Esta magia não impede criaturas de acordarem devido a um teste bem-sucedido de Percepção, limitando a utilidade dela em combate.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre –1 de penalidade de estado em testes de Percepção por 1 rodada.

Falha  A criatura fica inconsciente. Se ainda estiver inconsciente após 1 minuto, ela acorda automaticamente.

Falha Crítica  A criatura fica inconsciente. Se ainda estiver inconsciente inconsciente após 1 hora, ela acorda automaticamente.

---
Elevada (4º)  As criaturas ficam inconscientes por 1 rodada em uma falha ou por 1 minuto em uma falha crítica. Elas caem prostradas e soltam o que estiverem segurando e não podem fazer testes de Percepção para acordar. Quando a duração acaba, a criatura está dormindo normalmente em vez de acordar automaticamente.', false),
  (null, 'pathfinder', 'Bola de Neve', 1, 'Evocação', '2 ações', '9 metros', 'S, V', 'Instantânea', 'Você arremessa uma bola resfriada de neve densa que é magicamente propelida. O alvo sofre 2d4 de dano de frio e potencialmente outros efeitos, dependendo do resultado de sua rolagem de ataque de magia.
 
Sucesso Crítico O alvo sofre dobro do dano e –3 metros de penalidade de estado nas Velocidades dele por 1 rodada.
Sucesso O alvo sofre o dano inteiro e –1,5 metros de penalidade de estado nas Velocidades dele por 1 rodada. round.
Falha Nenhum efeito.

---

Elevada (+1) O dano aumenta em 2d4.', false),
  (null, 'pathfinder', 'Abrandar', 1, '', '2 ações', '9 metros', '', '1 minuto', 'Você agracia a mente do alvo, incrementando as defesas mentais e curando os ferimentos dele. O alvo recupera 1d10+4 Pontos de Vida quando você Conjurar a Magia e recebe +2 de bônus de estado em salvamentos contra efeitos mentais pela duração da magia.

---

Elevada (+1) A quantidade de cura aumenta em 1d10+4.', false),
  (null, 'pathfinder', 'Ferrão de Aranha', 1, '', '2 ações', 'Toque', '', 'Instantânea', 'Você cria magicamente uma duplicata do ferrão venenoso de uma aranha. Você causa 1d4 de dano perfurante à criatura tocada e a aflige com veneno de aranha. O alvo deve tentar um salvamento de Fortitude.

---

Veneno de Aranha (veneno);

Nível 1 ; Duração Máxima 4 rodadas.

Estagio 1 1d4 de dano de veneno e enfraquecido 1 (1 rodada);

Estagio 2 1d4 de dano de veneno e enfraquecido 2 (1 rodada).

---

Sucesso Crítico O alvo não é afetado.

Sucesso O alvo sofre 1d4 de dano de veneno.

Falha O alvo é afligido com veneno de aranha no estágio 1.

Falha Crítica O alvo é afligido com veneno de aranha no estágio 2.', false),
  (null, 'pathfinder', 'Vínculo Espiritual', 1, '', '2 ações', '9 metros', '', '10 minutos', 'Você forma um vínculo espiritual com outra criatura, que lhe permite sofrer a dor dele. Quando você Conjurar esta Magia e no início de cada um de seus turnos, se o alvo estiver abaixo dos Pontos de Vida máximos dele, ele recupera 2 Pontos de Vida (ou a diferença entre os Pontos de Vida máximos e atuais, se for menor). Você perde a mesma quantidade de Pontos de Vida que o alvo recuperou.

Isto é uma transferência espiritual, portanto, não se aplicam efeitos que aumentariam os Pontos de Vida recuperados pelo alvo ou que reduziriam os Pontos de Vida perdidos por você. Esta transferência também ignora quaisquer Pontos de Vida temporários que você ou o alvo tiverem. Como este efeito não envolve energia positiva ou energia negativa, vínculo espiritual funciona mesmo se você ou o alvo for um morto-vivo. Enquanto a duração persistir, você não recebe benefícios de regeneração ou cura acelerada. Você pode Dispensar esta magia e, se em algum momento você chegar a 0 Pontos de Vida, vínculo espiritual é encerrada automaticamente.

---

Elevada (+1) A quantidade de Pontos de Vida transferidos a cada vez aumenta em 2.', false),
  (null, 'pathfinder', 'Convocar Animal', 1, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um animal para lutar por você. Você convoca uma criatura comum que possua o traço animal cujo nível seja –1. Elevar a magia aumenta o nível máximo da criatura que você pode convocar.

---

Elevada (2º) Nível 1

Elevada (3º) Nível 2

Elevada (4º) Nível 3

Elevada (5º) Nível 5

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Constructo', 1, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um constructo para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço constructo e cujo nível seja –1.

---

Elevada (2º) Nível 1

Elevada (3º) Nível 2

Elevada (4º) Nível 3

Elevada (5º) Nível 5

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Fada', 1, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura uma fada para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço fada e cujo nível seja –1.

---

Elevada (2º) Nível 1

Elevada (3º) Nível 2

Elevada (4º) Nível 3

Elevada (5º) Nível 5

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Planta ou Fungo', 1, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura uma planta ou fungo para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço planta ou fungo e cujo nível seja –1.

---

Elevada (2º) Nível 1

Elevada (3º) Nível 2

Elevada (4º)Nível 3

Elevada (5º) Nível 5

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Golpe Certo', 1, '', '1 ação', '', '', 'Until the end of your turn', 'Um vislumbre do futuro garante que seu próximo golpe seja certeiro. A próxima vez que você fizer uma rolagem de ataque antes do final de seu turno, role o ataque duas vezes e use o melhor resultado. O ataque ignora penalidades de circunstância na rolagem de ataque e qualquer teste simples requerido devido ao alvo estar ocultado ou escondido.', false),
  (null, 'pathfinder', 'Passos Largos', 1, '', '2 ações', '', '', '1 hora', 'Você alonga seus passos além do que seria possível. Você recebe+3 metros de bônus de estado em sua Velocidade.

---

Elevada (2º) A duração aumenta para 8 horas.', false),
  (null, 'pathfinder', 'Ferramenta Temporária', 1, 'Conjuração', '1 minuto', '', '', 'Until used or 1 minuto; see text', 'Você conjura uma ferramenta simples temporária, como uma pá ou corda em suas mãos. Ela dura até ser usado para uma única atividade ou por 1 minuto, o que ocorrer primeiro, após o que desaparecerá. A ferramenta é obviamente conjurada temporariamente e, portanto, não pode ser vendida ou passada como um item genuíno.', false),
  (null, 'pathfinder', 'Amarra', 1, 'Abjuração', '2 ações', '9 metros', 'S, V', '1 minuto or until dismissed; see text', 'Você usa correntes mágicas, trepadeiras ou outras amarras para prender seu alvo a você. A criatura ainda pode tentar  Escapar, e ele ou outros podem quebrar as amarras, atacando-as (as amarras têm CA 15 e 10 Pontos de Vida). Você deve permanecer a 9 metros do alvo enquanto ele estiver amarrado; afastar-se a mais de 9 metros do alvo termina a magia. O alvo deve tentar um teste de Reflexo.

 Sucesso Crítico O alvo não é afetado.
Sucesso O alvo sofre uma penalidade de circunstância de 1,5 metros à sua Velocidade, desde que esteja a 9 metros de você.
Falha O alvo sofre uma penalidade de circunstância de 3 metros à sua Velocidade e não pode se mover a mais de 9 metros de você até que ele Escape ou a magia termine.
 Falha Crítica O alvo fica imobilizado até que ele Escape ou a magia termine.

---

Elevada (+1) A CA das amarras aumenta em 3 e seus pontos de vida aumentam em 10.', false),
  (null, 'pathfinder', 'Toque Chocante', 1, '', '2 ações', '36 metros', '', 'Instantânea', 'Você envolve suas mãos em um campo crepitante de eletricidade. Faça uma rolagem de ataque de magia corpo a corpo. Em um acerto, o alvo sofre 2d12 de dano de eletricidade. Se o alvo estiver vestindo armadura de metal ou se for feito de metal, você recebe +1 de bônus de circunstância em sua rolagem de ataque com toque chocante e o alvo também sofre 1d4 de dano persistente de eletricidade em um acerto. Em um acerto crítico, dobre o dano inicial, mas não o dano persistente.

---

Elevada (+1) O dano aumenta em 1d12 e o dano persistente de eletricidade aumenta em 1.', false),
  (null, 'pathfinder', 'Passos sem Pegadas', 1, '', '2 ações', '', '', '1 hora', 'Você obscurece os rastros que deixa para trás e torna mais difícil para os outros lhe encontrarem. A CD dos testes para Rastreá-lo recebem +4 de bônus de estado ou se tornam iguais à sua CD de magia, o que resultar em uma CD maior. Você pode beneficiar-se somente de uma magia de passos sem pegadas ao mesmo tempo.

---

Elevada (2º) A duração aumenta para 8 horas.

Heightened (4th) A duração aumenta para 8 horas. A magia possui uma distância de 6 metros e uma área de emanação de 6 metros, afetando até 10 criaturas à sua escolha dentro dessa área.', false),
  (null, 'pathfinder', 'Ventriloquismo', 1, 'Ilusão', '2 ações', '', '', '10 minutos', 'Sempre que falar ou fizer algum outro som vocal, você pode fazer com que essa vocalização pareça vir de outro lugar a até 18 metros, e você também pode alterar essa localização aparente enquanto vocaliza o som. Qualquer criatura que ouvir o som pode tentar desacreditar sua ilusão.

---

Elevada (+2) A duração da magia aumenta para 1 hora e você também pode mudar o tom, qualidade e outros aspectos de sua voz. Antes de uma criatura tentar desacreditar sua ilusão, ela deve ativamente fazer um teste de Percepção ou de alguma outra forma usar ações para interagir com o som.', false),
  (null, 'pathfinder', 'Broto Verdejante', 1, '', '3 ações', '9 metros', '', 'Instantânea', '---

Você imbui uma única semente de planta comum e barata com energia primal e a lança sobre uma superfície, onde brota gradualmente em uma planta Média. Após 10 minutos, a planta é robusta o suficiente para fornecer cobertura padrão e seu espaço é um terreno difícil. A planta está carregada de nozes ou frutas nutritivas suficientes para alimentar uma criatura Média por um dia. A planta possui CA 10, dureza 5 e 20 pontos de vida.

---

Elevada (+1) Você lança uma semente adicional, que cresce em uma planta adicional dentro do alcance.', false),
  (null, 'pathfinder', 'Flecha Ácida', 2, '', '2 ações', '36 metros', '', 'Instantânea', 'Você conjura uma flecha de ácido que continua corroendo o alvo após acertá-lo. Faça um ataque de magia contra o alvo. Em um acerto, você causa 3d8 de dano de ácido mais 1d6 de dano persistente de ácido. Em um acerto crítico, dobre o dano inicial, mas não o Dano Persistente.

---

Elevada (+2) O dano inicial aumenta em 2d8, e o dano persistente de ácido aumenta em 1d6.', false),
  (null, 'pathfinder', 'Forma de Animal', 2, '', '2 ações', '', '', '1 minuto', 'Você recorre à energia primal para se transformar na forma de batalha de um animal Médio. Quando conjurar esta magia, escolha canídeo, felino, macaco, sapo, serpente, touro, tubarão, urso ou veado. Você pode decidir o tipo específico de animal (como leão ou leopardo da neve para felino), mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire o traço animal. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 16 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
5 Pontos de Vida temporários.
Visão na penumbra e faro impreciso de 9 metros.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +9 e seu bônus de dano é +1. Estes ataques são baseados em Força (para o propósito da condição Enfraquecido, por exemplo). Se seu modificador de ataque para ataques desarmados baseados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
 +9 de modificador de Atletismo, exceto se o seu próprio modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

Canídeo Velocidade 12 metros; Corpo a Corpo mandíbulas, Dano 2d8 perfurante.
Felino Velocidade 12 metros; Corpo a Corpo mandíbulas, Dano 2d6 perfurante; Corpo a Corpo garra (ágil), Dano 1d10 cortante.
Macaco Velocidade 7,5 metros, Velocidade de escalada 6 metros; Corpo a Corpo punho, Dano 2d6 contundente.
Sapo Velocidade 7,5 metros, Velocidade de natação 7,5 metros; Corpo a Corpo mandíbulas, Dano 2d6 contundente; Corpo a Corpo íngua (alcance 4,5 metros), Dano 2d4 contundente.
Serpente Velocidade 6 metros, Velocidade de escalada 6 metros, Velocidade de natação 6 metros; Corpo a Corpo presas, Dano 2d4 perfurante mais 1d6 de veneno.
Touro Velocidade 9 metros; Corpo a Corpo chifre, Dano 2d8 perfurante.
Tubarão Velocidade de natação 10,5 metros; Corpo a Corpo mandíbulas, Dano 2d8 perfurante; respira embaixo d’água, mas não no ar.
Urso Velocidade 9 metros; Corpo a Corpo mandíbulas, Dano 2d8 perfurante; Corpo a Corpo garra (ágil), Dano 1d8 cortante.
Veado Velocidade 15 metros; Corpo a Corpo galhada, Dano 2d6 perfurante.

---

Elevada (3º) Você recebe CA = 17 + seu nível, 10 PV temporários, +14 de modificador de ataque, +5 de bônus de dano e +14 de Atletismo em vez dos valores iniciais.

Elevada (4º)Sua forma de batalha é Grande e seus ataques possuem alcance de 3 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 18 + seu nível, 15 PV temporários, +16 de modificador de ataque, +9 de bônus de dano e +16 de Atletismo em vez dos valores iniciais.

Elevada (5º) Sua forma de batalha é Enorme e seus ataques possuem alcance de 4,5 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 18 + seu nível, 20 PV temporários, +18 de modificador de ataque, +7 de bônus de dano, o dobro de dados de dano e +20 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Mensageiro Animal', 2, '', '1 minuto', '36 metros', '', 'See text', 'Você faz uma oferenda de comida e um animal selvagem Minúsculo dentro da distância se aproxima para comê-la. Você transmite a imagem, direção e distância de um local óbvio ou ponto de referência bem conhecido por você ao animal. Opcionalmente, você pode anexar um objeto pequeno ou anotação de Volume leve nele. O animal faz o melhor que puder para alcançar o destino; se alcançá-lo, ele espera por perto, permitindo que outras criaturas não-hostis se aproximem dele e removam o objeto anexado.

A magia dura 24 horas ou até o objeto anexado ser removido, o que ocorrer primeiro. Se não houver animais selvagens Minúsculos na distância, a magia é perdida.', false),
  (null, 'pathfinder', 'Mina de Animus', 2, 'Abjuração', '2 ações', '', 'S, V', '1 hora', 'Você implanta uma mina mental em sua psique que detona contra qualquer pessoa que tente manipular seus pensamentos. Você pode usar uma única ação, que tem o traço concentração, para suprimir os efeitos da mina por 1 rodada para permitir que alguém use com segurança um efeito mental em você. Você pode dispensar a magia.

A primeira criatura que usa um efeito mental contra você ativa a mina de animus, fazendo com que o feitiço termine. A mina de animus causa 4d8 de dano mental à criatura desencadeadora, que deve tentar um salvamento de Vontade.

 Sucesso crítico A criatura não é afetada.
Sucesso A criatura sofre metade do dano.
Falha A criatura sofre dano total e é Atordoado 1.
 Falha Crítica A criatura sofre o dobro do dano e fica Atordoado 1. Você não é afetado pelo efeito mental desencadeador.

---

Elevada (+1) O dano aumenta em 2d8.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Augúrio', 2, '', '10 minutos', '', '', 'Instantânea', 'Você obtém um vago vislumbre do futuro. Durante a conjuração desta magia, pergunte sobre os resultados de um curso de ação em particular. A magia pode predizer resultados de até 30 minutos no futuro e revelar a melhor predição do MJ entre os resultados a seguir:

Prosperidade Os resultados serão bons.
Infortúnio Os resultados serão ruins.
Prosperidade e InfortúnioOs resultados serão uma mescla de bons e ruins.
Nada Não há resultados particularmente bons ou ruins.

O MJ rola secretamente um teste simples CD 6. Em uma falha, o resultado é sempre “nada”. Isto torna impossível dizer se um resultado de “nada” é preciso. Se alguém perguntar sobre o mesmo tópico que a primeira conjuração de augúrio durante uma conjuração adicional, o MJ usa o resultado do teste secreto da primeira conjuração. Porém, se as circunstâncias mudarem, é possível obter um resultado diferente.', false),
  (null, 'pathfinder', 'Borrar', 2, 'Ilusão', '2 ações', 'Toque', '', '1 minuto', 'A forma do alvo parece borrada. Ele fica Ocultado. Como a natureza deste efeito deixa a localização do alvo óbvia, ele não pode usar esta ocultação para se Esconder ou Esgueirar.', false),
  (null, 'pathfinder', 'Marcar o Impertinente', 2, 'Abjuração', '2 ações', 'Toque', 'S, V', 'Varies', 'Você marca o alvo com uma cópia etérea do símbolo religioso de sua divindade. Essa marca não pode ser ocultada, mas é visível apenas para os seguidores de sua fé, que a veem tão claramente quanto uma tocha acesa. Seguidores de sua fé ignoram a condição Ocultado do alvo, se houver, e o alvo ganha uma penalidade de status -1 na CA contra ataques de seguidores de sua fé. Se o alvo é um seguidor de sua divindade em boa posição, a magia falha.
 
Sucesso Crítico O alvo não é afetado.
Sucesso A magia dura por 1 rodada.
Falha A magia dura por 1 minuto.
 Falha Crítica A magia tem uma duração ilimitada.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Sopro da Seca', 2, 'Evocação', '2 ações', '9 metros', 'S, V', 'Sustentada', 'Você preenche a área com um árido escaldante e opressivo que sobrecarrega as criaturas com exaustão pelo calor. Objetos não são afetados. Cada criatura na área quando a magia é lançada ou que termina seu turno na área depois deve tentar um teste de Fortitude. Criaturas aquáticas e vegetais usam o resultado um grau de sucesso pior que o resultado do teste de resistência. Criaturas cujos corpos não contêm umidade significativa (como elementais do fogo) são imunes a sopro da seca.

Sucesso A criatura não é afetada.
Falha A criatura fica Enjoado 1. 
Falha Crítica A criatura fica Enjoado 2.

---

Elevada (4°) Uma vez por rodada quando você Sustentar a Magia, você pode mover o centro da explosão para um novo local dentro do alcance. Elevada (7º) Como a versão de 4º nível, exceto o alcance de 36 metros e a área é uma explosão de 6 metros.
(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Acalmar Emoções', 2, '', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Você forçadamente acalma criaturas na área, amansando-as e deixando-as em um estado não-violento; cada criatura deve tentar um salvamento de Vontade.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  Impulsos calmantes impõem –1 de penalidade de estado às rolagens de ataque da criatura.

Falha  Quaisquer efeitos de emoção que afetariam a criatura são suprimidos e a criatura não pode usar ações hostis. Se o alvo for sujeitado à hostilidade de qualquer outra criatura, ele deixa de ser afetado por acalmar emoções.

Falha Crítica  Como falha, mas hostilidade não encerra o efeito.', false),
  (null, 'pathfinder', 'Neutralizar Veneno', 2, '', '2 ações', 'Toque', '', 'Instantânea', 'Você canaliza magia curativa sobre o alvo na tentativa de curar um veneno que o aflige. Faça um teste de neutralização contra o veneno.', false),
  (null, 'pathfinder', 'Remover Medo', 2, '', '2 ações', 'Toque', '', 'Instantânea', 'Com um toque, você abranda o medo de uma criatura. Você pode tentar neutralizar um único efeito de medo que o alvo está sofrendo. Isto liberta somente um alvo, mas não todas as criaturas sob o mesmo efeito de medo.

Elevada (6º) A distância da magia aumenta para 9 metros e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Criar Comida', 2, '', '1 hora', '9 metros', '', 'Instantânea', 'Você cria comida o suficiente para alimentar seis criaturas Médias por um dia. Esta comida é insípida e desagradável, mas é nutritiva. Após 1 dia, se ninguém a tiver comido, ela apodrece e deixa de ser comestível. A maioria das criaturas Pequenas come um quarto do que comeria uma criatura Média (um dezesseis avos no caso da maioria das criaturas Minúsculas), e a maioria das criaturas Grandes come 10 vezes do que comeria uma criatura Média (100 vezes no caso da maioria das criaturas Enormes e assim por diante).

---

Elevada (4º) Você pode alimentar 12 criaturas Médias.

Elevada (6º) Você pode alimentar 50 criaturas Médias.

Elevada (8º) Você pode alimentar 200 criaturas Médias.', false),
  (null, 'pathfinder', 'Escuridão', 2, '', '3 ações', '36 metros', '', '1 minuto', 'Você cria um manto de escuridão que impede qualquer de entrar ou emanar dentro da área. Nenhuma luz entra na área e quaisquer fontes de iluminação não-mágica, como uma tocha ou lanterna, não emanam luz enquanto estiverem na área, mesmo se seu raio de iluminação se estenderia além da escuridão. Isto também suprime qualquer luz mágica de nível de magia igual ou inferior ao de sua escuridão. A luz não pode atravessar a escuridão, portanto, criaturas na área não conseguem ver o lado de fora. Do lado de fora, a área parece um globo de pura escuridão.

---

Elevada (4º) Mesmo criaturas com visão no escuro (mas não com visão no escuro maior) mal podem ver através da escuridão. Elas tratam alvos vistos na escuridão como ocultado.', false),
  (null, 'pathfinder', 'Visão no Escuro', 2, '', '2 ações', '', '', '1 hora', 'Você concede a si mesmo uma visão sobrenatural em áreas de escuridão. Você adquire visão no escuro.

---

Elevada (3º) A distância da magia é toque e tem como alvo 1 criatura voluntária.

Elevada (5º) A distância da magia é toque e tem como alvo 1 criatura voluntária. A duração é até a próxima vez que você fizer suas preparações diárias.', false),
  (null, 'pathfinder', 'Surdez', 2, '', '2 ações', '9 metros', '', 'Instantânea', 'O alvo perde a audição; ele deve tentar um salvamento de Fortitude. O alvo fica temporariamente imune por 1 minuto.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica surdo por 1 rodada.

Falha  O alvo fica surdo por 10 minutos.

Falha Crítica  O alvo fica surdo permanentemente.', false),
  (null, 'pathfinder', 'Reverberação da Morte', 2, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você extingue a vida de uma criatura à beira da morte. O alvo deve tentar um salvamento de Vontade. Se este efeito matá-lo, você ganha 10 Pontos de Vida temporários e +1 de bônus de estado em rolagens de ataque e dano por 10 minutos.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O valor de morrendo do alvo aumenta em 1.

Falha  O alvo morre.', false),
  (null, 'pathfinder', 'Dissipar Magia', 2, '', '2 ações', '36 metros', '', 'Instantânea', 'Você desfaz a magia que está por trás de um efeito. Faça um teste de neutralização contra o alvo (página 459). Se obtiver sucesso contra um efeito de magia, você o neutraliza. Se obtiver sucesso contra um item mágico, o item se torna um item mundano do tipo dele por 10 minutos. Isso não altera as propriedades não-mágicas do item. Se o alvo for um artefato ou item similar, você falha automaticamente.', false),
  (null, 'pathfinder', 'Boca Mágica', 2, 'Ilusão', '2 ações', 'Toque', '', 'Ilimitada', 'Você especifica um acionamento (descrito na página 305) e uma mensagem de até 25 palavras. Quando o acionamento especificado ocorrer a até 9 metros do alvo, uma boca ilusória aparece no alvo e pronuncia a mensagem, e então a magia boca mágica se encerra.', false),
  (null, 'pathfinder', 'Melhorar Alimentos', 2, 'Transmutação', '1 minuto', 'Toque', 'S, V, M', '1 hora', 'Você transforma o alvo em um alimento delicioso, transformando água em vinho ou outra bebida de qualidade
ou melhorando o gosto da comida e ingredientes para
torná-la saborosa.

Antes da transformação, a magia tenta neutralizar quaisquer venenos na água ou comida. A comida volta ao normal se não for consumida antes da duração expirar, embora quaisquer venenos neutralizados continuem assim.

---

Elevada (+1) A quantidade de água que você pode afetar aumenta em 4 litros e a quantidade de peso de comida que você pode afetar aumenta em 2,5 quilos.', false),
  (null, 'pathfinder', 'Crescer', 2, '', '2 ações', '9 metros', '', '5 minutos', 'Reforçado por poder mágico, o alvo cresce para o tamanho Grande. Os equipamentos dele crescem junto com ele, mas retornam ao tamanho natural se removidos de sua posse. A criatura fica desajeitado 1. O alcance dela aumenta em 1,5 metros (ou em 3 metros se ela for originalmente Minúscula) e ela recebe +2 de bônus de estado em dano corpo a corpo. Esta magia não surte efeito em uma criatura Grande ou maior.

---

Elevada (4º)A criatura cresce para o tamanho Enorme. O bônus de estado em dano corpo a corpo aumenta para +4 e o alcance da criatura aumenta em 3 metros (ou 4,5 metros se ela fosse Minúscula). A magia não surte efeito em uma criatura Enorme ou maior..

Elevada (6º) Escolha entre a versão de 2º e 4º nível desta magia e aplique os efeitos dela a até 10 criaturas voluntárias.', false),
  (null, 'pathfinder', 'Suportar Elementos', 2, '', '10 minutos', 'Toque', '', 'Until your next daily preparations', 'Você protege o alvo contra temperaturas perigosas. Escolha calor ou frio severo. O alvo é protegido da temperatura escolhida (mas não calor ou frio extremo).

---

Elevada (3º) alvo é protegido de calor e frio severo.

Elevada (5º) O alvo é protegido de calor severo, calor extremo, frio severo e frio extremo..', false),
  (null, 'pathfinder', 'Chama Contínua', 2, '', '3 ações', 'Toque', '', 'Ilimitada', 'Uma chama mágica emana do objeto, tão brilhante quanto uma tocha. Ela não precisa de oxigênio, não reage à água nem gera calor.

---

Elevada (+1) O custo aumenta da seguinte maneira: 16 po para 3º nível; 30 po para 4º nível; 60 po para 5º nível; 120 po para 6º nível; 270 po para 7º nível; 540 po para 8º nível; 1.350 po para 9º nível; e 3.350 po para 10º nível.', false),
  (null, 'pathfinder', 'Escavação Expedita', 2, 'Transmutação', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você remove a sujeira solta, poeira, cascalho, areia e similares (embora não seja pedra sólida) até o tamanho de um cubo de 1,5 m. Qualquer criatura Média ou menor que esteja no topo da Terra quando o feitiço for lançado deve fazer um teste de resistência por Reflexos ou Acrobatismo.

Sucesso A criatura não é afetada e pode optar por descer do poço sem danos ou passar para o espaço disponível mais próximo de sua escolha.
Falha A criatura cai prostrada no espaço disponível mais próximo de sua escolha ou cai no poço, se preferir.
Falha Crítica A criatura cai no poço escavado pela magia e cai prostrada, tendo dano de queda como normal.

---

Elevada (+2) O feitiço pode escavar um cubo adicional de 1,5 metro de terra. Se você escavar todos os quatro cubos de um metro e meio abaixo de uma criatura Grande, ela deve fazer um teste de resistência de Reflexo ou Acrobatismo, como acima. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Fogo Feérico', 2, 'Evocação', '2 ações', '36 metros', 'S, V', '5 minutos', 'Todas as criaturas na área quando você conjurar a magia são delineadas em um fogo colorido e sem calor de uma cor à sua escolha pela duração. Criaturas visíveis não podem ficar ocultado enquanto estiverem afetadas por fogo feérico. Se as criaturas estiverem invísivel, elas ficam apenas ocultado enquanto estiverem afetadas por fogo feérico em vez de ficarem indetectado.', false),
  (null, 'pathfinder', 'Vitalidade Falsa', 2, '', '2 ações', '', '', '8 horas', 'Você cria um reservatório de vitalidade a partir de energia necromântica, ganhando uma quantidade de Pontos de Vida temporários igual a 6 mais o modificador de seu atributo de conjuração.

---

Elevada (+1)  Os Pontos de Vida temporários aumentam em 3.', false),
  (null, 'pathfinder', 'Festim de Cinzas', 2, 'Necromancia', '3 ações', '9 metros', 'S, V, M', '1 week', 'Você amaldiçoa o alvo com fome que nenhum alimento pode saciar. Você pode Dispensar a magia. O alvo deve tentar um salvamento de Fortitude.
 
Sucesso Crítico A criatura não é afetada e fica temporariamente imune por 1 hora.
Sucesso A criatura esta fatigado por 1 rodada.
Falha A criatura é imediatamente atingida pela fome, como se não tivesse comido há dias. Ele fica fatigado e recebe 1d4 de dano por dia que não pode ser curado até que sacie sua fome. Nenhuma quantidade de comida pode saciar a fome da criatura durante a duração da magia. Após a duração da magia, a criatura sofre dano por inanição.
 Falha Crítica Como falha, mas a criatura sofre 2d4 de dano por dia, o dobro do normal para a fome.

---

Elevada (+1) A fome se torna mais insuportável, aumentando o dano a cada dia em 1d4, ou 2d4 em uma falha crítica.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Esfera Flamejante', 2, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', '1

Você cria uma esfera de chamas em um quadrado na distância. A esfera deve ser suportada por uma superfície sólida, como um piso de pedra. A esfera causa 3d6 de dano de fogo a cada criatura no quadrado onde aparecer; cada criatura deve tentar um salvamento básico de Reflexos. Em rodadas subsequentes, você pode Sustentar esta Magia, deixando a esfera no quadrado em que estava ou rolando-a para outro quadrado dentro da distância e causando 3d6 de dano de fogo; cada criatura no quadrado da esfera deve tentar um salvamento básico de Reflexos.

Criaturas que obtiverem sucesso em seus salvamentos não sofrem dano (em vez de sofrerem metade do dano).

---

Elevada (+1) O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Hifas Fúngicas', 2, 'Necromancia', '2 ações', '', 'S, V', '1 minuto', 'Hifas finas crescem dos pés e mergulham na terra, criando uma rede de fungos simbióticos que se liga às plantas em um raio de 9 metros e conecta você ao sistema de raízes. Você ganha um impreciso senso sísmico permitindo que você sinta qualquer coisa tocando diretamente as plantas nessa distância. Se você se mover, a hifa se rompe e a magia termina.

---

Elevada (4º) Você pode controlar plantas na área em um pequeno grau, permitindo fazer Golpes com galhos de árvores, raízes expostas ou plantas igualmente sólidas. Para fazer isso, você usa uma ação de Golpe, mas você pode Golpear qualquer criatura que possa detectar com seu senso sissômico. Estes são ataques corpo a corpo que causam 2d8 de dano por esmagamento, mais o seu modificador de capacidade de conjuração. Plantas incomuns, como videiras espinhosas, podem causar um tipo diferente de dano, a critério do MJ. Você não pode fazer nenhum outro ataque por essas plantas ou executar outras ações por elas, além desses ataques.
Elevada (6º) Como de 4º nível, mas você pode usar outras ações simples de manipulação através das plantas, incluindo fazer com que um galho pegue um objeto ou abra uma porta, embora ações mais complexas, como abrir uma fechadura ou desativar uma armadilha, permaneçam impossíveis. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Escalada da Aranha', 2, '', '2 ações', 'Toque', '', '10 mintues', 'Minúsculos pelos pegajosos nascem nas mãos e pés da criatura, permitindo que se prenda em quase qualquer superfície. O alvo adquire Velocidade de escalada igual à Velocidade dele.

---

Elevada (5º) A duração aumenta para 1 hora.', false),
  (null, 'pathfinder', 'Mão Espectral', 2, '', '2 ações', '36 metros', '', '1 minuto', 'Você cria a partir de sua essência uma mão semi-corpórea que transmite magias de toque. Sempre que Conjurar uma Magia com distância de toque, você pode fazer a mão rastejar pelo chão até um alvo na distância, tocá-lo e então rastejar de volta para você. Quando fizer um ataque de magia corpo a corpo com a mão, você utiliza seus bônus normais. A mão pode se mover tão longe quanto precisar dentro da distância da magia. A mão utiliza a sua CA e salvamentos, mas qualquer dano que ela sofrer a destrói e faz você sofrer 1d6 de dano.', false),
  (null, 'pathfinder', 'Ânsias de Carniçal', 2, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você toca o alvo para afligi-lo com febre de carniçal, infestando-o com fome e diminuindo constantemente a conexão dele à energia positiva; o alvo deve tentar um salvamento de Fortitude.

---

Febre de Carniçal (disease); Level 3; Stage 1 ortador sem efeitos nocivos (1 dia);; Stage 2 3d8 de dano de energia negativa e a
criatura recupera metade dos Pontos de Vida de qualquer cura (1 dia); Stage 3 como estágio 2 (1 dia); Stage 4 3d8 de dano negativo e a criatura não recebe benefício de cura (1 dia); Stage 5 como estágio 4 (1 dia); Stage 6 a criatura morre e se ergue como um carniçal na próxima meia-noite.

Successo Critico  O alvo não é afetado.
Successo O alvo é afligido com febre de carniçal no estágio 1.
Falha O alvo é afligido com febre de carniçal no estágio 2.
Critical Failure O alvo é afligido com febre de carniçal no estágio 3.', false),
  (null, 'pathfinder', 'Forma Humanóide', 2, '', '2 ações', '', '', '10 minutos', 'Você transforma sua aparência na de um humanoide Pequeno ou Médio, como um anão, elfo, goblin, halfling, humano, povo-lagarto ou orc. Você adquire o traço humanoide em adição aos seus outros traços enquanto estiver nesta forma, assim como qualquer outro traço relacionado ao tipo de criatura escolhido (como goblin ou humano). Se esta transformação reduzir seu tamanho, o seu alcance é reduzido apropriadamente (como a magia encolher). Esta transformação não altera suas estatísticas de qualquer forma e você não recebe quaisquer habilidades especiais da forma de humanoide assumida. Você ainda pode vestir e usar seus equipamentos, que mudam de tamanho (se necessário) para condizer com sua nova forma. Se os itens saírem de sua posse, eles retornam ao tamanho normal. 
Forma de humanoide lhe concede +4 de bônus de estado em testes de Dissimulação para se passar como um membro genérico da ancestralidade escolhida e você adiciona seu nível ao teste mesmo se for destreinado, mas não pode assumir a aparência de uma pessoa específica. Se quiser Personificar um indivíduo, você ainda precisa criar um disfarce, embora o MJ não considere a diferença de ancestralidade quando determinar a CD de seu teste de Dissimulação. Você pode Dispensar esta magia.
Elevada (3º) Você adquire visão no escuro ou visão na penumbra se a forma assumida possuir essa habilidade.
Elevada (5º) Você pode assumir a aparência de um humanoide Grande. Se isto aumentar seu tamanho, você recebe os efeitos da magia crescer.', false),
  (null, 'pathfinder', 'Criatura Ilusória', 2, 'Ilusão', '2 ações', '150 metros', '', 'Sustentada', 'Você cria uma imagem ilusória de uma criatura Grande ou menor. Ela gera os sons e cheiros apropriados, assim como parece crível ao tato. Se você e a imagem em algum momento ficarem maisdistantes que 150 metros, a magia acaba.
A imagem não pode falar, mas você pode usar suas ações para falar através da criatura, com a magia disfarçando sua voz apropriadamente. Você pode precisar fazer um teste de Dissimulação ou Percepção para imitar a criatura, conforme determinado pelo MJ. Isto é especialmente provável se você estiver tentando imitar uma pessoa específica e interagir com alguém que a pessoa conhece.
Em combate, a ilusão pode usar 2 ações por turno, que ela usa quando você Sustenta a Magia. Ela usa sua rolagem de ataque de magia para rolagens de ataque e sua CD de magia para a CA dela. Os modificadores de jogada de salvamento dela são iguais à sua CD de magia – 10. Ela é substancial o suficiente para flanquear outras criaturas. Se a imagem for atingida por um ataque ou falhar em um salvamento, a magia é encerrada.
A ilusão pode causar dano ao fazer o alvo acreditar que os ataques dela são reais, mas não pode de alguma outra forma afetar o mundo físico. Se a criatura ilusória atingir um Golpe, o alvo sofre dano mental igual a 1d4 mais o modificador de seu atributo de conjuração. Este é um efeito mental. Os Golpes da ilusão são não-letais. Se o dano não corresponder à imagem do monstro — por exemplo, se um dragão ilusório Grande causar somente 5 de dano — o MJ pode permitir o alvo fazer um teste de Percepção para desacreditar a magia como uma ação livre. Quaisquer resistências e fraquezas relevantes se aplicam se o alvo pensar que elas o fazem, conforme julgado pelo MJ. Por exemplo, se a ilusão empunhar um martelo de guerra e atacar uma criatura resistente a dano contundente, a criatura sofreria menos dano mental. Entretanto, dano ilusório não desativa regeneração ou aciona outros efeitos que requeiram certo tipo de dano. O MJ deve acompanhar o dano ilusório causado pela ilusão.
Qualquer criatura que tocar a imagem ou usar a ação Buscar para examiná-la pode tentar desacreditar sua ilusão. Quando uma criatura desacreditar a ilusão, ela recupera metade do dano que tenha sofrido dela (se houver) e não sofre qualquer dano adicional da criatura.
Elevada (+1) O dano dos Golpes da imagem aumenta em 1d4, e o tamanho máximo de criatura que você pode criar aumenta em um (até o máximo de Imenso).', false),
  (null, 'pathfinder', 'Invisibilidade', 2, 'Ilusão', '2 ações', 'Toque', '', '10 minutos', 'Coberto em ilusão, o alvo fica invisível. Isto o torna indetectado para todas as outras criaturas, embora as criaturas possam tentar encontrar o alvo para torná-lo escondido para elas em vez de indetectado (página 466). Se o alvo usar uma ação hostil, a magia é encerrada após essa ação hostil ser completada.

---

Elevada (4º) A magia dura 1 minuto, mas não é encerrada se o alvo usar uma ação hostil.', false),
  (null, 'pathfinder', 'Tripas de Ferro', 2, 'Transmutação', '2 ações', '', 'S, M', '1 hora', 'Sua boca, esôfago e estômago se tornam incrivelmente elásticos e mais resistentes que o metal. Durante a duração da magia, você pode descer pela garganta para armazenar ou recuperar um único objeto de Volume leve ou desprezível no estômago, como se o estômago fosse uma mochila ou outro recipiente. Armazenar e recuperar um item dessa maneira requer uma ação do Interagir. O objeto deve ser pequeno o suficiente para caber dentro do estômago. É muito difícil para outras criaturas perceberem que você está escondendo um objeto dessa maneira; os observadores passivos não podem perceber e você ganha um bônus de +4 circunstâncias nos seus testes de furtividade para Empalmar um Objeto a menos que o procurador busque especificamente na sua boca e estômago. Se, no final da duração da magia, você ainda tiver um objeto armazenado no estômago, ele será expulso violentamente, causando 1d6 de dano a você.

---

Elevada (3º) A duração aumenta para 8 horas. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Arrombar', 2, '', '2 ações', '9 metros', '', '1 minuto', 'Você torna o alvo mais fácil de abrir. Arrombar concede +4 de bônus de estado para qualquer criatura que tentar abrir a porta, recipiente ou tranca alvo com um teste de Atletismo ou Ladroagem. Você pode fazer um teste de Ladroagem para abrir o alvo como parte da conjuração de arrombar e adiciona seu nível ao teste mesmo se for destreinado.

Arrombar neutraliza trancar.', false),
  (null, 'pathfinder', 'Riso Histérico', 2, '', '2 ações', '9 metros', '', 'Sustentada', 'O alvo é tomado por uma risada incontrolável. Ele deve tentar um salvamento de Vontade. 
Sucesso Crítico O alvo não é afetado.
Sucesso O alvo é atormentado com uma risada incontrolável. Ele não pode usar reações.
Falha O alvo fica lento 1 e não pode usar reações.
 Falha Crítica  O alvo fica  prostrado e não pode usar ações ou reações por 1 rodada. Depois ele sofre os efeitos de uma falha.', false),
  (null, 'pathfinder', 'Montaria Fantasma', 2, '', '10 minutos', '9 metros', '', '8 horas', 'Você conjura uma criatura equina Grande que somente você (ou outra criatura Média ou Pequena escolhida) pode montar. O cavalo possui natureza claramente fantasmagórica, CA 20 e 10 Pontos de Vida, além de falhar automaticamente em todos os salvamentos que tentar. Se for reduzido a 0 Pontos de Vida, ele desaparece e a magia acaba. A montaria possui uma Velocidade de 12 metros e pode carregar o peso do corpo do cavaleiro mais 20 Volumes.

---

Elevada (4º) A montaria possui uma Velocidade de 18 metros, pode andar na água e ignora áreas de terreno difícil natural.

Elevada (5th)A montaria possui uma Velocidade de 18 metros, pode andar na água e ignora áreas de terreno difícil natural. Ela também pode caminhar no ar, mas deve encerrar o turno dela em chão sólido ou cai.

Elevada (6th) A montaria possui uma Velocidade de 24 metros, pode andar na água e ignora áreas de terreno difícil natural. Ela também pode caminhar no ar, mas deve encerrar o turno dela em chão sólido; caso contrário, ela cai.', false),
  (null, 'pathfinder', 'Imagem Espelhada', 2, 'Ilusão', '2 ações', '', 'S, V', '1 minuto', 'Três imagens ilusórias idênticas a você ocupam seu espaço, potencialmente recebendo ataques direcionados contra você. Qualquer ataque que o acertaria possui uma chance aleatória de acertar uma de suas imagens em vez de você. Se todas as três imagens existirem, há uma chance de 1 em 4 de acertar você (1 em 1d4). Com duas imagens remanescentes, há uma chance de 1 em 3 de acertar você (1 ou 2 em 1d6). Com somente uma imagem, as chances são de 1 em 2 (1 a 3 em 1d6).

Após ser atingida, uma imagem é destruída. Se uma rolagem de ataque falhar em acertar sua CA (mas não se falhar criticamente), ela destrói uma imagem, embora sem qualquer efeito adicional (mesmo se o ataque normalmente geraria um efeito em caso de falha). Se uma rolagem de ataque obtiver sucesso crítico e atingiria uma das imagens, uma das imagens é destruída e a rolagem de ataque se torna um sucesso contra você. Após todas as imagens serem destruídas, a magia é encerrada.', false),
  (null, 'pathfinder', 'Bruma Obscurecente', 2, '', '3 ações', '36 metros', '', '1 minuto', 'Você invoca uma nuvem de brumas. Todas as criaturas dentro das brumas ficamOcultado, e todas as criaturas fora da bruma ficam Ocultado para as criaturas dentro dela. Você pode Dispensar a nuvem.', false),
  (null, 'pathfinder', 'Explosão Sonora', 2, '', '2 ações', '9 metros', '', 'Instantânea', 'Um barulho cacofônico explode, causando 2d10 de dano sônico. Cada criatura na área deve tentar um salvamento de Fortitude.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e fica surda por 1 rodada.

Falha Crítica  A criatura sofre o dobro do dano, fica surda por 1 minuto e  atordoada 1.

---
Elevada (+1)  O dano aumenta em 1d10.', false),
  (null, 'pathfinder', 'Pele de Árvore', 2, '', '2 ações', 'Toque', '', '10 minutos', 'A pele do alvo é coberta por casca de árvore. O alvo adquire resistência 2 a dano contundente e perfurante e fraqueza 3 a fogo. Após sofrer dano de fogo, o alvo pode Dispensar esta magia como uma ação livre acionada por sofrer esse dano; porém, fazer isso não reduz o dano de fogo que o alvo sofreu.

---

Elevada (+2) As resistências aumentam em 2 pontos, e a fraqueza aumenta em 3 pontos.', false),
  (null, 'pathfinder', 'Paranoia', 2, 'Ilusão', '2 ações', '9 metros', '', '1 minuto', 'Você faz o alvo ver todas as outras criaturas como ameaças atrozes. O alvo é acometido por uma paranoia intensa em relação a todas as criaturas ao redor dele e deve tentar um salvamento de Vontade.

---
Sucesso Crítico O alvo não é afetado.

Success O alvo acredita que todo mundo o vê como uma ameaça em potencial. Ele fica Unfriendly todas as criaturas para as quais já não esteja hostil, mesmo àquelas que eram previamente aliadas. Ele não trata ninguém como aliado. A magia se encerra após 1 rodada.

Falha Como sucesso, mas o efeito dura 1 minuto.

Falha Crítica  Como falha, exceto que o alvo acredita que todo mundo o vê como um inimigo mortal. Ele usa as reações e ações livres dele contra todos, independentemente de serem previamente aliados, conforme determinado pelo MJ. Apesar disso, ele age racionalmente como normalmente faria e prefere atacar criaturas que estejam o atacando ou prejudicando ativamente em vez daquelas que não estão interagindo com ele.

---
Elevada (6º)  Você pode afetar até 5 criaturas.', false),
  (null, 'pathfinder', 'Repouso Tranquilo', 2, '', '2 ações', 'Toque', '', 'Until your next daily preparations', 'cadáver alvo não apodrece nem pode ser transformado em um morto-vivo. Se o cadáver for sujeitado a uma magia que requeira um cadáver que tenha morrido a uma determinada quantidade de tempo (por exemplo, reviver os mortos), não conte a duração de repouso tranquilo para esse tempo. Esta magia também impede insetos e pestes ordinárias (como larvas) de consumirem o corpo..

---

Elevada (5º) A duração da magia é ilimitada, mas ela usa uma ação a mais para conjurar e requer um componente material e custo (fluido de embalsamento no valor de 6 po).', false),
  (null, 'pathfinder', 'Resistir a Energia', 2, '', '2 ações', 'Toque', '', '10 minutos', 'Um escudo de energia elemental protege uma criatura contra um tipo de dano de energia. Escolha dano de ácido, eletricidade, fogo, frio ou sônico. O alvo e os equipamentos dele adquirem resistência 5 contra o tipo de dano escolhido.

---

Elevada (4º) A resistência aumenta para 10 e você pode afetar até 2 criaturas.

Elevada (7º) A resistência aumenta para 15 e você pode afetar até 5 criaturas.', false),
  (null, 'pathfinder', 'Restauração', 2, 'Necromancia', '1 minuto', 'Toque', 'S, V', 'Instantânea', 'Magia restaurativa neutraliza os efeitos de toxinas ou condições que impedem uma criatura de funcionar da melhor forma. Quando conjurar restauração, escolha reduzir uma condição ou atenuar o efeito de uma toxina. Uma criatura pode se beneficiar somente de uma magia de restauração por dia e não pode se beneficiar de restauração mais de uma vez para reduzir o estágio da mesma exposição a uma determinada toxina.

Reduzir uma Condição Reduz o valor da condição desajeitado, enfraquecido, ou estupefato do alvo em 2. Em vez disso, você pode reduzir duas das condições listadas em 1.Atenuar uma Toxina Reduz em um o estágio de uma toxina que esteja afetando o alvo em um estágio. Isto não pode reduzir o estágio abaixo do estágio 1 ou curar a aflição.

---

Elevada (4º) Acrescente drenado à lista de condições que você pode reduzir. Quando atenuar uma toxina, reduza o estágio em dois. Você também possui uma terceira opção que lhe permite reduzir em 1 o valor de condenado  do alvo. Você não pode usar isto para reduzir uma condição  condenado permanente.

Elevado (6º) Como restauração de 4º nível, mas você pode reduzir uma condição condenado permanente se acrescentar uma ação de conjuração e um componente material enquanto Conjurar a Magia, durante a qual você fornece 100 po em pó de diamante como um custo.', false),
  (null, 'pathfinder', 'Fogo Feérico', 2, '', '2 ações', '36 metros', '', 'Varies', 'Todas as criaturas na área quando você conjurar a magia são delineadas em um fogo colorido e sem calor de uma cor à sua escolha pela duração. Criaturas visíveis não podem ficar ocultado enquanto estiverem afetadas por fogo feérico. Se as criaturas estiverem invísivel, elas ficam apenas ocultado enquanto estiverem afetadas por fogo feérico em vez de ficarem indetectado.', false),
  (null, 'pathfinder', 'Geada Escorregadia', 2, 'Evocação', '2 ações', '18 metros', 'S, V', '1 minuto', 'Você chama um vento frio. Quando você conjura esta magia, você causa 2d4 de dano de frio a cada criatura na área (salvamento básico de Reflexo). Se uma criatura na área falha criticamente em seu teste de Reflexo e estava em pé, ela também cai prostrada.

Você também cria uma camada de gelo em todas as superfícies da área, que se tornam terrenos difíceis. Objetos desapossados na área ficam escorregadios com gelo, e buscá-los exige um teste bem-sucedido de salvamento de Reflexo ou Acrobatismo contra sua CD de magia. O gelo derrete em qualquer objeto que receba dano de fogo, bem como em qualquer quadrado incluído na área da magia ou efeito de nível superior com o traço fogo.

---

Elevada (5º) O dano aumenta para 8d4 de dano de frio e a área é uma explosão de 9 metros.
Elevada (8º) O dano aumenta para 14d4 de dano de frio e a área é uma explosão de 18 metros.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Surto de Onda', 2, 'Evocação', '2 ações', '', 'S, V', 'Until the start of your next turn', 'Você bate ou pisa em uma superfície sólida ou líquida próxima, enviando uma onda de água correndo para longe de você. A água forma uma parede plana de 1,5 metros de espessura e 3 metros de altura, entre 1,5 e 4,5 metros de largura (você decide). Ela se move 18 metros na direção de sua escolha ao longo da superfície atingida, extinguindo todos os incêndios não mágicos, carregando objetos não segurados de Volume 1 ou menor e empurrando objetos maiores. A onda se move mais 18 metros na mesma direção no início do seu próximo turno e depois desaparece. Criaturas grandes ou menores na área ou que entram na área pela qual a onda se move devem fazer um teste de salvamento de Fortitude.

Sucesso A criatura não é afetada.
Falha A criatura fica knocked prostrada. Se a criatura estava Nadando, em vez disso, ocorre uma falha crítica.
Falha Crítica A criatura é empurrada 6 metros na direção da onda, é cai prostrada, e leva 3d6 de dano por esmagamento.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Ver Invisibilidade', 2, '', '2 ações', '', '', '10 minutos', 'Você pode enxergar criaturas e objetos invisíveis. Eles aparecem como formas translúcidas e ficam ocultados para você.

---

Elevada (5°) A magia tem uma duração de 8 horas.', false),
  (null, 'pathfinder', 'Moldar Madeira', 2, '', '2 ações', 'Toque', '', 'Instantânea', 'Você molda a madeira em um formato à sua escolha. O processo de moldagem é bruto demais para produzir partes intrincadas, detalhes minuciosos, peças móveis ou partes similares. Você não pode usar esta magia para melhorar o valor do objeto de madeira que estiver moldando.', false),
  (null, 'pathfinder', 'Proteger Outro', 2, '', '2 ações', '9 metros', '', '10 minutos', 'Você forja um vínculo temporário entre a essência vital do alvo e a sua própria. O alvo sofre apenas metade do dano de todos os efeitos que causem dano em Pontos de Vida e você sofre o dano remanescente. Quando sofrer dano através deste vínculo, não aplique quaisquer resistências, fraquezas ou outras habilidades que possua contra esse dano; você simplesmente sofre essa quantidade de dano. A magia acaba se o alvo a qualquer momento estiver a mais de 9 metros de distância de você. Se você ou o alvo for reduzido a 0 Pontos de Vida, qualquer dano desta magia é resolvido e a magia acaba.', false),
  (null, 'pathfinder', 'Estilhaçar', 2, '', '2 ações', '9 metros', '', 'Instantânea', 'Um ataque sônico de alta frequência estilhaça um objeto próximo. Você causa 2d10 de dano sônico ao objeto, ignorando a Dureza dele se ela for 4 ou menor.

---

Elevada (+1) O dano aumenta em 1d10 e a Dureza que a magia ignora aumenta em 2 pontos.', false),
  (null, 'pathfinder', 'Encolher', 2, '', '2 ações', '9 metros', '', '5 minutos', 'Você distorce o espaço para tornar uma criatura menor. A criatura encolhe para se tornar do tamanho Minúsculo. Os equipamentos dela encolhem junto, mas retornam ao tamanho natural se removidos. O alcance da criatura muda para 0 metros. Esta magia não surte efeito em uma criatura Minúscula.

---

Elevada (6º) A magia pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Silêncio', 2, 'Ilusão', '2 ações', 'Toque', '', '1 minuto', 'O alvo não emite nenhum som, impedindo criaturas de notá-lo usando apenas a audição. O alvo não pode usar ataques sônicos nem ações com o traço auditivo. Isto impede o alvo de conjurar magias que incluam componentes verbais.

---

Elevada (4º) O efeito da magia emana da criatura tocada, silenciando todos os sons em uma área afetada de 3 metros de raio e impedindo quaisquer efeitos auditivos ou sônicos dentro dela. Enquanto estiverem dentro da área, criaturas são sujeitas aos mesmos efeitos do alvo. Dependendo da posição do efeito, uma criatura pode perceber a aproximação da falta de sons (que bloqueia o barulho de um grupo, por exemplo).', false),
  (null, 'pathfinder', 'Renovar Pele', 2, 'Necromancia', '2 ações', '', 'S, V', '1 hora', 'Você remove a camada superior da pele de forma contínua e inofensiva, enquanto a nova pele se regenera imediatamente, afastando rapidamente as substâncias nocivas do corpo. O teste de salvamento para ser removido dano persistente dos efeitos que revestem sua pele (como a maioria dos danos persistentes com ácido) são reduzidos para 5 e você ganha um bônus de status +2 em seu salvamento inicial contra veneno de contato (mas não em salvamentos adicionais, pois nesse ponto a toxina já entrou no seu sistema). Se você está sofrendo de um efeito diferente de dano persistente isso depende do contato contínuo com a sua pele; se esse efeito permitir um teste de resistência, você receberá um novo teste de resistência contra esse efeito no final de cada turno, quando tentar seus testes simples contra dano persistente, e você também recebe um bônus de status +2 para esses testes de resistência.
 
Embora afetado por essa magia, sua pele continuamente se torna mais fácil de Rastrear. Qualquer um que rastreie você ganha +2 de bônus de circunstância e você não pode Ocultar suas trilhas. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Restaurar Sentidos', 2, '', '2 ações', 'Toque', '', 'Instantânea', 'Você tenta neutralizar um único efeito que esteja impondo as condições cego ou surdo ao alvo, restaurando a visão ou audição dele. Isto pode neutralizar magia temporária e consequências permanentes de magia, mas não cura alguém que não possua o sentido devido a algum estado ou efeito natural, como de nascimento ou por um ferimento ou toxina não-mágico.

---

Elevada (6°) A distância da magia aumenta para 9 metros e você pode afetar até 10 criaturas. Você pode escolher o efeito a ser neutralizado separadamente para cada criatura selecionada.', false),
  (null, 'pathfinder', 'Falar com Animais', 2, '', '2 ações', '', '', '1 hora', 'Você pode fazer perguntas e receber respostas de animais, assim como usar a perícia Diplomacia com eles. A magia não os torna mais amigáveis que o normal. Animais astutos são provavelmente sucintos e evasivos, enquanto os menos inteligentes frequentemente fazem comentários fúteis.', false),
  (null, 'pathfinder', 'Arma Espiritual', 2, '', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Uma arma feita de pura força mágica se materializa e ataca adversários que você designar na distância desta magia. Esta arma possui uma aparência fantasmagórica e se manifesta como a arma favorita de sua divindade.

Quando você conjurar a magia, a arma aparece próxima a um adversário escolhido na distância desta magia e desfere um Golpe contra ele. Cada vez que Sustentar a Magia, você pode mover a arma para um novo alvo na distância da magia (se necessário) e Golpeia com ela. A arma espiritual sofre e contribui para sua penalidade por ataques múltiplos.

Os Golpes da arma são ataques de magia corpo a corpo. Independentemente da aparência da arma, ela causa dano de força igual a 1d8 mais o modificador de seu atributo de conjuração, mas você pode causar dano do tipo normalmente causado pela arma em vez de dano de força (ou qualquer tipo de dano disponível para uma arma versátil). Nenhum outro traço ou estatística da arma se aplica, e mesmo um ataque com uma arma à distância ataca somente criaturas adjacentes a ela. Apesar de realizar um ataque de magia, a arma espiritual é considerada uma arma para os propósitos de acionamentos, resistências e outras regras similares.

A arma não ocupa um espaço, não concede flanqueamento nem possui quaisquer outras características que uma criatura normalmente teria. A arma não pode realizar qualquer ataque além do Golpe dela, e talentos ou magias que afetem armas não se aplicam a ela.

---

Elevada (+2) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Condição', 2, '', '2 ações', 'Toque', '', 'Until your next daily preparations', 'Enquanto você e o alvo estiverem no mesmo plano de existência e ambos estiverem vivos, você permanece ciente do estado atual dele. Você sabe a direção e distância do alvo em relação a você, assim como quaisquer condições que o estiverem afetando.

---

Elevada (4º) A distância da magia aumenta para 9 metros e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Toque da Idiotice', 2, '', '2 ações', '9 metros', '', 'Varies', 'Você embota a mente do alvo. O alvo deve tentar um salvamento de Vontade.

---
Sucesso  O alvo não é afetado.

Falha  O alvo fica estupefato 2.

Falha Crítica  O alvo fica estupefato 4.', false),
  (null, 'pathfinder', 'Raio Súbito', 2, 'Evocação', '2 ações', '18 metros', 'S, V', 'Instantânea', 'Você lança um pequeno raio no alvo, causando 4d12 de dano de eletricidade.

---

Elevada (+1) O dano aumenta em 1d12. 

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Convocar Elemental', 2, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um elemental para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço elemental e cujo nível seja 1 ou inferior.

---

Elevada (3º) Nível 2

Elevada (4º) Nível 3

Elevada (5º) Nível 5

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Remover Paralisia', 2, '', '2 ações', 'Toque', '', 'Instantânea', 'Um surto de energia liberta uma criatura paralisado. Você pode tentar neutralizar um único efeito que esteja impondo a condição paralisado ao alvo. Isto não cura alguém que esteja paralisado por algum estado ou efeito natural, tal como a paralisia causada por ferimentos ou toxinas não-mágicas.

---

Elevada (6º) A distância da magia aumenta para 9 metros e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Manobra Telecinética', 2, '', '2 ações', '18 metros', '', 'Instantânea', 'Com uma rajada de poder telecinético, você move um adversário ou algo que ele carrega. Você pode tentar Derrubar, Desarmar ou Empurrar o alvo usando uma rolagem de ataque de magia em vez de um teste de Atletismo.', false),
  (null, 'pathfinder', 'Compreender Idioma', 2, '', '2 ações', '9 metros', '', '1 hora', 'O alvo pode compreender o significado de um único idioma que estiver ouvindo ou lendo quando você conjurar a magia. Isto não permite que ele compreenda códigos, linguagens expressas em metáforas e coisas similares (sujeito ao critério do MJ). Se estiver ouvindo vários idiomas e souber disso, o alvo pode escolher qual idioma irá compreender; caso contrário, escolha um dos idiomas aleatoriamente.

---

Elevada (3º) O alvo também pode falar o idioma.

Elevada (4º) Você pode afetar até 10 criaturas e os alvos também podem falar o idioma.', false),
  (null, 'pathfinder', 'Tendência Indetectável', 2, 'Abjuração', '1 minuto', 'Toque', 'S, V, M', 'Until the next time you make your daily preparations', 'Você envolve uma criatura em defesas que escondem a tendência dela. O alvo parece ser neutro para todos os efeitos que detectariam a tendência dele.', false),
  (null, 'pathfinder', 'Respirar na Água', 2, '', '1 minuto', '9 metros', '', '1 hora', 'Os alvos podem respirar na água.

---

Elevada (3º) A duração aumenta para 8 horas.

Elevada (4º) A duração aumenta para até a próxima vez que você fizer suas preparações diárias.', false),
  (null, 'pathfinder', 'Caminhar na Água', 2, '', '2 ações', 'Toque', '', '10 minutos', 'O alvo pode andar na superfície da água e outros líquidos sem afundar neles. Ele pode ficar submerso se quiser, mas nesse caso deve Nadar normalmente. Esta magia não concede a habilidade de respirar na água.

---

Elevada (4º) A distância da magia aumenta para 9 metros, a duração aumenta para 1 hora e você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Teia', 2, 'Conjuração', '3 ações', '9 metros', 'S, V, M', '1 minuto', 'Você cria uma teia pegajosa na área que dificulta o movimento de criaturas a cada vez que elas tentarem se mover por ela. Quadrados preenchidos com a teia são terreno difícil. Cada quadrado pode ter a teia removida com um único ataque ou efeito que cause pelo menos 5 de dano cortante ou 1 de dano de fogo. Um quadrado afetado por esta magia possui CA 5 e falha automaticamente em jogadas de salvamento.

Cada vez que uma criatura na teia começa a usar uma ação de movimento ou entra na teia durante uma ação de movimento, deve tentar um teste de Atletismo ou um salvamento por Reflexo contra o sua CD de magia para evitar aplicar uma penalidade de circunstância às suas Velocidades ou se tornar imobilizado. Uma criatura que sair da teia para de sofrer a penalidade de circunstância na Velocidade dela devido a esta magia.

---

Sucesso Crítico  A criatura não é afetada e não precisa tentar mais testes de Atletismo ou jogadas de salvamento contra a teia neste turno. Se tiver usado um teste de Atletismo, ela remove a teia de todos os quadrados que atravessar após deixar esse quadrado.

Sucesso A criatura não é afetada durante a ação dela. Se tiver usado um teste de Atletismo, ela remover a teia de todos os quadrados que atravessar após deixar esse quadrado.

Falha A criatura sofre –3 metros de penalidade de circunstância nas Velocidades dela até o início do próximo turno dela.

Falha Crítica A criatura fica imobilizado até o início do próximo turno dela, e após isso sofre –3 metros de penalidade de circunstância nas Velocidades dela por 1 rodada. Ela pode tentar Escapar para remover essa condição imobilizado.

---

Elevada (4º) A área da magia aumenta para uma explosão de 6 metros e a distância aumenta para 18 metros.', false),
  (null, 'pathfinder', 'Visão Animal', 3, 'Adivinhação', '1 minuto', '36 metros', 'S, V, M', '1 hora', 'Você usa os sentidos do alvo, permitindo-lhe ver, ouvir e sentir qualquer coisa que ele perceber pela duração da magia. Se o alvo quiser impedi-lo, ele pode tentar um salvamento de Vontade, anulando a magia em um sucesso (embora a maioria dos animais não se importe de fazê-lo). Enquanto usar os sentidos do alvo, você não pode usar os sentidos de seu próprio corpo, mas pode alternar entre os sentidos de seu corpo e os sentidos do alvo usando uma ação única que possui o traço concentração.', false),
  (null, 'pathfinder', 'Compelir Morto-Vivo', 3, '', '2 ações', '9 metros', '', '1 dia', 'Com uma palavra de poder necromântico, você toma controle do alvo. Ele recebe o traço lacaio. Se você ou um aliado usar quaisquer ações hostis contra o alvo, a magia é encerrada.', false),
  (null, 'pathfinder', 'Cegueira', 3, '', '2 ações', '9 metros', '', 'Instantânea', 'Você cega o alvo. O efeito é determinado pelo salvamento de Fortitude do alvo. Após o efeito, o alvo fica temporariamente imune por 1 minuto.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica Cego até o início do próximo turno dele.

Falha  O alvo fica Cego por 1 minuto.

Falha Crítica  O alvo fica permanentemente Cego.', false),
  (null, 'pathfinder', 'Escuridão Gélida', 3, '', '2 ações', '36 metros', '', 'Instantânea', 'Você dispara um raio completamente frio de escuridão carregado com energia profana. Faça um ataque de magia à distância contra o alvo. Você causa 5d6 de dano de frio mais 5d6 de dano maligno se o alvo for um celestial.

Se o raio atravessar uma área de luz mágica ou mirar uma criatura afetada por luz mágica, escuridão gélida tenta neutralizar essa luz. Se precisar determinar se o raio atravessa uma área de luz, trace uma linha entre você e o alvo da magia.

---

Sucesso Crítico O alvo sofre o dobro do dano.

Sucesso O alvo sofre o dano inteiro.

---

Elevada (+1) O dano de frio aumenta em 2d6 e o dano maligno contra celestiais aumenta em 2d6.', false),
  (null, 'pathfinder', 'Círculo de Proteção', 3, 'Abjuração', '3 ações', 'Toque', 'S, V, M', '1 minuto', 'Você protege uma criatura e aqueles próximos dela contra uma tendência específica. Escolha bem, caos, mal ou ordem; esta magia adquire o traço oposto. Criaturas na área recebem +1 de bônus de estado na CA contra ataques feitos por criaturas da tendência escolhida e em salvamentos contra efeitos dessas criaturas. Este bônus aumenta para +3 contra efeitos dessas criaturas que controlem diretamente o alvo e contra ataques feitos por criaturas convocadas da tendência escolhida. Criaturas convocadas da tendência escolhida não podem voluntariamente entrar na área sem obter sucesso em um salvamento de Vontade; tentativas repetidas usam o resultado do primeiro salvamento.

---

Elevada (4º) A duração aumenta para 1 hora.', false),
  (null, 'pathfinder', 'Clariaudiência', 3, '', '1 minuto', '150 metros', '', '10 minutos', 'Você cria uma orelha flutuante invisível em um local na distância (mesmo se estiver fora de sua linha de visão ou linha de efeito). Essa orelha não pode se mover, mas você pode ouvir através dela como se estivesse usando seus sentidos auditivos normais.', false),
  (null, 'pathfinder', 'Crise de Fé', 3, '', '2 ações', '9 metros', '', 'Instantânea', 'Você agride a fé do alvo, impondo dúvida e turbulência mental à criatura, causando 6d6 de dano mental a ela, ou 6d8 de dano mental se ela puder conjurar magias divinas. Os efeitos são determinados pelo salvamento de Vontade dela.

Para muitas divindades, conjurar esta magia em um seguidor de sua própria divindade sem motivo significativo é um anátema.

---

Sucesso Crítico O alvo não é afetado.

Sucesso O alvo sofre metade do dano.

Falha O alvo sofre o dano inteiro; se o alvo puder conjurar magias divinas, ele fica estupefato 1 por 1 rodada.

Falha Crítica O alvo sofre o dobro do dano, fica estupefato 1 por 1 rodada e não pode conjurar magias divinas por 1 rodada.

---

Elevada (+1) O dano aumenta em 2d6 (ou em 2d8 se o alvo for um conjurador divino).', false),
  (null, 'pathfinder', 'Taça da Poeira', 3, 'Necromancia', '3 ações', '9 metros', 'S, V, M', '1 dia', 'Você amaldiçoa o alvo com uma sede que nenhuma bebida pode saciar. Você pode dispensar a magia. O alvo deve tentar um salvamento de Fortitude.
 
Sucesso Crítico A criatura não é afetada e fica temporariamente imune por 1 hora.
Sucesso A criatura esta fatigada por 1 rodada.
Falha A criatura é imediatamente atingida pela sede, como se não tivesse bebido há dias. Ele fica fatigada e recebe 1d4 de dano a cada hora que não pode ser curado até que sacie sua sede. Nenhuma quantidade de bebida pode saciar a sede da criatura durante a duração da magia.
 Falha Crítica Como falha, mas a criatura sofre 2d4 de dano a cada hora, o dobro do normal para a sede.

---

Elevada (+3) A sede se torna mais insuportável, aumentando o dano a cada hora em 1d4 ou 2d4 em uma falha crítica.

(Tradução não oficial - Gods & Magic)', false),
  (null, 'pathfinder', 'Mensagem Onírica', 3, '', '10 minutos', 'Planetário', '', 'Until your next daily preparations', 'Você envia uma mensagem para o sonho de seu alvo. A mensagem é de mão única e de até 1 minuto de fala (mais ou menos 150 palavras). Se estiver dormindo, o alvo recebe a mensagem instantaneamente. Se não, ele recebe a mensagem na próxima vez que dormir. Assim que ele a receber, a magia acaba e você sabe que a mensagem foi enviada.

---

Elevada (4º) Você pode afetar até 10 criaturas conhecidas por nome e que já tenha encontrado pessoalmente. Você deve enviar a mesma mensagem para todas elas; a magia acaba individualmente para cada criatura.', false),
  (null, 'pathfinder', 'Prender à Terra', 3, '', '2 ações', '36 metros', '', 'Varies', 'Usando o peso da terra, você prejudica o voo de uma criatura, com efeitos baseados no salvamento de Fortitude dela. Se a criatura
alcançar o chão seguramente, ela não sofre dano de queda.

---
Sucesso CríticoO alvo não é afetado.

Sucesso O alvo cai seguramente até 36 metros.

Crítica  O alvo cai seguramente até 36 metros. Se atingir o chão, ele não pode Voar, levitar ou de alguma outra forma sair do chão por 1 rodada.

Falha Crítica  O alvo cai seguramente até 36 metros. Se atingir o chão, ele não pode Voar, levitar ou de alguma outra forma sair do chão por 1 minuto.', false),
  (null, 'pathfinder', 'Subjugar', 3, '', '2 ações', '36 metros', '', 'Sustentada', 'Suas palavras fascinam seus alvos. Você fala ou canta sem interrupção durante toda a conjuração e duração da magia. Alvos que perceberem seu discurso ou canção devem prestar atenção completamente; cada alvo deve tentar um salvamento de Vontade. O MJ pode conceder um bônus de circunstância (até um máximo de +4) se o alvo for de uma religião, ancestralidade ou inclinação política oposta, ou se de alguma outra forma estiver inclinado a discordar do que você está dizendo.
Cada criatura que entrar na distância deve tentar um salvamento quando você Sustentar a Magia. Se você estiver falando, subjugar ganha o traço linguístico.
Sucesso Crítico O alvo não é afetado e percebe que você tentou usar uma magia.
Sucesso O alvo não precisa prestar atenção, mas não percebe que você tentou usar uma magia (embora possa perceber que outros estão subjugados).
Falha O alvo fica fascinado por você. Ele pode tentar outro salvamento de Vontade se testemunhar ações ou fala das quais discorde. Se obtiver sucesso, ele não está mais fascinado e fica temporariamente imune por 1 hora. Se o alvo for sujeitado a um ato hostil, ou se outra criatura obtiver sucesso em um teste de Diplomacia ou Intimidação contra ele, a fascinação é encerrada imediatamente.
Falha Crítica Como falha, mas o alvo não pode tentar um salvamento para encerrar o fascínio se discordar de você.', false),
  (null, 'pathfinder', 'Pés em Barbatanas', 3, '', '2 ações', 'Toque', '', '10 minutos', 'Os pés do alvo se transformam em barbatanas, aprimorando mobilidade na água, mas reduzindo-a em terra. O alvo adquire uma Velocidade de natação igual à Velocidade em terra normal dele, mas essa Velocidade em terra se torna 1,5 metros.

---

Elevada (6º) A magia dura até a próxima vez que você fizer suas preparações diárias.', false),
  (null, 'pathfinder', 'Bola de Fogo', 3, '', '2 ações', '150 metros', '', 'Instantânea', 'Uma explosão estrondosa de fogo aparece no ponto que você designa, causando 6d6 de dano de fogo.

---

Elevada (+1)O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Arma Fantasmagórica', 3, '', '2 ações', 'Toque', '', '5 minutos', 'A arma alvo fica translúcida e fantasmagórica, podendo afetar criaturas e objetos materiais e incorpóreos. Ela pode ser empunhada por uma criatura corpórea ou incorpórea e recebe os efeitos da runa de propriedade toque fantasma.', false),
  (null, 'pathfinder', 'Glifo de Guarda', 3, 'Abjuração', '10 minutos', 'Toque', 'S, V, M', 'Ilimitada', 'Você cria uma armadilha ao esconder uma magia hostil em um símbolo. Enquanto Conjurar esta Magia, você também pode conjurar uma magia de um nível de magia inferior para armazenar no glifo. A magia armazenada deve usar 3 ações ou menos para ser conjurada, possuir um efeito hostil e afetar uma criatura ou possuir uma área. Você pode determinar uma senha, um acionamento ou ambos para o glifo. Uma criatura ativa o glifo se abrir, mover ou tocar o recipiente alvo ou se entrar na área sem falar a senha ou ativando o acionamento. Quando isso acontece, o glifo libera a magia nociva dentro dele.

OApós uma magia ser armazenada no glifo, o glifo adquire todos os traços dessa magia. Se a magia armazenada afetar uma ou mais criaturas, ela afeta a criatura que ativou o glifo. Se ela tiver uma área, essa área é centrada na criatura que ativou o glifo. A duração do glifo de guarda acaba quando o glifo é acionado. O glifo é considerado uma armadilha mágica, utilizando sua CD de magia para o teste de Percepção para ser percebido e para o teste de Ladroagem para ser desativado; ambos os testes requerem que a criatura realizando-os seja treinada para poder obter sucesso.

Você pode Dispensar glifo de guarda. A quantidade máxima de glifos de guarda que você pode possuir ativos ao mesmo tempo é igual ao modificador de seu atributo de conjuração.', false),
  (null, 'pathfinder', 'Fonte de Gravidade', 3, 'Evocação', '2 ações', '36 metros', 'S, V', 'Instantânea', 'Você cria uma esfera de gravidade alterada. Todas as criaturas e objetos não protegidos na área se movem em direção ao centro, dependendo dos seus testes de resistência de Reflexo. Isto segue as regras para movimento forçado. Se não houver espaço suficiente perto do centro da esfera, as criaturas e os objetos mais próximos do centro se moverão primeiro e outros se moverão o mais longe que puderem sem serem bloqueados, até o valor definido pelos resultados dos testes de resistência.

Sucesso Crítico A criatura não é afetada.
Sucesso A criatura se move 1,5 metros em direção ao centro.
Falha A criatura se move 4,5 metros em direção ao centro.
Falha Crítica A criatura se move 9 metros em direção ao centro. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Rapidez', 3, '', '2 ações', '9 metros', '', '1 minuto', 'Magia energiza o alvo para que ele aja mais rápido. Ele adquire a condição acelerado e pode usar a ação extra a cada rodada somente para ações de Andar ou Golpear.

---

Elevada (7º)Você pode afetar até 6 criaturas', false),
  (null, 'pathfinder', 'Heroísmo', 3, '', '2 ações', 'Toque', '', '10 minutos', 'Você inflama o heroísmo interior do alvo, concedendo-o +1 de bônus de estado em jogadas de salvamento, rolagens de ataque, testes de Percepção e testes de perícia.

---

Elevada (6º)O bônus de estado aumenta para +2.

Elevada (9º)O bônus de estado aumenta para +3.', false),
  (null, 'pathfinder', 'Luz Abrasadora', 3, '', '2 ações', '36 metros', '', 'Instantânea', 'Você dispara um raio abrasador de luz mesclada com energia sagrada. Faça um ataque de magia à distância. O raio causa 5d6 de dano de fogo. Se o alvo for um ínfero ou morto-vivo, você causa 5d6 de dano bondoso extra.

Se a luz atravessar uma área de escuridão mágica ou se atingir uma criatura afetada por escuridão mágica, luz abrasadora tenta neutralizar essa escuridão. Se você precisar determinar se o raio atravessa uma área de escuridão, trace uma linha entre você e o alvo da magia.

---

Sucesso Crítico O alvo sofre o dobro do dano, assim como o dobro do dano bondoso se for um ínfero ou morto-vivo.

Sucesso O alvo sofre o dano inteiro.

---

Elevada (+1) O dano de fogo aumenta em 2d6 e o dano bondoso contra ínferos e mortos-vivos aumenta em 2d6.', false),
  (null, 'pathfinder', 'Hipercognição', 3, '', '1 ação', '', '', 'Instantânea', 'Você cataloga e coleta informações relevantes sobre sua situação atual. Você pode instantaneamente usar até 6 ações de Recordar Conhecimento como parte de Conjurar esta Magia. Para estas ações, você não pode usar habilidades especiais, reações ou ações livres acionadas ao Recordar Conhecimento.', false),
  (null, 'pathfinder', 'Padrão Hipnótico', 3, 'Ilusão', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Você cria um padrão de cores alternantes que paira no ar em uma nuvem geométrica. Criaturas ficam ofuscado enquanto estiverem dentro do padrão. Além disso, uma criatura deve tentar um salvamento de Vontade se estiver dentro do padrão quando você conjurá-lo se ela encerrar o turno dentro do padrão ou se usar uma ação de Buscar ou Interagir no padrão. Uma criatura atualmente fascinado pelo padrão não tenta novos salvamentos.

---
Successo O alvo não é afetado.

Falha  O alvo é fascinado pelo padrão.

Critical Failure  O alvo é fascinado pelo padrão. Enquanto permanecer fascinado, ele não pode usar reações.', false),
  (null, 'pathfinder', 'Forma de Inseto', 3, '', '2 ações', '', '', '1 minuto', 'Você visualiza um inseto simples e se transforma na forma de batalha de um animal Médio. Quando conjurar esta magia, escolha aranha, besouro, centopeia, escorpião, formiga ou louva-a-deus. Você pode decidir o tipo específico de animal (como joaninha ou escaravelho para besouro), mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire o traço animal. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 18 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
10 Pontos de Vida temporários.
Visão na penumbra.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +13 e seu bônus de dano é +2. Estes ataques são baseados em Força (para o propósito da condição Enfraquecido, por exemplo). Se seu modificador de ataque para ataques desarmados baseados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.  
+13 de modificador de Atletismo, exceto se o seu próprio modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

AranhaVelocidade 7,5 metros, Velocidade de escalada 7,5 metros, visão no escuro;  Corpo a corpo   presas,  Dano 1d6 perfurante mais 1d4 persistente de veneno; Distância  teia (incremento de distância 6 metros), Dano emaranha o alvo por 1 rodada.

Besouro Velocidade 7,5 metros; Corpo a Corpo  mandíbulas, Dano 2d10 contundente.

Centopeia Velocidade 7,5 metros, Velocidade de escalada 7,5 metros, visão no escuro; Corpo a Corpo  mandíbulas, Dano 1d8 perfurante mais 1d4 persistente de veneno. 

EscorpiãoVelocidade 12 metros, sentido sísmico impreciso 18 metros, visão no escuro; Corpo a Corpo  ferrão, Dano 1d8 perfurante mais 1d4 persistente de veneno; Corpo a Corpo  pinça (ágil), Dano 1d6 contundente. 

Formiga Velocidade 9 metros, Velocidade de escalada 9 metros; Corpo a Corpo  mandíbulas, Dano 2d6 contundente.

Louva-a-deus Velocidade 12 metros, faro impreciso 9 metros; Corpo a Corpo  perna dianteira, Dano 2d8 contundente.

---

Elevada (4º) Sua forma de batalha é Grande e seus ataques possuem alcance de 3 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe 15 PV temporários, +16 de modificador de ataque, +6 de bônus de dano e +16 de Atletismo em vez dos valores iniciais.

Elevada (5º) Sua forma de batalha é Enorme e seus ataques possuem alcance de 4,5 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe 20 PV temporários, +18 de modificador de ataque, +2 de bônus de dano, o dobro de dados de dano (incluindo Dano Persistente) e +20 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Esfera de Invisibilidade', 3, 'Ilusão', '2 ações', '', 'S, M', '10 minutos', 'Você e todos os alvos ficam invisíveis exceto uns para os outros enquanto permanecerem dentro da área da magia. Se uma criatura tornada invisível por esta magia deixar a área da magia, ela fica visível e permanece visível mesmo que retorne para a área da magia. Se qualquer criatura tornada invisível por esta magia usar uma ação hostil, a magia é encerrada após a ação hostil ser completada.

Durante a exploração, é fácil mover-se lentamente e permanecer invisível. Entretanto, isto é insustentável em uma batalha. Após um encontro começar, criaturas permanecem invisíveis no máximo até o final da primeira rodada, momento em que a magia é encerrada.

---

Elevada (5º) A duração aumenta para 1 hora.', false),
  (null, 'pathfinder', 'Levitação', 3, '', '2 ações', 'Toque', '', '5 minutos', 'Você desafia a gravidade e levita o alvo a 1,5 metros do chão. Pela duração da magia, você pode mover o alvo 3 metros para cima ou para baixo com uma ação única que possui o traço concentração. Uma criatura flutuando no ar por levitação sofre –2 de penalidade de circunstância em rolagens de ataque. Uma criatura flutuante pode gastar uma ação de Interagir para se estabilizar e anular esta penalidade pelo restante do turno dela. Se estiver adjacente a um objeto fixado ou um terreno de estabilidade adequada, o alvo pode mover- se pela superfície ao escalar (se a superfície for vertical, como uma parede) ou rastejar (se a superfície for horizontal, como o teto). O MJ determina quais superfícies podem ser escaladas ou rastejadas.', false),
  (null, 'pathfinder', 'Relâmpago', 3, '', '2 ações', '', '', 'Instantânea', 'Um relâmpago dispara de sua mão, causando 4d12 de dano de eletricidade.

---

Elevada (+1) O dano aumenta em 1d12.', false),
  (null, 'pathfinder', 'Localizar', 3, '', '10 minutos', '150 metros', '', 'Sustentada', 'Você descobre a direção do alvo (se você selecionar um objeto específico, como “a espada da minha mãe”) ou o alvo mais próximo (se você selecionar um tipo de objeto, como “espadas”). Se o alvo for um objeto específico, você deve ter observado-o diretamente com seus próprios sentidos. Se for um tipo de objeto, você ainda precisa ter uma imagem mental apurada do tipo do objeto. Se houver chumbo ou água corrente entre você e o alvo, esta magia não consegue localizar o objeto. Isto significa que você pode encontrar um tipo de objeto bem mais distante se o mais próximo estiver atrás de chumbo ou água corrente.

---

Elevada (5º) Você pode afetar uma ancestralidade ou criatura específica em vez de um objeto, mas deve ter encontrado ou visto de perto a criatura ou ancestralidade escolhida.', false),
  (null, 'pathfinder', 'Ler Mente', 3, '', '2 ações', '9 metros', '', '1 rodada or Sustentada até 1 minuto', 'Com um toque mental superficial, você tenta ler a mente do alvo. Ele deve tentar um salvamento de Vontade. O alvo fica temporariamente imune às suas magias de ler mente por 1 hora.

---
Successo Crítico  O alvo percebe os seus pensamentos superficiais vagos seus quando você Conjurar a Magia.

Successo  Você descobre se o modificador de Inteligência do alvo é maior, igual ou menor que o seu.

Falha  Você percebe pensamentos superficiais vagos do alvo quando você Conjurar a Magia e descobre se o modificador de Inteligência dele é maior, igual ou menor do que o seu.

Falha Crítica  Como falha, e pela duração da magia, você pode Sustentar a Magia para detectar pensamentos superficiais do alvo novamente. O alvo não recebe quaisquer salvamentos adicionais.', false),
  (null, 'pathfinder', 'Mesclar-se ás Rochas', 3, '', '2 ações', '', '', '10 minutos or 8 horas', 'Você se mescla com um bloco de pedra adjacente que tenha volume o suficiente para abrigá-lo e suas posses vestidas e seguradas. Você deve tocar a pedra quando Conjurar esta Magia. Você pode ouvir, mas não ver, o que está ocorrendo fora da pedra e pode conjurar magias enquanto estiver dentro da pedra desde que elas não requeiram linha de efeito além da pedra.

Dano físico significativo causado à pedra enquanto você estiver dentro dela o expele e causa 10d6 de dano a você. Criar passagem expele você sem causar qualquer dano e encerra mesclar-se às rochas. Você pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Paralisar', 3, '', '2 ações', '9 metros', '', 'Varies', 'Você bloqueia os impulsos motores do alvo antes que eles possam sair da mente dele, ameaçando paralisá-lo. O alvo deve tentar um salvamento de Vontade.

---

Successo Crítico O alvo não é afetado.

Successo O alvo fica  Stunned 1.

Falha O alvo fica Paralyzed por 1 rodada.

FalhaO alvo fica  Paralyzed por 4 rodadas. No início de cada um dos turnos dele, o alvo deve tentar um novo salvamento de Vontade para reduzir a duração em 1 rodada, ou encerrá-la inteiramente em um sucesso crítico.

---

Elevada (7º) Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Pilar de Água', 3, '', '3 ações', '36 metros', '', '1 minuto', 'Você cria um cilindro grande e independente de água parada e fresca. O pilar tem um raio máximo de 4,5 metros e uma altura máxima de 18 metros. Criaturas dentro do pilar podem nadar através da água normalmente (Nadar CD 10), ou, se a magia foi lançada em terreno sólido, caminhar ao longo do fundo (que é um terreno difícil). Qualquer criatura que sai do pilar cai ou cai de acordo.  

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Pirotecnia', 3, 'Transmutação', '2 ações', '36 metros', 'S, M', 'Sustentada até 1 minuto', 'Você transforma um fogo em uma explosão de fogos de artifício ofuscantes ou em uma nuvem espessa de fumaça sufocante, escolhida quando você Conjurar a magia. A magia tem como alvo uma fonte de fogo, que é imediatamente extinta se for um fogo não mágico do tamanho de uma fogueira ou menor. Se a fonte de fogo é uma criatura, a criatura sofre 1d6 pontos de dano de frio e não é extinta. 

Fogos de Artifício  O fogo alvejado explode em uma variedade colorida de fogos de artifício aéreos chamativos, ardentes e brilhantes em uma explosão de 6 metros de raio. Na primeira vez em que você Sustenta a magia a cada rodada, você pode fazer com que a área de fogos de artifício suba até 6 metros, mas não pode mover a área lateralmente. As criaturas que começam sua vez na área dos fogos de artifício devem fazer um salvamento de Fortitude e ficam temporariamente imunes por 1 minuto. 
Sucesso Crítico A criatura não é afetada.
Sucesso A criatura fica ofuscada até o final de seu próximo turno.
Falha A criatura fica cega até o final de seu próximo turno.
Falha Crítica A criatura fica cega por 1 minuto.
Nuvem de Fumaça  Uma fumaça espessa se eleva do fogo e se forma em uma nuvem que se espalha para preencher um raio de 6 metros centrado no fogo alvo. As criaturas dentro da nuvem de fumaça sofrem uma penalidade de -4 circunstâncias nas verificações de Percepção visual, e as criaturas fora da nuvem de fumaça sofrem uma penalidade de -4 circunstâncias nas verificações de Percepção visual para detectar criaturas ou objetos dentro dela. Na primeira vez em que você Sustenta a magia a cada rodada, você pode fazer com que a nuvem de fumaça desça até 6 metros, mas não pode mover a área lateralmente. As criaturas que começam sua vez na nuvem de fumaça devem fazer um salvamento em Fortitude e ficam temporariamente imunes por 1 minuto. 
Sucesso A criatura não é afetada.
Falha A criatura fica enjoada 1.
Falha Crítica A criatura fica enjoada 1 e não pode se recuperar da condição enjoado enquanto estiver na área da nuvem de fumaça. 

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Remover Doença', 3, 'Necromancia', '10 minutos', 'Toque', 'S, V, M', 'Instantânea', 'Cura mágica purga uma doença do corpo de uma criatura. Você tenta neutralizar uma doença que esteja afligindo o alvo.', false),
  (null, 'pathfinder', 'Zona da Verdade', 3, '', '', '9 metros', '', '10 minutos', 'Você designa uma área na qual criaturas são compelidas a falar somente a verdade. Criaturas dentro da área ou que entrarem nela têm dificuldade em mentir. Cada criatura potencialmente afetada deve tentar um salvamento de Vontade quando a magia for conjurada ou quando a criatura entrar na área pela primeira vez. Ela usa os resultados deste salvamento inicial se sair e reentrar na área. Criaturas afetadas ficam cientes deste encantamento; portanto, podem evitar responder questões que normalmente responderiam com uma mentira, ou então podem ser evasivas desde que permaneçam dentro dos limites da verdade.

---
Sucesso Crítico O alvo não é afetado.

Sucesso O alvo sofre –2 de penalidade de estado em testes de Dissimulação.

Falha O alvo não pode falar quaisquer mentiras deliberadas e intencionais e sofre –2 de penalidade de estado em testes de Dissimulação.

Falha Crítica O alvo não pode falar quaisquer mentiras deliberadas e intencionais e sofre –4 de penalidade de estado em testes de Dissimulação.', false),
  (null, 'pathfinder', 'Solo Santificado', 3, 'Abjuração', '1 minuto', '', 'S, V, M', 'Until the next time you make your daily preparations.', 'Você santifica a área, aspergindo-a com água benta e protegendo-a contra seus adversários. Escolha aberrações, celestiais, dragões, ínferos, monitores ou mortos-vivos. Todas as criaturas na área recebem +1 de bônus de estado na CA, rolagens de ataque, rolagens de dano e jogadas de salvamento contra as criaturas escolhidas.', false),
  (null, 'pathfinder', 'Página Secreta', 3, 'Ilusão', '1 minuto', 'Toque', 'S, V, M', 'Ilimitada', 'Você muda o texto escrito no alvo para um texto inteiramente diferente. Se o texto for um grimório ou pergaminho, você pode mudá-lo para mostrar uma magia que você conhece do nível da página secreta ou inferior. Você também pode transformar o texto em algum outro texto que você tenha escrito ou ao qual tenha acesso. Você pode especificar uma senha que permite que uma criatura toque a página para alternar o texto entre o antigo e o novo. Você deve escolher o texto de substituição e a senha, se houver, quando Conjurar a Magia.', false),
  (null, 'pathfinder', 'Areia Movediça', 3, 'Transmutação', '3 ações', '9 metros', 'S, V, M', 'Sustentada até 1 minuto', 'Você faz com que a superfície se solte. A área se torna um terreno difícil e quaisquer trilhas na área são destruídas pelo chão agitado. As criaturas que estão na área recebem uma penalidade de status -1 nos testes de Acrobacias para Equilibrar e Atravessar Acrobraticamente nos testes de Atletismo para Salto em Altura e Salto em Distância. Quando você Sustentar a magia, pode mover a área de agitação até 3 metros em qualquer direção. Criaturas imobilizadas pela magia são transportadas junto com a areia movediça na mesma direção, se possível; esse movimento é um movimento forçado. As criaturas que entram ou começam sua vez de pé na areia movediça devem fazer um teste de Reflexos.
 
Critical Success A criatura não é afetada e ignora o terreno difícil da área e a penalidade nos testes de habilidade até o final do seu turno.
Sucesso A criatura ignora a penalidade da área em testes de habilidade até o final do seu turno.
Falha A criatura é afetada normalmente pela magia neste turno.
 Falha Crítica A criatura fica imobilizada dentro da área da magia até Escapar. Se a criatura já estava imobilizada pelas areias movediças, ela também cai prostrada.

---

Elevada (5º) A penalidade de status aumenta para –2 e o alcance da mágica aumenta para 18 metros.
 Elevada (7º) A penalidade de status aumenta para –3, o alcance da mágica aumenta para 19 metros e a área da magia aumenta para uma explosão de 9 metros.
 Elevada (9º) A penalidade de status aumenta para –4, o alcance da magia aumenta para 18 metros e a área da magia aumenta para uma explosão de 12 metros. 

(Tradução não oficial - Gods anda Magic)', false),
  (null, 'pathfinder', 'Mostre o Caminho', 3, 'Adivinhação', '10 minutos', '', 'S, V, M', '8 horas', 'Você e os aliados afetados adquirem conhecimento sobrenatural do caminho à frente, permitindo que você intua o melhor caminho a seguir e evite possíveis obstáculos, como terrenos difíceis ou confusos. Para fins de viagens terrestres de longa distância durante o modo de exploração, viajar por terrenos difíceis reduz você a apenas três quartos da sua velocidade de viagem em vez de metade, e viajar por terrenos mais difíceis reduz a velocidade de sua viagem para apenas metade da sua velocidade de viagem em vez de um-terço. Mostrar o caminho não impede que você caia em armadilhas ou encontre outros obstáculos e perigos artificiais.

---

Elevada (+6) Para fins de viagens terrestres de longa distância durante o modo de exploração, viajar por terrenos difíceis não reduz a velocidade de sua viagem, e viajar por terrenos mais difíceis reduz a velocidade de viagem para apenas três-quartos do seu valor normal em vez de um-terço. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Encolher Item', 3, 'Transmutação', '10 minutos', 'Toque', 'S, V', 'Until the next time you make your daily preparations.', 'Você encolhe o alvo para um tamanho similar ao de uma moeda. Isto o reduz para Volume desprezível. Você pode Dispensar esta magia e ela é encerrada se você jogar o objeto em uma superfície sólida. O objeto não pode ser usado para atacar ou causar dano durante o processo de retornar ao tamanho normal. Se não houver espaço para o objeto retornar ao tamanho normal quando a magia acabar, a duração da magia continua até o objeto estar em um local grande o suficiente para acomodá-lo em seu tamanho normal.', false),
  (null, 'pathfinder', 'Lentidão', 3, '', '2 ações', '9 metros', '', 'Varies', 'Você dilata o fluxo do tempo ao redor do alvo, tornando as ações dele mais lentas.

---
Suceso Crítico  O alvo não é afetado.

Sucesso  O alvo fica Slowed 1 por 1 rodada.

Falha  O alvo fica Slowed 1 por 1 minuto.

Falha Crítica  O alvo fica Slowed 2 por 1 minuto.

---
Elevada (6º)  Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Falar com Plantas', 3, '', '2 ações', '', '', '1 hora', 'Você pode fazer perguntas e receber respostas de plantas, mas a magia não as torna mais amigáveis ou inteligentes que o normal. A maioria das plantas normais possui uma visão distintas do mundo ao redor delas e, portanto, não reconhecem detalhes sobre criaturas ou sabem qualquer coisa sobre o mundo além dos arredores delas. Criaturas plantas astutas provavelmente são sucintas e evasivas, enquanto as menos inteligentes frequentemente fazem comentários fúteis.', false),
  (null, 'pathfinder', 'Nuvem Fétida', 3, 'Conjuração', '2 ações', '36 metros', 'S, V', '1 minuto', 'Você cria uma nuvem de brumas pútridas na área. A nuvem funciona como bruma obscurecente (página 323), exceto que ela enjoa criaturas que encerrarem os turnos delas dentro da nuvem. (A condição ocultado não é um efeito de veneno.)

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura fica enjoado 1.

Falha  A criatura fica enjoado 1 e lento 1 enquanto estiver na nuvem.

Falha Crítica  A criatura fica enjoado 2 e lento enquanto estiver na nuvem.', false),
  (null, 'pathfinder', 'Ventania Fora de Estação', 3, 'Evocação', '2 ações', '18 metros', 'S, V', 'Until the start of your next turn', 'Você lança uma rajada de vento repentino que ondula para fora do centro da explosão. O vento extingue pequenos incêndios não mágicos, dispersa neblina e nevoa, espalha objetos de volume leve ou menor e empurra objetos não seguros de volume 1  ou menos a 1,5 metros de distância do ponto de origem da magia. Cada criatura Média ou menor na área quando você lança a magia ou que se move para a área da magia deve tentar um teste de resistência de Fortitude.

Sucesso A criatura não é afetada.
Falha A criatura é prostrada. Se a criatura estava voando, em vez disso, ocorre uma falha crítica.
 Falha Crítica A criatura é empurrada 9 metros de distância do centro da explosão, é prostrada e sofre 2d6 de dano por espancamento.', false),
  (null, 'pathfinder', 'Toque Vampírico', 3, '', '2 ações', 'Toque', '', 'Instantânea', 'Seu toque drena o sangue de um alvo para reforçar você mesmo. Você causa 6d6 de dano negativo ao alvo. Você recupera Pontos de Vida temporários iguais à metade do dano negativo que o alvo sofrer (após aplicar resistências e similares). Você perde quaisquer Pontos de Vida temporários após 1 minuto.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Indetecção', 3, '', '10 minutos', 'Toque', '', '8 horas', 'Você ergue defesas protetoras que tornam o alvo difícil de detectar através de magia. Indetecção tenta neutralizar todas as adivinhações de detecção, vidência e revelação feitas contra o alvo ou aos equipamentos dele por toda a duração, considerando truques mágicos como magias de 1º nível para este propósito. Obter sucesso em neutralizar uma adivinhação que afetar uma área ou múltiplos alvos anula os efeitos somente para o alvo de indetecção.', false),
  (null, 'pathfinder', 'Muralha de Espinhos', 3, '', '3 ações', '18 metros', '', '1 minuto', 'Ao longo de um minuto, você faz uma muralha de galhos espinhentos crescer do chão. Você cria uma muralha de espinheiros em uma linha reta de até 18 metros de comprimento e 3 metros de altura. Você deve criar a muralha em um espaço aberto ininterrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida. A muralha se ergue verticalmente. Se você quiser, a muralha pode ser menor em comprimento e altura. Tudo que estiver de um lado da muralha recebe cobertura contra criaturas que estejam do lado oposto, e os espaços da muralha são terreno difícil. Para cada ação de movimento que uma criatura usar para entrar em pelo menos um dos espaços da muralha, essa criatura sofre 3d4 de dano perfurante.

Cada seção de 1,5 metros por 1,5 metros de lado da muralha possui CA 10, Dureza 10, 20 Pontos de Vida e é imune a acertos críticos e dano de precisão. Uma seção destruída pode ser atravessada livremente.

---

Elevada (+1) Os Pontos de Vida de cada seção da muralha aumentam em 5, e o dano perfurante aumenta em 1d4.', false),
  (null, 'pathfinder', 'Muralha de Vento', 3, '', '3 ações', '36 metros', '', '1 minuto', 'Você cria uma barreira de ventos fortes que impedem qualquer coisa de atravessá-la. A muralha de ventos rodopiantes possui 1,5 metros de espessura, 18 metros de comprimento e 9 metros de altura. A muralha se ergue verticalmente, mas você pode moldar o caminho dela. Embora a muralha de vento distorça o ar, ela não impede a visão. A muralha possui os efeitos a seguir.

Projéteis de ataques à distância físicos — como balas de funda, flechas, virotes e outros objetos de tamanho similar — não podem atravessar a muralha. Ataques com armas à distância maiores, como azagaias, sofrem –2 de penalidade de circunstância em suas rolagens de ataque se passarem pela muralha. Armas à distância massivas e efeitos de magia que não criam objetos físicos atravessam a muralha sem nenhuma penalidade.
A muralha é terreno difícil para criaturas que tentem atravessá-la pelo chão. Gases, incluindo criaturas em forma gasosa, não podem atravessar a muralha.
Uma criatura que tentar voar através da muralha usando uma ação de movimento deve tentar um salvamento de Fortitude.

---

Sucesso Crítico A criatura pode se mover através da muralha normalmente neste turno.

Sucesso A criatura pode se mover através da muralha neste turno, mas a muralha é terreno difícil.

Falha A muralha impede o movimento da criatura voadora e qualquer movimento remanescente da ação atual é desperdiçado.

Falha Crítica Como falha, mas a criatura é empurrada 3 metros para longe da muralha.', false),
  (null, 'pathfinder', 'Orientação do Andarilho', 3, 'Adivinhação', '1 minuto', '', 'S, V, M', 'Until your next daily preparations', 'Você recorre a forças externas para guiar sua rota. Quando Conjurar esta Magia, escolha um destino; você recebe uma rota inspirada que leva até esse destino, permitindo que você e aliados que viajarem em sua companhia por terra reduzam a penalidade de movimento por terreno difícil à metade pela duração da magia — desde que você não desvie da rota inspirada. Isto não exerce nenhum efeito no movimento durante encontros. Se você usar esta habilidade novamente antes da duração acabar, este efeito é encerrado e substituído pelo da nova rota.', false),
  (null, 'pathfinder', 'Lenços Giratórios', 3, 'Abjuração', '2 ações', '', 'S, V', '1 minuto', 'Você se envolve em um vórtice de lenços coloridos de força que ofuscam você e desorientam seus inimigos. Você ganha os benefícios da condição ocultado, mas apenas contra ataques à distância e corpo a corpo. Quando um ataque corpo a corpo falha em atingi-lo por causa da verificação de acerto da condição ocultado, os lenços prendem a arma ou o ataque desarmado, e a criatura sofre uma penalidade de -1 de circunstância para novos ataques com essa arma ou ataque desarmado até o final de seu turno (ou no final do próximo turno, se não for o turno da criatura). O momento do movimento dos lenços é mais difícil de prever para atacantes à distância, portanto a verificação de acerto da condição ocultado contra ataques à distância aumenta de CD 5 para CD 6. Você pode Dispensar essa magia.

---

Elevada (+2) A penalidade da circunstância para ataques adicionais com uma arma corpo a corpo ou ataque desarmado aumenta em 1. O CD do teste para a condição ocultado contra ataques à distância aumenta em 1.', false),
  (null, 'pathfinder', 'Forma Aérea', 4, '', '2 ações', '', '', '1 minuto', 'Você usa sua maestria das forças primais para remoldar seu corpo na forma de batalha de um animal voador Médio. Quando conjurar esta magia, escolha morcego, pássaro, pterossauro ou vespa. Você pode decidir o tipo específico de animal (como uma águia ou coruja para pássaro), mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire o traço animal. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher: 

CA = 18 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
5 Pontos de Vida temporários.
Visão na penumbra.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +16 e seu bônus de dano é +5. Estes ataques são baseados em Destreza (para o propósito da condição Desajeitado, por exemplo). Se seu modificador de ataque para ataques desarmados baseados em Destreza for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+16 de modificador de Acrobatismo, exceto se o seu próprio modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

Morcego Velocidade 6 metros, Velocidade de voo 9 metros; ecolocalização precisa 12 metros; Corpo a Corpo  presas, Dano 2d8 perfurante; Corpo a Corpo  asa (ágil), Dano 2d6 contundente.
Pássaro Velocidade 3 metros, Velocidade de voo 15 metros; Corpo a Corpo  bico, Dano 2d8  perfurante; Corpo a Corpo  unha (ágil), Dano 1d10 cortante.
Pterossauro Velocidade 3 metros, Velocidade de voo 9 metros; faro impreciso 9 metros; Corpo a Corpo  bico, Dano 3d6 perfurante.
Vespa Velocidade 6 metros, Velocidade de voo 12 metros; Corpo a Corpo  ferrão, Dano 1d8 perfurante mais 1d6 persistente de veneno.

---

Elevada (5º) Sua forma de batalha é Grande e sua Velocidade de voo recebe +3 metros de bônus de estado. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe 10 PV temporários, +18 de modificador de ataque, +8 de bônus de dano e +20 de Acrobatismo em vez dos valores iniciais.
Elevada (6º) Sua forma de batalha é Enorme, sua Velocidade de voo recebe +4,5 metros de bônus de estado e seus ataques possuem alcance de 3 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 21 + seu nível, 15 PV temporários, +21 de modificador de ataque, +4 de bônus de dano, o dobro de dados de dano (incluindo Dano Persistente) e +23 de Acrobatismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Caminhar no Ar', 4, 'Transmutação', '2 ações', 'Toque', 'S, V', '5 minutos', 'O alvo pode caminhar no ar como se fosse chão sólido. Ele pode subir e descer desta forma em um ângulo máximo de 45 graus.', false),
  (null, 'pathfinder', 'Represália Anatemática', 4, 'Encantamento', 'reação', '9 metros', 'S, V', 'Instantânea', 'Acionamento Uma criatura executa um ato anátema para sua divindade.

---

Você pune uma criatura que transgrida contra sua divindade, direcionando a angústia que você sente por ver um anátema de sua divindade sendo cometido. Você pode conjurar esta magia somente quando uma criatura cometer ativamente um ato único de anátema. Por exemplo, se criar mortos-vivos for anátema para sua divindade, você poderia usar represália anatemática em um necromante que acabou de criar mortos-vivos na sua frente, mas não em uma criatura morta-viva simplesmente por ela existir. Você causa 4d6 de dano mental ao alvo, mas um salvamento básico de Vontade pode reduzir este dano. Se falhar, ele também fica  Estupefato 1 por 1 rodada. A criatura fica temporariamente imune por 1 minuto.

---

Elevada (+1) O dano aumenta em 1d6.', false),
  (null, 'pathfinder', 'Clarividência', 4, '', '1 minuto', '150 metros', '', '10 minutos', 'Você cria um olho flutuante invísivel em um local na distância (mesmo se estiver fora de sua linha de visão ou linha de efeito). Esse olho não pode se mover, mas você pode ver através dele como se estivesse usando seus sentidos visuais normais.', false),
  (null, 'pathfinder', 'Maldição do Palhaço', 4, 'Encantamento', '2 ações', 'Toque', 'S, V', 'Varies', 'Você aflige o alvo com uma maldição que o faz emitir ruídos ridículos enquanto se move. Além disso, as mãos e os pés do alvo se tornam estranhos e descoordenados, como se usassem luvas e sapatos grandes. 

Sucesso Crítico O alvo não é afetado.
Sucesso Durante 1 rodada, o alvo deve rolar duas vezes e usar o pior resultado sempre que tentar fazer acrobacias, furtividade ou ladroagem. Se o alvo realizar uma falha em uma verificação de Acrobacia, Furtividade ou Ladroagem, ocorrerá uma falha crítica.
Falha Como sucesso, mas o efeito é de 1 hora.
 Falha Crítica Como sucesso, exceto que o efeito é permanente.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Confusão', 4, '', '2 ações', '9 metros', '', '1 minuto', 'Você confunde seu alvo com impulsos estranhos, fazendo-o agir aleatoriamente. Os efeitos são determinados pelo salvamento de Vontade do alvo. Você pode Dispensar esta magia.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo balbucia incoerentemente e fica atordoado 1.

Falha  O alvo fica confuso por 1 minuto. Ele pode tentar um novo salvamento ao final de cada um dos turnos dele para encerrar
a confusão.

Falha Crítica  O alvo fica confuso por 1 minuto sem salvamento para encerrar o efeito previamente.

---
Elevada (8º)  Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Criação', 4, '', '1 minuto', '0 metros', '', '1 hora', 'Você conjura um objeto temporário de energia mística. Ele deve ser composto de matéria vegetal (como madeira ou papel) e ter 150 litros ou menos de tamanho. Ele não contém arte intrincada ou partes móveis complexas, nunca atende a um custo ou algo similar e não pode ser feito de materiais preciosos ou materiais de raridade incomum ou mais raros. Ele é obviamente conjurado temporariamente, portanto, não pode ser vendido ou passado para frente como um item genuíno.

---

Elevada (5º) O item é de metal e pode incluir minerais comuns, como feldspato ou quartzo.', false),
  (null, 'pathfinder', 'Detectar Vidência', 4, '', '2 ações', '', '', '1 hora', 'Ao examinar vestígios de auras de adivinhação, você detecta a presença de efeitos de vidência na área. Se detectar vidência for de nível superior a um efeito de vidência, você obtém um vislumbre da criatura vidente e descobre sua direção e distância aproximada.

---

 Elevada (6º) A duração se torna até a próxima vez que você fizer suas preparações diárias.', false),
  (null, 'pathfinder', 'Forma de Dinossauro', 4, '', '2 ações', '', '', '1 minuto', 'Você canaliza as formas primais da natureza para se transformar na forma de batalha de um animal Grande, especificamente a de um poderoso e aterrorizante dinossauro. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Quando conjurar esta magia, escolha anquilossauro, brontossauro, deinonico, estegossauro, tricerátops ou tiranossauro. Você pode decidir o tipo específico de animal, mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire os traços animal e dinossauro. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 18 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
15 Pontos de Vida temporários.
Visão na penumbra e faro impreciso de 9 metros.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +16 e seu bônus de dano é +9. Estes ataques são baseados em Força (para o propósito da condição enfraquecido, por exemplo). Se seu modificador de ataque para ataques desarmados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+18 de modificador de Atletismo, exceto se o seu próprio modificador for maior. 
Você também recebe habilidades específicas baseadas na forma escolhida:

Anquilossauro Velocidade 7,5 metros; Corpo a Corpo cauda (oscilante, alcance 3 metros), Dano2d6 contundente; Corpo a Corpo  pata, Dano 2d6 contundente.
Brontossauro Velocidade 7,5 metros; Corpo a Corpo  cauda (alcance 4,5 metros) Dano 2d6 contundente; Corpo a Corpo  pata, Dano 2d8 contundente.
Deinonico Velocidade 12 metros; Corpo a Corpo  unha (ágil), Dano 2d4 perfurante mais 1 de sangramento persistente; Corpo a Corpo  mandíbulas, Dano 1d10 perfurante.
Estegossauro Velocidade 9 metros; Corpo a Corpo  cauda (alcance 3 metros), Dano 2d8 perfurante.
Tricerátops Velocidade 9 metros; Corpo a Corpo  chifre, Dano 2d8 perfurante mais 1d6 de sangramento persistente em um acerto crítico; Corpo a Corpo pata, Dano 2d6 contundente.
Tiranossauro Velocidade 9 metros; Corpo a Corpo  mandíbulas (mortal, alcance 3 metros), Dano 1d12 perfurante; Corpo a Corpo  cauda (alcance 3 metros), Dano 1d10 contundente.

---

Elevada (5º) Sua forma de batalha é Enorme e seus ataques possuem alcance de 4,5 metros, ou alcance de 6 metros se tinham alcance inicial de 4,5 metros. Você recebe 20 PV temporários, +18 de modificador de ataque, +6 de bônus de dano, o dobro de dados de dano e +21 de Atletismo em vez dos valores iniciais.

Elevada (7º) Sua forma de batalha é Imensa e seus ataques possuem alcance de 6 metros, ou alcance de 7,5 metros se tinham alcance inicial de 4,5 metros. Você recebe CA = 21 + seu nível, 25 PV temporários, +25 de modificador de ataque, +15 de bônus de dano, o dobro de dados de dano e +25 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Discernir Mentiras', 4, 'Adivinhação', '2 ações', '', 'S, V', '10 minutos', 'Inverdades soam em seus ouvidos como notas discordantes. Você recebe +4 de bônus de estado para testes de Percepção quando alguém mentir.', false),
  (null, 'pathfinder', 'Globo de Invulnerabilidade', 4, '', '2 ações', '', '', '10 minutos', 'Você cria um globo imóvel ao seu redor que tenta neutralizar qualquer magia externa cuja área ou alvos entrem no globo, como o efeito da magia dissipar magia de 1 nível inferior ao nível real do globo. Se a tentativa de neutralização for bem-sucedida, essa magia impede somente a parte da magia que teria entrado no globo (portanto, se a magia também afetar alvos fora do globo, ou se parte da área dela estiver além do globo, esses alvos ou essa área são afetados normalmente). Você deve formar a esfera em um espaço aberto ininterrupto e não @JournalEntry[Broken]  para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida (embora criaturas possam entrar no globo após a magia ser conjurada).', false),
  (null, 'pathfinder', 'Ira Divina', 4, '', '2 ações', '36 metros', '', 'Instantânea', 'Você pode canalizar a fúria de sua divindade contra adversários de tendência oposta. Escolha uma tendência que sua divindade possua (bem, caos, mal ou ordem). Você não pode conjurar esta magia se não tiver uma divindade ou se sua divindade for neutra verdadeira. Esta magia recebe o traço da tendência escolhida. Você causa 4d10 de dano da tendência escolhida; cada criatura na área deve tentar um salvamento de Fortitude. Criaturas de tendência condizente com a escolhida não são afetadas pela magia. Aqueles que não possuam a mesma tendência nem possuam uma tendência oposta tratam o resultado de suas jogadas de salvamento como um grau melhor.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e fica enjoado 1.

Falha Crítica  A criatura sofre o dobro do dano e fica enjoado 2; enquanto enjoado, ela também fica lento 1.

---
Elevada (+1)  O dano aumenta em 1d10.', false),
  (null, 'pathfinder', 'Revisão Favorável', 4, 'Encantamento', '2 ações', 'Toque', 'S, V', 'Varies', 'Você encanta uma criatura para garantir que ela tenha apenas boas coisas a dizer sobre seu show. Identifique uma única criatura, local ou performance, como "Dama Ellendia", "Carnes Savories" ou "o mais recente show de mágica do Teatro da Mente". O alvo deve fazer um teste de Vontade. Você pode Dispensar a magia. 

Sucesso Crítico O alvo não é afetado e sabe que você tentou enganá-lo.
Sucesso O alvo não é afetado, mas acha que sua magia foi algo inofensivo, em vez de uma revisão favorável, a menos que identifique a magia (geralmente usando Identificar Magia).
Falha O alvo não pode falar desfavoravelmente sobre o assunto por 1 semana. Isso não muda a opinião do alvo sobre o assunto, mas as tentativas do alvo de falar mal do assunto, seja na fala, na escrita ou em outra comunicação, sempre se transformam em elogios e cumprimentos. O alvo provavelmente toma conhecimento desse efeito rapidamente e pode evitar falar inteiramente sobre o assunto, se assim o desejar.
Falha Crítica Como falha, exceto que a duração é permanente e o alvo realmente tem uma opinião favorável sobre o assunto, com sua atitude em relação à criatura (ou criaturas associadas ao sujeito, como o proprietário de um local ou artistas em uma apresentação) se tornando dois graus melhor (por exemplo, prestativo ao invés de indiferente.

---

Elevada (8º) O alcance aumenta para 18 metros e você pode atingir até 10 criaturas. 

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Escudo de Fogo', 4, '', '2 ações', '', '', '1 minuto', 'Você se rodeia em chamas fantasmagóricas, adquirindo resistência a frio 5. Adicionalmente, criaturas adjacentes que lhe tocarem ou acertarem usando um ataque corpo a corpo ou desarmado sofrem 2d6 de dano de fogo a cada vez que o fizerem.

---

Elevada (+2)resistência a frio aumenta em 5 pontos e o dano de fogo aumenta em 1d6.', false),
  (null, 'pathfinder', 'Piscar', 4, '', '2 ações', '', '', '1 minuto', 'Você alterna rapidamente entre o Plano Material e o Plano Etéreo. Você adquire resistência 5 a todo dano (exceto força). Você pode Sustentar a Magia para desaparecer e reaparecer a 3 metros de distância em uma direção aleatória determinada pelo GM; o movimento não aciona reações. Ao final de seu turno, você desaparece e reaparece como descrito acima.

---

Elevada (+2) A resistência aumenta em 3 pontos.', false),
  (null, 'pathfinder', 'Voar', 4, '', '2 ações', 'Toque', '', '5 minutos', 'O alvo pode flutuar pelo ar, recebendo uma Velocidade de voo igual à Velocidade dele ou 6 metros, o que for maior.

---

Elevada (7º) A duração aumenta para 1 hora.', false),
  (null, 'pathfinder', 'Linhas Esquecidas', 4, 'Adivinhação', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Membros da Lacunafex e outros aliados usam esta magia para restaurar informações removidas de textos históricos ou valiosos pelos agentes da casa Thrune. Você aprende uma informação que foi removida do texto alvo após sua criação. Em vez disso, você pode aprender uma informação de um texto que foi destruído (mas você deve possuir um fragmento do texto, como um pedaço da capa, uma página ou até mesmo um fecho ou lombada de metal).

---

Elevada (6º) A magia reconstrói todas as informações perdidas sobre um tópico específico à sua escolha.
Elevada (9º) A magia também revela informações autocensuradas pelo próprio autor que não chegaram a ser escritas no papel.', false),
  (null, 'pathfinder', 'Cascata Sagrada', 4, 'Evocação', '2 ações', '150 metros', 'S, V', 'Instantânea', 'Você invoca energia sagrada para amplificar o poder de um frasco de água benta, lançando-o a uma distância incrível. Ele irrompe em uma enorme explosão de uma cascata de água que causa 3d6 de dano contundente a criaturas na área. A água causa 6d6 de dano positivo adicional a mortos-vivos e 6d6 de dano bondoso adicional a ínferos.
Elevada (+1) O dano contundente aumenta em 1d6 e os danos positivo e bondoso adicionais aumentam em 2d6 cada um.', false),
  (null, 'pathfinder', 'Loquacidade', 4, '', '2 ações', '', '', '10 minutos', 'As inverdades que deixam seus lábios são tão suaves quanto a seda mais nobre. Você recebe +4 de bônus de estado em testes de Dissimulação para Mentir e contra testes de Percepção realizados para discernir se você está dizendo a verdade, e adiciona seu nível ao teste mesmo se for destreinado. Se a implausibilidade de suas mentiras acarretarem em uma penalidade de circunstância ou incremento de CD, reduza essa penalidade ou incremento pela metade.', false),
  (null, 'pathfinder', 'Torrente Hidráulica', 4, '', '2 ações', '', '', 'Instantânea', 'Uma torrente rodopiante de água jorra em linha reta, batendo naqueles que estiverem em seu caminho e possivelmente empurrando-os para longe de você. A torrente causa 8d6 de dano contundente. Cada criatura na área deve tentar um salvamento básico de Fortitude. Criaturas que falharem no salvamento também são empurradas 1,5 metros para trás (3 metros em uma falha crítica).

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Truque de Corda', 4, '', '10 minutos', 'Toque', '', '8 horas', 'Você faz a corda alvo erguer-se verticalmente no ar. Onde ela acaba, abre-se um espaço extradimensional, conectado ao topo da corda. Este espaço pode ser alcançado somente ao escalar a corda.

A entrada para o espaço não pode ser vista e pode ser indicada somente pela presença da corda. A corda não pode ser removida ou escondida, embora possa ser solta do espaço extradimensional se alguém puxá-la com 8 toneladas de peso, obtiver sucesso crítico em um teste de Atletismo contra a CD da magia ou destruir a corda. O espaço abriga até oito criaturas Médias e seus equipamentos. Uma criatura Grande conta como duas criaturas Médias, uma criatura Enorme conta como quatro criaturas Médias e uma criatura Imensa ocupa o espaço inteiro sozinha.

Se a corda for solta ou destruída, ou se uma criatura tentar entrar no espaço forçando-o além de sua capacidade, o espaço começa a se desfazer. Ele desaparece em 1d4 rodadas, depositando as criaturas com segurança no chão abaixo.', false),
  (null, 'pathfinder', 'Terreno Alucinatório', 4, 'Ilusão', '10 minutos', '150 metros', '', 'Until your next daily preparations', 'Você cria uma ilusão que faz com que o terreno natural pareça, soe, cheire e seja percebido pelo tato como um tipo diferente de terreno. Isto não disfarça quaisquer estruturas ou criaturas na área. Qualquer criatura que tocar a ilusão ou usar a ação Buscar para examiná-la pode tentar desacreditar sua ilusão

---

Elevada (5º) Sua imagem também pode disfarçar estruturas ou criar estruturas ilusórias (mas ainda não disfarça criaturas).', false),
  (null, 'pathfinder', 'Pele de Pedra', 4, '', '2 ações', 'Toque', '', '20 minutos', 'A pele do alvo endurece como pedra. Ele adquire resistência 5 a dano físico, exceto dano causado por adamante. Cada vez que o alvo é atingido por um ataque contundente, cortante ou perfurante, a duração de pele de pedra é reduzida em 1 minuto.

---

Elevada (6º)  A resistência aumenta para 10.

Elevada (8º)  A resistência aumenta para 15.

Elevada (10º)  A resistência aumenta para 20.', false),
  (null, 'pathfinder', 'Radiação Necrótica', 4, 'Necromancia', '2 ações', 'Toque', 'S, M', '24 horas', 'Você imbui o objeto ou o espaço tocado com radiação necrótica de ação lenta. Se você lançar a magia em um objeto, qualquer criatura que termine seu turno segurando ou carregando o objeto recebe 2d6 de dano negativo. Se você lançar a magia em uma área, qualquer criatura que termine seu turno na área recebe 2d6 de dano negativo. Você pode tentar usar essa magia em um objeto segurado tocando no objeto. Se o fizer, a criatura faz um teste de Reflexo para reduzir o efeito.

Sucesso Crítico O objeto não é afetado
Sucesso A criatura afasta o objeto rapidamente. A magia dura apenas 1 minuto.
Falha A criatura consegue proteger levemente o objeto. A magia dura 10 minutos.
Falha Crítica A magia dura 24 horas.

---

Elevada (+2) Aumenta o dano negativo da radiação em 1d6.

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Pesadelo', 4, 'Ilusão', '10 minutos', 'Planetário', '', '1 dia', 'Você envia pesadelos perturbadores ao seu alvo. Na próxima vez que o alvo dormir, ele deve tentar um salvamento de Vontade. Se você conhecer o alvo somente por nome e nunca o tiver encontrado, ele recebe +4 de bônus de circunstância no salvamento de Vontade

---
Successo CríticoO alvo não sofre efeitos adversos e fica temporariamente imune por 1 semana.

Successo O alvo vivencia os pesadelos, mas não sofre efeitos adversos além de memórias desagradáveis

Falha  O alvo vivencia os pesadelos e acorda Fatigued.

Falha Crítica   O alvo vivencia os pesadelos, acorda Fatigued, e fica Drained 2 enquanto estiver Fatigued.', false),
  (null, 'pathfinder', 'Maldição do Exilado', 4, '', '2 ações', 'Toque', '', 'Instantânea', 'Você aflige o alvo com uma maldição que torna a presença dele incômoda e desconcertante. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico O alvo não é afetado.

Successo Por 10 minutos, o alvo deve rolar duas vezes e usar o pior resultado sempre que fizer um teste de Diplomacia, Dissimulação, Intimidação ou Performance, e criaturas que ele encontrar possuem uma atitude inicial contra ele um passo pior (por exemplo, Unfriendly em vez de Indifferent).

Falha  Como sucesso, mas o efeito é permanente.

Falha Crítica Como falha, e criaturas que o alvo encontrar possuem uma atitude inicial em relação a ele dois passos pior.', false),
  (null, 'pathfinder', 'Santuário Particular', 4, '', '10 minutos', 'Toque', '', '24 horas', 'Do lado de fora, a área se parece com um acúmulo de névoa impenetrável. Estímulos sensoriais (como sons, odores e iluminação) não saem de dentro da área para fora dela. Magias de vidência não são capazes de perceber qualquer estímulo da área, e efeitos de leitura de mente não funcionam na área.', false),
  (null, 'pathfinder', 'Âncora Dimensional', 4, '', '2 ações', '9 metros', '', 'Varies', 'Você interfere com a habilidade do alvo de teleportar e viajar entre dimensões. Âncora dimensional tenta neutralizar qualquer efeito de teleportação, ou qualquer efeito que moveria o alvo para um plano diferente. A duração é determinada pelo salvamento de Vontade do alvo.

---
 Sucesso Crítico O alvo não é afetado.

 Sucesso A duração do efeito é de 1 minuto. 

Falha A duração do efeito é de 10 minutos.

 Falha Crítica A duração do efeito é de 1 hora.', false),
  (null, 'pathfinder', 'Ler Presságios', 4, '', '10 minutos', '', '', 'Instantânea', 'Você vislumbra o futuro. Escolha um objetivo, evento ou atividade em particular que ocorrerá em até 1 semana. Você descobre uma pista enigmática ou conselho que poderia ajudar no evento escolhido, frequentemente na forma de uma rima ou presságio.', false),
  (null, 'pathfinder', 'Escamas Reflexivas', 4, 'Abjuração', '2 ações', '', 'S, V', '1 minuto', 'Você cresce um conjunto de escamas brilhantes coloridas ou cota de escamas que armazenam energia antes de liberá-la em uma explosão final. Ao lançar essa magia, escolha ácido, frio, fogo, eletricidade ou dano de veneno. Você ganha resistência 5 contra esse tipo de dano. A cor das escamas depende do tipo de dano que você escolheu e geralmente é a cor de um tipo de dragão ou outra criatura associada a esse tipo de dano, como vermelho ou dourado para dano de fogo. 

As escamas armazenam energia à medida que o protegem. Acompanhe quanto dano as escamas impediram. Como uma atividade de duas ações que tem os traços concentração e manipulação, você pode explodir suas escamas para fora em um raio de 6 metros ao seu redor, causando 1d6 de dano do tipo escolhido a todas as criaturas da área a cada 10 danos que as escamas impediram, com um máximo de 10d6 de dano (após evitar 100 danos). Depois de fazer isso, a magia termina.

---

Elevada (+2) A resistência aumenta em 5 e o dano máximo da explosão da balança aumenta em 5d6. 

(Tradução não oficial - Gods and Magic)', false),
  (null, 'pathfinder', 'Remover Maldição', 4, 'Necromancia', '10 minutos', 'Toque', 'S, V, M', 'Instantânea', 'Seu toque concede uma remissão a uma criatura amaldiçoada. Você tenta neutralizar uma maldição que esteja afligindo o alvo. Se a maldição originar-se de um item amaldiçoado ou outra fonte externa, um sucesso indica que a criatura alvo pode livrar-se do item amaldiçoado, mas não remover a maldição do item.', false),
  (null, 'pathfinder', 'Esfera Resiliente', 4, 'Abjuração', '2 ações', '9 metros', 'S, V', '1 minuto', 'Você cria uma esfera imóvel de força para prender ou proteger o alvo, bloqueando qualquer coisa que atravessaria a esfera. A esfera possui CA 5, Dureza 10 e 40 Pontos de Vida. Ela é imune a acertos críticos e a dano de precisão. Desintegrar destrói a esfera instantaneamente. Se o alvo não for voluntário, os efeitos da esfera dependem do salvamento de Reflexos dele.

---
Sucesso Crítico  O alvo interrompe a integridade da esfera, colapsando-a inteiramente.

Sucesso  A esfera funciona normalmente, mas tem somente 10 Pontos de Vida em vez de 40.

Falha  A esfera possui seu efeito normal.', false),
  (null, 'pathfinder', 'Modificar Memória', 4, '', '2 ações', '9 metros', '', 'Ilimitada', 'Você altera as memórias do alvo, seja melhorando a clareza de uma memória, alterando-a, apagando-a ou adicionando uma memória falsa. O alvo pode tentar um salvamento de Vontade para resistir a magia.

As memórias modificadas por você persistem alteradas
enquanto a magia estiver ativa. Se o alvo se mover para fora da distância antes dos 5 minutos se passarem, você não pode mais alterar quaisquer memórias.

---

Sucesso Crítico  O alvo não é afetado e percebe que você tentou alterar a memória dele.

---

Successo O alvo não é afetado, mas pensa que sua magia foi algo inofensivo em vez de modificar memória, a menos que consiga identificar a magia.

Falha Durante os primeiros 5 minutos da duração da magia, você pode Sustentar a Magia uma vez por rodada. Quando o fizer, você imagina até 6 segundos de memória para modificar, até um máximo de 5 minutos contínuos de memória.

---

---
Elevada (6º)Você pode conjurar a magia em um alvo voluntário para suprimir todas as memórias sobre um tópico em particular, detalhado em 50 palavras ou menos. O efeito é permanente e obscurece as lacunas de memória com um nevoeiro indistinto', false),
  (null, 'pathfinder', 'Moldar Pedra', 4, '', '2 ações', 'Toque', '', 'Instantânea', 'Você molda a pedra em um formato à sua escolha. O processo de moldagem é bruto demais para produzir partes intrincadas, detalhes minuciosos, peças móveis ou partes similares. Quaisquer criaturas de pé sobre a pedra quando você a remoldar devem tentar um salvamento de Reflexos ou fazer um teste de Acrobatismo.

---
Sucesso  A criatura não é afetada.

Falha  A criatura cai prostrada sobre a pedra.

Falha Crítica  A criatura cai da pedra (se aplicável) e aterrissa prostrada.', false),
  (null, 'pathfinder', 'Névoa Sólida', 4, 'Conjuração', '3 ações', '36 metros', 'S, V, M', '1 minuto', 'Você conjura um nevoeiro tão denso que ele impede tanto movimento quanto visão. Isto funciona como bruma obscurecente (página 323), exceto que a área também é terreno difícil. Você pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Imunidade a Magia', 4, 'Abjuração', '2 ações', 'Toque', 'S, V', 'Until the next time you make your daily preparations.', 'Você protege uma criatura contra os efeitos de uma única magia. Escolha uma magia e a nomeie em voz alta como parte do componente verbal. Imunidade a magia tenta neutralizar essa magia sempre que o alvo de imunidade a magia for o alvo da magia nomeada ou que estiver na área dela. Neutralizar com sucesso uma magia que afetar uma área ou múltiplos alvos com imunidade a magia anula os efeitos somente para o alvo afetado por imunidade a magia.', false),
  (null, 'pathfinder', 'Anamnese Espiritual', 4, 'Necromancia', '2 ações', '18 metros', 'S, V', 'Varies', 'Memórias de uma vida passada que parecem incrivelmente reais (e podem até ser) dominam a mente do alvo. Isso é especialmente desorientador para mortos-vivos e criaturas que viveram uma vida anterior (como celestiais, demônios, monitores e muitas outras criaturas extraplanares); se essas criaturas obtêm sucesso crítico em seus testes de salvamento, elas obtêm um sucesso no lugar e, se tiram uma falha, obtêm uma falha crítica no lugar. 

Sucesso Crítico A criatura não é afetada.
Sucesso A criatura fica lenta 1 por 1 rodada.
Falha O alvo fica lento 1 por 1 minuto e murmura sobre as visões, possivelmente fornecendo informações sobre o que eles viram.
Falha Crítica Como falha, mas o alvo também fica atordoado 3.

(Tradução não oficial - Age of Ashes)', false),
  (null, 'pathfinder', 'Sugestão', 4, '', '2 ações', '9 metros', '', 'Varies', 'Suas palavras doces são quase irresistíveis. Você sugere um curso de ação ao alvo, que deve ser descrito de forma que pareça um curso de ação lógico para o alvo, não podendo ser autodestrutivo ou obviamente contra os interesses dele. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado e sabe que você tentou controlá-lo.

Sucesso  O alvo não é afetado e pensa que você estava falando normalmente com ele, e não conjurando uma magia.

Falha  O alvo segue sua sugestão imediatamente. O efeito possui duração de 1 minuto ou até o alvo ter completado uma sugestão finita, ou se a sugestão se tornar autodestrutiva ou se possuir outros efeitos obviamente negativos.

Falha Crítica  Como falha, mas a duração é de 1 hora.

---
Elevada (8º)  Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Cadáver Falante', 4, '', '10 minutos', 'Toque', '', '10 minutos', 'Você concede ao cadáver alvo um simulacro de vida, que ele usa para responder até três perguntas feitas a ele. Esta magia utiliza as memórias latentes do corpo físico em vez de convocar o espírito falecido, portanto, o cadáver deve estar majoritariamente intacto para que a magia funcione. Quanto mais dano o cadáver tiver sofrido, mais imprecisas ou remendadas são as suas respostas, e ele deve possuir garganta e boca para falar. Se qualquer pessoa tiver conjurado esta magia previamente no cadáver na última semana, a magia falha automaticamente. O cadáver pode tentar um salvamento de Vontade para resistir a responder às perguntas utilizando as estatísticas da criatura original no momento de sua morte, com os efeitos a seguir.

---
Sucesso Crítico  O alvo pode mentir ou recusar responder suas perguntas, e o espírito dele o assombra por 24 horas, aborrecendo-o e impedindo-lhe de descansar durante esse período.

Sucesso  O alvo pode fornecer informações falsas ou se recusar a responder suas perguntas.

Falha  O alvo deve responder verdadeiramente, mas as respostas podem ser breves, enigmáticas e repetitivas. Ele ainda pode induzi-lo ao erro ou tentar enrolar e prolongar as respostas para que a duração da magia acabe antes de você poder fazer todas suas perguntas.

Falha Crítica  Como falha, mas as respostas do alvo são mais diretas e menos repetitivas, embora ainda sejam enigmáticas. Ele sofre –2 de penalidade de estado em testes de Dissimulação para enganá-lo ou induzi-lo ao erro.', false),
  (null, 'pathfinder', 'Telepatia', 4, '', '2 ações', '', '', '10 minutos', 'Você pode se comunicar telepaticamente com criaturas a até 9 metros. Você estabelece uma ligação telepática quando se comunica com uma criatura, estabelecendo um canal de comunicação de duas vias — para isso, porém, você e ela precisam ter algum idioma em comum.

---

Elevada (6º) Telepatia perde o traço linguístico. Você pode comunicar-se telepaticamente com criaturas utilizando imagens mentais mesmo se não compartilharem um idioma.', false),
  (null, 'pathfinder', 'Porta Dimensional', 4, '', '2 ações', '36 metros', '', 'Instantânea', 'Abrindo uma porta que transcende o espaço normal, você transporta instantaneamente a si e a quaisquer itens que estiver  vestindo ou segurando para um espaço livre à sua vista dentro da distância. Se este efeito traria outra criatura com você — mesmo se você a estiver carregando em um recipiente extradimensional — a magia é perdida.

---

 Elevada (5º) A distância aumenta para 1,5 quilômetros. Você não precisa ser capaz de ver seu destino, desde que tenha estado lá no passado e souber sua localização e distância relativas a você. Você fica temporariamente imune por 1 hora.', false),
  (null, 'pathfinder', 'Liberdade de Movimento', 4, '', '2 ações', 'Toque', '', '10 minutos', 'Você repele efeitos que atrasariam ou deixariam lento o movimento de uma criatura. Enquanto estiver sob o efeito desta magia, o alvo ignora efeitos que imporiam uma penalidade de circunstância na Velocidade. Quando tentar Escapar de um efeito que o tenha agarrado, imobilizado ou restringido, ele obtém sucesso automaticamente, exceto se o efeito for mágico e de nível superior ao da magia liberdade de movimento.', false),
  (null, 'pathfinder', 'Forma Gasosa', 4, '', '2 ações', 'Toque', '', '5 minutos', 'O alvo se transforma em um estado vaporoso. Neste estado, o alvo fica amorfo e perde quaisquer bônus de item na CA. Ele adquire resistência 8 a dano físico e se torna imune a dano de precisão. Ele não pode conjurar magias, ativar itens ou usar ações que tenham os traços ataque ou manuseio. Ele também adquire uma Velocidade de voo de 3 metros e pode passar por frestas minúsculas. O alvo pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Assassino Fantasmagórico', 4, '', '2 ações', '36 metros', '', 'Instantânea', 'Você cria uma imagem fantasmagórica da criatura mais temida pelo alvo. Somente o alvo da magia pode ver o assassino, embora você consiga visualizar o formato vago da ilusão enquanto ela se move para atacar. O efeito do assassino é baseado no resultado do salvamento de Vontade do alvo.

---

Successo Crítico O alvo não é afetado.

Successo  O alvo sofre 4d6 de dano mental e fica Frightened 1.

Falha  O alvo sofre 8d6 de dano mental e fica Frightened 2.

Falha Crítica O alvo fica com tanto medo que pode morrer. Ele deve tentar um salvamento de Fortitude; se falhar, ele morre. Em um salvamento de Fortitude bem-sucedido, o alvo sofre 12d6 de dano mental, fica Fleeing até o final do próximo
turno dele e fica Frightened 4. Este efeito possui o traço de incapacitação.

---
Heightened (+1)  The damage increases by 2d6 on a failure and by 3d6 on a critical failure.', false),
  (null, 'pathfinder', 'Farol Vital', 4, '', '1 minuto', '', '', 'Until your next daily preparations', 'Vitalidade irradia a partir de você, permitindo aos outros suplicarem e receberem cura. Uma vez por rodada, você ou um aliado pode usar uma ação de Interagir para suplicar e colocar as mãos sobre você para recuperar Pontos de Vida. Cada vez que o farol curar alguém, ele perde força. Ele restaura 4d10 Pontos de Vida da primeira criatura, 4d8 Pontos de Vida da segunda, 4d6 Pontos de Vida da terceira e 4d4 Pontos de Vida da quarta — após isso, a magia acaba. Você pode ter somente um farol vital ativo ao mesmo tempo.

---

Elevada (+1) O farol restaura um dado adicional a cada vez que ele curar, utilizando o mesmo tamanho de dado que os outros para a cura sendo realizada.', false),
  (null, 'pathfinder', 'Muralha de Fogo', 4, '', '3 ações', '36 metros', '', '1 minuto', 'Você ergue uma muralha de chamas que queima criaturas que a atravessarem. Você cria uma muralha de chamas de 1,5 metros de espessura em uma linha reta de até 18 metros de comprimento e 3 metros de altura ou um anel de chamas de 1,5 metros de espessura e 3 metros de raio com a mesma altura. A muralha se ergue verticalmente em ambas as formas; se você quiser, a muralha pode ser mais curta ou mais baixa. Tudo que estiver de um lado da muralha fica ocultado contra criaturas que estejam do lado oposto. Qualquer criatura que atravessar a muralha ou estiver ocupando a área da muralha no início do turno dela sofre 4d6 de dano de fogo.

---

Elevada (+1) O dano de fogo aumenta em 1d6.', false),
  (null, 'pathfinder', 'Tempestade de Armas', 4, '', '2 ações', '', '', 'Instantânea', 'Você brande uma arma que estiver segurando, e a arma se multiplica magicamente em duplicatas que golpeiam todas as criaturas em um cone ou emanação. Esta torrente de golpes causa quatro dados de dano às criaturas na área. O dano causado é do mesmo tipo da arma e utiliza o mesmo tamanho de dado. Determine o tamanho de dado como se estivesse atacando com a arma; por exemplo, se estiver empunhando uma arma com o traço duas mãos em ambas mãos, você utiliza os dados de dano para duas mãos.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso O alvo sofre metade do dano.

Falha  O alvo sofre o dano inteiro.

Falha Crítica  O alvo sofre o dobro do dano e é sujeito ao efeito de especialização de crítico da arma.

---
Elevada (+1)  Adicione outro dado de dano.', false),
  (null, 'pathfinder', 'Praga Abissal', 5, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Seu toque aflige o alvo com uma praga abissal, que sifona fragmentos da alma dele para energizar o Abismo. O efeito é baseado no salvamento de Fortitude do alvo.

---
Critical Success  O alvo não é afetado.

Success  O alvo sofre 2 de dano maligno por nível da magia e também sofre –2 de penalidade de estado em salvamentos contra a praga abissal por 1 dia ou até contraí-la, o que ocorrer primeiro.

Failure O alvo é afligido com praga abissal no estágio 1.

Critical Failure  O alvo é afligido com praga abissal no estágio 2.

Praga Abissal (doença) Nível 9. O alvo não pode recuperar a
condição drenado da praga abissal até a doença ser curada. Estagio 1 Drenado 1 (1 dia); Estagio 2 Drenado aumenta para 2 (1 dia).', false),
  (null, 'pathfinder', 'Visão Animal', 5, 'Evocação', '2 ações', '36 metros', 'S, V', '1 minuto', 'Você evoca uma tempestade de chuva ácida que atinge a área pela duração do feitiço. Uma criatura que começa seu turno na área recebe 3d8 de dano ácido (salvamento básico de Reflexo).

---

Elevada (+2) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Banimento', 5, '', '2 ações', '9 metros', '', 'Instantânea', 'Você envia o alvo de volta ao plano natal dele. O alvo deve tentar um salvamento de Vontade. Você pode gastar uma ação extra enquanto Conjurar esta Magia e adicionar um componente material para impor à criatura –2 de penalidade de circunstância no salvamento dela. O componente deve ser algum objeto especialmente adquirido que seja um anátema para a criatura e não simplesmente retirado uma bolsa de componentes de magia. Esta magia falha se você não estiver em seu plano natal quando conjurá-la.

---
Sucesso Crítico O alvo resiste ao banimento e você fica Atordoado 1.

Sucesso O alvo resiste ao banimento.

Falha O alvo é banido.

Falha CríticaO alvo é banido e não pode retornar por quaisquer meios ao plano do qual foi banido por 1 semana.

---
Elevada (9º) Você pode afetar até 10 criaturas. O componente material extra afeta todos os alvos para os quais for um anátema.', false),
  (null, 'pathfinder', 'Festa do Sangue', 5, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Sua cabeça se divide verticalmente em uma enorme mordida, que se alimenta do sangue do alvo, causando 12d6 de dano de perfuração, dependendo da sua jogada de ataque mágico. Após o feitiço, sua cabeça se costura novamente como se nunca tivesse se separado. Você ganha Pontos de Vida temporários por 1 minuto, igual à metade do dano penetrante que o alvo sofreu.

Se você é um gug, aumente o dano de perfuração em 2d6 e aumente o dano de sangramento persistente que você causa em um golpe crítico em 1d8. Esse feitiço não altera a aparência de um gug.

 Sucesso Crítico A criatura sofre o dobro de dano e 1d8 de dano de sangramento persistente.
Sucesso A criatura sofre dano total.
Falha Você erra e a criatura não sofre dano.

---

Elevada (+1) O dano penetrante aumenta em 2d6 e o ​​dano persistente de sangramento em um crítico aumenta em 1.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Sopro de Vida', 5, '', 'reação', '18 metros', '', 'Instantânea', 'Acionamento Uma criatura viva na distância
iria morrer.

---

Sua benção revive uma criatura no momento da morte dela. Você impede o alvo de  Morrer e restaura uma quantidade de Pontos de Vida dele igual a 4d8 mais o modificador de seu atributo de conjuração. Você não pode usar sopro de vida se o efeito acionador for desintegrar ou um efeito de morte.', false),
  (null, 'pathfinder', 'Muralha Cromática', 5, 'Abjuração', '3 ações', '36 metros', 'S, V, M', '10 minutos', 'Você cria uma muralha opaca de luz em uma única cor vibrante. A muralha é reta e vertical, estendendo-se por 18 metros de comprimento e 9 metros de altura. Se a muralha passaria sobre uma criatura, a magia é perdida. A muralha emana luz brilhante por 6 metros em cada lado e luz fraca nos próximos 6 metros. Você pode ignorar os efeitos da muralha.

Role 1d4 para determinar a cor da muralha. Cada cor possui um efeito em particular sobre criaturas, efeitos ou itens que tentarem atravessá-la. Muralha cromática não pode ser neutralizada normalmente; em vez disso, cada cor é automaticamente neutralizada quando atingida por uma magia específica, mesmo se o nível dessa magia for inferior ao da muralha cromática.

1. Vermelho A muralha destrói os projéteis de armas à distância (como flechas e virotes) que a atravessarem e causa 20 de dano de fogo a qualquer um que atravessá-la, permitindo um salvamento básico de Reflexos. Cone de frio pode neutralizar uma muralha cromática vermelha.
2. Laranja A muralha destrói armas de arremesso que a atravessarem e causa 25 de dano de ácido a qualquer um que atravessá-la, permitindo um salvamento básico de Reflexos. Lufada de vento pode neutralizar uma muralha cromática laranja.
3. Amarelo A muralha bloqueia efeitos de ácido, eletricidade, fogo, força, frio, negativo, positivo e sônico que a atravessarem e causa 30 de dano de eletricidade a qualquer um que atravessá-la, permitindo um salvamento básico de Reflexos. Desintegrar pode neutralizar uma muralha cromática amarela.
4. Verde A muralha impede toxinas, gases e sopros de atravessá-la. Ela causa 10 de dano de veneno a qualquer um que atravessá-la e o deixa Enfraquecido 1 por 1 minuto. Um salvamento básico de Fortitude reduz o dano e anula a condição Enfraquecido em um sucesso. Criar passagem pode neutralizar uma muralha cromática verde.
---

 

Elevada (7º) A duração da magia aumenta para 1 hora. Role 1d8 para determinar a cor da muralha; os resultados para 5 a 8 são apresentados abaixo. Uma muralha vermelha, laranja, amarela ou verde causam 10 de dano extra.

5. Azul A muralha impede efeitos auditivos, de petrificação e visuais de atravessá-la, e criaturas que a atravessarem são sujeitas aos efeitos de carne em pedra. Mísseis mágicos pode neutralizar uma muralha cromática azul.

6. Anil A muralha impede efeitos de adivinhação e mentais de atravessá-la, e criaturas que a atravessarem são sujeitas aos efeitos de distorcer mente. Luz abrasadora pode neutralizar uma muralha cromática anil.

7. Violeta A muralha impede magias de mirarem o outro lado (efeitos de área ainda a atravessam normalmente). Criaturas que a atravessarem devem obter sucesso em um salvamento de Vontade ou ficam Lento 1 por 1 minuto; em uma falha crítica, em vez disso a criatura é enviada para outro plano, com o efeito de salto planar. Dissipar magia pode neutralizar uma muralha cromática violeta.

8. Rerrole, e criaturas que atravessarem a muralha sofrem –2 de penalidade de circunstância em seus salvamentos.', false),
  (null, 'pathfinder', 'Manto de Cores', 5, 'Ilusão', '2 ações', '9 metros', 'S, V', '1 minuto', 'Um manto de cores rodopiantes envolve o alvo. Criaturas ficam ofuscado enquanto estiverem adjacentes a ele, e atacar o alvo causa um clarão brilhante de luz. Uma criatura que atingir o alvo com um ataque corpo a corpo deve tentar um salvamento de Vontade. A criatura fica temporariamente imune até o final do turno dela. Este efeito possui o traço incapacitação.

Sucesso O atacante não é afetado.

Falha O atacante fica cego por 1 rodada.

Falha Crítica O atacante fica atordoado por 1 rodada.', false),
  (null, 'pathfinder', 'Controlar Água', 5, '', '2 ações', '150 metros', '', '1 hora', 'Ao impor sua vontade sobre a água, você pode erguer ou baixar o nível da água na área escolhida em 3 metros. Criaturas de água na área são sujeitas aos efeitos de lentidão.', false),
  (null, 'pathfinder', 'Proteção Contra a Morte', 5, 'Abjuração', '2 ações', 'Toque', 'S, V', '10 minutos', 'Você protege uma criatura da devastação da energia negativa. Ela recebe +4 de bônus de estado em salvamentos contra efeitos com o traço morte ou negativo, adquire resistência 10 a dano negativo e suprime os efeitos da condição condenado.', false),
  (null, 'pathfinder', 'Chuva de Fogo', 5, '', '2 ações', '36 metros', '', 'Instantânea', 'Você pode invocar uma chuva de fogo divino que causa 8d6 de dano de fogo. Como a chama é infundida com energia divina, criaturas na área aplicam somente metade de suas resistências a fogo usuais. Criaturas imunes a fogo não recebem o benefício convencional de sua imunidade, mas tratam os resultados de suas jogadas de salvamento como se fossem um grau de sucesso melhor.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Potencial Onírico', 5, '', '10 minutos', 'Toque', '', '8 horas', 'Você atrai o alvo para um sonho lúcido onde ele pode explorar possibilidades intermináveis de seu próprio potencial dentro dos cenários oníricos em constante mudança. Se dormir 8 horas completas ininterruptamente, ele se beneficia como se tivesse passado um dia de recesso em retreino, embora não possa usar potencial onírico para retreinar algo que requeira um instrutor ou conhecimento especializado que ele é incapaz de acessar dentro do sonho.', false),
  (null, 'pathfinder', 'Fingir de Morto', 5, 'Ilusão', 'reação', '36 metros', 'S', 'Sustentada até 1 minuto', 'Acionamento Uma criatura ao alcance é atingida por um ataque de um inimigo.

---

O alvo parece cair morto, embora na verdade fique invísivel. O cadáver ilusório permanece onde caiu, completo com um ferimento fatal crível. Esta ilusão aparenta ser um corpo morto à visão e ao toque. Se a morte do alvo parecer absurda — por exemplo, um bárbaro em saúde plena parecer ser morto por 2 de dano — o MJ pode conceder ao atacante um teste imediato de Percepção para desacreditar a ilusão. Se o alvo usar ações hostis, a magia acaba. Isto encerra a magia por completo, fazendo com que o cadáver ilusório também desapareça.

---

Elevada (7º) A magia não acaba se o alvo usar ações hostis.', false),
  (null, 'pathfinder', 'Forma de Elemental', 5, '', '2 ações', '', '', '1 minuto', 'Você invoca o poder dos planos para se transformar na forma de batalha de um elemental Médio. Quando conjurar esta magia, escolha água, ar, fogo ou terra. Enquanto estiver nesta forma, você adquire o traço correspondente à energia escolhida e o traço elemental. Você possui mãos nesta forma de batalha e pode usar ações de manuseio. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 19 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
10 Pontos de Vida temporários.
Visão no escuro.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +18 e seu bônus de dano é +9. Estes ataques são baseados em Destreza (ar ou fogo) ou Força (água ou terra). Se seu modificador de ataque para ataques desarmados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+20 de modificador de Acrobatismo (ar ou fogo) ou Atletismo (água ou terra), exceto se o seu próprio modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

ÁguaVelocidade 6 metros, Velocidade de natação 18 metros, resistência a fogo 5; Corpo a Corpo onda, Dano 1d12 contundente e você pode gastar uma ação imediatamente após um acerto para empurrar o alvo 1,5 metros com os efeitos da ação Empurrar bem-sucedida..
Ar Velocidade de voo 24 metros, movimento não aciona reações;Corpo a Corpo  lufada, Dano1d4 contundente.
FogoVelocidade 15 metros, resistência a fogo 10, fraqueza a frio 5 e água 5; Corpo a Corpo gavinha, Dano 1d8 de fogo mais 1d4 de dano persistente de fogo.
TerraVelocidade 6 metros, Velocidade de escavação 6 metros; Corpo a Corpo  punho,Dano2d10 contundente.

---

Elevada (6º) Sua forma de batalha é Grande e seus ataques possuem alcance de 3 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 22 + seu nível, 15 PV temporários, +23 de modificador de ataque, +13 de bônus de dano e +23 de Acrobatismo ou Atletismo em vez dos valores iniciais. 

Elevada (7º) Sua forma de batalha é Enorme e seus ataques possuem alcance de 4,5 metros. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 22 + seu nível, 20 PV temporários, +25 de modificador de ataque, +11 de bônus de dano, o dobro de dados de dano (incluindo dano persistente),  e +25 de Acrobatismo ou Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Visão Falsa', 5, 'Ilusão', '10 minutos', 'Toque', '', 'Until your next daily preparations', 'Você cria uma imagem falsa que engana quaisquer tentativas de vidência na área. Qualquer magia de vidência vê, ouve, cheira e, de qualquer outra maneira, detecta o que você desejar na área e não o que realmente houver nela. Você pode Sustentar a Magia a cada rodada para mudar a ilusão conforme desejar, inclusive armar uma cena complexa. Se a magia de vidência for de um nível superior a visão falsa, o vidente pode fazer um teste de Percepção para desacreditar a ilusão, embora mesmo que seja bem-sucedido, ele não pode descobrir o que realmente está ocorrendo na área.', false),
  (null, 'pathfinder', 'Alucinação', 5, 'Ilusão', '2 ações', '9 metros', '', '1 hora', 'O alvo consistentemente detecta uma coisa como se fosse outra, não consegue detectar algo que existe ou detecta algo que não existe, embora isso não altere as crenças dele. Você escolhe qual destes efeitos aplicar e determina as especificidades da alucinação. Por exemplo: você poderia fazer o alvo ver todos os elfos como humanos, ser incapaz de detectar a presença do irmão dele, ver seu amado relógio de bolso consigo (mesmo quando não o estivesse carregando) ou enxergar uma torre no centro da cidade.

O alvo pode tentar um salvamento inicial de Vontade, com os efeitos abaixo. Ele também recebe um salvamento de Vontade para desacreditar a alucinação a cada vez que Buscar ou interagir diretamente com a alucinação. Por exemplo: o alvo pode tentar desacreditar a alucinação a cada vez que interagir com um elfo, trombar acidentalmente em seu irmão, tentar olhar em seu relógio de bolso ou estudar a torre. O alvo pode tentar desacreditar a ilusão recebendo um bônus de circunstância maior em situações determinadas pelo MJ, como se o alvo tentar escalar a torre não existente.

---
Sucesso Crítico  A criatura não é afetada.

SuccessoA criatura percebe a ilusão que você determinou até conseguir desacreditá-la, mas sabe que é uma alucinação.

Falha  A criatura percebe a ilusão determinada até desacreditá-la.

Falha Crítica  A criatura percebe a ilusão determinada até desacreditá-la e confia nos sentidos falsos dele, sofrendo –4 de penalidade de circunstância em salvamentos para desacreditá-la.

---
Elevada (6º)  Escolha entre afetar até 10 alvos ou mudar a duração da magia para até a próxima vez que você fizer suas preparações diárias.

Elevada (8º)  Escolha entre afetar qualquer número de criaturas ou mudar a duração da magia para ilimitada', false),
  (null, 'pathfinder', 'Cone de Frio', 5, '', '2 ações', '', '', 'Instantânea', 'Um frio gélido sai de suas mãos. Você causa 12d6 de dano de frio às criaturas na área.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Cena Ilusória', 5, 'Ilusão', '10 minutos', '150 metros', '', '1 hora', 'Você forma uma cena imaginária que inclui até 10 criaturas ou objetos distintos de vários tamanhos, que devem estar dentro da área da magia. Estes elementos geram sons e cheiros apropriados e parecem normais ao toque. Todos os elementos de uma cena ilusória são incapazes de falar. Ao contrário da magia criatura ilusória, criaturas em sua cena não possuem habilidades e estatísticas de combate. Sua cena não altera o ambiente ao redor dela, embora você possa situar sua cena dentro do ambiente ilusório da magia terreno alucinatório.

Quando criar uma cena, você pode escolher que ela seja estática ou que siga uma programação. Embora a cena estática seja estacionária, ela inclui movimentos naturais básicos. Por exemplo, um vento soprando um pedaço ilusório de papel o arrastaria. Um programa pode ter até 1 minuto de duração e se repete quando é finalizado. Portanto, você poderia criar uma cena de dois orcs lutando um contra o outro, e a luta aconteceria da mesma forma a cada repetição. Você pode criar uma cena que termine de forma semelhante ao início, de maneira que seja difícil dizer quando cada iteração começa e termina — os dois guerreiros acabariam no mesmo lugar onde começaram. Qualquer um observando a cena por mais de alguns minutos sempre percebe a iteração dela. Você é incapaz de alterar a programação após criar a ilusão.

Uma criatura que tocar qualquer parte da imagem ou que usar a ação Buscar para examiná-la pode tentar desacreditar sua ilusão. Se ela interagir somente com parte da ilusão, ela desacredita somente essa parte. Ela desacredita a cena inteira somente em um sucesso crítico.

---

Elevada (6º) Criaturas ou objetos em sua cena são capazes de falar. Você deve definir as falas específicas para cada ator quando criar sua programação. A magia disfarça sua voz para cada ator.

Elevada (8º) Como a versão de 6º nível, mas a duração é ilimitada.', false),
  (null, 'pathfinder', 'Criar Passagem', 5, '', '2 ações', 'Toque', '', '1 hora', 'Você cria um túnel visível através da parede na área escolhida, substituindo a área por espaço vazio. Se a parede for mais espessa do que 3 metros, o túnel acaba após 3 metros. Mesmo uma pequena camada de metal na parede impede esta magia de funcionar. Esta magia não reduz a integridade da estrutura. Quando a magia acaba, todo mundo dentro do túnel é expulso para a saída mais próxima

---

Elevada (7th) O túnel pode ter até 6 metros de profundidade. As áreas da parede que contêm a entrada do túnel parecem completamente normais (exceto se vistas com visão verdadeira ou um efeito similar), apesar da existência do túnel. A entrada do túnel funciona como uma parede sólida, mas você pode especificar uma senha ou acionamento (veja página 305), permitindo a livre entrada no túnel para criaturas.', false),
  (null, 'pathfinder', 'Maldição do Marinheiro', 5, '', '2 ações', 'Toque', '', 'Instantânea', 'Você aflige o alvo com a maldição do mar turbulento e implacável. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Successo  O alvo fica Sickened 1. Reduzir esta condição Sickened para 0 encerra a maldição.

Falha O alvo fica Sickened 1 e não pode reduzir a condição Sickened abaixo de 1 enquanto a maldição permanecer. A maldição pode ser removida por remover maldição ou magia similar. Enquanto estiver Sickened e em águas distantes da costa (pelo menos 1,5
quilômetros), o alvo também fica Slowed 1.

Falha Crítica  Como falha, mas o alvo fica Sickened 2.', false),
  (null, 'pathfinder', 'Sondar Mente', 5, '', '1 minuto', '9 metros', '', 'Sustentada até 1 minuto', 'Você estende seus pensamentos através da mente de uma criatura, sugando informações. Você acessa as memórias e conhecimento do alvo a menos que ele lhe expulse com um salvamento de Vontade.

---
Successo  O alvo não é afetado

Falha  cada rodada da duração da magia, você pode Sustentar a Magia para fazer uma pergunta diferente e tentar descobrir a resposta. Para cada pergunta, o alvo pode tentar um teste de Dissimulação contra sua CD de magia; se o alvo obtiver sucesso, você não descobre a resposta e, em um sucesso crítico, o alvo lhe fornece uma informação falsa que você acredita ser verdade. Após você ter perguntado ao alvo sobre uma determinada questão, novas perguntas sobre o mesmo assunto (mesmo com outra conjuração de sondar mente) produzem o mesmo resultado.

Falha Crítica  Como falha, mas o alvo sofre –4 de penalidade nos testes de Dissimulação contra suas perguntas.', false),
  (null, 'pathfinder', 'Frenesi da Lua', 5, '', '2 ações', '9 metros', '', '1 minuto', 'Um aspecto feral domina os alvos, tornando-os resistentes e selvagens. Alvos recebem 5 Pontos de Vida temporários, +3 metros de bônus de estado em suas Velocidades e fraqueza 5 a prata. Neles também crescem presas e garras afiadas que são ataques desarmados. As presas causam 2d8 de dano perfurante; as garras causam 2d6 de dano cortante e possuem os traços acuidade e ágil. Os alvos usam sua maior proficiência com armas ou ataques
desarmados para estes ataques e, se possuírem especialização em armas ou especialização em armas maior, também adicionam este dano. Em um acerto crítico com um destes ataques desarmados, a criatura atingida sofre 1d4 de dano persistente de sangramento.

Os alvos não podem usar ações de concentração a menos que elas também possuam o traço fúria, com exceção de Buscar. Uma criatura pode tentar encerrar o efeito da magia em si ao usar uma ação única (que possui o traço fúria) para tentar um salvamento de Vontade contra sua CD de magia; em um sucesso, ela encerra o efeito da magia em si.

Se um alvo estiver sob a luz da lua cheia, ele também cresce de tamanho se for Médio ou menor. Isto aumenta o alcance de uma criatura Média ou Minúscula em 1,5 metros.

---

Elevada (6º) Os Pontos de Vida temporários aumentam para 10, a fraqueza a prata para 10 e o dano causado pelos ataques para três dados de dano.

Elevada (10º)Os Pontos de Vida temporários aumentam para 20, a fraqueza a prata para 20 e o dano causado pelos ataques para quatro dados de dano.', false),
  (null, 'pathfinder', 'Pilares de Areia', 5, 'Conjuração', '3 ações', '36 metros', 'S, V, M', 'Sustentada até 1 minuto', 'Você levanta um ou mais pilares de areia sólida da terra. A altura total dos pilares é de 9 metros, que deve ser usada em incrementos de 3 metros (por exemplo, você pode criar três pilares de 3 metros de altura, um pilar de 6 metros de altura e um pilar de 3 metros de altura, ou um pilar de 9 metros de altura). Cada pilar tem 1,5 metro por 1,5 metro de comprimento e largura. Os pilares devem ser conjurados em uma área relativamente plana do terreno natural, como areia, sujeira, pedra ou argila. Independentemente do terreno, os pilares são sempre feitos de partículas de areia compactadas que, juntas, tornam-se tão duras e sólidas quanto a pedra (CD 15 Atletismo para Escalar).

Se uma criatura ocupa o espaço em que você lança essa magia, ela é carregada para cima em cima do pilar. A criatura pode tentar um teste de Reflexos (CD igual ao CD da magia do lançador); em caso de sucesso, a criatura pode tentar Segurar uma Beirada ou mover-se para um quadrado desocupado adjacente. Se o pilar subir mais alto que o teto, ele se apoia firmemente no teto, mas não sobe mais. Uma criatura presa entre um pilar e um teto não sofre dano (sujeito a critério do Mestre, como é o caso de estalactites ou outros perigos), mas fica imobilizada. A criatura pode tentar um teste de Escapar para se libertar, mas depois deve Segurar uma Beirada, Subir ou cair do topo do pilar. As CDs para Segurar uma Beirada e Escapar são os mesmos que os teste de Reflexo.

Como parte de sua ação para Sustentar a Magia, você pode optar por destruir um de seus pilares, fazendo com que ele desmorone imediatamente em nada, ou criar um novo pilar, desde que isso não exceda o número total de metros de pilar que você pode criar. Você pode sustentar a magia duas ou mais vezes em um único turno para destruir ou criar um pilar.

---

Elevada (+1) A altura total dos pilares aumenta em 3 metros, mas ainda deve ser usada em incrementos de 3 metros (isso também aumenta o número total de pilares que podem ser criados em 1).

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Forma Planta', 5, '', '2 ações', '', '', '1 minuto', 'Inspirando-se em criaturas verdejantes, você se transforma na forma de batalha de uma planta Grande. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Quando conjurar esta magia, escolha abocanhadora, arbórea ou dioneia. Você pode escolher um tipo específico de planta para se transformar (como uma planta-jarro em vez de uma dioneia), mas isto não tem efeito no tamanho ou nas estatísticas da forma. Enquanto estiver nesta forma, você adquire o traço planta. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 19 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura
12 Pontos de Vida temporários.
Resistência 10 a veneno.
Visão na penumbra.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +17 e seu bônus de dano é +11. Estes ataques são baseados em Força (para o propósito da condição Enfeebled, por exemplo). Se seu modificador de ataque para ataques desarmados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+19 de modificador de Atletismo, exceto se o seu próprio
modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

Abocanhadora Velocidade 6 metros, Velocidade de natação 6 metros, resistência 10 a eletricidade Corpo a Corpo  vinha (alcance 4,5 metros), Dano 2d8 cortante.
Arbórea Velocidade 9 metros; Corpo a Corpo  galho (alcance 4,5 metros),, Dano 2d10 contundente;Corpo a Copro raiz, Dano 2d8 contundente; você pode falar nesta forma, mas ainda não pode Conjurar uma Magia ou suprir componentes verbais.
Dioneia Velocidade 4,5 metros, resistência 10 a ácido; Corpo a Corpo folha (alcance 3 metros), Dano 2d8 perfurante e você pode gastar uma ação após acertar para Atracar o alvo.

---

Elevada (6º) Sua forma de batalha é Enorme e seus ataques têm seus alcances aumentados em 1,5 metros. Você recebe CA = 22 + seu nível, 24 PV temporários, +21 de modificador de ataque, +16 de bônus de dano e +22 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Boca Voraz', 5, 'Necromancia', '2 ações', '18 metros', 'S, V', '3 rodadas', 'Você evoca a fome incessante de Zevgavizeb e a inflige ao seu alvo. O alvo fica sobrecarregado com a fome canibalística e pode restaurar sua vitalidade banqueteando-se com a carne dos caídos. Por sua vez, o alvo pode usar 2 ações (essas ações têm o traço manipulação) canibalizar uma criatura adjacente morrendo ou morta. Se a criatura canibalizada está morrendo, ela morre imediatamente. Se a criatura canibalizada for um aliado do alvo, ele recupera 5d8 PV; caso contrário, o alvo recuperará 5d4 PV. Certos monstros (como aqueles cujo sangue é ácido ou mágico) podem infligir efeitos adicionais sobre aqueles que os canibalizam, a critério do Mestre. Uma vez canibalizado, o corpo de uma criatura em particular não possui carne suficiente para canibalizar novamente. Durante qualquer rodada, que houver uma criatura morrendo ou morta a 9 metros do alvo, se o alvo não pode ou não canibaliza uma criatura, o alvo sofre 5d4 de dano mental. 

---

Elevada (+1) A quantidade de PV restaurado por canibalização de uma criatura aumenta em 1d8 por comer um aliado e 1d4 caso contrário, e o dano mental aumenta em 1d4. 

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Olho Bisbilhoteiro', 5, '', '1 minuto', 'see text', '', 'Sustentada', 'Você cria um olho flutuante invisível, de 2,5 centímetros de diâmetro em um local à sua vista e ver a até 150 metros de distância. Ele vê em todas as direções usando os seus sentidos visuais normais e lhe transmite continuamente o que vê.
A primeira vez em que Sustentar a Magia a cada rodada, você pode mover o olho até 9 metros, vendo somente o que estiver na frente do olho ou movê-lo até 3 metros, vendo tudo em todas as direções ao redor dele. O olho pode se afastar de você a qualquer distância, mas a magia é encerrada imediatamente se você e o olho deixarem de estar no mesmo plano de existência. Você pode tentar ações de Buscar através do olho se quiser fazer testes de Percepção com ele. Qualquer dano causado ao olho o destrói e encerra a magia.', false),
  (null, 'pathfinder', 'Enviar Mensagem', 5, '', '3 ações', 'Planetário', '', 'Instantânea', 'Você envia uma mensagem mental de até 25 palavras à criatura e ela pode responder imediatamente com a própria mensagem de até 25 palavras.', false),
  (null, 'pathfinder', 'Explosão de Sombras', 5, '', '2 ações', 'varies', '', 'Instantânea', 'Você molda a substância quase real do Plano das Sombras em uma explosão. Escolha dano de ácido, contundente, cortante, eletricidade, fogo, força, frio, perfurante ou sônico; e escolha um cone de 9 metros, uma explosão de 4,5 metros a até 36 metros de distância ou uma linha de 15 metros. A explosão causa 5d8 de dano do tipo escolhido a cada criatura na área.

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Sifonar Sombra', 5, 'Ilusão', 'reação', '18 metros', 'V', 'Instantânea', 'Acionamento Uma magia ou efeito mágico causa dano.

---

Trocando energia material com o Plano das Sombras, você transforma a magia acionadora em uma versão parcialmente ilusória dela. Tente neutralizar a magia alvo. Se a tentativa for bem-sucedida, quaisquer criaturas que sofreriam dano pela magia sofrem apenas metade do dano — exceto por isso, a magia funciona normalmente. Trate o nível de neutralização de sifonar sombra como 2 níveis superior para esta tentativa.', false),
  (null, 'pathfinder', 'Tentáculos Negros', 5, '', '3 ações', '36 metros', '', '1 minuto', 'Tentáculos negros oleosos se erguem e tentam Agarrar cada criatura na área. Faça rolagens de ataque de magia contra a CD de Fortitude de cada criatura na área. Qualquer criatura contra a qual você obtiver sucesso fica Agarrado e sofre 3d6 de dano contundente. Sempre que uma criatura encerrar o turno dela na área, os tentáculos tentam agarrar essa criatura se ainda não tiverem feito isso, e causam 1d6 de dano contundente a qualquer criatura Agarrado.

A CD de Escapar dos tentáculos é igual à sua CD de magia. Uma criatura pode atacar um tentáculo na tentativa de libertar-se. A CA dele é igual à sua CD de magia e ele é destruído se sofrer 12 ou mais de dano. Mesmo se destruído, tentáculos adicionais continuam a crescer na área até a duração encerrar. Você pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Guardião Espiritual', 5, '', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Um guardião Médio feito de força mágica aparece e ataca adversários que você designar na distância. O guardião espiritual é translúcido e parece estar segurando a arma favorita de sua divindade.

Quando você Conjurar a Magia, o guardião espiritual aparece em um espaço desocupado próximo a um adversário escolhido na distância desta magia e desfere um Golpe contra ele. Cada vez que Sustentar a Magia, você pode mover o guardião espiritual para um espaço desocupado próximo a um alvo na distância da magia (se necessário) e desferir um Golpe com ele. O guardião sofre e contribui para sua penalidade por ataques múltiplos. Alternativamente, quando Sustentar a Magia, você pode fazer o guardião se mover adjacente a um aliado e protegê-lo. Se fizer isso, cada vez que o aliado sofreria dano, o guardião sofre os primeiros 10 pontos de dano em vez de seu aliado. Ele continua a fazê-lo até você mover o guardião para atacar um inimigo ou defender um aliado diferente, ou até o guardião ser destruído (ele possui 50 pontos de Vida e não pode recuperar Pontos de Vida por quaisquer meios). O guardião normalmente não pode sofrer dano exceto ao proteger um aliado, embora desintregar automaticamente o destrua se acertar a CA 25 do guardião espiritual.

Os Golpes do guardião são ataques de magia corpo a corpo. Independentemente da aparência da arma do guardião, ele causa dano de força igual a 2d8 mais o modificador de seu atributo de conjuração, mas você pode causar dano do tipo normalmente causado pela arma que ele porta em vez de dano de força (ou qualquer tipo de dano disponível para uma arma versátil). Nenhum outro traço ou estatística da arma se aplica, e mesmo um ataque com uma arma à distância ataca somente criaturas adjacentes. Apesar de realizar um ataque de magia, a arma do guardião espiritual é considerada uma arma para os propósitos de acionamentos, resistências e outras regras similares.

O guardião ocupa um espaço e aliados podem considerá-lo quando flanquearem, mas ele não possui quaisquer outras características que uma criatura normalmente teria além de Pontos de Vida, e outras criaturas podem mover-se através do espaço dele sem impedimento. O guardião não pode realizar qualquer ataque além do Golpe dele, e talentos ou magias que afetem armas ou reforcem aliados não se aplicam a ele.

---

Elevada (+2) O dano do guardião aumenta em 1d8 e os Pontos de Vida dele aumentam em 20.', false),
  (null, 'pathfinder', 'Sugestão Subconsciente', 5, '', '2 ações', '9 metros', '', 'Varies', 'Você implanta uma sugestão subconsciente nas profundezas da mente do alvo, que irá seguí-la quando ocorrer um acionamento especificado por você (conforme descrito na página 305). Você sugere um curso de ação para o alvo. Sua diretiva deve ser descrita de forma que pareça um curso de ação lógico para o alvo, não podendo ser autodestrutivo ou obviamente contra os interesses dele. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado e sabe que você tentou controlá-lo.

Sucesso  O alvo não é afetado e pensa que você estava falando normalmente com ele, e não conjurando uma magia.

Falha  A sugestão permanece no subconsciente do alvo até a próxima vez que você fizer suas preparações diárias. Se o acionamento ocorrer antes desse período, o alvo segue sua sugestão imediatamente. O efeito possui duração de 1 minuto ou até o alvo ter completado uma sugestão finita, ou se a sugestão se tornar autodestrutiva ou se tiver outros efeitos obviamente negativos.

Falha Crítica  Como falha, mas a duração é de 1 hora.

---
Elevada (9º)  Você pode afetar até 10 criaturas.', false),
  (null, 'pathfinder', 'Convocar Celestial', 5, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um celestial para lutar a seu favor. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço celestial e cujo nível seja igual ou inferior a 5. Você não pode convocar uma criatura a menos que a tendência dela seja uma das tendências preferidas de sua divindade (ou, se não possuir uma divindade, a tendência dela deve estar a um passo da sua própria tendência). A critério do MJ, algumas divindades podem restringir tipos específicos de celestiais, mesmo que as tendências deles sejam condizentes.

---

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Dragão', 5, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um dragão para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço dragão e cujo nível seja igual ou inferior a 5.

---

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Entidade', 5, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura uma aberração para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço aberração e cujo nível seja igual ou inferior a 5.

---

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Ínfero', 5, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um ínfero para lutar a seu favor. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço ínfero e cujo nível seja igual ou inferior a 5. Você não pode convocar uma criatura a menos que a tendência dela seja uma das tendências preferidas de sua divindade (ou, se não possuir uma divindade, a tendência dela deve estar a um passo da sua própria tendência). A critério do MJ, algumas divindades podem restringir tipos específicos de ínferos, mesmo que as tendências deles sejam condizentes.

---

Elevada (6º) Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Convocar Gigante', 5, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você conjura um gigante para lutar por você. Isto funciona como convocar animal, exceto que você pode convocar uma criatura que possua o traço gigante e cujo nível seja igual ou inferior a 5.

---

Elevada (6º)Nível 7

Elevada (7º) Nível 9

Elevada (8º) Nível 11

Elevada (9º) Nível 13

Elevada (10º) Nível 15', false),
  (null, 'pathfinder', 'Pulso Sináptico', 5, '', '2 ações', '', '', '1 rodada', 'Você emite uma rajada mental pulsante que penetra as mentes de todos os inimigos na área. Cada criatura na área deve tentar um salvamento de Vontade.

---

Sucesso Crítico  A criatura não é afetada.

Sucesso  A criatura fica atordoado 1.

Falha  A criatura fica atordoado 2.

Falha Crítica  A criatura fica atordoado por 1 rodada.', false),
  (null, 'pathfinder', 'Sinestesia', 5, 'Adivinhação', '2 ações', '9 metros', 'S, V', '1 minuto', 'Os sentidos do alvo são subitamente reconectados de formas inesperadas, fazendo-o processar barulhos como explosões de cores, cheiros como sons e assim por diante. Isto possui três efeitos, e o alvo deve tentar um salvamento de Vontade. 
• Devido à distração, o alvo deve obter sucesso em um teste simples CD 5 cada vez que usar uma ação de concentração, ou a ação falha e é desperdiçada. 
• A dificuldade do alvo em processar estímulos visuais deixa todas as criaturas e objetos ocultados para ele. 
• A criatura tem dificuldades para se mover, ficando desajeitado 3 e sofrendo –3 metros de penalidade de estado nas Velocidades dela.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo é afetado por 1 rodada.

Falha  O alvo é afetado por 1 minuto.

Falha Crítica  Como falha, mas o alvo fica atordoado 2 enquanto
tenta processar as mudanças sensoriais.

Elevada (9°) Você pode afetar até 5 criaturas.', false),
  (null, 'pathfinder', 'Carga Telecinética', 5, '', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Você move o alvo até 6 metros, potencialmente suspendendo-o no ar. Quando Sustentar a Magia, você pode movê-lo novamente ou escolher um outro alvo elegível para mover.', false),
  (null, 'pathfinder', 'Elo Telepático', 5, 'Adivinhação', '1 minuto', 'Toque', 'S, V, M', '8 horas', 'Os alvos poder se comunicar telepaticamente com qualquer um dos alvos ou com todos eles que estiverem no mesmo planeta.', false),
  (null, 'pathfinder', 'Nuvem Mortal', 5, '', '3 ações', '36 metros', '', '1 minuto', 'Você conjura uma névoa venenosa. Isto funciona como bruma obscurecente, exceto que a área se move 3 metros para longe de você a cada rodada, causando 6d8 de dano de veneno a cada criatura capaz de respirar que iniciar o turno dela na área da magia. Você pode Dispensar esta magia.

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Idiomas', 5, '', '2 ações', 'Toque', '', '1 hora', 'O alvo pode compreender todas as palavras independentemente do idioma e falar os idiomas de outras criaturas. Para lidar com um grupo misto de criaturas, a cada vez que falar, o alvo escolhe uma criatura e fala em um idioma que ela compreenda (mesmo que ele não saiba sequer qual idioma a criatura compreende).

---

Elevada (7º) A duração é de 8 horas.', false),
  (null, 'pathfinder', 'Caminhar nas Sombras', 5, '', '1 minuto', 'Toque', '', '8 horas', 'Você acessa o Plano das Sombras, usando a natureza distorcida dele para fazer suas viagens. Os alvos entram nas margens do Plano das Sombras, onde ele encontra o Plano Material. Alvos não podem ver o Plano Material enquanto estiverem no Plano das Sombras (embora elementos desse plano às vezes sejam um reflexo enevoado do Plano Material). Enquanto estiverem no Plano das Sombras, os alvos podem ter encontros com os habitantes desse plano. As sombras nessas margens entre os planos dobram o espaço, acelerando seu movimento em relação ao Plano Material. A cada 3 minutos que os alvos se deslocam por estas margens, eles se movem tão rápido como se tivessem deslocado 1 hora no Plano Material. A qualquer momento, um alvo pode Dispensar os efeitos da magia, embora isto afete somente esse alvo. A dobra da sombra é inexata, portanto, ao final da magia, os alvos aparecem cerca de 1,5 quilômetros de distância de sua localização pretendida no Plano Material (embora aqueles que estiverem viajando juntos e Dispersarem a magia no mesmo momento no Plano das Sombras apareçam juntos).', false),
  (null, 'pathfinder', 'Muralha de Gelo', 5, '', '3 ações', '36 metros', '', '1 minuto', 'Você esculpe uma barreira de gelo que bloqueia a visão e, após estilhaçada, congela adversários. Você cria uma muralha de gelo de 30 centímetros de espessura em uma linha reta de até 18 metros de comprimento e 3 metros de altura (a muralha não precisa ser vertical, mas ambos os lados dela devem ser ancorados em uma superfície sólida) ou um hemisfério de 30 centímetros de espessura e 3 metros de raio. Se você quiser, a muralha pode ser menor em comprimento, altura e raio. 

Você deve criar a muralha em um espaço aberto interrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida. Cada seção de 3 metros por 3 metros de lado da muralha possui CA 10, Dureza 10, 40 Pontos de Vida e é imune a acertos críticos, dano de frio e dano de precisão. Cada seção também possui fraqueza 15 a fogo; uma seção da muralha destruída por fogo é derretida e evapora em água e vapor. Uma seção destruída por outros meios deixa uma massa de gelo congelante que é terreno difícil e causa 2d6 de dano de frio a qualquer criatura que atravessá-la.

---

Elevada (+2) Os Pontos de Vida de cada seção da muralha aumentam em 10, e o dano de frio causado a criaturas atravessando uma seção destruída aumenta em 1d6.', false),
  (null, 'pathfinder', 'Muralha de Pedra', 5, '', '3 ações', '36 metros', '', 'Instantânea', 'Você forma uma parede de pedra sólida. Você cria uma muralha de pedra de 30 centímetros de espessura, até 36 metros de comprimento e 6 metros de altura. Você pode moldar o caminho da muralha, posicionando cada 1,5 metros da muralha na borda entre quadrados. A muralha não precisa ser vertical, portanto, você pode usá-la para formar uma ponte ou um conjunto de escadas, por exemplo. Você deve criar a muralha em um espaço aberto interrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida.
Cada seção de 1,5 metros por 1,5 metros de lado da muralha possui CA 10, Dureza 14, 50 Pontos de Vida e é imune a acertos críticos e dano de precisão. Uma seção destruída da muralha pode ser atravessada, mas os detritos criados dela são terreno difícil.

---

Elevada (+2) Os Pontos de Vida de cada seção da muralha aumentam em 15.', false),
  (null, 'pathfinder', ' Desespero Esmagador', 5, '', '2 ações', '', '', '1 or more rodadas', 'Você inflige desespero em criaturas na área. Os efeitos para cada criatura são determinados pelos salvamentos de Vontade deles.

---
Sucesso Crítico  A criatura não é afetada.

Sucesso   Por 1 rodada, a criatura não pode usar reações e deve tentar outro salvamento no início do turno dela; em uma falha, ela fica lento 1 nesse turno e fica em prantos descontroladamente.

Falha  Como sucesso, mas a duração é de 1 minuto para lento 1.

Falha Crítica  Como falha, e a criatura fica automaticamente lento 1 por 1 minuto.

---
Elevada (7º)  A área aumenta para um cone de 18 metros.', false),
  (null, 'pathfinder', 'Barreira de Lâminas', 6, '', '3 ações', '36 metros', '', '1 minuto', 'Lâminas de força formam uma muralha agitada. A muralha é uma linha reta de 6 metros de altura, 36 metros de comprimento e 60 centímetros de espessura e fornece cobertura. A muralha causa 7d8 de dano de força a cada criatura que estiver no espaço da muralha quando ela for criada, que tentar atravessá-la ou que terminar o próprio turno dentro da muralha. Um salvamento básico de Reflexos reduz o dano. Uma criatura que obtiver sucesso neste salvamento quando a muralha for criada é empurrada para o espaço desocupado mais próximo à escolha dela. Criaturas tentando se mover através da muralha falham em fazê-lo se falharem criticamente no salvamento, encerrando seu movimento adjacente à muralha.

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Corrente de Relâmpagos', 6, '', '2 ações', '150 metros', '', 'Instantânea', 'Você descarrega um relâmpago poderoso no alvo, causando 8d12 de dano de eletricidade. O alvo deve tentar um salvamento básico de Reflexos. A eletricidade salta para outra criatura a até 9 metros do primeiro alvo, então salta para outra criatura a até 9 metros desse alvo e assim por diante. Você pode encerrar a corrente em qualquer ponto. Você não pode mirar a mesma criatura mais de uma vez e deve ter linha de efeito para todos os alvos. Role o dano somente uma vez e aplique-o a cada alvo (dividindo pela metade ou dobrando conforme apropriado para o resultado da jogada de salvamento de cada um deles). A corrente acaba se qualquer um dos alvos obtiver sucesso crítico em seu salvamento.

---

Elevada (+1) O dano aumenta em 1d12.', false),
  (null, 'pathfinder', 'Transposição Coletiva', 6, 'Conjuração', '2 ações', '', 'S, V', 'Instantânea', 'Você teleporta os alvos para novas posições dentro da área. Cada uma das criaturas deve ser capaz de caber em seu novo espaço, e suas posições devem estar desocupadas, inteiramente dentro da área e em sua linha de visão. Criaturas involuntárias podem tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo pode teleportar se quiser, mas escolhe o destino dentro da área.

Sucesso  O alvo não é afetado.

Falha  Você teleporta o alvo e escolhe o destino dele.

---
Elevada (+1)  A quantidade de alvos aumenta em 1.', false),
  (null, 'pathfinder', 'Polimorfia Perniciosa', 6, '', '2 ações', '9 metros', '', 'Varies', 'Você transforma a criatura alvo em um animal inofensivo apropriado para a área, com efeitos baseados no salvamento de Fortitude dela.

---

Sucesso Crítico O alvo não é afetado.

Sucesso O corpo do alvo adquire caraterísticas menores do animal inofensivo. As entranhas dele se agitam durante a transformação parcial, fazendo-o ficar Enjoado 1. Quando ele se recuperar da condição Enjoado, suas características revertem ao normal.

Falha O alvo se transforma por 1 minuto, mas mantém sua mente. Se ele gastar todas as ações dele no turno concentrando em sua forma original, ele pode tentar um salvamento de Vontade para encerrar o efeito imediatamente.

Falha Crítica O alvo é transformado no animal inofensivo escolhido, de corpo e mente, por uma duração ilimitada.', false),
  (null, 'pathfinder', 'Desintegrar', 6, '', '2 ações', '36 metros', '', 'Instantânea', 'Você dispara um raio verde em um alvo. Faça um ataque de magia. Você causa 12d10 de dano em um acerto e o alvo deve tentar um salvamento básico de Fortitude. Em um acerto crítico, trate o resultado do salvamento como um grau pior. Uma criatura reduzida a 0 PV é reduzida a poeira fina; os equipamentos dela permanecem intocados.
Um objeto que você acerte é destruído (sem salvamento), independentemente da Dureza dele, exceto se for um artefato ou item similarmente difícil de destruir. Uma única conjuração não pode destruir matéria equivalente a mais que um cubo de 3 metros de lado. Isto destrói automaticamente qualquer construção de força, como uma muralha de força.

---

Elevada (+1) O dano aumenta em 2d10.', false),
  (null, 'pathfinder', 'Dominar', 6, '', '2 ações', '9 metros', '', 'Until your next daily preparations', 'Você assume o comando do alvo, forçando-o a obedecer às suas ordens. Se emitir uma ordem obviamente autodestrutiva, o alvo não age até você emitir uma nova ordem. O efeito depende do salvamento de Vontade dele.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica atordoado 1 enquanto luta contra seus comandos.

Falha  O alvo segue suas ordens, mas pode tentar um salvamento de Vontade ao final de cada um dos turnos dele. Em um sucesso, a magia é encerrada.

Falha Crítica  Como falha, mas o alvo recebe um novo salvamento somente se você emitir uma nova ordem que seja contra a natureza dele, como matar os aliados que ele tiver.

---
Elevada (10º)  A duração é ilimitada.', false),
  (null, 'pathfinder', 'Forma de Dragão', 6, '', '2 ações', '', '', '1 minuto', 'Recorrendo a magia transformativa poderosa, você adquire uma forma de batalha de um dragão Grande. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Quando conjurar esta magia, escolha um tipo de dragão cromático ou metálico. Enquanto estiver nesta forma, você adquire o traço dragão. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 18 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
10 Pontos de Vida temporários.
Velocidade 12 metros, Velocidade de voo 30 metros
Resistência 10 contra o tipo de dano de seu sopro (veja
abaixo).
Visão no escuro e faro impreciso de 18 metros.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +22 e seu bônus de dano é +6. Estes ataques são baseados em Força (para o propósito da condição Enfeebled, por exemplo). Se seu modificador de ataque para ataques desarmados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+23 de modificador de Atletismo, exceto se o seu próprio modificador for maior.
Sopro arcana, evocação) O formato, dano e tipo de dano de seu sopro depende de sua forma de dragão específica (veja abaixo). Uma criatura na área do sopro tenta um salvamento básico contra sua CD de magia. Este salvamento é Reflexos exceto se especificado o contrário na descrição da habilidade especial para sua forma de dragão específica. Uma vez ativado, seu sopro não pode ser usado novamente por 1d4 rodadas. Seu sopro possui o traço correspondente ao tipo de dano que ele causa.

Você também recebe habilidades específicas baseadas na forma escolhida:

Azul Velocidade de escavação 6 metros;Corpo a Corpo mandíbulas, Dano 2d10 perfurante mais 1d12 de eletricidade;Corpo a Corpo  garra (ágil), Dano 3d10 cortante; Corpo a Corpo cauda (alcance 3 metros), Dano 3d10 contundente;Corpo a Corpo  chifres (alcance 3 metros), Dano 3d8 perfurante; sopro em linha de 24 metros, 6d12 de eletricidade.
Branco Velocidade de escalada 7,5 metros somente no gelo;Corpo a Corpo mandíbulas, Damage 3d6 perfurante mais 2d6 de frio; Corpo a Corpo garra (ágil),Dano, 3d10 cortante; Corpo a Corpo cauda (alcance 3 metros),Damage contundente; sopro em cone de 9 metros, 10d6 de frio
Negro Velocidade de natação 18 metros; Corpo a Corpo  mandíbulas, Damage 2d12 perfurante mais 2d6 de ácido;Corpo a Corpo  garra (ágil), Damage 3d10 cortante; Corpo a Corpo  cauda (alcance 3 metros), Dano 3d10 contundente; Corpo a Corpo  chifres (alcance 3 metros), Dano 3d8 perfurante; sopro em linha de 18 metros, 11d6 de ácido.
Verde Velocidade de natação 12 metros; ignora terreno difícil de folhagem não-mágica;Corpo a Corpo  mandíbulas, Dano 2d12
perfurante mais 2d6 de veneno;Corpo a Corpo  garra (ágil), Dano3d10 cortante; Corpo a Corpo  cauda (alcance 3 metros), Dano 3d10 contundente; Corpo a Corpo  chifres (alcance 3 metros),Dano 3d8 perfurante; sopro em cone de 9 metros, 10d6 de veneno (salvamento de Fortitude em vez de Reflexos).
Vermelhoignora Concealed por fumaça; Corpo a Corpo mandíbulas, Dano 2d12 perfurante mais 2d6 de fogo;Corpo a Corpo  garra (ágil),Dano 4d6 cortante;Corpo a Corpo tail (reach 10 feet), Dano 3d10 contundente; Corpo a Corpo  asa (alcance 3 metros), Dano3d8 contundente; sopro em cone de 9 metros, 10d6 de fogo.
Bronze Velocidade de natação 12 metros;Corpo a Corpo  mandíbulas, Dano2d10 perfurante mais 1d12 de eletricidade;Corpo a Corpo  garra (ágil),Damage 3d10 cortante; Corpo a Corpo  tail (reach 10 feet), Dano 3d10 contundente; Corpo a Corpo  asa (alcance 3 metros), Dano ortante;
sopro em linha de 24 metros, 6d12 de eletricidade.
CobreVelocidade de escalada 7,5 metros somente em pedra;Corpo a Corpo mandíbulas, Dano2d12 perfurante mais 2d6 de ácido; Corpo a Corpo garra (ágil), Dano 3d10 cortante; Corpo a Corpo cauda (alcance 3 metros),Dano 3d10 contundente;Corpo a Corpo asa (alcance 3 metros),Damage 3d8 contundente; sopro em linha de 18 metros, 10d6 de ácido.
Latão Velocidade de escavação 6 metros;Corpo a Corpo  mandíbulas, Dano 3d8 perfurante mais 2d4 de fogo; Corpo a Corpo  garra (ágil), Dano 3d10 cortante; Corpo a Corpo  cauda (alcance 3 metros), Dano3d10 contundente;Corpo a Corpo  espinhos (alcance 3 metros) Dano 3d8 perfurante; sopro em linha de 18 metros, 15d4 de fogo.
OuroVelocidade de natação 12 metros;Corpo a Corpo mandíbulas, Dano 2d12 perfurante mais 2d6 de fogo;Melee  garra (ágil), Dano 4d6 cortante; Corpo a Corpo cauda (alcance 3 metros), Dano 3d10 contundente; Corpo a Corpo  chifres (alcance 3 metros) Dano 3d8 perfurante; sopro em linha de 18 metros, 6d10 de fogo.

---

Elevada (8º) Sua forma de batalha é Enorme, você recebe +6 metros de bônus de estado em sua Velocidade de voo e seus ataques possuem alcance de 3 metros, ou alcance de 4,5 metros se tinham alcance inicial de 3 metros. Você recebe CA = 21 + seu nível, 15 PV temporários, +28 de modificador de ataque, +12 de bônus de dano, +14 de bônus de estado no dano do sopro e +28 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Campo de Vida', 6, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Um campo de energia positiva preenche a área, exalando vivacidade e rejuvenescendo aqueles que estiverem nela. Cada criatura viva que iniciar o turno dela dentro da área recupera 1d8 Pontos de Vida e qualquer criatura morta-viva que iniciar o turno dela na área sofre 1d8 de dano positivo.

---

Elevada (8º) A cura e o dano aumentam para 1d10.

Elevada (9º)A cura e o dano aumentam para 1d12.', false),
  (null, 'pathfinder', 'Despistar', 6, 'Ilusão', '2 ações', '', '', 'Sustentada até 1 minuto', 'Você fica Invisible e cria uma duplicata ilusória sua. Quando
Sustentar a Magia, você pode mentalmente ditar o curso de
ação que a sua duplicata vai seguir essa rodada. Sua duplicata age como se tivesse sua quantidade total de ações, embora ela não possa afetar nada verdadeiramente no ambiente. Tanto a duplicata quanto sua invisibilidade persistem pela duração da magia. Realizar uma ação hostil não encerra a invisibilidade de despistar, assim como a magia invisibilidade de 4º nível. Uma criatura que determinar que a duplicata é uma ilusão não necessariamente sabe que você está invisível, e uma que puder ver sua forma invisível não necessariamente sabe que sua duplicata é uma ilusão.

Se você Conjurar uma Magia, atacar ou de outra forma
interagir com outra criatura, você pode, como parte dessa ação, fazer um teste de Dissimulação contra as CDs de Percepção dos observadores para convencê-los que sua duplicata usou essa ação. Isto não engana qualquer pessoa que esteja ciente que sua duplicata é uma ilusão, nem funciona se o ataque obviamente não vier da duplicata. Por exemplo: se tiver disparado um raio, você pode fazer com que ele pareça que saiu da duplicata (desde que ela esteja posicionada apropriadamente), mas se você tiver atacado com uma espada e sua duplicata estiver do outro lado da sala oposta ao alvo, seu teste de Dissimulação falharia automaticamente.', false),
  (null, 'pathfinder', 'Enfraquecer Mente', 6, '', '2 ações', '9 metros', '', 'Varies', 'Você reduz drasticamente as faculdades mentais do alvo. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo fica estupefato 2 por 1 rodada.

Falha  O alvo fica estupefato 4 com duração ilimitada.

Falha Crítica O intelecto do alvo é permanentemente reduzido abaixo do intelecto de um animal e ele considera os modificadores de Inteligência, Sabedoria e Carisma dele como –5. Ele perde todas as habilidades de classe que requeiram faculdades mentais, incluindo toda conjuração. Se o alvo for um PJ, ele se torna um PdM sob o controle do MJ.', false),
  (null, 'pathfinder', 'Carne em Pedra', 6, '', '2 ações', '36 metros', '', 'Varies', 'Você tenta transformar a carne do alvo em pedra. O alvo deve tentar um salvamento de Fortitude.
Sucesso Crítico O alvo não é afetado.
Sucesso O alvo fica  lento 1 por 1 rodada.
FalhaO alvo fica lento  1 e deve tentar um salvamento de Fortitude ao final de cada um dos turnos dele; este salvamento contínuo possui o traço incapacitação. Em um salvamento falho, a condição lento aumenta em 1 (ou 2 em uma falha crítica). Um salvamento bem-sucedido reduz a condição lento em 1. Quando for incapaz de agir devido à condição lento  de carne em pedra, a criatura é petrificado  permanentemente. A magia encerra se a criatura for petrificado  ou se a condição lento  for removida.
Falha Crítica Como falha, mas o alvo fica  lento 2 inicialmente.', false),
  (null, 'pathfinder', 'Calamidade Fantasmagórica', 6, 'Ilusão', '2 ações', '150 metros', '', 'Instantânea', 'A visão de uma destruição apocalíptica preenche a mente de cada criatura na área. A visão causa 11d6 de dano mental (salvamento básico de Vontade). Em uma falha crítica, a criatura também deve obter sucesso em um salvamento de Reflexos ou acredita que está presa (confinada em uma fissura, à deriva no mar ou algum outro destino condizente com a visão dela). Se falhar no segundo salvamento, ela também fica Stunnedpor 1 minuto. Ela pode tentar um novo salvamento de Vontade a cada um dos turnos dela e, em um sucesso, consegue desacreditar a ilusão e recuperar-se da condição Stunned.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Ferrão do Vorme Púrpura', 6, 'Necromancia', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Você replica o ataque do mortal vorme púrpura. Você causa 6d6 de dano perfurante à criatura tocada e a aflige com veneno de vorme púrpura. O alvo deve tentar um salvamento de Fortitude.

Veneno de Vorme Púrpura (veneno); Nível 11; Duração Máxima 6 rodadas. Estagio 1 3d6 de dano de veneno e enfraquecido 2 (1 rodada); Estagio 2 4d6 de dano de veneno e enfraquecido 2 (1 rodada); Estagio 3 6d6 de dano de veneno e enfraquecido 2 (1 rodada).

Sucesso Crítico O alvo não é afetado.
Sucesso O alvo sofre 3d6 de dano de veneno.
Falha O alvo é afligido com veneno de vorme púrpura no estágio 1.
Falha Crítica O alvo é afligido com veneno de vorme púrpura no estágio 2.', false),
  (null, 'pathfinder', 'Reviver os Mortos', 6, '', '10 minutos', '3 metros', '', 'Instantânea', 'Você tenta invocar a alma da criatura morta, requerendo que o corpo da criatura esteja presente e relativamente intacto. A criatura deve ter morrido nos últimos 3 dias. Se Pharasma tiver decidido que o tempo da criatura chegou ao fim (a critério do MJ) ou se a criatura não quiser retornar à vida, esta magia falha automaticamente, mas os diamantes não são consumidos na conjuração.

Se a magia for bem-sucedida, a criatura retorna à vida com 1 Ponto de Vida, sem nenhuma magia preparada ou espaços de magia disponíveis, nenhum ponto em quaisquer reservas ou outros recursos diários, e ainda possui as debilitações duradouras que seu corpo antigo possuía. O tempo gasto no Ossário deixa o alvo temporariamente debilitado, deixando-o desajeitado 2, drenado 2, e enfraquecido 2 por 1 semana; estas condições não podem ser removidas ou reduzidas por quaisquer meios até a semana ter passado. A criatura também fica permanentemente alterada pelo tempo que passou no pós-vida, por exemplo, demonstrando uma leve mudança de personalidade, uma mecha branca de cabelo ou uma nova e estranha marca de nascença.

---

Elevada (7°) O nível máximo do alvo aumenta para 15. O custo aumenta para o nível do alvo (mínimo 1) × 400 po.

Elevada (8º) O nível máximo do alvo aumenta para 17. O custo aumenta para o nível do alvo (mínimo 1) × 800 po.

Elevada (9º) O nível máximo do alvo aumenta para 19. O custo aumenta para o nível do alvo (mínimo 1) × 1.600 po.

Elevada (10°) O nível máximo do alvo aumenta para 21. O custo aumenta para o nível do alvo (mínimo 1) × 3.200 po.', false),
  (null, 'pathfinder', 'Repulsão', 6, '', '2 ações', '', '', '1 minuto', 'Você manifesta uma aura que impede criaturas de se aproximarem. Quando conjurar a magia, você pode fazer a área com qualquer raio escolhido de até 12 metros. Uma criatura deve tentar um salvamento de Vontade se estiver na área quando você conjurar a magia ou assim que ela entrar na área enquanto a magia estiver em efeito. Após uma criatura ter tentado o salvamento, ela utiliza o mesmo resultado para essa conjuração de repulsão. Quaisquer restrições ao movimento de uma criatura se aplicam somente se ela se mover voluntariamente em direção a você. Por exemplo, se você se aproximar de uma criatura, ela não precisa se mover para longe.
Sucesso Crítico O movimento da criatura não é restringido.
SucessoA criatura trata todo quadrado na área como terreno difícil quando se mover para perto de você.
Falha A criatura não pode se mover para mais perto de você dentro da área.', false),
  (null, 'pathfinder', 'Poder da Retidão', 6, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Você foca toda sua energia divina e se transforma em uma forma de batalha Média, similar à sua forma normal, portando armamentos divinos poderosos concedidos por sua divindade. Você possui mãos nesta forma de batalha e pode usar ações de manuseio. Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir: 

CA = 20 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
10 Pontos de Vida temporários.
Velocidade 12 metros.
Resistência 3 contra dano físico.
Visão no escuro.
Um ataque especial usando uma versão de armamento de retidão de sua arma favorita, que é o único ataque que pode usar. Seu modificador de ataque é +21 e seu bônus de dano é +8 (ou +6 para um ataque à distância). Se seu modificador de ataque com a arma favorita de sua divindade for superior, você pode utilizá-lo em vez do modificador concedido pela magia. Você causa três dos dados de dano normais de sua arma, ou três dados de dano de um tamanho de dado superior se sua arma for uma arma simples com dado de dano de d4 ou d6. A arma possui uma das seguintes propriedades que seja condizente à tendência de sua divindade: anarquica, axiomatica, sagrada, profana. Se sua divindade for neutra verdadeira, você não recebe essas propriedades, mas causa 1d6 de dano de precisão extra.
+23 de modificador de Atletismo, exceto se o seu próprio modificador for maior.

---

Elevada (8º) Sua forma de batalha é Grande e seus ataques possuem alcance de 3 metros, ou alcance de 4,5 metros se a arma favorita de sua divindade possuir alcance. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você recebe CA = 21 + seu nível, 15 PV temporários, resistência 4 a dano físico, +28 de modificador de ataque, +15 de bônus de dano (+12 para um ataque à distância) e +29 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Vidência', 6, '', '10 minutos', 'Planetário', '', 'Sustentada até 10 minutos', 'Você espiona magicamente uma criatura à sua escolha. Vidência funciona como clarividência (página 327), exceto que a imagem que você recebe é menos precisa, insuficiente para teleporte e magias similares. Em vez de criar um olho em um local determinado a até 150 metros, você cria um olho que se manifesta acima do alvo. Você pode escolher um alvo pelo nome ou ao tocar uma das posses ou uma parte do corpo dele. Se você não tiver encontrado o alvo pessoalmente, a CD de vidência é 2 pontos menor e, se você não estiver ciente da identidade do alvo (talvez porque você encontrou a presa de uma criatura desconhecida em uma cena de crime), em vez disso, a CD é 10 pontos menor.
O efeito de vidência depende do salvamento de Vontade do alvo.

---
Sucesso Crítico  A magia falha e o alvo fica temporariamente imune por 1 semana. O alvo também recebe um vislumbre de você e descobre a distância e direção aproximadas em relação a você.

Sucesso  A magia falha e o alvo fica temporariamente imune por 1 dia.

Falha  A magia é bem-sucedida.

Falha Crítica  A magia é bem-sucedida e o olho segue o alvo se ele se mover, deslocando-se até 18 metros por rodada.', false),
  (null, 'pathfinder', 'Arruinar Magia', 6, '', '2 ações', '9 metros', '', 'Instantânea', 'Você dispersa as energias das magias conjuradas no alvo em surtos nocivos. O alvo deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  Sempre que o alvo for afetado por uma magia com uma duração, ele sofre 2d12 de dano persistente de força. Cada vez que ele sofrer dano persistente de força de arruinar magia, reduza a duração remanescente das magias o afetando em 1 rodada. Somente um teste bem-sucedido de Arcanismo contra sua CD de magia pode ajudar o alvo a se recuperar do Persistent Damage; a maldição e o Persistent Damage se encerram após 1 minuto.

Falha  Como sucesso, mas a maldição e o Persistent Damage não se encerram sozinhos.

Falha Crítica  Como falha, mas o dano persistente de força é 4d12.', false),
  (null, 'pathfinder', 'Rajada Espiritual', 6, '', '2 ações', '9 metros', '', 'Instantânea', 'Você concentra energia etérea e ataca o espírito de uma criatura, causando 16d6 de dano de força. Como rajada espiritual afeta o espírito da criatura, ela pode causar dano a um alvo que esteja projetando sua consciência (como através de projetar imagem) ou possuindo outra criatura mesmo que o corpo do alvo esteja em outro lugar. A criatura possuída não é ferida pela rajada. A rajada não fere criaturas que não tenham espírito, como constructos.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Pedra em Carne', 6, 'Transmutação', '2 ações', 'Toque', 'S, V', 'Instantânea', 'Manipulando as partículas fundamentais da matéria, você converte pedra em carne e sangue. Você restaura uma criatura petrificada ao estado normal dela ou transforma um objeto de pedra em uma massa de carne inerte (sem a Dureza da pedra) mais ou menos com o mesmo formato.', false),
  (null, 'pathfinder', 'Trepadeiras Emaranhadoras', 6, '', '3 ações', '150 metros', '', '10 minutos', 'Trepadeiras densas e retorcidas brotam de toda a superfície e preenchem quaisquer corpos d''água na área. Qualquer criatura se movendo sobre a terra, ou Escalando ou Nadando entre as trepadeiras, sofre –3 metros de penalidade de circunstância nas Velocidades dela enquanto estiver na área. Uma vez por rodada, você pode fazer uma vinha chicotear de qualquer quadrado dentro da área das trepadeiras ao usar uma ação única que possui o traço concentração. Esta vinha possui um alcance de 4,5 metros e faz um ataque desarmado corpo a corpo utilizado seu modificador de ataque de magia. Se o ataque for bem-sucedido, a vinha puxa o alvo para as trepadeiras e o deixa imobilizado por 1 rodada ou até a criatura Escapar (contra sua CD de magia), o que ocorrer primeiro.', false),
  (null, 'pathfinder', 'Teleporte', 6, '', '10 minutos', '100 km', '', 'Instantânea', 'Você e os alvos são instantaneamente transportados para qualquer local na distância, desde que seja capaz de determinar a aparência desse local (ou outras características marcantes) e a posição dele relativa à sua posição inicial. Conhecimento incorreto sobre a aparência do local normalmente faz a magia falhar, mas em vez disso ela pode teleportar os alvos para um local indesejado ou resultar em algum outro incidente determinado pelo MJ. Teleporte não é preciso em grandes distâncias. Os alvos aparecem a uma distância do destino pretendido igual a mais ou menos 1 por cento da distância total deslocada, em uma direção determinada pelo MJ. Para trajetos curtos, esta falta de precisão é irrelevante, mas para longas distâncias pode chegar a até 1,5 quilômetros.

---

Elevada (7º) Você e os outros alvos podem viajar para qualquer local a até 1.500 quilômetros.

Elevada (8º) Você e os outros alvos podem viajar para qualquer local no mesmo planeta. Se viajar mais de 1.500 quilômetros, você chega a somente 15 quilômetros de distância do destino pretendido.

Elevada (9º) Você e os outros alvos podem viajar para qualquer local em outro planeta no mesmo sistema solar. Pressupondo que você tenha conhecimento preciso sobre a posição e aparência do local, você chega ao novo planeta a 150 quilômetros de distância do destino pretendido.

Elevada (10º) Como a versão de 9º nível, mas você e os outros alvos podem viajar para qualquer planeta na mesma galáxia.', false),
  (null, 'pathfinder', 'Visão Verdadeira', 6, '', '2 ações', '', '', '10 minutos', 'Você vê coisas a até 18 metros como elas realmente são. O MJ rola um teste secreto de neutralização contra qualquer ilusão ou transmutação na área, mas somente para determinar se você pode ver através dela (por exemplo, se o teste for bem-sucedido contra a magia metamorfose, você vê a verdadeira forma da criatura, mas a magia metamorfose não é encerrada).', false),
  (null, 'pathfinder', 'Exsanguinação Vampírica', 6, '', '2 ações', '', '', 'Instantânea', 'Você drena o sangue e força vital de outras criaturas através de seus braços estendidos. Você causa 12d6 de dano negativo a criaturas vivas na área.
Você recebe Pontos de Vida temporários igual à metade do dano que uma única criatura sofrer desta magia; calcule estes Pontos de Vida temporários utilizando a criatura que sofreu a maior quantidade de dano. Você perde quaisquer Pontos de Vida temporários após 1 minuto.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Padrão Vibrante', 6, 'Ilusão', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Você cria um padrão de luzes que pulsam com intensidade. Criaturas ficam ofuscada dentro deste padrão. Além disso, uma criatura deve tentar uma jogada de salvamento de Vontade se estiver dentro do padrão quando você conjurá-lo, se entrar no padrão, se encerrar o turno dela dentro do padrão ou se usar uma ação de Buscar ou Interagir dentro do padrão. Uma criatura atualmente cega pelo padrão não precisa tentar novas jogadas de salvamento.

---
Sucesso   A criatura não é afetada..

Falha  A criatura fica cega pelo padrão. Se sair do padrão, ela pode tentar um novo salvamento para recuperar-se da condição cega ao final de cada um dos turnos dela, até uma duração máxima de 1 minuto.

Falha Crítica  A criatura fica cega por 1 minuto.', false),
  (null, 'pathfinder', 'Muralha de Força', 6, '', '3 ações', '9 metros', '', '1 minuto', 'Você forma uma muralha invisível de pura força mágica de até 15 metros de comprimento e até 6 metros de altura. A muralha não possui espessura discernível. Você deve criar a muralha em um espaço aberto interrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida. A muralha possui CA 10, Dureza 30, 60 Pontos de Vida e é imune a acertos críticos e dano de precisão. A muralha bloqueia e impede efeitos físicos de atravessá-la e, por ser feita de força, também bloqueia criaturas incorpóreas e etéreas. Efeitos de teleportação podem atravessar a barreira, assim como efeitos visuais (já que a muralha é invisível).
Muralha de força é imune a efeitos de neutralização do nível dela ou inferior, mas é automaticamente destruída pela magia desintegrar de qualquer nível ou ao contato de um bastão de cancelamento ou uma esfera de aniquilação.

---

Elevada (+2) Os Pontos de Vida da muralha aumentam em 20.', false),
  (null, 'pathfinder', 'Zealous Conviction', 6, '', '2 ações', '9 metros', '', '10 minutos', 'Você supera as mentes racionais de seus alvos, instigando-os com convicção e fervor inabaláveis. Cada alvo recebe 12 Pontos de Vida temporários e +2 de bônus de estado em salvamentos de Vontade contra efeitos mentais, já que sua fé supera os limites de seus próprios corpos e mentes. Se você disser a um alvo para fazer algo, ele deve consentir com seu pedido, embora, se normalmente acharia a tarefa repugnante, poderá tentar um salvamento de Vontade ao final do turno dele a cada rodada devido à dissonância cognitiva. Em um sucesso, ele encerra inteiramente os efeitos da magia sobre si mesmo.

Elevada (9º) Os Pontos de Vida temporários aumentam para 18 e
o bônus de estado em salvamentos de Vontade aumenta para +3.', false),
  (null, 'pathfinder', 'Contingência', 7, '', '10 minutos', '', '', 'Until your next daily preparations', 'Você prepara uma magia que será acionada posteriormente. Enquanto conjurar contingência, você também conjura outra magia de 4º nível ou inferior com tempo de execução de no máximo 3 ações. Esta magia acompanhante deve ser capaz de afetá-lo. Você deve fazer quaisquer decisões para a magia quando conjurar contingência, tal como escolher um tipo de dano para resistir a energia. Durante a conjuração, escolha um acionamento sob o qual a magia será conjurada, utilizando as mesmas restrições para o acionamento de uma ação de Preparar. Após contingência ser conjurada, você pode fazer a magia que a acompanha surtir efeito como uma reação a esse acionamento. Ela afeta somente você, mesmo que normalmente afetaria mais criaturas. Se você definir condições complicadas, conforme determinado pelo MJ, o acionamento pode falhar. Se você conjurar contingência novamente, a nova conjuração substitui a antiga.

---

Elevada (8º) Você pode escolher uma magia de 5º nível ou inferior.

Elevada (9º) Você pode escolher uma magia de 6º nível ou inferior.

Elevada (10º) Você pode escolher uma magia de 7º nível ou inferior.', false),
  (null, 'pathfinder', 'Controlar Areia', 7, 'Evocação', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'Você cria uma pequena tempestade de areia ao redor do seu corpo. Quando uma criatura começa sua vez na área ou se move para a área, ela deve ter sucesso em um teste de Fortitude ou fica ofuscada pelo tempo que permanecer na área; ou então temporariamente imune a esse efeito ofuscante por 10 minutos.

Escolha um dos seguintes efeitos adicionais ao lançar esta magia. Nas rodadas subsequentes, você pode mudar para um efeito diferente uma vez por rodada como uma ação livre desencadeada ao Sustentar a magia.

Escudo de Areia Você cria um escudo mágico feito de areia. O escudo de areia não oferece benefício para a CA, mas permite que você use a reação Bloqueio com Escudo e atua como um escudo para esse fim. O escudo de areia possui dureza 14, 21 pontos de vida e nenhum limiar de quebra; quando o HP do escudo é reduzido a 0, você não pode usar a reação Bloqueio com Escudo novamente até a próxima vez em que Sustentar a magia e escolher o efeito do escudo de areia.
Tiro de Areia Você dirige um jato de areia em um único alvo. Uma criatura de sua escolha em um raio de 9 metros recebe 8d6 de dano cortante (salvamento básico de Reflexo). Em uma falha crítica, a criatura também fica ofuscada por 1 minuto.
Tempestade de Areia A área da magia se expande para uma emanação de 9 metros, e qualquer criatura que começa sua vez na área ou se mover para a área sofre 6d4 de dano cortante (salvamento básico de Reflexo) e deve prender a respiração ou começar a sufocar.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Decreto Divino', 7, '', '2 ações', '12 metros', '', 'Varies', 'Você profere uma litania potente de sua fé, um decreto que fere aqueles que se opõem aos seus ideais. Escolha uma tendência que sua divindade possua (bem, caos, mal ou ordem). Você não pode conjurar esta magia se não tiver uma divindade ou se sua divindade for neutra verdadeira. Esta magia recebe o traço da tendência escolhida. Você causa 7d10 de dano a criaturas na área; cada criatura deve tentar um salvamento de Fortitude. Criaturas de tendência condizente com a escolhida não são afetadas pela magia. Aqueles que não possuam a mesma tendência nem possuam uma tendência oposta tratam o resultado de suas jogadas de salvamento como um grau melhor e não sofrem efeitos além do dano.

---

Sucesso Crítico A criatura não é afetada.

Sucesso A criatura sofre metade do dano.

Falha A criatura sofre o dano inteiro e fica enfraquecido 2 por 1 minuto.

Falha Crítica A criatura sofre o dobro do dano e fica enfraquecido 2 por 1 minuto. Se estiver em seu plano natal quando proferir o decreto, uma criatura alvo que falhar criticamente é banida com o mesmo efeito de falha do salvamento de banimento. Uma criatura de 10º nível ou inferior deve tentar um salvamento de Vontade. Em uma falha, ela fica paralisado por 1 minuto; em uma falha crítica, ela morre.

Elevada (+1) O dano aumenta em 1d10 e o nível de criaturas que devem tentar um segundo salvamento em uma falha crítica aumenta em 2.', false),
  (null, 'pathfinder', 'Receptáculo Divino', 7, 'Transmutação', '2 ações', '', 'S, V', '1 minuto', 'Você aceita energias divinas em seu corpo; embora ainda seja reconhecido como a mesma pessoa, você adquire as características de um dos servidores de sua divindade. Escolha uma tendência que sua divindade possua (bem, caos, mal ou ordem). Você não pode conjurar esta magia se não tiver uma divindade ou se sua divindade for neutra verdadeira. Esta magia recebe o traço da tendência escolhida.

Se for Médio ou menor, você fica Grande, como os efeitos de crescer. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você também recebe os benefícios a seguir:

• 40 Pontos de Vida temporários.
• Velocidade de voo igual à sua Velocidade.
• Fraqueza 10 à tendência oposta à escolhida.
• +1 de bônus de estado em salvamentos contra magias.
• Visão no escuro.
• Seus ataques desarmados e armas causam 1 de dano adicional do tipo de tendência escolhido.
• Um ou mais ataques desarmados corpo a corpo. Se escolher bem ou ordem, seus ataques de punho causam 2d8. Se escolher caos, você adquire um ataque desarmado de mordida que causa 2d10 de dano perfurante. Se escolher mal, você adquire um ataque desarmado de garras que causa 2d8 de dano cortante e que possui os traços acuidade e ágil.

---

Elevada (9º) Os Pontos de Vida temporários aumentam para 60, a fraqueza aumenta para 15 e a duração aumenta para 10 minutos.', false),
  (null, 'pathfinder', 'Duplicar Adversário', 7, '', '3 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você tenta criar uma duplicata temporária de um inimigo para lutar a seu favor. O alvo pode tentar um salvamento de Fortitude para interromper a magia. A duplicata aparece em um espaço desocupado adjacente ao alvo e possui o modificador de ataque, CA, modificadores de jogadas de salvamento, Percepção e modificadores de perícia do alvo, mas possui somente 70 Pontos de Vida e não possui as habilidades especiais do alvo (incluindo imunidades, resistências e fraquezas). Ela não possui itens mágicos exceto runas de potência de arma.
A duplicata recebe o traço lacaio e pode somente Andar e Golpear. Os Golpes dela causam o dano inteiro do alvo, mas não aplicam efeitos adicionais, já que ela não possui habilidades especiais. A magia acaba automaticamente se os Pontos de Vida da duplicata chegarem a 0. 
A duplicata ataca seus inimigos com o melhor das capacidades dela. Você também pode tentar dar instruções adicionais: quando Sustentar a Magia, você também Comanda um Lacaio como parte de sua ação, mas o MJ determina se aduplicata segue seu comando.
 A duplicata é instável, portanto, perde 4d6 Pontos de Vida a
cada turno após realizar as ações dela. Ela não é uma criatura viva e nunca pode recuperar Pontos de Vida perdidos de qualquer forma..

---
Sucesso Crítico Você falha em criar a duplicata.

Sucesso  A duplicata causa metade do dano com os Golpes dela e a duração é reduzida para um máximo de 2 rodadas

Falha A duplicata funciona conforme descrito.

---
Elevada (+1) O nível de criatura que você pode afetar aumenta em 2. A duplicata possui 10 PV adicionais..', false),
  (null, 'pathfinder', 'Explosão de Eclipse', 7, '', '2 ações', '150 metros', '', 'Instantânea', 'Um globo de escuridão congelante explode na área, causando 8d10 de dano de frio para criaturas e objetos na área, mais 8d4 de dano negativo a criaturas vivas. Criaturas e objetos na área devem tentar um salvamento de Reflexos.
Se o globo se sobrepor a uma área de luz mágica ou afetar uma criatura afetada por uma luz mágica, explosão de eclipse tenta neutralizar o efeito de iluminação.

---
Sucesso Crítico  A criatura ou objeto não é afetada.

Sucesso  A criatura ou objeto sofre metade do dano.

Falha A criatura ou objeto sofre o dano inteiro.

Falha Crítica  A criatura ou objeto sofre o dobro do dano. Se for uma criatura, ela fica cego pela escuridão por duração ilimitada.

---
Elevada (+1) O dano de frio aumenta em 1d10 e o dano negativo contra vivos aumenta em 1d4.', false),
  (null, 'pathfinder', 'Égide de Energia', 7, '', '1 minuto', 'Toque', '', 'Until your next daily preparations', 'Você protege o alvo com uma poderosa barreira duradoura de energia. O alvo adquire resistência 5 a dano de ácido, eletricidade, fogo, força, frio, negativo, positivo
e sônico.

---

Elevada (9º)As resistências aumentam para 10.', false),
  (null, 'pathfinder', 'Olhos Fascinantes', 7, 'Encantamento', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'Seus olhos brilham com um brilho fascinante que cativa aqueles que encontram seu olhar. Qualquer criatura que terminar seu turno dentro da emanação deve fazer um teste de salvamento de Vontade.

Sucesso Crítico O alvo não é afetado e fica imune a essa conjuração da magia em particular.
Sucesso O alvo não é afetado.
Falha Até o final de seu próximo turno, o alvo fica estupefato 2 e fascinado.
Falha Crítica Até o final de seu próximo turno, o alvo fica estupefato 4, fascinado, e não pode tomar reações. Além disso, todas as criaturas e objetos que não sejam você ficam ocultado do alvo.

Durante qualquer rodada que Sustentar a magia, você pode usar uma única ação, que possui a característica de manipular, para focar seus olhos fascinantes em uma única criatura que você pode ver a 9 metros. Esta criatura deve fazer imediatamente um teste de resistência de Vontade contra & nbsp; a magia como se estivesse terminando sua vez na emanação. Se a criatura já estava fascinado por seus olhos fascinantes antes do teste, um teste com falha faz com que seja paralisado por 1 rodada. Você não pode usar esta ação para focar na mesma criatura mais de uma vez por rodada.

(Tradução não oficial - Extinction Curse)', false),
  (null, 'pathfinder', 'Passeio Etéreo', 7, 'Conjuração', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'Você viaja para o Plano Etéreo, que se sobrepõe ao Plano Material. Criaturas do Plano Material não podem vê-lo e você pode mover-se através de coisas no Plano Material. Você se move à metade de suas Velocidades normais, mas pode se mover em qualquer direção (incluindo para cima e para baixo).
Você pode ver no Plano Material em um raio de 18 metros; ele aparece cinzento, enevoado e ocultado para você. Você não pode afetar o Plano Material e não pode ser afetado pelo Plano Material exceto por efeitos de força e abjurações originadas nele.
Quando a magia acaba, você retorna ao Plano Material. Se estiver no ar, você cai (exceto se puder voar) e, se estiver dentro de um objeto, você é empurrado para o espaço aberto mais próximo e sofre 1d6 de dano a cada 1,5 metros que for empurrado.
Se conjurar esta magia quando não estiver no Plano Material, ela é perdida.
Elevada (9º) Você pode afetar até cinco criaturas voluntárias adicionais a uma distância de 9 metros. A duração é de até 10 minutos.', false),
  (null, 'pathfinder', 'Dedo da Morte', 7, '', '2 ações', '9 metros', '', 'Instantânea', 'Você aponta seu dedo em direção ao alvo e fala uma palavra de assassinato. Você causa 70 de dano negativo ao alvo. Se o dano de dedo da morte reduzir o alvo a 0 Pontos de Vida, ele morre instantaneamente.

---

Elevada (+1) O dano aumenta em 10 pontos.', false),
  (null, 'pathfinder', 'Corpo Ardente', 7, '', '2 ações', '', '', '1 minuto', 'Você se torna chama viva, adquirindo imunidade a fogo, resistência 10 a dano de precisão e fraqueza 5 a frio e água. Qualquer criatura que o tocar ou lhe causar dano com um ataque desarmado ou com uma arma corpo a corpo (que não seja de alcance) sofre 3d6 de dano de fogo.
Seus ataques desarmados causam 1d4 de dano de fogo adicional e suas magias de fogo causam um dado de dano de fogo adicional (da mesma categoria de dado usado pela magia). Você pode conjurar produzir chama como uma magia inata; a conjuração é reduzida de 2 para 1 ação.
Em forma de fogo, você possui uma Velocidade de voo de 12 metros e não precisa respirar.

---

Elevada (9º) Criaturas que o tocarem sofrem 4d6 de dano de fogo em vez de 3d6, seus ataques desarmados causam 2d4 de dano de fogo adicional e você possui uma Velocidade de voo de 18 metros.', false),
  (null, 'pathfinder', 'Salto Planar', 7, '', '10 minutos', '1,5 metro', '', 'Instantânea', 'Você e seus aliados atravessam as barreiras entre os planos de existência. Os alvos se movem para outro plano, como para o Plano do Fogo, Plano das Sombras ou o Abismo. Você deve ter conhecimento específico do plano de destino e precisa usar um diapasão mágico criado de um material desse plano como foco para a magia. Embora os diapasões para os planos mais proeminentes sejam incomuns, assim como a magia salto planar, planos e semiplanos mais obscuros frequentemente possuem diapasões raros.

Esta magia é altamente imprecisa, e você aparece a 1d20×40 quilômetros do último local em que um dos alvos (à sua escolha) esteve quando viajou para o plano. Se for a primeira vez que todos os alvos viajam para o plano, você aparece em um local aleatório no plano de destino. Salto planar não fornece um meio de viagem de retorno, embora conjurar salto planar novamente permita retornar para seu plano prévio a menos que hajam circunstâncias extenuantes.', false),
  (null, 'pathfinder', 'Máscara de Terror', 7, 'Ilusão', '2 ações', '9 metros', '', '1 minuto', 'O alvo parece ser uma criatura terrível e pavorosa. O efeito é único para cada observador, portanto, um humano observando o alvo poderia ver um demônio com presas sangrentas, enquanto um demônio olhando o alvo poderia ver um rosto angelical brilhante.

Qualquer criatura que realizar uma ação hostil contra o alvo deve tentar um salvamento de Vontade. Ela fica temporariamente imune até o final do turno dela.

---
Successo  A criatura não é afetada.

Failure  A criatura fica Frightened 2 antes de usar a ação dela.

Critical Failure  A criatura fica Frightened 2, e a ação dela falha e é desperdiçada.

---
Elevada (8º)  Você pode afetar até 5 criaturas. Se uma criatura usar uma ação ou reação hostil que afete vários alvos simultaneamente, ela precisa tentar somente um salvamento contra máscara de terror.', false),
  (null, 'pathfinder', 'Mansão Magnífica', 7, '', '1 minuto', '9 metros', '', 'Until your next daily preparations', 'Você conjura um semiplano extradimensional consistindo de uma habitação espaçosa com uma única entrada. A entrada conecta o semiplano ao lugar de onde você Conjurar a Magia, aparecendo em qualquer lugar na distância da magia como um retângulo tênue, cintilante e vertical de 1,5 metros de largura e 3 metros de altura. Quando conjurar a magia, você designa quem pode entrar. Uma vez do lado de dentro, você pode fechar a entrada, tornando-a invisível.Invisible. Você e as criaturas que designar podem reabrir a porta à vontade, da mesma forma que abririam uma porta física.

Do lado de dentro, o semiplano parece ser uma mansão consistindo de uma sala de estar magnífica e vários aposentos luxuosos. A mansão pode ter qualquer planta baixa que você imaginar quando Conjurar a Magia, desde que caiba em um espaço de 12 metros de largura por 12 metros de comprimento e 9 metros de altura. Enquanto a entrada da mansão estiver fechada, efeitos do lado de fora da mansão falham em penetrá-la e vice-versa, exceto por salto planar, que pode ser usado para entrar na mansão. Você pode usar vidência mágica e efeitos similares para observar o exterior somente se essa magia for capaz de atravessar planos.

Uma equipe de até 24 servos atende a qualquer um dentro da mansão. Eles são similares ao servo criado pela magia servo invisível, embora sejam visíveis e tenham a aparência que você determinar durante a conjuração. A mansão possui comida armazenada suficiente para servir um banquete de nove pratos para 150 pessoas.', false),
  (null, 'pathfinder', 'Tranca Dimensional', 7, '', '2 ações', '36 metros', '', 'Until your next daily preparations', 'Você cria uma barreira cintilante que tenta neutralizar efeitos de teleportação e viagem planar para dentro ou para fora da área, incluindo itens que permitem acesso a espaços extradimensionais (como uma mochila de carga). Tranca dimensional tenta neutralizar qualquer tentativa de convocar uma criatura na área, mas não impede a criatura de partir ao término da magia de convocação.', false),
  (null, 'pathfinder', 'Possessão', 7, '', '2 ações', '9 metros', '', '1 minuto', 'Você envia sua mente e alma para dentro do corpo do alvo, tentando assumir o controle. O alvo deve tentar um salvamento de Vontade. Você pode escolher usar os efeitos de um grau de sucesso mais favorável para o alvo se preferir. Enquanto estiver possuindo um alvo, seu próprio corpo fica inconsciente e não pode despertar normalmente. Você pode sentir tudo que o alvo possuído fizer. Você pode Dispensar esta magia. Se o corpo possuído morrer, a magia acaba e você deve obter sucesso em um salvamento de Fortitude contra sua CD de magia ou fica paralisado por 1 hora, ou por 24 horas em uma falha crítica. Se a magia acabar durante um encontro, você age logo antes da contagem de iniciativa da criatura possuída.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  Você possui o alvo, mas não pode controlá-lo. Você fica no corpo dele enquanto a magia durar.

Falha  Você possui o alvo e assume controle parcial dele. Você não possui mais um turno separado; em vez disso, você deve controlar o alvo. No início de cada um dos turnos do alvo, ele tenta outro salvamento de Vontade. Se falhar, ele é controlado por você nesse turno; se obtiver sucesso, ele escolhe as próprias ações; e, se obtiver sucesso crítico, ele expulsa você para fora dele e a magia acaba.

Falha Crítica  Você possui o alvo por completo e ele pode somente observar enquanto é manipulado como um fantoche. O alvo fica controlado por você.

---
Elevada (9º)  A duração é de 10 minutos e você pode entrar fisicamente no corpo da criatura, protegendo seu corpo físico enquanto a magia durar.', false),
  (null, 'pathfinder', 'Palavra de Poder: Cegar', 7, 'Encantamento', '1 ação', '9 metros', 'V', 'Varies', 'Você profere uma palavra de poder arcana que deixa o alvo Blinded ao ouvi-la. Uma vez tido como alvo, ele fica temporariamente imune por 10 minutos. O efeito da magia depende do nível do alvo. 

---
11º ou Inferior  O alvo fica permanentemente cego. 

12º ou 13º  O alvo fica cego por 1d4 minutos. 

14º ou Superior  O alvo fica ofuscado por 1 minuto.

---
Elevada (+1)  Os níveis em que cada resultado se aplica aumenta em 2.', false),
  (null, 'pathfinder', 'Rajada Prismática', 7, 'Evocação', '2 ações', '', 'S, V', 'Instantânea', 'Uma rajada de luz arco-íris cascateia de sua mão aberta. Cada criatura na área deve rolar 1d8 na tabela abaixo para determinar qual feixe a acerta, e então tentar uma jogada de salvamento contra o tipo indicado. A tabela destaca quaisquer traços adicionais aplicados a cada tipo de raio. Se uma criatura for atingida por vários raios, ela usa o mesmo resultado do d20 para todas suas jogadas de salvamento. Para todos os raios, uma jogada de salvamento bem-sucedida anula o efeito para essa criatura.

Rajada Prismatica

1d8
Cor
Salvamento
Efeito (Traços)

1
Vermelho
Reflexo
50 de dano de fogo (fogo)

2
Laranja
Reflexo
60 de dano de ácido (ácido)

3
Amarelo
Reflexo
70 de dano de eletricidade (eletricidade)

4
Verde
Fortitude
30 de dano de veneno e enfraquecido por 1 minuto (veneno)

5
Azul
Fortitude
Afetado como por carne em pedra

6
Anil
Vontade
Confuso, como a magia distorcer mente(mental)

7
Violeta
Vontade
Lento 1 por 1 minuto; em uma falha crítica, é enviado para outro plano, como salto planar (teleportação)

8
Feixe potente
-

Afetado por dois feixes — role duas vezes, rerrolando outros resultados 8', false),
  (null, 'pathfinder', 'Projetar Imagem', 7, 'Ilusão', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você projeta uma imagem ilusória sua. Você deve permanecer na distância da imagem e, se a qualquer momento não puder ver a imagem, a magia acaba. Sempre que Conjurar uma Magia que não possua uma área de emanação, você pode fazer o efeito da magia originar de si mesmo ou da imagem. Como a imagem é uma ilusão, ela não pode se beneficiar de magias, embora manifestações visuais ainda apareçam. A imagem possui a mesma CA e salvamentos que você. Se ela for atingida por um ataque ou falhar em um salvamento, a magia é encerrada.s.

---

Elevada (+2) A duração máxima que você pode Sustentar a Magia aumenta para 10 minutos.', false),
  (null, 'pathfinder', 'Regeneração', 7, '', '2 ações', 'Toque', '', '1 minuto', 'Uma infusão de energia positiva concede cura contínua a uma criatura. O alvo ganha temporariamente regeneração 15, que restaura 15 Pontos de Vida ao alvo no início de cada um dos turnos dele. Enquanto tiver regeneração, o alvo não pode morrer por dano sofrido e seu valor de morrendo nunca pode exceder 3, embora, se o valor de ferido dele se tornar 4 ou superior, ele permaneça inconsciente até seus ferimentos serem tratados. Se o alvo sofrer dano de ácido ou de fogo, a regeneração dele é desativada até o final do próximo turno dele.
Cada vez que a criatura recuperar Pontos de Vida por regeneração, ela também regenera um órgão danificado ou arruinado (se houver). Durante a duração da magia, a criatura também pode reanexar partes do corpo decepadas ao gastar uma ação de Interação para segurar a parte do corpo à área da qual ela foi separada..

---

Elevada (9º) A regeneração aumenta para 20.', false),
  (null, 'pathfinder', 'Retrocognição', 7, '', '1 minuto', '', '', 'Sustentada', 'Abrindo sua mente para ecos ocultistas, você obtém impressões de eventos passados que ocorreram em sua localização atual. Retrocognição revela impressões psíquicas de eventos que ocorreram ao longo do último dia durante o primeiro minuto de duração, seguido pelas impressões do próximo dia no minuto seguinte e assim por diante. Estes ecos não são percebidos como uma visão, mas impressões de emoções e metáforas que fornecem detalhes e pistas enigmáticos sobre o passado. Se você testemunhar um evento traumático ou turbulento através de uma impressão, a magia é encerrada a menos que você obtenha sucesso em um salvamento de Vontade com uma CD de pelo menos 30 e possivelmente até 50, dependendo da severidade do evento. O MJ determina se um evento é traumático e escolhe a CD apropriada.

---

Elevada (8º) Você obtém impressões de eventos ocorridos ao longo do ano anterior para cada minuto de concentração (em vez do dia anterior), embora os detalhes sejam menores e seja mais difícil distinguir as impressões umas das outras com exceção dos eventos mais significativos.

Elevada (9º) Você obtém impressões de eventos que ocorreram ao longo do século anterior para cada minuto em que se concentrar em vez do dia anterior, embora os detalhes sejam menores e seja mais difícil distinguir e diferenciar as impressões umas das outras com exceção dos eventos mais significativos.', false),
  (null, 'pathfinder', 'Inverter a Gravidade', 7, 'Evocação', '3 ações', '36 metros', 'S, V, M', '1 minuto', 'Você inverte a gravidade na área. Criaturas e objetos que não estão presos no chão imediatamente caem para cima no topo da área. Uma criatura pode ser capaz de Segurar numa Beirada para atenuar sua queda se passar perto de uma superfície apropriada.
Se uma criatura cair contra um objeto sólido (como no teto), ela sofre a quantidade de dano de queda apropriada e aterrissa na superfície. Uma criatura ou objeto que alcance o topo da área fica flutuando entre a gravidade invertida e a normal. A criatura pode se mover pela área plana onde as duas formas de gravidade se encontram. Criaturas que puderem levitar ou voar podem usar essas habilidades para mitigar os efeitos de inverter a gravidade.
Quando inverter a gravidade acabar, todas as criaturas e objetos pegos na área caem de volta para baixo. Da mesma forma, qualquer coisa que se mover para fora da área da magia é novamente sujeitada à gravidade normal.', false),
  (null, 'pathfinder', 'Refletir Magia', 7, 'Abjuração', '2 ações', '', 'S, V', '1 hora', 'Esta abjuração reflete magias conjuradas em você contra o conjurador delas. Quando uma magia lhe mirar, você pode gastar uma reação para tentar refleti-la. Isto utiliza as regras para neutralizar a magia, mas se a magia for neutralizada com sucesso, o efeito é enviado de volta ao conjurador. Seja a tentativa de neutralização bem-sucedida ou não, refletir magia é encerrada. Refletir magia não pode afetar magias que não tenham um alvo específico (como magias de área).
Se refletir magia devolver uma magia de volta para um conjurador que também está sob o efeito de refletir magia, o efeito de refletir magia dele pode tentar refletir a própria magia de volta para você novamente; se isto ocorrer, essa tentativa de neutralização é automaticamente bem-sucedida.', false),
  (null, 'pathfinder', 'Explosão Solar', 7, '', '2 ações', '150 metros', '', 'Instantânea', 'Um globo poderoso de luz solar abrasadora explode na área, causando 8d10 de dano de fogo a criaturas e objetos na área, mais 8d10 de dano positivo adicional a mortos-vivos. Cada criatura e objeto na área deve tentar um salvamento de Reflexos. Se o globo sobrepor-se a uma área de escuridão mágica, explosão solar tenta neutralizar o efeito de escuridão.

---
Sucesso Crítico  A criatura ou objeto não é afetado.

Sucesso  A criatura ou objeto sofre metade do dano.

Falha  A criatura ou objeto sofre o dano inteiro.

Falha Crítica  A criatura ou objeto sofre o dano inteiro. Se for uma criatura, ela fica permanentemente cego .

---
Elevada (+1)  O dano de fogo aumenta em 1d10 e o dano positivo contra mortos-vivos aumenta em 1d10.', false),
  (null, 'pathfinder', 'Farol do Tempo', 7, 'Adivinhação', '1 ação', '', 'M', 'Until the end of your turn', 'Você cria um farol a tempo, pretendendo retornar a ele se as coisas derem errado. Você pode conjurar farol do tempo apenas no seu turno. Mantenha um controle cuidadoso de tudo o que acontece neste turno depois de conjurar farol do tempo. No final do seu turno, você pode voltar no tempo logo após conjurar farol do tempo, removendo todos os efeitos do seu turno desde então. Maldições, armadilhas e outros efeitos nocivos que acontecem durante o seu turno podem impedir que você retorne ao farol se eles forem poderosos o suficiente. Se você sofreu algum efeito prejudicial durante o seu turno após a conjuração de farol do tempo, para retornar ao seu farol, farol do tempo tente uma verificação de neutralização contra cada um desses efeitos. Se falhar em alguma dessas verificações, você não poderá retornar.', false),
  (null, 'pathfinder', 'True Target', 7, '', '1 ação', '18 metros', '', 'Until the start of your next turn', 'Você vislumbra os vários futuros possíveis para os próximos segundos, examinando todas as maneiras que seu alvo poderia usar para se proteger, e então transmite para aqueles ao seu redor uma visão de um futuro onde ele não conseguiu se proteger. Na primeira rolagem de ataque feita contra o alvo durante a duração de alvo certo, o atacante rola duas vezes e usa o melhor resultado. O atacante também ignora penalidades de circunstância na rolagem de ataque e qualquer teste simples requerido devido ao alvo estar ocultado ou escondido.', false),
  (null, 'pathfinder', 'Matilha Desimpedida', 7, '', '2 ações', '9 metros', '', '1 hora', 'Você liberta seus companheiros de viagem dos impedimentos ambientais. Os alvos não sofrem penalidades de circunstância na Velocidade por vegetação, detritos, ventos ou outras propriedades do ambiente, seja o ambiente mágico ou não, além de ignorarem o terreno difícil dessas propriedades ambientais.

---

Elevada (9º) Os alvos também ignoram terreno difícil maior de propriedades ambientais.', false),
  (null, 'pathfinder', 'Visions of Danger', 7, 'Ilusão', '3 ações', '150 metros', 'S, V, M', '1 minuto', 'Uma ilusão de criaturas horríveis preenche a área da magia. As criaturas se parecem com monstros Minúsculos enxameando o local com uma aparência específica à sua escolha, como moscas infernais ou lâminas serrilhadas animadas. A magia causa 8d8 de dano mental a cada criatura que estiver dentro da explosão quando ela for criada, que entrar na explosão ou que começar o turno dela dentro da explosão. Uma criatura que obtiver um sucesso crítico no salvamento de Vontade pode imediatamente tentar desacreditar a ilusão. Uma criatura que tentar Interagir com os monstros ou observar um deles com uma ação de Buscar pode tentar desacreditar a ilusão. Criaturas que desacreditarem a ilusão não sofrem dano posterior dela.

---

Elevada (+1) O dano aumenta em 1d8.', false),
  (null, 'pathfinder', 'Erupção Vulcânica', 7, '', '2 ações', '36 metros', '', 'Instantânea', 'O chão se abre, expelindo alto no ar uma coluna de lava em um cilindro vertical, causando 14d6 de dano de fogo a criaturas na área. A lava resfria rapidamente e cobre criaturas na área. Uma criatura coberta pela rocha fica desajeitado 1 e sofre –3 metros de penalidade de estado nas Velocidades dela. Todo o terreno normal é terreno difícil para uma criatura voadora, e essas criaturas imediatamente descem 6 metros no momento em que são cobertas, mas não sofrem dano desta queda. Uma criatura coberta de rocha pode tentar Escapar contra sua CD de magia para encerrar o efeito. Caso contrário, a criatura permanece coberta até sofrer um total de 50 de dano, quando se livra da rocha.
Adicionalmente, criaturas na área e aquelas que estiverem a 1,5 metros da coluna de lava automaticamente sofrem 3d6 de dano de fogo pelo calor intenso, independentemente dos resultados de suas jogadas de salvamento.

---
Sucesso Crítico A criatura não é afetada.

Sucesso  A criatura sofre metade do dano.

Falha  A criatura sofre o dano inteiro e fica coberta.

Falha Crítica  A criatura sofre o dobro do dano e fica coberta.

---
Elevada (+1)  O dano na área aumenta em 2d6 e o dano do calor intenso aumenta em 1d6.', false),
  (null, 'pathfinder', 'Distorcer Mente', 7, '', '2 ações', '36 metros', '', 'Instantânea', 'Você desordena as faculdades mentais e as informações sensoriais de uma criatura. O alvo deve tentar um salvamento de Vontade. Independentemente do resultado desse salvamento, o alvo fica temporariamente imune por 10 minutos. Os efeitos de distorcer mentes acontecem instantaneamente, portanto, dissipar magia e outros efeitos que neutralizam magias não podem neutralizá-los. Entretanto, alterar realidade, desejo, fenômeno primal, milagre ou restauração ainda podem neutralizar os efeitos.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo gasta a primeira ação do próximo turno dele com a condição confuso .

Falha  O alvo fica confuso por 1 minuto.

Falha Crítica  O alvo fica confuso permanentemente.', false),
  (null, 'pathfinder', 'Campo Antimagia', 8, 'Abjuração', '3 ações', '', 'S, V, M', 'Sustentada até 1 minuto', 'Você repele toda a magia da área alvo, impedindo o funcionamento de magias e outros efeitos mágicos. Magias não podem penetrar a área, itens mágicos param de funcionar dentro dela e ninguém dentro da área pode conjurar magias ou usar habilidades mágicas. Da mesma forma, magias — como Dispel Magic — não podem afetar o campo em si a menos que sejam de um nível superior. Efeitos mágicos se recompõem assim que passam para fora do campo. Por exemplo: um raio disparado de um lado do campo poderia mirar uma criatura no outro lado (desde que o conjurador e o alvo estejam ambos fora do campo). Uma criatura convocada sai da existência, mas reaparece se o campo se mover ou acabar. Itens mágicos investidos param de funcionar, mas permanecem investidos e voltam a funcionar quando saem do campo; a melhoria de atributo de um item de apogeu não é suprimido dentro do campo. Magias de nível superior ao campo de antimagia superam seus efeitos, e podem até mesmo ser conjuradas por uma criatura dentro do campo.

O campo anula somente a magia, portanto, uma espada longa +3 ainda funciona como uma espada longa. Criaturas criadas magicamente (como golens) funcionam normalmente dentro de um campo antimagia.', false),
  (null, 'pathfinder', 'Raio Polar', 8, '', '2 ações', '', '', 'Instantânea', 'Você dispara um raio branco azulado de ar congelante com granizo de seu dedo para resfriar seu alvo até os ossos. Você deve obter sucesso em uma rolagem de ataque de magia para afetar o alvo, que sofre 10d8 de dano de frio e fica Drained 2.

---

Elevada (+1)  O dano aumenta em 2d8.', false),
  (null, 'pathfinder', 'Ressecamento Horrível', 8, '', '2 ações', '150 metros', '', 'Instantânea', 'Você extrai a umidade dos corpos dos alvos, causando 10d10 de dano negativo. Criaturas feitas de água (como elementais da água) e plantas usam o resultado para um grau de sucesso pior do que o resultado de suas jogadas de salvamento. Criaturas com corpos que não contêm umidade significativa (como elementais da terra) são imunes a ressecamento horrível.
Elevada (+1) O dano aumenta em 1d10.', false),
  (null, 'pathfinder', 'Desaparecimento', 8, 'Ilusão', '2 ações', 'Toque', '', '10 minutos', 'Você protege uma criatura contra os sentidos dos outros. O alvo fica indetectado, não somente para visão, mas para todos os sentidos, e é considerado invísivel, não importa quais sentidos precisos e imprecisos um observador possua. Uma criatura ainda pode encontrar o alvo ao Buscar procurando por poeira mexida, ouvindo lacunas no espectro do som ou encontrando alguma outra forma de descobrir a presença de uma criatura que seria indetectável.', false),
  (null, 'pathfinder', 'Aura Divina', 8, 'Abjuração', '2 ações', '', 'S, V', 'Sustentada até 1 minuto', 'Poder divino protege os alvos, concedendo +1 de bônus de estado na CA e em salvamentos a cada um deles enquanto estiverem na área.

Escolha uma tendência que sua divindade possua (bem, caos, mal ou ordem). Você não pode conjurar esta magia se não tiver uma divindade ou se sua divindade for neutra verdadeira. Esta magia recebe o traço da tendência escolhida. Os bônus concedidos pela magia aumentam para +2 contra ataques feitos — e efeitos criados — por criaturas com tend��ncia oposta à da magia (ordem se escolher caos, mal se escolher bem). Estes bônus aumentam para +4 contra efeitos criados por essas criaturas que tentem impor a condição controlado sobre um alvo de sua aura divina, assim como contra ataques realizados por criaturas convocadas por algo que possua uma tendência oposta à sua aura divina.

Quando uma criatura de tendência oposta atingir um alvo com um ataque corpo a corpo, ela deve obter sucesso em um salvamento de Vontade ou fica cego por 1 minuto. Ela fica temporariamente imune a este efeito por 1 minuto.

A primeira vez que você Sustentar a Magia a cada rodada, o raio da aura divina aumenta em 3 metros.', false),
  (null, 'pathfinder', 'Inspiração Divina', 8, '', '2 ações', 'Toque', '', 'Instantânea', 'Você infunde um alvo com energia espiritual, reabastecendo a magia dele. Se preparar magias, ele recupera uma magia de 6º nível ou inferior que tenha conjurado previamente nesse dia e pode conjurar essa magia novamente. Se conjurar magias espontaneamente, ele recupera um espaço de magia de 6º nível ou inferior. Se possuir uma reserva de foco, ele recupera Pontos de Foco como se tivesse Refocado.', false),
  (null, 'pathfinder', 'Conselho Onírico', 8, 'Ilusão', '10 minutos', 'Planetário', 'S, V', '1 hora', 'Quando você Conjurar esta Magia, todos os alvos — incluindo você — podem escolher dormir imediatamente. A magia se encerra para quaisquer criaturas que não escolherem dormir. Os adormecidos se encontram em um sonho compartilhado, onde podem se comunicar uns com os outros como se estivessem na mesma sala. Alvos individuais deixam este sonho compartilhado ao acordarem e, se todos os alvos acordarem, a magia acaba.', false),
  (null, 'pathfinder', 'Terremoto', 8, '', '2 ações', '150 metros', '', '1 rodada', 'Você faz o chão tremer, derrubando criaturas em fissuras e desmoronando estruturas.
O MJ pode acrescentar efeitos adicionais em certas áreas.
Penhascos podem desmoronar, criaturas ser derrubadas ou um lago pode ser drenado enquanto fissuras se abrem sob ele, se tornando um atoleiro de areia movediça.
Chão Tremendo O chão é terreno difícil, e criaturas sobre ele sofrem –2 de penalidade de circunstância em rolagens de ataque, CA e testes de perícia.
Fissuras Cada criatura no chão deve tentar um salvamento de Reflexos no início do turno dela para continuar de pé e evitar cair em fissuras de 12 metros de profundidade que se abrem sob ela. As fissuras são permanentes e seus lados requerem Atletismo CD 15 para Escalar.
Desmoronamento Estruturas e tetos podem desmoronar. O MJ rola um teste simples para cada (CD 16 para uma estrutura resistente, CD 14 para uma estrutura mediana e a maioria das formações naturais e CD 9 para uma estrutura de má qualidade, todos ajustadas para mais ou menos conforme o MJ achar adequado). Um desmoronamento causa 11d6 de dano contundente; cada criatura pega no desmoronamento deve tentar um salvamento de Reflexos para evitá-lo.

---
Sucesso Crítico  A criatura sofre metade do dano de desmoronamento.

Sucesso  A criatura sofre metade do dano de desmoronamento e cai prostrado.

Falha  A criatura sofre o dano inteiro de desmoronamento e cai prostrado.

Falha Crítica  A criatura sofre o dano inteiro de desmoronamento e cai em uma fissura..

---
Elevada (10º)  Você cria um terremoto massivo que pode devastar um assentamento. A distância aumenta para 750 metros e a área para uma explosão de 375 metros.', false),
  (null, 'pathfinder', 'Limpar a Mente', 8, '', '2 ações', '9 metros', '', 'Until your next daily preparations', 'Proteções poderosas escondem uma criatura de adivinhação mágica. O alvo recebe +4 de bônus de estado em salvamentos contra efeitos mentais. Limpar a mente tenta neutralizar quaisquer efeitos de detecção, revelação e vidência como se fosse uma magia 1 nível superior do que realmente é. Em um sucesso, o efeito de adivinhação funciona normalmente, exceto que ele não detecta nada sobre o alvo e as posses dele. Por exemplo, detectar magia ainda detectaria outras magias na área, mas nenhuma magia que esteja no alvo.', false),
  (null, 'pathfinder', 'Momento de Renovação', 8, '', '2 ações', 'Toque', '', 'Instantânea', 'Os alvos desfrutam de um dia de descanso em um instante. Quaisquer efeitos prejudiciais que acabariam após 24 horas são encerrados, embora isto não encurte a duração de quaisquer magias ativas que estejam afetando os alvos. Os alvos recuperam Pontos de Vida e se recuperam de condições como se tivessem passado 24 horas descansando, mas não fazem suas preparações diárias novamente ou recebem quaisquer benefícios de descanso além de cura. Os alvos ficam temporariamente imunes por 1 dia.', false),
  (null, 'pathfinder', 'Forma de Monstruosidade', 8, '', '2 ações', '', '', '1 minuto', 'Você se transforma no aspecto de um monstro lendário, assumindo a forma de batalha de um animal Enorme. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Quando conjurar esta magia, escolha fênix, serpente marinha ou vorme púrpura. Enquanto estiver nesta forma, você adquire o traço besta (para fênix) ou animal (para serpente marinha ou vorme púrpura). Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha escolher:

CA = 20 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
20 Pontos de Vida temporários.
Visão no escuro.
Um ou mais ataques desarmados corpo a corpo específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +28 e você causa o dano listado. Estes ataques são baseados em Força (para o propósito da condição Enfeebled, por exemplo). Se seu modificador de ataque para ataques desarmados for maior, você pode utilizá-lo em vez do modificador concedido pela magia.
+30 de modificador de Atletismo, exceto se o seu próprio modificador for maior.

Você também recebe habilidades específicas baseadas na forma escolhida:

FênixVelocidade 9 metros, Velocidade de voo 27 metros; Corpo a Corpo  bico (alcance 4,5 metros), Dano 2d6+12 mais 2d4 de fogo e 2d4 persistente de fogo; Corpo a Corpo  unha (ágil, alcance de 4,5 metros), Dano2d8+12 cortante;Manto de Chamas (aura, evocação, fogo, primal) 6 metros. Você adquire uma aura de fogo que se estende a partir de você. Uma criatura que entrar ou encerrar o turno dela dentro da aura sofre 2d6 de dano de fogo. Uma criatura pode sofrer este dano somente uma vez por turno. Você pode usar uma ação única que possui o traço concentração para ativar ou desativar esta aura.
Serpente MarinhaVelocidade 6 metros, Velocidade de natação 27 metros; Corpo a Corpo  mandíbulas (alcance 4,5 metros), Dano 2d12+20 perfurante; Corpo a Corpo  cauda (alcance 7,5 metros), Dano 2d8+20 contundente;  Rasgar com Espinhos    (movimento) Você estende seus espinhos e Anda ou Nada. Cada criatura que estiver adjacente a você a qualquer momento durante o seu movimento sofre 4d8+10 de dano cortante (salvamento básico de Reflexos contra sua CD de magia).
Vorme Púrpura Velocidade 12 metros, Velocidade de escavação 9 metros, Velocidade de natação 6 metros;Corpo a Corpo mandíbulas (alcance 3 metros), Dano 2d12+20 perfurante; Corpo a Corpo ferrão (ágil, alcance de 3metros), Dano 2d8+15 perfurante mais 2d6 persistente de veneno; Corpo a Corpo  corpo (alcance de 3 metros),Dando2d8+20 contundente;InexorávelVocê automaticamente se
recupera das condições Paralyzed, Slowed, and Stunned ao final
de cada um dos seus turnos. Você também fica imune a ser {Immobilized] ignora terreno difícil e terreno difícil maior.

---

Heightened (9th) Você recebe CA = 22 + seu nível, 25 PV temporários, +31 de modificador de ataque, aumenta o dano em um dado de dano e recebe +33 de Atletismo em vez dos valores iniciais.', false),
  (null, 'pathfinder', 'Discernir Localização', 8, '', '10 minutos', 'Ilimitado', '', 'Instantânea', 'Você descobre o nome da localização e plano exatos do alvo (incluindo o prédio, comunidade e país) e em qual plano de existência ele está.
Você pode mirar uma criatura somente se a tiver visto pessoalmente, se possuir um dos pertences significativos dela ou uma parte de seu corpo. Para um objeto, você deve tê-lo tocado ou ter um fragmento dele. Discernir localização automaticamente supera proteções contra adivinhação ou detecção de nível inferior ao desta magia, mesmo que normalmente tivessem uma chance de bloqueá-la.', false),
  (null, 'pathfinder', 'Palavra de Poder: Atordoar', 8, 'Encantamento', '1 ação', '9 metros', 'V', 'Varies', 'Você atordoa o alvo com uma palavra de poder arcana. Uma vez tido como alvo, ele fica temporariamente imune por 10 minutos. O efeito da magia depende do nível do alvo. 
13º ou Inferior O alvo fica atordoado por 1d6 rodadas. 
14º ou 15º O alvo fica atordoado por 1 rodada. 
16º ou Superior O alvo fica atordoado 1.

---

Elevada (+1) Os níveis em que cada resultado se aplica aumenta em 2.', false),
  (null, 'pathfinder', 'Muralha Prismática', 8, 'Abjuração', '3 ações', '36 metros', 'S, V, M', '1 hora', 'Você cria uma muralha de luz cintilante multicolorida que não é transparente. A muralha é reta e vertical, esticando-se por 18 metros de comprimento e 9 metros de altura. Você deve formar a muralha em um espaço aberto ininterrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida. Você pode atravessar a muralha e ignorar os efeitos dela. A muralha emana luz brilhante a até 6 metros de cada lado (e luz fraca nos próximos 6 metros). Criaturas (exceto você) que entrarem na luz da muralha devem tentar um salvamento de Vontade; elas ficam ofuscada por 1 rodada em um sucesso, cega por 1 rodada em uma falha e cega por 1 minuto em uma falha crítica. Elas ficam temporariamente imunes ao efeito de cegueira por 1 hora.

Uma muralha prismática possui sete camadas diferentes, cada uma de uma cor diferente. Vermelho, laranja, amarelo e verde possuem o efeito de uma muralha cromática (página 361) dessa cor, e as outras possuem o efeito de uma muralha cromática de 7º nível dessa cor. Uma criatura que tentar atravessar a muralha deve tentar uma jogada de salvamento contra cada camada componente da muralha. Os efeitos ocorrem simultaneamente, portanto, uma criatura transformada em pedra pela muralha azul ainda é tratada como uma criatura para as muralhas anil e violeta.

A muralha como um todo é imune a efeitos de neutralização do nível dela ou inferior; cada cor deve ser neutralizada por sua magia específica, conforme descrito em muralha cromática. Isto deve ser feito em ordem (vermelho, laranja, amarelo, verde, azul, anil e violeta). Uma dada cor não pode ser afetada até a cor anterior ser neutralizada. Neutralizar uma cor da muralha remove o efeito dessa cor na muralha, e neutralizar todas encerra a muralha prismática. Você pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Ventos Punitivos', 8, '', '3 ações', '30 metros', '', 'Sustentada até 1 minuto', 'Ventos violentos e poderosos direcionados para baixo preenchem a área, formando um ciclone. Todas as criaturas voadoras na área descem 12 metros. A área inteira é terreno difícil maior para criaturas Voando e terreno difícil para criaturas no solo ou Escalando. Qualquer criatura que encerrar o turno dela Voando dentro da área desce 6 metros. Qualquer criatura empurrada contra uma superfície pelos ventos desta magia sofre dano contundente como se tivesse caído.
Os quadrados do lado de fora dos limites verticais do cilindro impedem criaturas de sair. Estes quadrados são terreno difícil maior e uma criatura que tentar atravessá-los deve obter sucesso em um teste de Atletismo ou teste de Acrobatismo para Manobrar em Voo contra sua CD de magia para conseguir fazê-lo. Uma criatura que falhar encerra a ação atual dela, mas pode tentar novamente.', false),
  (null, 'pathfinder', 'Labirinto', 8, '', '2 ações', '9 metros', '', 'Sustentada', 'Você transporta o alvo para um labirinto extradimensional de origem mística e o prende lá. Uma vez a cada turno, o alvo pode gastar 1 ação para fazer um teste de Percepção ou Sobrevivência contra sua CD de magia para escapar do labirinto. Os resultados possíveis são os seguintes:

Teleportação mágica não ajuda a criatura a escapar a menos que a magia possa transportar através de planos, como salto planar. Quando a magia acabar, seja porque o alvo escapou ou porque a duração acabou, o alvo retorna para o espaço que ocupava quando foi transportado para o labirinto ou para o espaço mais próximo se o espaço original estiver ocupado.

---

Sucesso Crítico O alvo escapa e a magia é encerrada.

Successo  O alvo está no caminho certo para a saída. Se o alvo já estiver no caminho certo, ele escapa do labirinto e a magia é encerrada.

Falha  O alvo não progride em direção à saída.

Falha Crítica  O alvo não progride em direção à saída e, se já estivesse no caminho certo, deixa de estar.', false),
  (null, 'pathfinder', 'Padrão Cintilante', 8, 'Ilusão', '2 ações', '36 metros', 'S, M', 'Sustentada até 1 minuto', 'Uma turbulenta cascata de cores em constante mudança se manifesta no ar. Criaturas ficam ofuscada enquanto estiverem dentro do padrão ou a até 6 metros da área do padrão. Uma criatura deve tentar um salvamento de Vontade se estiver dentro do padrão quando você conjurá-lo se entrar no padrão, se encerrar o turno dela dentro do padrão ou se usar uma ação de Buscar ou Interagir dentro do padrão. Uma criatura atualmente afetada pelo padrão não precisa tentar novos salvamentos.

---
Sucesso  A criatura não é afetada.

Falha  A criatura fica confusa por 1d4 rodadas.

Falha Crítica  A criatura fica atordoada por 1d4 rodadas. Após a condição atordoada acabar, a criatura fica confusa pelo restante da duração da magia.', false),
  (null, 'pathfinder', 'Canção Espiritual', 8, 'Necromancia', '2 ações', '', 'S, V', 'Instantânea', 'Sua canção mística envia ondas pulsantes de energia etérea para atacar os espíritos das criaturas na área, causando 18d6 de dano de força. Como canção espiritual afeta os espíritos das criaturas, ela pode causar dano a um alvo que esteja projetando sua consciência (como através de projetar imagem) ou possuindo outra criatura mesmo que o corpo do alvo esteja em outro lugar. Criaturas possuídas não são feridas pela canção. A canção não fere criaturas que não tenham espírito, como constructos. As ondas vibrantes da canção espiritual penetram barreiras sólidas, embora não as atravessem, causando dano a criaturas incorpóreas escondendo-se em objetos sólidos na área, mas não as ultrapassando as barreiras para causar dano a criaturas em outros cômodos.

---

Elevada (+1) O dano aumenta em 2d6.', false),
  (null, 'pathfinder', 'Epidemia Espiritual', 8, 'Necromancia', '2 ações', '36 metros', 'S, V', 'Varies', 'Você amaldiçoa o alvo, drenando o espírito e deixando uma armadilha contagiosa na essência dele. O alvo deve tentar um salvamento de Vontade. Qualquer criatura que conjurar uma magia divina ou ocultista no alvo enquanto ele estiver afetado também se torna alvo de epidemia espiritual e deve tentar um salvamento de Vontade. A maldição continua a se espalhar desta forma.

---
Sucesso Crítitco  O alvo não é afetado.

Sucesso  O alvo fica enfraquecido 2 e estupefato 2 por 1 rodada.

Falha  O alvo fica enfraquecido 2 e estupefato 2 por 1 minuto e enfraquecido 1 e estupefato 1 permanentemente.

Falha Crítica  O alvo fica enfraquecido 3 e estupefato 3 por 1 minuto e enfraquecido 2 e estupefato 2 permanentemente.', false),
  (null, 'pathfinder', 'Dança Incontrolável', 8, '', '2 ações', 'Toque', '', 'Varies', 'O alvo é tomado por um impulso obsessivo de dançar. Pela duração da magia, o alvo fica desprevenido e não pode usar reações. Enquanto estiver sob efeito desta magia, a criatura não pode usar ações com o traço movimento exceto para dançar, usando a ação Andar para se mover até metade da Velocidade dele.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  A duração da magia é 3 rodadas e o alvo deve gastar pelo menos 1 ação dançando a cada turno.

Falha  A duração da magia é 1 minuto e o alvo deve gastar pelo menos 2 ações dançando a cada turno.

Falha Crítica  A duração da magia é 1 minuto e o alvo deve gastar todas as ações dele dançando a cada turno.', false),
  (null, 'pathfinder', 'Observação Inexorável', 8, '', '2 ações', '30 metros', '', 'Varies', 'Esta magia concede uma visão perfeita baseada em vidência, permitindo que vários alvos voluntários rastreiem os movimentos exatos ou posição de uma criatura ou objeto. Escolha uma criatura ou objeto alvo na área para ser rastreado. Ele se torna o sensor para a magia. Até cinco criaturas voluntárias à sua escolha na área podem ver uma imagem fantasmagórica desta criatura ou objeto quando esse alvo não estiver à vista. Eles podem perceber a criatura ou objeto perfeitamente, permitindo-lhes ignorar a condição ocultado ou invisível, embora barreiras físicas ainda forneçam cobertura.

As criaturas rastreadoras podem ver a criatura ou objeto rastreado através de todas as barreiras exceto chumbo ou água corrente, que bloqueiam sua visão. Distância não importa, embora a criatura ou objeto possa se mover tão longe que fique pequeno demais para se perceber. As criaturas rastreadoras não veem nada do ambiente ao redor do alvo, embora vejam os equipamentos que o alvo esteja vestindo ou segurando e possam notar se ela remover um objeto de sua pessoa.

Se o alvo a ser rastreado for voluntário, a duração é 1 hora. Se você tentar rastrear uma criatura involuntária, o alvo deve tentar um salvamento de Vontade.

---

Sucesso Crítico A criatura ou objeto não é afetado.

Sucesso Como descrito, e a duração é de 1 minuto.

Falha Como descrito, e a duração é de 1 hora.', false),
  (null, 'pathfinder', 'Cruzada', 9, 'Encantamento', '2 ações', '18 metros', 'S, V', '10 minutos', 'Você emite um mandato divino aos alvos. Você pronuncia uma causa. Ela pode ser obter um item, reivindicar uma terra, matar uma criatura, guerrear com um grupo ou até ser inteiramente pacífica. Sua causa não pode forçar alvos a ferirem uns aos outros ou a si mesmos. Os alvos se tornam completamente dedicados à causa, dependendo do nível deles. Eles podem escolher suas próprias ações, mas preferem tomar ações diretas em vez de ações indiretas ou inação.

13º Nível ou Inferior O alvo é tão dedicado à causa que a persegue até a morte (a menos que você diga o contrário).
14º Nível O alvo é dedicado à causa, mas a magia encerra para o alvo se ele for reduzido à metade ou menos de seus Pontos de Vida máximos.
15º Nível Como o efeito de 14º nível, mas o alvo pode tentar um salvamento de Vontade ao final de cada um dos turnos dele para encerrar a magia para si.

A magia é encerrada para todas as criaturas se você ou um de seus aliados usar uma ação hostil contra um alvo, ou quando a causa for completada. O MJ pode determinar que esta magia possui traços de tendência relacionados à causa.

---

Elevada (10º) O nível para cada categoria aumenta em 2.', false),
  (null, 'pathfinder', 'Disjunção', 9, '', '2 ações', '36 metros', '', 'Instantânea', 'Energia crepitante disjunta o alvo. Você tenta neutralizá-lo. Se você obtiver sucesso, ele é desativado por 1 semana. Em um sucesso crítico, ele é destruído. Se o alvo for um artefato ou item similar, você falha automaticamente.', false),
  (null, 'pathfinder', 'Chuva de Meteoros', 9, '', '2 ações', '150 metros', '', 'Instantânea', 'Você invoca quatro meteoros que detonam em uma explosão flamejante. Cada meteoro causa 6d10 de dano contundente a quaisquer criaturas dentro da explosão de 3 metros no centro de sua área de efeito antes de detonar e causar 14d6 de dano de fogo a quaisquer criaturas na sua área da explosão de 12 metros. As explosões centrais de 3 metros dos meteoros não se sobrepõem, e cada criatura sofre o dano de fogo apenas uma vez, não importando em quantas áreas de explosão sobrepostas ela estiver. A jogada de salvamento se aplica ao dano contundente e ao dano de fogo..

---

Elevada (+1) O dano contundente aumenta em 1d10 e o dano de fogo aumenta em 2d6.', false),
  (null, 'pathfinder', 'Presciência', 9, '', '2 ações', 'Toque', '', '1 hora', 'Você adquire um sexto sentido que o alerta de perigos que ameaçam o alvo da magia. Se escolher uma outra criatura como alvo, você cria um vínculo psíquico pelo qual pode informá-la do perigo. Este vínculo é um efeito mental. Devido à quantidade de informação que esta magia exige que processe, você não pode ter mais de uma magia de presciência em efeito ao mesmo tempo. Conjurar presciência novamente encerra qualquer presciência anterior. Enquanto presciência estiver em efeito, o alvo recebe +2 de bônus de estado em rolagens de iniciativa e não fica desprevenidas contra criaturas indetectadas ou quando estiver flanqueado. Além disso, você ganha a reação a seguir.

---
PresciênciaAcionamento O alvo de presciência se defende contra uma criatura hostil ou outro perigo.Efeito Se a criatura hostil ou perigo forçar o alvo a rolar dados (uma jogada de salvamento, por exemplo), o alvo rola duas vezes e usa o maior resultado e esta magia adquire o traço fortuna. Mas se a criatura hostil ou perigo estiver rolando contra o alvo (uma rolagem de ataque ou teste de perícia, por exemplo), essa criatura hostil ou perigo rola duas vezes e usa o menor resultado e esta magia adquire o traço infortúnio.', false),
  (null, 'pathfinder', 'Implosão', 9, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Você esmaga o alvo ao fazê-lo colapsar sobre ele mesmo, causando 75 de dano. Cada vez que Sustentar a Magia, você deve escolher um novo alvo para sofrer o mesmo efeito; a mesma criatura nunca pode ser afetada mais de uma vez com uma única conjuração desta magia. Você também não pode afetar mais de uma criatura por turno com implosão. Você não pode afetar uma criatura que seja incorpórea, gasosa ou líquida, ou uma criatura que não tenha forma sólida.

---

Elevada (+1) O dano aumenta em 10 pontos.', false),
  (null, 'pathfinder', 'Massacre', 9, '', '2 ações', '', '', 'Instantânea', 'Você libera uma onda de energia necromântica que exaure a força vital daqueles em seu caminho. Cada criatura de 17º nível ou inferior na linha deve tentar um salvamento de Vontade. Se o dano de massacre reduzir uma criatura a 0 Pontos de Vida, ela morre instantaneamente. Se massacre não matar nem uma única criatura, a energia negativa explode violentamente no caminho de volta contra você, causando 30 de dano negativo adicional a cada criatura na linha (mesmo aquelas acima de 17º nível) e 30 de dano negativo a você.

---
Successo Crítico   A criatura não é afetada.

Successo  A criatura sofre 9d6 de dano negativo.

Falha  A criatura sofre 100 de dano negativo.

Falha Crítica  A criatura morre.

---
Elevada (10º)  A magia pode afetar criaturas de até 19º nível. Aumente o dano para 10d6 em um sucesso e para 115 em uma falha.', false),
  (null, 'pathfinder', 'Metamorfose', 9, '', '2 ações', '', '', '1 minuto', 'Utilizando de seu domínio da magia transformativa, você assume uma forma mutável. Você se transforma em qualquer forma que poderia escolher com uma magia de polimorfia de 8º nível ou inferior (incluindo qualquer versão elevada ao 8º nível das magias que você conhece) em seu repertório de magias ou que você poderia preparar. Você escolhe o tipo de criatura quando Conjurar a Magia em vez de quando a preparar. Você pode mudar sua forma para qualquer outra que poderia escolher com esta magia ao usar uma ação única que possui o traço concentração. Você pode Dispensar esta magia.', false),
  (null, 'pathfinder', 'Inimizade da Natureza', 9, 'Encantamento', '2 ações', '36 metros', 'S, V', '10 minutos', 'Animais e plantas na área se viram contra os alvos. Cada alvo sofre os efeitos a seguir enquanto permanecer na área.

Vegetação brota em todas as superfícies, impondo –3 metros de penalidade de circunstância na Velocidade de cada alvo a qualquer momento em que ele estiver adjacente às plantas. 
Animais agressivos atacam imprevisivelmente. No início do turno de cada alvo, ele rola um teste simples CD 8. Em uma falha, ele é atacado por um enxame de criaturas que causam 2d10 de dano cortante. O alvo tenta um salvamento básico de Reflexos e fica Desprevenido por 1 rodada em qualquer resultado diferente de um sucesso crítico. 
O alvo perde qualquer conexão com a natureza ou criaturas naturais. O alvo deve obter sucesso em um teste simples CD 5 ao conjurar qualquer magia primal ou perde a magia. Além disso, criaturas animais ou plantas se tornam hostis ao alvo mesmo que possuam fortes elos com ele (como um companheiro animal).
O MJ pode decidir que você não pode afetar algumas criaturas, como um emissário de uma divindade da natureza ou a ira dela.', false),
  (null, 'pathfinder', 'Presença Avassaladora', 9, '', '2 ações', '', '', 'Until full tribute is paid', 'Você se envolve com um esplendor sobrenatural, parecendo ser um deus ou ser similarmente majestoso. Você escolhe os aspectos de sua nova aparência majestosa. Isto força os alvos prestarem tributo a você curvando-se ou usando alguma outra ação condizente com sua aparência. A quantidade de vezes que um alvo deve fazer isto depende do resultado do salvamento de Vontade dele.

Prestar tributo é uma ação de manuseio ou uma ação de movimento, conforme escolhido pela criatura prestando o tributo. Uma criatura sob este efeito deve prestar tributo a você pelo menos uma vez em cada um dos turnos dela se possível. Enquanto estiver afetada por esta magia, a criatura fica Fascinated por você e não pode usar ações hostis contra você. O alvo fica temporariamente imune por 1 minuto.

---

Successo Crítico O alvo não é afetado.

Successo O alvo deve prestar tributo duas vezes.

Falha O alvo deve prestar tributo seis vezes.

Falha Crítica  Como falha, e o alvo deve gastar todas as ações dele prestando tributo se possível.', false),
  (null, 'pathfinder', 'Fatídico', 9, 'Ilusão', '2 ações', '36 metros', '', 'Instantânea', 'Você enche as mentes dos alvos com imagens aterrorizantes de criaturas temíveis, cada uma utilizando os piores medos dos alvos. Somente os alvos podem ver seus agressores. Cada alvo sofre 16d6 de dano mental e deve tentar um salvamento de Vontade.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso  O alvo sofre metade do dano e fica assustado 1.

Falha  O alvo sofre o dano inteiro e fica assustado 2.

Falha Crítica  O alvo está com tanto medo que pode morrer instantaneamente. Ele deve tentar um salvamento de Fortitude. Se for bem-sucedido, ele sofre o dobro do dano e fica assustado 2, além de também ficar fugindo até o final do próximo turno dele se não tiver obtido um sucesso crítico. Se falhar, ele é reduzido a 0 Pontos de Vida e morre.', false),
  (null, 'pathfinder', 'Palavra de Poder: Matar', 9, 'Encantamento', '1 ação', '9 metros', 'V', 'Varies', 'Você profere uma palavra de poder arcana poderosa. Uma vez tido como alvo, ele fica temporariamente imune por 10 minutos. O efeito da magia depende do nível do alvo.
14º ou Inferior O alvo morre instantaneamente. 
15º Se o alvo tiver 50 Pontos de Vida ou menos, ele morre instantaneamente; caso contrário, é reduzido a 0 Pontos de Vida e fica morrendo 1, ou aumenta sua condição morrendo em 1 se já estivesse morrendo. 
16º ou Superior O alvo sofre 50 pontos de dano; se isso levá-lo a 0 Pontos de Vida, o alvo morre instantaneamente.

---

Elevada (10º) Os níveis em que cada resultado se aplica aumentam em 2.', false),
  (null, 'pathfinder', 'Esfera Prismática', 9, 'Abjuração', '2 ações', '3 metros', 'S, V', '1 hora', 'Você cria uma esfera de sete camadas para proteger uma área. Esta esfera multicolorida funciona como uma muralha prismática (página 363), mas possui o formato de uma explosão de 3 metros centrada em um canto do seu espaço. Você deve formar a esfera em um espaço ininterrupto para que os lados dela não passem através de quaisquer criaturas ou objetos, ou então a magia é perdida.', false),
  (null, 'pathfinder', 'Mansão Resplandecente', 9, 'Conjuração', '1 minuto', '150 metros', 'S, V, M', 'Until the next time you make your daily preparations', 'Você conjura uma mansão enorme de até quatro andares de altura e de até 90 metros de lado. Quando Conjurar a Magia, você imagina a mansão e a aparência desejada para ela. A mansão pode conter quantos cômodos você desejar e ser decorada de acordo com a sua imaginação. Você pode imaginar um propósito para cada cômodo da mansão, e os adornos e equipamentos adequados surgirão dentro deles. Qualquer mobília ou outros objetos mundanos funcionam normalmente para qualquer pessoa dentro da mansão, mas param de existir se forem removidos de dentro dela. Nenhum objeto criado com esta magia pode criar efeitos mágicos, mas dispositivos mágicos trazidos para dentro da mansão funcionam normalmente.

Sua mansão contém os mesmos tipos e quantidades de comida e servos que os criados pela magia mansão magnífica.

Cada porta e janela exterior da mansão é protegida por magias de alarme. Você escolhe qual o alarme (audível ou mental) para cada uma quando Conjurar a Magia, e cada um deles possui um som ou sensação diferentes, permitindo que você determine instantaneamente qual entrada foi usada.', false),
  (null, 'pathfinder', 'Exigência Telepática', 9, 'Encantamento', '3 ações', 'Planetário', 'S, V, M', 'Varies', 'Você envia uma mensagem de até 25 palavras ao alvo e ele pode responder imediatamente com a própria mensagem de até 25 palavras. Sua mensagem é insidiosa e possui o efeito de sugestão, com a mensagem substituindo a sugestão falada. Em um salvamento bem-sucedido, o alvo fica temporariamente imune por 1 dia e, em um sucesso crítico, o alvo fica temporariamente imune por 1 mês. Você pode afetar a criatura somente se tiver entrado em contato telepático com ela anteriormente, como através da magia telepatia.', false),
  (null, 'pathfinder', 'Canção Incomensurável', 9, '', '1 ação', '36 metros', '', 'Sustentada até 1 minuto', 'Notas efêmeras de uma canção estranha e sobrenatural preenchem o ar, sobrepujando a mente dos alvos. Cada alvo deve tentar um salvamento de Vontade quando você conjurar a magia e novamente a cada vez que você Sustentar a Magia. Uma criatura precisa tentar somente um salvamento contra a canção a cada rodada e você deve manter os mesmos alvos quando Sustentar a Magia.

---

Sucesso Crítico O alvo não é afetado, não pode ser afetado em rodadas subsequentes e fica temporariamente imune por 1 minuto.

Sucesso O alvo não é afetado nesta rodada, mas pode ser afetado em rodadas subsequentes.

Falha Role 1d4 na tabela abaixo.

Falha Crítica Role 1d4+1 na tabela abaixo.

Resultado
Efeito

1
O alvo fica assustado 2

2
O alvo fica confuso por 1 rodada.

3
O alvo fica estupefato 4 por 1 rodada.

4
O alvo fica cego por 1 rodada.

5
O alvo fica atordoado por 1 rodada e estupefato 1 por uma duração ilimitada.', false),
  (null, 'pathfinder', 'Lamento da Banshee', 9, '', '2 ações', '', '', 'Instantânea', 'Seu grito arrepia as almas dos inimigos que o ouvirem. Cada
inimigo vivo na área sofre 8d10 de dano negativo e deve tentar
um salvamento de Fortitude.

---
Sucesso Crítico  O alvo não é afetado.

Sucesso   O alvo sofre o dano inteiro.

Falha  O alvo sofre o dano inteiro e fica drenado 1d4.

Falha Crítica  O alvo sofre o dobro do dano e fica drenado 4.', false),
  (null, 'pathfinder', 'Tempestade da Vingança', 9, '', '3 ações', '240 metros', '', 'Sustentada até 1 minuto', 'Nuvens massivas de tempestade se formam no ar em uma explosão de 108 metros. Uma chuva começa abaixo das nuvens, vendavais impõem –4 de penalidade de circunstância em ataques à distância físicos ou com armas à distância, e o ar na área se torna terreno difícil maior para criaturas que estejam voando. Quando Conjurar esta Magia e na primeira vez a cada rodada em que Sustentar a Magia, você pode escolher um dos efeitos de tempestade a seguir. Você não pode escolher o mesmo efeito duas vezes seguidas.

Chuva Ácida Cada criatura na tempestade sofre 4d8 de dano de ácido sem jogada de salvamento.
Granizo A tempestade causa 4d10 de dano contundente a criaturas sob ela (salvamento básico de Fortitude).
Relâmpago Até 10 relâmpagos saem da tempestade, acertando alvos à sua escolha dentro da área. Nenhuma criatura pode ser atingida por mais de um relâmpago. Cada relâmpago causa 7d6 de dano de eletricidade (salvamento básico de Reflexos).
Chuva e Vento Chuva forte e ventos castigantes reduzem visibilidade e mobilidade, tornando a área sob a nuvem terreno difícil maior e deixando tudo visto dentro da área (ou de dentro dela) ocultado.
Trovão Cada criatura na tempestade deve obter sucesso em um salvamento de Fortitude ou fica surda por 10 minutos. Uma criatura que obtiver sucesso fica temporariamente imune aos trovões de tempestade da vingança por 1 hora.

---

Elevada (10º) A distância aumenta para 660 metros e a nuvem é uma explosão de 300 metros.', false),
  (null, 'pathfinder', 'Alterar a Realidade', 10, 'Adivinhação', '3 ações', '', 'S, V, M', 'Instantânea', 'Você usa seu saber ocultista e o poder de sua mente para manipular o multiverso espiritual, resultando em qualquer um dos efeitos a seguir:

Duplicar qualquer magia ocultista de 9º nível ou inferior.
Duplicar qualquer magia não-ocultista de 7º nível ou inferior.
Produzir qualquer efeito cujo poder seja equivalente ao de qualquer magia ocultista de 9º nível ou inferior ou equivalente ao poder de qualquer magia não-ocultista de 7º nível ou inferior.
Reverter determinados efeitos que mencionem a magia desejo.

A critério do MJ, você pode tentar produzir efeitos maiores, mas isto é perigoso e a magia pode ter um efeito somente parcial.', false),
  (null, 'pathfinder', 'Avatar', 10, '', '2 ações', '', '', '1 minuto', 'Você se transforma em um avatar de sua divindade, assumindo uma forma de batalha Enorme. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Você possui mãos nesta forma de batalha e pode usar ações de manuseio. Você pode Dispensar esta magia.  Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha assumir:

CA = 25 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
30 Pontos de Vida temporários.
Visão no escuro.
Um ou mais ataques específicos para a forma de batalha de sua divindade, que são os únicos ataques que pode usar. Você é treinado com esses ataques. Seu modificador de ataque é +33 e utiliza o dano listado. Ataques corpo a corpo são baseados em Força (para o propósito da condição Enfraquecido por exemplo) a menos que tenham o traço acuidade, e todos os ataques à distância são baseados em Destreza. Ataques que causem dano positivo ou dano negativo não curam criaturas.
+35 de modificador de Atletismo, exceto se o seu próprio modificador for maior. 
 

Você também recebe habilidades específicas listadas para sua divindade: 

Abadar Velocidade 15 metros, Velocidade de escavação 9 metros, imune a Imobilizado; Distância besta (incremento de distância de 36 metros, recarga 1), Dano 6d10+3 perfurante.
Achaekek Velocidade 21 metros, Velocidade de escalada 15 metros, ignora terreno difícil e terreno difícil maior; Corpo a corpo  garra de louva-a-deus (ágil, oscilante, acuidade, alcance 4,5 metros, versátil Pf), Dano 6d8+6 cortante; Distância rajada de espinho (distância 18 metros), Dano 6d6+3 perfurante.
Asmodeus Velocidade 21 metros, caminhar no ar; Corpo a corpomaça (alcance 4,5 metros), Dano 6d10+6 contundente;  Distância   fogo infernal (distância 36 metros), Dano 6d6+3 de fogo.
Calistria Velocidade 9 metros, Velocidade de voo 21 metros; Corpo a corpo chicote (acuidade, desarmar, não letal, alcance 6 metros),  Dano  6d4+6 cortante;  Distância doce ferroada (alcance 18 metros), Dano  6d6+3 de veneno.
Cayden CaileanVelocidade 21 metros, caminhar no ar, ignora terreno difícil e terreno difícil maior; Corpo a corporapieira (mortal d8, alcance 4,5 metros), Dano 6d6+6 perfurante; Distância  respingo de cerveja (alcance 36 metros), Dano 6d6+3 de veneno.
Desna Velocidade 9 metros, Velocidade de voo 21 metros; Corpo a corpofaca-estrela (acuidade, ágil, arremesso 18 metros, mortal d6, prata, alcance 4,5 metros); Dano 6d4+6 perfurante; Distância  feixe lunar (prata, distância 36 metros), Dano 6d6+3 de fogo.
ErastilVelocidade 21 metros, caminhar no ar, ignora terreno difícil e terreno difícil maior; Distânciaarco longo (incremento de distância de 50 metros, mortal d8), Dano 6d8+3 perfurante.
Gorum Velocidade 21 metros, imune a Imobilizado; Corpo a corpomontante (versátil Pf, alcance 4,5 metros), Dano 6d12+6 cortante.
Gozreh nenhuma Velocidade em terra, Velocidade de voo 21 metros, Velocidade de natação 21 metros, ignora terreno difícil e terreno difícil maior; Corpo a corpoondas (arremesso 6 metros, empurrar, alcance 4,5 metros), Dano 6d8+6 contundente; Distância  vento (distância 36 metros, versátil eletricidade), Dano 6d6+3 contundente.
Iomedae Velocidade 21 metros, caminhar no ar; escudo (Dureza 15, não pode ser danificado); Corpo a corpoespada longa (versátil Pf, alcance 4,5 metros), Dano 6d8+6 cortante.
Irori Velocidade 24 metros, caminhar no ar; Corpo a corpogolpe liberto (acuidade, ágil, versátil Ct ou Pf, alcance 4,5 metros); Dano 6d8+6 contundente; Distância golpe de vento (distância 36 metros), Dano 6d4+6 contundente.
Lamashtu Velocidade 9 metros, Velocidade de voo 21 metros; Corpo a corpobracamante (enérgico, alcance 4,5 metros); Dano 6d10+6 cortante; Distância   águas de Lamashtu (distância 36 metros), Dano 6d6+3 de veneno.
Nethys Velocidade 21 metros, caminhar no ar; Distânciamagia bruta (versátil eletricidade, fogo ou frio; distância 36 metros), Dano 6d6 força.
Norgorber Velocidade 21 metros, caminhar no ar, ignora terreno difícil e terreno difícil maior; Corpo a corpoespada curta (acuidade, ágil, versátil Ct, alcance 4,5 metros); Dano 6d6+6 perfurante; Distância   arremesso do Dedos Negros (distância 36 metros), Dano 6d6+3 de veneno.
Pharasma Velocidade 21 metros, caminhar no ar; Corpo a corpoadaga (acuidade, ágil, arremesso 12 metros, alcance 4,5 metros); Dano 6d6+6 cortante; Distância  rajada espiral (fere somente mortos-vivos, distância 36 metros), Dano 6d8+3 positivo.
Rovagug Velocidade 15 metros, Velocidade de escavação 9 metros, imune a Imobilizado; Corpo a corpomandíbulas (alcance 4,5 metros); Dano 6d12+6 perfurante; Corpo a Corpo  perna (ágil, versátil Pf, alcance 4,5 metros), Dano 6d8+6 contundente.
Sarenrae Velocidade 9 metros, Velocidade de voo 21 metros; Corpo a corpo(enérgica, não letal, alcance 4,5 metros); Dano 6d6+6 cortante; Distância  chama eterna (não letal, distância 36 metros), Dano 6d6+3 de fogo.
Shelyn Velocidade 21 metros, caminhar no ar, ignora terreno difícil e terreno difícil maior; Corpo a corpoglaive (mortal d8, não letal, alcance 6 metros); Dano 6d8+6 cortante;  Distância  melodia da beleza interior (não letal, distância 36 metros), Dano 6d6+3 sônico.
Torag Velocidade 15 metros, Velocidade de escavação 9 metros, imune a Imobilizado; escudo (Dureza 15, não pode ser danificado)Corpo a corpomartelo de guerra (empurrar, alcance 4,5 metros); Dano 6d8+6 contundente.
Urgathoa Velocidade 21 metros, caminhar no ar; Corpo a corposegadeira (derrubar, mortal d10, alcance 4,5 metros); Dano 6d10+6 cortante; Distância  praga pálida (distância 36 metros), Dano 6d6+3 negativo.
Zon-KuthonVelocidade 21 metros, caminhar no ar, ignora terreno difícil e terreno difícil maior;  Corpo a corpocorrente com cravos (derrubar, desarmar, alcance 4,5 metros); Dano 6d8+6 cortante; Distância  dor da meia-noite (mental, não letal, distância 36 metros), Dano 6d6+3 mental.', false),
  (null, 'pathfinder', 'Cataclismo', 10, '', '2 ações', '1,000 m', '', 'Instantânea', 'Você recorre ao poder inimaginável de cataclismos apocalípticos, rasgando um pequeno pedaço de cada cataclismo e combinando-os em um ataque terrivelmente poderoso. Os efeitos a seguir recaem sobre todas as criaturas na área. Trate as resistências de criaturas na área como se fossem 10 pontos menor para o propósito de determinar o dano do cataclismo. Cada criatura tenta um salvamento básico de Reflexos que se aplica a todos os seis tipos de dano.

Chuva ácida que dissolve a carne causa 3d10 de dano de ácido.
Um terremoto estrondoso abala e assola criaturas no chão, causando 3d10 de dano contundente.
Uma rajada de vento congelante causa 3d10 de dano de frio.
Relâmpagos incríveis cobrem a área, causando 3d10 de dano de eletricidade.
Ventos fortes atravessam os céus, causando 3d10 de dano contundente a criaturas que estejam voando na área.
Um tsunami instantâneo varre as criaturas na área, causando 3d10 de dano contundente com o traço água (dobrado para criaturas que estejam nadando na área).
Um enorme incêndio queima como um inferno súbito, causando 3d10 de dano de fogo.', false),
  (null, 'pathfinder', 'Verdade Fabricada', 10, '', '3 ações', '30 metros', '', 'Varies', 'Escolha uma única afirmação que você deseja que o alvo acredite. O fato pode ser estrito, como “um dragão está circulando por perto e quer me matar”; amplo, como “todos os humanoides são abominações disfarçadas”; ou conceitual, como “se eu não viver uma vida mais gentil, serei punido no pós-vida”.
As experiências do alvo determinam como ele reage a essa
“verdade” e como seu comportamento muda. Se a afirmação alterar o que elas percebem, elas tratam essa alteração como uma revelação súbita.

O efeito da magia depende dos salvamentos de Vontade dos
alvos. Se o alvo já estiver afetado por verdade fabricada, , sua magia tenta neutralizá-la. Se o teste de neutralização falhar, o resultado da jogada de salvamento do alvo não pode ser pior que um sucesso.

---

Sucesso Crítico O alvo não acredita na afirmação e sabe que você tentou enganá-lo.

Successo O alvo não acredita na afirmação nem percebe que você tentou enganá-lo.

FalhaO alvo acredita na afirmação por uma duração de 1 semana.

Falha Crítica O alvo acredita na afirmação por uma duração ilimitada.', false),
  (null, 'pathfinder', 'Parar O Tempo', 10, '', '3 ações', '', '', 'Instantânea', 'Você para o tempo temporariamente para tudo além de si, permitindo-lhe usar várias ações em um período que parece ser apenas um instante para os outros. Imediatamente após conjurar parar o tempo, você pode usar até 9 ações em 3 conjuntos de até 3 ações cada. Após cada conjunto de ações, considera-se que se passou 1 rodada, somente para você, os efeitos que o estejam afetando e efeitos que você criar durante esse tempo parado. Todas as outras criaturas e objetos são invulneráveis a seus ataques, e você não pode mirá-las ou afetá-las com qualquer coisa. Após ter terminado suas ações, o tempo começa a fluir novamente para o resto do mundo. Se você criou um efeito com duração que se estende além da duração de parar o tempo — como uma muralha de fogo, por exemplo — ele imediatamente afeta os outros novamente, mas não possui quaisquer efeitos que acontecem no momento da conjuração da magia.', false),
  (null, 'pathfinder', 'Portal', 10, '', '2 ações', '36 metros', '', 'Sustentada até 1 minuto', 'Você rasga uma fenda para outro plano, criando um portal que criaturas podem atravessar em qualquer direção. Este portal é vertical e circular, com raio de 12 metros. O portal aparece em um local à sua escolha no plano de destino, assumindo que você tenha uma ideia clara da aparência desse local de destino e a localização dele dentro do plano desejado. Se tentar criar um portal para dentro ou para fora do reino de uma divindade ou outro ser poderoso, esse ser pode impedir o portal de se formar.', false),
  (null, 'pathfinder', 'Milagre', 10, 'Adivinhação', '3 ações', '', 'S, V, M', 'Instantânea', 'Você pede ajuda diretamente à sua fonte divina. Sua fonte divina sempre recusa um pedido fora da natureza dela e pode conceder um pedido diferente (potencialmente mais poderoso ou que seja mais apropriada à sua natureza) do que você pediu. Uma conjuração de milagre pode resultar em qualquer um dos efeitos. 

Duplicar qualquer magia divina de 9º nível ou inferior.
Duplicar qualquer magia não-divina de 7º nível ou inferior.
Produzir qualquer efeito cujo poder seja equivalente ao de qualquer magia divina de 9º nível ou inferior ou equivalente ao poder de qualquer magia não-divina de 7º nível ou inferior.
Reverter determinados efeitos que mencionem a magia desejo.

A critério do MJ, você pode tentar produzir efeitos maiores, mas isto é perigoso e a magia pode ter um efeito somente parcial.', false),
  (null, 'pathfinder', 'Encarnação da Natureza', 10, '', '2 ações', '', '', '1 minuto', 'O poder primal do mundo flui através de você. Você se transforma em uma encarnação da natureza, como um homem verde ou um kaiju. Sua forma de batalha é Média para um homem verde ou Imensa (9 metros de lado) para um kaiju. Você deve ter espaço suficiente para se expandir ou a magia é perdida. Enquanto estiver nesta forma, você adquire o traço planta (para um homem verde) ou o traço besta (para um kaiju). Você pode Dispensar esta magia.

Você recebe as estatísticas e habilidades a seguir independentemente de qual forma de batalha assumir: 

CA = 25 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
30 Pontos de Vida temporários.
Visão no escuro.
Um ou mais ataques específicos para a forma de batalha escolhida, que são os únicos ataques que pode usar. Você é treinado com eles. Seu modificador de ataque é +34 e utiliza o dano listado. Ataques corpo a corpo são baseados em Força (para o propósito da condição Enfraquecido, por exemplo). Se seu modificador de ataque para ataques desarmados baseados for maior, você pode utilizá-lo em vez do modificador concedido pela magia. 
+36 de modificador de Atletismo, exceto se o seu próprio modificador for maior.

 Você também recebe habilidades específicas baseadas na forma escolhida:

Homem Verde Velocidade 12 metros, Velocidade de escalada 12 metros; Corpo a corpo  vinhas (versátil Pf, alcance 9 metros), Dano 6d8+12 contundente; Distância  espinhos (distância 30 metros), Dano 6d6+6 perfurante; Afago Verde (aura, primal, transmutação) 18 metros. Inimigos que não sejam plantas devem obter sucesso em um salvamento de Fortitude contra sua CD de magia ou ficam Desajeitado 1 por 1 rodada (Desajeitado 2 em uma falha crítica).
Kaiju Velocidade 15 metros, resistência 5 a dano físico; Corpo a corpo  mandíbulas (alcance 9 metros), Dano 6d10+10 perfurante; Corpo a corpo garras (ágil, alcance 4,5 metros), Dano 6d8+8 cortante; Corpo a corpo  pata (ágil, alcance 4,5 metros), Dano 6d6+10 contundente; Imparável Você é imune a ficar Imobilizado e ignora terreno difícil e terreno difícil maior; AtropelaVocê se move até o dobro de sua Velocidade e se move através de espaços de criaturas Enormes ou menores, atropelando cada criatura cujo espaço você adentrar. Uma criatura atropelada sofre dano de sua pata com um salvamento básico de Reflexos contra sua CD de magia.', false),
  (null, 'pathfinder', 'Manada Primal', 10, 'Transmutação', '2 ações', '9 metros', 'S, V', '1 minuto', 'Convocando o poder do mundo natural, você transforma os alvos em uma manada de mamutes, e cada um deles assume uma forma de batalha Enorme. Cada alvo deve ter espaço suficiente para se expandir ou a magia é perdida para esse alvo. Enquanto estiver nesta forma, cada alvo adquire o traço animal. Cada alvo pode Dispensar a magia em si. 
Cada alvo recebe as estatísticas e habilidades a seguir: 

CA = 22 + seu nível. Ignore a penalidade em testes e redução de Velocidade de sua armadura.
20 Pontos de Vida temporários.
Velocidade 12 metros.
Visão na penumbra.
Os ataques desarmados a seguir, que são os únicos ataques que o alvo pode usar. Ele é treinado com eles. Quando atacar com estes ataques, o alvo utiliza o modificador de ataque dele com a proficiência e bônus de item do Golpe de sua arma ou ataque desarmado mais favorável, assim como o dano listado para esses ataques. Estes ataques são baseados em Força (para o propósito da condição enfraquecido, por exemplo). Se o modificador do ataque desarmado do alvo for maior, ele pode usar o melhor modificador. Corpo a Corpo  presa comprida (alcance 4,5 metros), Dano 4d8+19 perfurante; Corpo a Corpo  tromba (ágil, alcance 4,5 metros), Dano 4d6+16 contundente; Corpo a Corpo  pata (ágil, alcance 4,5 metros), Dano 4d6+13 contundente.
+30 de modificador de Atletismo, exceto se o próprio modificador do alvo for maior.
Atropelar  Você se move até o dobro de sua Velocidade e se move através de espaços de criaturas Grandes ou menores, atropelando cada criatura cujo espaço você adentrar. Uma criatura atropelada sofre dano da pata do alvo com um salvamento básico de Reflexos (CD 19 + o nível do alvo).', false),
  (null, 'pathfinder', 'Fenômeno Primal', 10, 'Adivinhação', '3 ações', '', 'S, V, M', 'Instantânea', 'Você pede que o mundo natural interceda diretamente sobre uma situação. A natureza sempre recusa pedidos aberrantes ou anormais à ordem natural e pode conceder um pedido diferente (potencialmente mais poderoso ou que seja mais apropriada à sua natureza) do que você pediu. Uma conjuração de fenômeno primal pode resultar em qualquer um dos efeitos a seguir: 

Duplicar qualquer magia primal de 9º nível ou inferior.
Duplicar qualquer magia não-primal de 7º nível ou inferior.
Produzir qualquer efeito cujo poder seja equivalente ao de qualquer magia primal de 9º nível ou inferior ou equivalente ao poder de qualquer magia não-primal de 7º nível ou inferior.
Reverter determinados efeitos que mencionem a magia desejo.

 A critério do MJ, você pode tentar usar fenomeno primal para produzir efeitos maiores, mas isto é perigoso e a magia pode ter um efeito somente parcial.', false),
  (null, 'pathfinder', 'Refazer', 10, '', '1 hora', '1,5 metro', '', 'Instantânea', 'Você recria completamente um objeto do nada, mesmo se o objeto tiver sido destruído. Para fazê-lo, você deve ser capaz de visualizar o objeto em sua mente. Adicionalmente, o componente material deve ser um resto do item, não importa quão pequeno ou insignificante (até mesmo um grão de poeira restante de desintegrar é suficiente). A magia falha se sua imaginação for baseada demais em suposições; se o objeto seria grande o suficiente para caber em um cubo de 1,5 metros de lado; se o objeto ainda existir e você simplesmente não estiver ciente disso; ou se o objeto for um artefato, tiver nível maior que 20 ou algum poder mágico similar..

O item se remonta em perfeitas condições. Mesmo se sua imagem mental do objeto danificado ou desgastado, o novo item está em sua forma perfeita. Se o objeto era mágico, esta magia normalmente restaura as propriedades mágicas constantes dele, mas não propriedades temporárias, como cargas ou usos únicos. Um item com cargas ou usos por dia tem todos os usos dele gastos quando é refeito com todos seus usos gastos, mas os reabastece normalmente depois.', false),
  (null, 'pathfinder', 'Revivificar', 10, '', '2 ações', '9 metros', '', 'Sustentada até 1 minuto', 'Uma explosão de energia de cura alivia as criaturas vivas e ergue temporariamente aquelas que foram assassinadas recentemente. Todos os alvos vivos recuperam 10d8+40 Pontos de Vida. Além disso, você retorna à vida temporariamente qualquer quantidade de alvos mortos, com os mesmos efeitos e limitações de reviver os mortos (página 376). As criaturas revividas recebem uma quantidade de Pontos de Vida temporários igual aos Pontos de Vida que você recuperou às criaturas vivas, mas não possuem Pontos de Vida normais. As criaturas revividas não podem recuperar Pontos de Vida ou ganhar Pontos de Vida temporários de outras formas, e após o fim da duração de revivificar, eles perdem todos os Pontos de Vida temporários e morrem. Revivificar não pode ressuscitar criaturas mortas por desintegrar ou um efeito de morte. Ela não possui efeito sobre mortos-vivos.', false),
  (null, 'pathfinder', 'Desejo', 10, 'Adivinhação', '3 ações', '', 'S, V, M', 'Instantânea', 'Você profere um desejo, fazendo sua maior vontade virar verdade. Uma conjuração de desejo pode resultar em qualquer um dos efeitos a seguir:
• Duplicar qualquer magia arcana de 9º nível ou inferior.
• Duplicar qualquer magia não-arcana de 7º nível ou inferior.
• Produzir qualquer efeito cujo poder seja equivalente ao de qualquer magia arcana de 9º nível ou inferior ou equivalente ao poder de qualquer magia não-arcana de 7º nível ou inferior.
• Reverter determinados efeitos que mencionem a magia desejo.
A critério do MJ, você pode tentar produzir efeitos maiores, mas isto é perigoso e a magia pode ter um efeito somente parcial.', false);
