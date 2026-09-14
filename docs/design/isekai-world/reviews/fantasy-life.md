# Habitantes de fantasia e composição do vale

[Comparativo e vídeo](fantasy-life.html) · [Print](../implementation/fantasy-life/after.png)

Esta revisão responde a quatro problemas: fauna real fora da direção de anime, grandes áreas vazias, voo rígido do dragão e defeitos nas cachoeiras.

## Resultado

- Os GLBs de cervos deixaram de ser carregados. Há **24 habitantes de fantasia**: slimes azuis com expressão, material de gel e salto com antecipação/aterrissagem; espíritos de folhas com flutuação e inclinação suave. Um dos slimes fica no parapeito, mais próximo de quem está à mesa. São geometria original, inspirada na linguagem dos animes, sem extração de personagens oficiais.
- A fauna usa cinco lotes de instâncias, incluindo os rostos, para evitar uma chamada de desenho por parte de cada criatura. A deformação mantém a base dos slimes no chão quando estão parados. O relógio compartilhado pausa as animações quando o mundo está inativo.
- Quatro povoados ocupam os patamares. As casas ganharam escala visível da mesa, fundações que acompanham a encosta e exclusão dos canais. Os bosques cresceram em massas separadas por clareiras; duas árvores antigas e cinco grupos de cogumelos identificam habitats de fantasia.
- Os dois dragões preservam a malha licenciada, mas deixam de reproduzir o clip anterior. O controle usa os nomes dos ossos normalizados pelo GLTFLoader, batidas coordenadas de ombro/antebraço, atraso da cauda e fechamento da mandíbula. Três batidas de dois segundos alternam com seis segundos de planeio; a orientação acompanha a tangente e a curvatura do percurso.
- As cachoeiras têm quedas mais íngremes, ruído de fluxo medido ao longo do curso, espuma e névoa nos impactos. O leito deixa 2,8 unidades de folga; o encontro com o rio fica 0,18 acima da superfície média, além da amplitude das ondas. O refinamento da malha se limita aos corredores das quedas.

A mesa, prateleira, colecionáveis e câmera inicial foram preservados. Não houve adição de dependências nem download de novos modelos para esta revisão.

## Fontes e direção

A referência visual dos slimes é a forma azul e a relação com a floresta de *That Time I Got Reincarnated as a Slime*: [still promocional do episódio 3](https://www.animatetimes.com/news/details.php?id=1539220330). Árvores antigas e vegetação em camadas também foram comparadas com [arte de Mushoku Tensei divulgada pela Crunchyroll](https://x.com/Crunchyroll/status/1511495444030971905). Essas imagens servem de referência, sem uso como textura ou fundo.

Árvores: [Poly Haven Tree Small 02](https://polyhaven.com/a/tree_small_02), CC0, reaproveitado com copa mais larga, pigmento adaptado e raízes locais. Arquitetura: [Quaternius Medieval Village](https://quaternius.com/packs/medievalvillage.html), CC0. Dragão: [Dragon Rigged, na3ee1](https://poly.pizza/m/WIOTISRjeX), CC BY 3.0. Os créditos anteriores continuam em `public/CREDITS.md`.

## Verificação

- 22 testes unitários: contato e continuidade dos habitantes, tangente do voo, transição para planeio, distância do dragão ao terreno e folga das cachoeiras em relação aos triângulos efetivamente renderizados.
- O primeiro teste de abertura revelou custo adicional de montagem. A distribuição de plantas passou a ser compartilhada entre os conjuntos de vegetação e o sombreamento do terreno; a malha mais densa ficou restrita às quedas.
- TypeScript, ESLint dos arquivos alterados e build de produção aprovados. Os sete cenários de navegador foram verificados; os dois que inicialmente falharam na abertura passaram após a otimização, sem aumentar o limite de espera.
- Captura final: nenhum erro de console e nenhuma requisição dos GLBs de cervos. Vídeo de 18 segundos da vista da mesa.
- Medição local de produção, RTX 3050 Laptop, 1440×900, DPR 1, 180 frames por vista: **31,0 FPS na mesa** (P95 50 ms) e **42,5 FPS atrás** (P95 33,4 ms). A versão anterior registrava aproximadamente 37 FPS na mesa; a densidade adicional tem custo. São medições locais, não uma garantia de 60 FPS. [Registro completo](../implementation/fantasy-life/frame-profile.json).
- Inspeção do rig real do dragão nas poses de batida e planeio, além das capturas do cenário.

## Limites

A arquitetura ainda usa o conjunto anterior e mantém sua estilização; não é uma substituição completa por edifícios autorais. Os habitantes saltam ou flutuam nas suas clareiras, sem navegação autônoma pelo vale. As árvores distantes continuam usando vistas de copas individuais; as árvores antigas são geometria completa. A gravação deve ser avaliada junto com o print, porque animação e oclusão não podem ser julgadas por uma única imagem.
