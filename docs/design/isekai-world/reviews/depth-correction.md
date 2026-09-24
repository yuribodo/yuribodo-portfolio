# Mesa preservada e escala do ambiente

O usuário rejeitou a alteração da mesa e apontou um cenário pequeno, próximo e sem qualidade de material. A mesa, a prateleira, as posições dos colecionáveis e a pose inicial da câmera foram restauradas à implementação original. Esses três arquivos voltaram a coincidir com a versão do repositório anterior à alteração.

[Antes/depois e vídeo](depth-correction.html) · [Print desta revisão](../implementation/before-living-world.png)

## Correção espacial

O terreno frontal agora se expande gradualmente depois de z=-35, chegando a três vezes a distância em z=-125. A transformação preserva alturas, não dobra a superfície e mantém intactas as coordenadas da mesa, do pátio e do vale traseiro. Terreno, água e pontes usam a mesma transformação; plantas e construções deslocam suas origens, conservando o tamanho dos modelos. Assim, as árvores deixam de dominar a escala do vale e o espaço entre destinos fica mais amplo.

A cidadela está a aproximadamente 930 unidades de profundidade, com menor tamanho aparente e mais espaço sob sua base. O monumento de xadrez ocupa uma encosta a aproximadamente 960 unidades, sem a antiga casca de ilha em forma de vaso. As ilhas menores foram afastadas. Novas camadas de montanhas usam cristas e depressões irregulares, e a malha se estende além do horizonte frontal. O alcance da câmera foi ampliado; sua posição, orientação e campo de visão foram preservados.

Os materiais mantêm coordenadas originais para estradas, campos, umidade e contato com o solo. As texturas de rocha usam coordenadas físicas para evitar que o aumento das distâncias estique as fissuras. As chaminés somam seus deslocamentos locais à nova origem das casas, para que a fumaça permaneça na saída correta. A densidade atmosférica traseira é compensada separadamente para preservar a profundidade da vista anterior.

## Materiais

A rocha anterior era remapeada para duas cores, reduzindo seu detalhe, e não tinha normal map próprio. Agora usa o difuso e o normal OpenGL 2K de [Rock Face 03, Poly Haven, CC0](https://polyhaven.com/a/rock_face_03), com cor moderadamente dessaturada, fissuras preservadas, projeção em três eixos e amostras deslocadas para reduzir repetição. O relevo fino perde intensidade à distância para evitar cintilação. Os dois WebP somam aproximadamente 3,3 MiB; fontes e reconstrução estão em `assets/lobby-world/rock-detail-sources.json` e `scripts/build-rock-detail.mjs`.

O pigmento do prado distante preserva mais variação da textura de origem. A exposição rochosa considera a inclinação da superfície expandida e um peso menor da geologia original, conservando vegetação nas encostas suaves. O piso do pátio mantém seu material. Nenhuma pintura de fundo foi acrescentada.

## Validação

- 17 testes unitários passaram, incluindo continuidade e monotonicidade da expansão, preservação das coordenadas próximas/traseiras e ligação dos afluentes ao rio.
- TypeScript, ESLint dos arquivos alterados e build de produção aprovados.
- Os 7 cenários Playwright passaram com Chromium e GPU: navegação, objetos por teclado, clique na malha do monitor, carregamento/skip, falha de assets, mobile e movimento reduzido. Os dois cenários de interação foram repetidos após o ajuste de neblina, sem erros.

## Limites

Esta correção trata escala, enquadramento e material; não transforma os modelos procedurais em um cenário AAA final. A arquitetura da cidadela ainda é repetitiva, os povoados usam um conjunto pequeno de modelos e as montanhas não têm o detalhamento de um cenário esculpido individualmente. A mesa original é agora uma restrição explícita para as próximas revisões.

## Evidência final

Capturas de produção em 1440×900, 1280×720, 1920×1080 e vista traseira inspecionadas, sem erros de página ou console. Vídeo de 28 segundos com vista inicial, giro e retorno, também sem erros. Imagens e controle de comparação do HTML verificados no navegador.

A medição final registrou **31,9 FPS à mesa / 38,2 FPS atrás**, p95 de 50,1 / 33,4 ms, em RTX 3050 Laptop, 1440×900, DPR 1 e 180 frames por vista. São amostras de cadência de `requestAnimationFrame` em navegador headless com câmera estabilizada; não isolam tempo de GPU, consumo de VRAM, carregamento frio ou aplicações concorrentes. O alvo de 60 FPS continua não atingido nessa máquina. [Perfil completo](../implementation/frame-profile.json).
