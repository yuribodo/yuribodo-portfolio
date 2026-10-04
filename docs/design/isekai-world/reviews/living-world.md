# Fauna e vegetação do vale

[Comparativo e vídeo](living-world.html) · [Vista da mesa](../implementation/fantasy-life/before.png) · [Inspeção dos modelos](../implementation/wildlife-details.png)

A revisão começou com o pedido de preencher a paisagem com vida, preservando os pássaros. Durante o trabalho, o usuário apontou que a escolha de modelos muito simples também limitava a ambientação. A seleção foi revista: os cervos de cores chapadas foram substituídos por modelos Blender texturizados, e a vegetação principal passou a usar assets detalhados do Poly Haven.

## O que está na cena

- **42 pássaros**, distribuídos em seis bandos com profundidades, fases e trajetórias diferentes. As borboletas existentes continuam no jardim.
- **13 cervos**, em grupos nas clareiras. Mantêm texturas de pelagem e animações originais de pasto, descanso e observação. Variam em tamanho, orientação e fase. As posições são fixas durante esses comportamentos, evitando deslizamento dos pés; não há navegação autônoma entre destinos.
- **Dois dragões**, com esqueleto articulado, ciclos de bater asas e planar, cauda em movimento e circuitos aéreos em distâncias diferentes.
- Bosques agrupados, arbustos nas bordas dos habitats, flores e rochas com musgo nos afloramentos. As clareiras dos animais permanecem livres das árvores maiores.
- Árvores próximas, samambaias, arbustos e rochas com materiais de cor, normal e rugosidade. O carregamento de cada conjunto é independente, para um modelo pesado não segurar as plantas menores.

Mesa, prateleira, colecionáveis, piso do pátio, pose inicial da câmera e geometria do vale foram preservados. As novas copas mudam as sombras projetadas no pátio.

## Qualidade e fontes

Os cervos são **Deer Female / Old Deer Male**, de **CDmir (Čestmír Dammer)** com **TinyWorlds**, CC0, criados para o projeto Kelgar. Os arquivos Blender foram convertidos para materiais PBR e receberam um nível de subdivisão, mantendo rig e animações. O macho inclui os normal maps do autor; as bordas dos UVs do corpo foram ajustadas para eliminar costuras azuis causadas pelo preenchimento do atlas original, sem alterar os pixels da textura. Fontes: [fêmea](https://opengameart.org/content/deer-female), [macho](https://opengameart.org/content/old-deer-male).

O dragão é **Dragon Rigged**, de **na3ee1**, [CC BY 3.0](https://poly.pizza/m/WIOTISRjeX). O modelo foi soldado e subdividido no Blender para suavizar corpo e membranas; o ciclo de voo foi criado para este cenário. A escolha não foi limitada ao catálogo inicial, mas esse modelo foi mantido e refinado. Não é um personagem oficial extraído de um jogo ou anime. A seleção ainda pode evoluir para uma criatura de acabamento mais elaborado.

As árvores e plantas são **Tree Small 02, Pine Tree 01, Fern 02, Shrub 02 e Rock Moss Set 01**, [Poly Haven, CC0](https://polyhaven.com/license). Os arquivos Blender das árvores trazem a geometria original e versões com menos detalhe. Os modelos próximos mantêm essas formas e materiais, sem a antiga pintura que reduzia todas as folhas a poucas cores.

A redução uniforme de polígonos foi descartada para as copas: ela eliminava folhas e deixava a floresta rala. A solução usa geometria completa para exemplares próximos e oito vistas pré-renderizadas de cada copa para árvores distantes. Cada árvore distante ocupa uma posição própria no terreno, recebe vento/neblina e respeita a oclusão da cena. O vale, o rio, a arquitetura e os animais continuam sendo geometria 3D. O uso de vistas pré-renderizadas é uma aproximação para a câmera fixa da mesa; não equivale a uma árvore totalmente modelada vista de qualquer ponto num jogo explorável.

Manifestos: `assets/lobby-world/wildlife-sources.json`, `assets/lobby-world/organic-sources.json`. Créditos e modificações registrados também em `public/CREDITS.md`. Os arquivos de origem e os renders intermediários ficam fora do pacote servido pelo site.

## Validação

- 20 testes unitários: incluem habitats secos, separação dos afluentes, contato estável durante o pasto e altitude dos dragões sobre o terreno.
- TypeScript, ESLint dos arquivos alterados e build de produção aprovados.
- 7 cenários Playwright com Chromium e GPU passaram: navegação, objetos da mesa, monitor, loading/skip, falha de assets, mobile, movimento reduzido e ausência de panoramas planos de paisagem/céu.
- Capturas em desktop, laptop, ultrawide e vista traseira; inspeção isolada dos mesmos GLBs de fauna usados no site.
- Na medição local de 180 frames por vista, em 1440×900, DPR 1, RTX 3050 Laptop: aproximadamente **37,1 FPS** na mesa e **43,5 FPS** atrás. P95 de **33,4 ms** em ambas. O registro inclui submissões de sombras e aplicações de desktop podem afetar o resultado; não é uma promessa de 60 FPS nem um benchmark universal.

## Limites do resultado

A substituição dos assets corrige uma parte da simplicidade, mas não conclui a direção de arte. O relevo amplo continua suave, a composição da arquitetura é repetitiva e as margens ainda têm menos erosão e diversidade do que a referência aprovada. Os animais distantes são detalhes do mundo; não dominam a vista da mesa. A próxima revisão de acabamento deve ser guiada pela imagem renderizada, usando essas fontes como base de trabalho, sem tratar quantidade de objetos ou origem da biblioteca como garantia de qualidade.

Esta revisão é histórica. A fauna real foi substituída na [revisão de criaturas de fantasia](fantasy-life.md).
