# Luz e resposta dos materiais

A cena tinha iluminação quase uniforme, sombras limitadas ao quadrado da mesa e um padrão regular de ondas que deixava o rio artificial. Esta revisão modifica a luz incidente e os materiais do mundo, mantendo os modelos e o enquadramento existentes.

## Implementação

- `outdoor-lighting.tsx`: contexto com um único relógio por mundo. Os materiais carregados depois recebem o mesmo instante de animação. O relógio pausa quando `active` é falso e limita saltos de tempo após uma aba suspensa.
- Sol em `[-52, 64, 38]`, intensidade 3,6, luz quente e preenchimento frio mais discreto. O disco solar do céu usa a mesma direção. O volume das nuvens mantém sua iluminação pré-calculada aproximada.
- Shadow map próximo: 4096², área de 40 × 40 unidades. Abrange a ruína e árvores próximas além da mesa; os objetos distantes continuam sem renderizar sombras reais.
- Cobertura de nuvens: duas escalas de ruído projetado em coordenadas do mundo, com deslocamento contínuo. Atenua apenas a luz solar até 38%, preservando preenchimento do céu, luzes locais e iluminação indireta. É uma aproximação de cobertura, **não** uma projeção exata dos volumes de nuvens visíveis. Usa os shaders dos materiais, sem outro passe de tela inteira.
- Terreno próximo/distante, árvores, grama, flores, casas, marcos, pontes, rochas e a alvenaria compartilham essa cobertura, inclusive em instâncias com diferentes escalas e rotações.
- Folhas e pétalas: termo aproximado de transmissão dependente da direção da câmera e do sol, pigmento e sombra recebida. Não usa emissão, de modo que desaparece junto com a luz na transição para o portfólio. Troncos e pedra não recebem transmissão.
- Rio: duas escalas principais de ruído advectado e uma escala fina com atenuação à distância. Derivadas analíticas geram as normais sem avaliações adicionais de diferenças finitas. Remove a camada de verniz (`clearcoat`) e a grade de reflexos causada por ondas senoidais repetidas. Mantém reflexão do ambiente, cor por profundidade e espuma irregular nas margens rasas.
- Recursos privados são descartados pelos componentes existentes; o contexto adiciona apenas um uniforme compartilhado. Não há novos modelos, texturas ou dependências nesta revisão.

Os shaders continuam compostos com os de vento e pigmento existentes. O trecho de luz direcional é expandido a partir de `ShaderChunk.lights_fragment_begin` da versão instalada de Three.js; uma atualização de Three deve ser validada em WebGL real. Durante a revisão, a captura detectou uma colisão de variáveis na expansão dos loops de luz, corrigida antes das validações finais.

## Referências técnicas

A distinção entre transmissão em folhas finas e emissão segue o princípio descrito nos [modelos de sombreamento da Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/shading-models?application_version=4.27). A implementação aqui é uma aproximação própria para Three.js, não o shader do Unreal.

Os parâmetros físicos de água e seu custo foram conferidos na [documentação de MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) e no código da versão instalada (0.183.2). Não foi adicionado um sistema de reflexão planar: a água continua refletindo o ambiente PMREM, gerado na montagem, sem refletir as casas ou atualizar cada nuvem em movimento.

## Revisão visual

Abra [a comparação interativa](lighting-comparison.html). Há vistas da mesa e do vale, com resolução e câmera correspondentes, além de um vídeo de 16 segundos da versão de produção local. Os instantes da animação diferem entre capturas.

A passagem dá mais contraste e movimento à iluminação, mas não altera as formas arredondadas do terreno nem a regularidade das margens do rio. Esses continuam sendo limites visuais separados.

## Validação

- Build de produção, TypeScript, ESLint dos arquivos alterados e `git diff --check` aprovados.
- 7 cenários Playwright aprovados em Chromium com GPU: navegação, interação da mesa, entrada no portfólio, carregamento e fallback de assets, mobile, movimento reduzido e ausência dos antigos fundos planos.
- Capturas de produção em 1440×900, 1280×720, 1920×1080 e vista traseira em 1280×800: nenhum erro de página ou shader no console.
- Amostra local de 180 frames por vista, RTX 3050 Laptop, 1440×900 e DPR 1: **38,7 FPS na mesa / 42,0 FPS no vale**, p95 de 33,4 ms em ambos. A amostra anterior foi 41,7 / 39,3 FPS; as oscilações entre vistas não demonstram ganho de desempenho. Dados e ressalvas em [frame-profile.json](../implementation/frame-profile.json). Não é garantia de 60 FPS nem medição de VRAM.
- Vídeo de produção de 16 s gravado sem erros de página/console; quadros do início e do fim inspecionados. Comparador HTML verificado no navegador: slider por teclado, troca entre as duas vistas, imagens carregadas e metadados do vídeo.
