# Vista principal da mesa — 13 de setembro de 2026

Registro histórico: a alteração da mesa foi rejeitada pelo usuário e revertida na [correção seguinte](depth-correction.md).

A vista anterior tinha uma prateleira alta cruzando a paisagem, um primeiro plano amplo de pedra e monumentos isolados acima de colinas semelhantes. Esta passagem trabalha o enquadramento inicial contra o [conceito aprovado](../concepts/05-skybound-at-the-desk.png).

[Comparador antes/depois, referência e vídeo](main-vista.html) · [Print atual](../implementation/before-depth-correction.png)

## O que mudou

- **Mesa e enquadramento:** a geometria privada da prateleira foi transformada em apoio baixo e recuada; os colecionáveis acompanham essa superfície. O corpo, a área de escrita e os objetos interativos continuam presentes. As constantes compartilhadas da câmera mantêm a transição de entrada e o retorno alinhados com a vista inicial. A adaptação do modelo CC BY está indicada nos créditos.
- **Primeiro plano:** muretas frontais mais baixas e canteiros de pedra com samambaias e arbustos enquadram o monitor. Plantas e alvenaria compartilham as posições dos canteiros. O piso aprovado conserva seu material.
- **Terreno e água:** o rio frontal desce 25 unidades adicionais; a transição é suave e o vale traseiro mantém sua elevação. Terraços rochosos e duas quedas em degraus seguem um perfil compartilhado com o terreno. Água, margens, plantas, pontes e construções usam a mesma função de altitude. A malha intermediária ganhou resolução para acomodar essas transições.
- **Escala da paisagem:** a cidadela foi afastada, ampliada e elevada, com casas e jardins em suas plataformas. Ilhas intermediárias usam uma casca contínua, com bordas irregulares, saliências, estratos e vegetação. O domínio do xadrez substitui a base retangular anterior por essa formação rochosa, com jardim e quedas laterais. As montanhas receberam picos e selas em camadas, sem ocupar a silhueta principal da cidadela.
- **Ocupação do vale:** ruas mais extensas, fachadas adicionais, pequenas propriedades e áreas cultivadas com divisões e sulcos no material do solo. Florestas deixam livres as áreas cultivadas. Os moinhos, pássaros, fumaça e vento da passagem anterior continuam ativos.
- **Céu e luz:** distribuição de nuvens com mais variação de escala, azul superior mais profundo e quatro volumes próximos às ilhas para sobreposição em profundidade. Névoa e materiais arquitetônicos foram ajustados para separar planos e aproximar a paleta dos diferentes modelos.

Os modelos de vila e vegetação já estavam disponíveis e creditados como CC0. Não há novo download, dependência ou imagem de paisagem no runtime. As novas cascas de ilhas, perfis de água e padrões de cultivo são procedurais.

## Custo do céu

A resolução da atmosfera distante continua em 75% por eixo, com até 48 amostras por raio. Quando a câmera está parada, sua textura renderizada pode ser reutilizada entre atualizações de 12 Hz: o deslocamento distante das nuvens é menor que um pixel nesse intervalo. Mudanças de câmera, projeção, tamanho ou intensidade da luz invalidam o resultado imediatamente. As nuvens próximas continuam desenhadas em cada frame com profundidade real. Isso evita repetir o raymarch inteiro durante a permanência à mesa; não limita a câmera a 12 FPS.

## Validação

- TypeScript, ESLint dos componentes alterados e build de produção aprovados.
- 14 testes unitários: incluem continuidade do terreno, rio submerso, transição de altitude e desembocadura dos afluentes.
- 7 cenários Playwright passaram em Chromium com GPU: objetos por teclado, clique na malha do monitor, giro/retorno, entrada pelo vale, carregamento/skip, ausência de assets, mobile e movimento reduzido.
- Capturas de produção em 1440×900, 1280×720, 1920×1080 e vista traseira inspecionadas, sem erros de página ou console.
- Vídeo de 28 segundos (1440×900, 8,5 MB), com quadros da mesa, vale traseiro e retorno inspecionados; sem erros de página ou console. Comparador HTML verificado: imagens carregadas e controle de antes/depois funcionando.

## Limites visuais

O resultado amplia a vista e organiza suas escalas, mas ainda não reproduz o detalhamento pictórico do conceito ou a variedade de um cenário AAA. A cidadela continua com repetição entre níveis; as ilhas são rochas estilizadas e os campos são tratados no material. A vista inicial só revela parte das quedas e do povoado, enquanto o giro permite ver outras partes. Não há navegação a pé, interiores ou população de NPCs.

## Medição local

Na RTX 3050 Laptop, Chromium nativo, 1440×900 e DPR 1, a amostra final de 180 frames por vista registrou **36,5 FPS à mesa e 38,6 FPS atrás**, com p95 de 33,4 ms em ambas. O perfil antes desta passagem registrava 41,4 / 42,5 FPS, em outra execução. A cena nova sem reutilização do céu registrou 36,1 / 38,3 FPS: a reutilização reduziu submissões de desenho, mas não produziu ganho relevante de FPS nessa amostra. O custo restante não está restrito ao céu.

O perfil registra cadência de `requestAnimationFrame` com câmera estabilizada, incluindo submissões das sombras. Não mede VRAM, carregamento frio, tempo isolado da GPU ou desempenho durante todo o giro; aplicações do desktop podem interferir. O alvo de 60 FPS não foi atingido nessa máquina. [Dados atuais](../implementation/before-depth-correction-profile.json) · [Registro anterior](../implementation/before-main-vista-profile.json).
