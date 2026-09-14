# Atividade no mundo

A revisão anterior melhorou a resposta da luz, mas o mundo continuava com pouca atividade observável. Esta passagem trabalha movimentos de plantas e animais e sinais de uso na vila. A mesa, iluminação e formas do terreno foram preservadas.

## Mudanças

- Rajadas percorrem o terreno em uma direção compartilhada. Árvores, grama e flores usam o mesmo relógio; a rotação de cada instância não altera a direção do vento. A intensidade varia por posição, com vibração menor nas pontas. As raízes permanecem fixas.
- Árvores recebem um material de profundidade com a mesma deformação e recorte alfa: a sombra acompanha a copa.
- Dois bandos de sete pássaros percorrem circuitos acima do vale. Alternam batidas de asa e voo planado, com fases individuais. São pequenas silhuetas tridimensionais com corpo, cabeça e asas afiladas.
- Doze borboletas ficam nos canteiros existentes, com trajetórias curtas, asas articuladas e desenho de borda e veios. Foram reduzidas após a primeira inspeção para não dominar o primeiro plano.
- Os dois moinhos usam o modelo original de Quaternius com o rotor separado. Mantêm escala e paleta da vila. O asset adicional tem cerca de 50 KB, licença CC0 e script de reconstrução. Se não carregar, cada moinho mantém o modelo estático anterior.
- Quatro chaminés em casas existentes emitem fumaça discreta. A emissão é ancorada no topo compacto do modelo; cumeeiras longas são excluídas. São 72 pequenas instâncias em um único draw, com crescimento, deriva e dissipação, teste de profundidade e neblina da cena.
- O relógio compartilhado pausa com `active=false`; fumaça respeita o dimmer da entrada no portfólio. Nenhum som automático foi acrescentado. Os componentes descartam suas geometrias e materiais privados.

O código de voo, asas, borboletas e fumaça é próprio. O moinho deriva do [modelo CC0 de Quaternius](https://poly.pizza/m/89dsFYAoX1), com crédito em `public/CREDITS.md` e reconstrução em `scripts/build-living-mill.mjs`.

## Evidência

[Vídeo de 28 segundos: mesa, giro da câmera e vale](../implementation/ambient-life.mp4). Observe as pás do moinho à frente, a sombra das árvores na pedra, as rajadas na grama e as borboletas nos canteiros traseiros. A presença dos bandos varia durante o circuito.

As capturas anteriores estão em `before-ambient-desktop.png` e `before-ambient-rear.png`. O comparador da revisão de iluminação foi fixado nesses arquivos, preservando a comparação histórica.

Esta passagem acrescenta atividade, mas não resolve a distância entre a geometria do terreno e o detalhamento do conceito aprovado.

## Validação

Build de produção, TypeScript e ESLint dos arquivos alterados aprovados. Revisão no navegador real sem erros de shader. Resultados de navegação, captura final e desempenho registrados após a revisão.

- Os 7 cenários Playwright passaram em Chromium com GPU: interação da mesa, giro e retorno de câmera, entrada no portfólio, readiness/skip, ausência de assets, mobile e movimento reduzido.
- Capturas finais de produção em desktop, laptop, wide e vista traseira sem erros de página ou console.
- Vídeo de 28 s (1440×900), sem erros de página/console; quadros nas duas vistas inspecionados. O arquivo está separado do vídeo da passagem anterior de iluminação.
- Amostra local de 180 frames por vista, RTX 3050 Laptop, 1440×900 e DPR 1: **41,4 FPS na mesa / 42,5 FPS no vale**, p95 de 33,4 ms. Quatro draws adicionais por vista nessa amostra. A leitura anterior foi 38,7 / 42,0 FPS; não é uma comparação controlada nem garantia de desempenho em outros dispositivos. Dados em [before-main-vista-profile.json](../implementation/before-main-vista-profile.json).
