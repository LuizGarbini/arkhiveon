-- Seed D&D 5e Feats (Talentos)
insert into public.feats (system, name, category, prerequisites, description, ability_increase, source, is_homebrew) values
('dnd5e', 'Alerta', 'general', '', 'Você recebe +5 de bônus em iniciativa. Além disso, você não pode ser surpreso enquanto estiver consciente e outras criaturas não ganham vantagem em jogadas de ataque contra você como resultado de estarem escondidas de você.', '', 'PHB', false),

('dnd5e', 'Robusto', 'general', '', 'Seu HP máximo aumenta em um valor igual a 2 vezes o seu nível atual. Cada vez que você subir de nível após receber este talento, seu HP máximo aumenta em 2 adicionais.', '', 'PHB', false),

('dnd5e', 'Sortudo', 'general', '', 'Você tem 3 pontos de sorte por dia. Você pode gastar 1 ponto de sorte para rolar um d20 adicional quando fizer uma jogada de ataque, teste de habilidade ou salvaguarda, escolhendo qual dado usar. Você também pode gastar para fazer um inimigo rolar novamente uma jogada de ataque contra você.', '', 'PHB', false),

('dnd5e', 'Conjurador de Guerra', 'general', 'Capacidade de conjurar pelo menos uma magia', 'Você tem vantagem em testes de salvaguarda de Constituição para manter sua concentração em uma magia quando sofre dano. Você pode executar os componentes somáticos de magias mesmo quando estiver empunhando armas ou escudos. Quando o movimento de uma criatura provocar um ataque de oportunidade contra você, você pode usar sua reação para conjurar uma magia contra a criatura em vez de fazer o ataque físico.', '', 'PHB', false),

('dnd5e', 'Sentinela', 'general', '', 'Quando você atinge uma criatura com um ataque de oportunidade, o deslocamento da criatura se torna 0 pelo resto do turno. Criaturas provocam ataques de oportunidade de você mesmo se realizarem a ação de Desengajar. Quando uma criatura dentro de 1,5m de você fizer um ataque contra um alvo que não seja você, você pode usar sua reação para realizar um ataque de arma corpo-a-corpo contra ela.', '', 'PHB', false),

('dnd5e', 'Observador', 'general', '', 'Você ganha +5 de bônus em Sabedoria Passiva (Percepção) e Inteligência Passiva (Investigação). Além disso, se você puder ver a boca de uma criatura enquanto ela fala um idioma que você conhece, você pode ler os lábios dela.', '+1 de Inteligência ou Sabedoria', 'PHB', false),

('dnd5e', 'Mestre em Armas Grandes', 'general', '', 'No seu turno, quando você atingir um acerto crítico com um ataque de arma corpo-a-corpo ou reduzir o HP de uma criatura a 0 com um, você pode fazer um ataque de arma corpo-a-corpo como uma ação bônus. Antes de fazer um ataque corpo-a-corpo com uma arma pesada que você é proficiente, você pode escolher sofrer -5 de penalidade na jogada de ataque. Se o ataque atingir, você adiciona +10 ao dano do ataque.', '', 'PHB', false),

('dnd5e', 'Atirador Preciso', 'general', '', 'Atacar a longa distância não impõe desvantagem nas suas jogadas de ataque com armas de ataque à distância. Seus ataques com armas à distância ignoram meia cobertura e três quartos de cobertura. Antes de fazer um ataque com uma arma à distância em que você seja proficiente, você pode escolher sofrer -5 de penalidade na jogada de ataque. Se o ataque atingir, você adiciona +10 ao dano do ataque.', '', 'PHB', false),

('dnd5e', 'Mobilidade', 'general', '', 'Seu deslocamento aumenta em 3 metros (10 feet). Quando você usa a ação de Disparar (Dash), terrenos difíceis não custam deslocamento extra para você naquele turno. Quando você faz um ataque corpo-a-corpo contra uma criatura, você não provoca ataques de oportunidade daquela criatura pelo resto do turno, independente de atingir ou não.', '', 'PHB', false),

('dnd5e', 'Resiliente', 'general', '', 'Escolha um valor de habilidade. Você ganha proficiência em testes de salvaguarda usando a habilidade escolhida.', '+1 na Habilidade Escolhida', 'PHB', false),

