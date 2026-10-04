# Comparação visual: mundo aberto e céu

Referência principal: [Skybound / At the desk](../concepts/05-skybound-at-the-desk.png). A comparação abaixo é uma leitura das imagens, não uma afirmação sobre os shaders ou técnicas internas dos jogos.

## Referências consultadas

- **Genshin Impact, Mondstadt:** [captura publicada no HoYoLAB](https://www.hoyolab.com/article/14452564), por ニクス / UID 846121272. [Imagem](https://upload-os-bbs.hoyolab.com/upload/2022/12/19/176566454/a94f4f3eb79187122a8e4203244729b3_6596335153965071917.png). Observada a combinação de grandes bancos no horizonte, fragmentos menores no alto, branco luminoso e espaços de céu entre massas. Rochas, relva, água e cidade formam planos intermediários legíveis.
- **The Legend of Zelda: Breath of the Wild:** [Explorer’s Guide da Nintendo](https://assets.nintendo.com/image/upload/v1675114089/Microsites/zelda-breath-of-the-wild/pdf/ExplorersGuide.pdf), página 5 do PDF / páginas impressas 5–6, “The Wilds of Hyrule”. As vistas separam primeiro plano, florestas e montanhas por contraste e névoa; montanhas e marcos têm silhuetas que orientam a leitura. A nossa direção de cor continua sendo a referência Skybound, mais azul e luminosa que as cenas de pôr do sol do guia.

## Diferenças que importam

| Aspecto | Referência Skybound / jogos | Cena antes desta revisão | Direção aplicada ou trabalho restante |
| --- | --- | --- | --- |
| Cor do céu | Azul profundo no alto, transição luminosa próxima do horizonte | Azul claro quase uniforme dentro do enquadramento | Degradê com três faixas de cor contínuas, ajustado à vista real da câmera |
| Nuvens | Escalas variadas, recortes menores, sobreposição e áreas vazias | Poucas massas grandes e parecidas, macias demais | Bancos assimétricos junto aos marcos, camada distante e fragmentos altos mais finos |
| Luz das nuvens | Áreas brancas legíveis, sombras frias com forma | Sombras cinzentas amplas e pouco detalhe de borda | Densidade em múltiplas escalas, transições de luz mais definidas e mais amostras no volume |
| Profundidade | Planos sucessivos até o horizonte | Morros próximos e distantes com cores e silhuetas semelhantes | O céu ajuda a separar a linha do horizonte; a escultura e composição dos morros continuam sendo a próxima lacuna importante |
| Geografia | Cristas, platôs, recortes e caminhos com curvas motivadas pelo relevo | Ondulações arredondadas e alguns canais com margens muito regulares | Ainda precisa de formas geológicas mais deliberadas; adicionar mais vegetação não resolve essa diferença |
| Enquadramento | A paisagem ocupa mais área acima da mesa | A prateleira superior da mesa ocupa parte significativa da vista | Diferença registrada para futura revisão de câmera; a mesa aprovada foi preservada |

## Implementação do céu

A cena continua usando volumes de nuvem em posições 3D e um céu procedural, sem panorama. A revisão altera a composição, o campo de densidade, a leitura de luz e o degradê. Os bancos compartilham dois campos 3D de cúmulos e um terceiro de filamentos altos; existem variações de escala, orientação e posição. O raymarch usa 48 amostras, com saída antecipada quando opaco. O céu distante é composto a 75% da resolução por eixo; o restante da cena mantém a resolução original. Luz ambiente/reflexos continuam derivados da cena do céu e o escurecimento na entrada do portfólio continua integrado.

## Evidência

[Antes](../implementation/before-sky-composition.png) · [Depois, mesa](../implementation/desktop.png) · [Depois, atrás](../implementation/rear.png)

As capturas dos jogos são referências de estudo. Nenhuma imagem ou recurso dos jogos foi colocado no site.

## Validação

Build de produção/TypeScript, ESLint do componente e verificação de whitespace passaram. Os sete cenários de navegador passaram, incluindo volta completa, entrada/escurecimento, ausência de panoramas, falha de recursos opcionais, mobile e movimento reduzido. Capturas de produção nas três larguras e vista traseira sem erros de página ou console. A [comparação interativa](sky-comparison.html) também foi aberta no navegador e o controle foi exercitado pelo teclado.

A [medição local](../implementation/frame-profile.json), em 1440×900 na RTX 3050 laptop, registrou 41,70 FPS na mesa e 39,27 FPS atrás (180 frames aquecidos por vista). Não é um benchmark controlado nem prova de ganho de desempenho; a meta de 60 FPS permanece aberta. Os três campos de nuvem somam 11,25 MiB de dados RGBA antes dos demais recursos do renderizador.