('dnd5e', 'Curandeiro', 'general', '', 'Quando usar um kit de curandeiro para estabilizar uma criatura agonizante, aquela criatura recupera 1 ponto de vida. Como uma ação, você pode gastar um uso de um kit de curandeiro para tratar um aliado e fazer com que ele recupere HP igual a 1d6 + 4 + o número máximo de dados de vida da criatura. Uma criatura não pode se beneficiar deste tratamento novamente até terminar um descanso curto ou longo.', '', 'PHB', false),

('dnd5e', 'Iniciado em Magia', 'general', '', 'Escolha uma classe: bardo, clérigo, druida, mago, paladino, patrulheiro, feiticeiro ou bruxo. Você aprende dois truques da lista dessa classe. Além disso, escolha uma magia de 1º nível da lista da mesma classe. Você pode conjurar essa magia uma vez por descanso longo sem gastar espaços de magia.', '', 'PHB', false),

('dnd5e', 'Mestre em Armas de Haste', 'general', '', 'Quando você realiza a ação de Ataque com uma alabarda, glaive, lança ou bastão, você pode usar uma ação bônus para realizar um ataque corpo-a-corpo com a outra extremidade da arma. O dado de dano para este ataque é um d4. Além disso, outras criaturas provocam um ataque de oportunidade de você quando entram no seu alcance corporal empunhando essas armas.', '', 'PHB', false),

('dnd5e', 'Mestre em Escudo', 'general', '', 'Se você realizar a ação de Ataque no seu turno, você pode usar uma ação bônus para empurrar uma criatura a até 1,5 metro de você com seu escudo. Se você não estiver incapacitado, você pode adicionar o bônus de CA do seu escudo a qualquer teste de salvaguarda de Destreza contra magias ou efeitos que tenham você como alvo individual. Se você for alvo de um efeito que permita fazer um teste de salvaguarda de Destreza para sofrer apenas metade do dano, você pode usar sua reação para não sofrer dano algum se passar no teste.', '', 'PHB', false),

('dnd5e', 'Ator', 'general', '', 'Você tem vantagem em testes de Carisma (Enganação) e Carisma (Atuação) quando estiver tentando se passar por outra pessoa. Você pode mimetizar perfeitamente a fala de outra pessoa ou sons feitos por outras criaturas contanto que os tenha escutado por pelo menos 1 minuto.', '+1 de Carisma', 'PHB', false),

('dnd5e', 'Brigão de Taberna', 'general', '', 'Você é proficiente com armas improvisadas. Seus ataques desarmados causam 1d4 de dano. Quando você atinge uma criatura com um ataque desarmado ou com uma arma improvisada no seu turno, você pode usar uma ação bônus para tentar agarrar (grapple) o alvo.', '+1 de Força ou Constituição', 'PHB', false),

('dnd5e', 'Lutador com Duas Armas', 'general', '', 'Você ganha +1 de bônus na CA enquanto estiver empunhando uma arma corpo-a-corpo em cada mão. Você pode usar o combate com duas armas mesmo quando as armas de uma mão que estiver empunhando não forem leves. Você pode sacar ou guardar duas armas de uma mão quando normalmente seria permitido sacar ou guardar apenas uma.', '', 'PHB', false),

('dnd5e', 'Explorador de Masmorras', 'general', '', 'Você tem vantagem em testes de Sabedoria (Percepção) e Inteligência (Investigação) feitos para detectar a presença de portas secretas. Você tem vantagem em testes de salvaguarda contra armadilhas e resistência contra o dano causado por armadilhas. Você pode procurar por armadilhas mesmo enquanto viaja a um ritmo rápido.', '', 'PHB', false),

('dnd5e', 'Mestre em Armadura Média', 'general', 'Proficiência com armadura média', 'Usar armadura média não impõe desvantagem nos seus testes de Destreza (Furtividade). Além disso, você pode adicionar até +3 (em vez de +2) do seu modificador de Destreza à sua Classe de Armadura se estiver usando armadura média.', '', 'PHB', false),

('dnd5e', 'Especialista em Besta', 'general', '', 'Você ignora a propriedade de recarga (loading) de bestas com as quais você seja proficiente. Estar a até 1,5 metro de uma criatura hostil não impõe desvantagem em suas jogadas de ataque à distância. Quando você usa a ação de Ataque e ataca com uma arma de uma mão, você pode usar uma ação bônus para atacar com uma besta de mão carregada que esteja empunhando.', '', 'PHB', false);
