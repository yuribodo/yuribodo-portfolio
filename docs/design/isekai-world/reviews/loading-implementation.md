**Carregamento Skybound — implementação e validação, 15/09/2026 (UTC−3)**

A primeira entrada caiu de **9,16 s para 3,67 s**, comparando as medianas de três execuções locais em produção. A mesa e o enquadramento foram preservados. A entrada agora exige também chão próximo, vale, céu, terraço e copas preparados; personagens, vegetação complementar e a resolução final das texturas do terreno chegam depois. O ganho mede o início de uma cena 3D utilizável, não o término de todos os detalhes.

Base: [auditoria da revisão 01ff946](loading-audit.md). Resultados finais: [medições](../implementation/loading-optimized/measurements.json), [waterfall inicial](../implementation/loading-optimized/cold-waterfall.json), [revisita](../implementation/loading-optimized/repeat-waterfall.json) e [20 Mbps](../implementation/loading-optimized/network-20-waterfall.json).

**Plano executado**

1. Retirar cálculos estáticos do caminho do visitante: alturas e máscaras do terreno geradas no build, preservando os geradores originais.
2. Descobrir arquivos essenciais mais cedo e usar URLs por conteúdo com cache persistente.
3. Preparar texturas e shaders antes da primeira exibição, separar a paisagem essencial dos detalhes e pausar trabalho encoberto.
4. Experimentar compressão de texturas para GPU, integrando apenas se o custo total justificar a mudança.
5. Verificar dados, falhas, navegação, aparência e tempos em produção; não usar uma imagem para representar falsamente uma cena 3D pronta.

**O que mudou**

`npm run build` gera 244.322 alturas Float32 e as máscaras originais de trilhas e copas. O arquivo comprimido pesa 905.816 bytes. O navegador ainda constrói buffers e normais, mas não refaz os cálculos de ruído correspondentes. Um teste compara todos os bytes com a geração original. Não há alteração na forma do terreno.

Seis versões de 256×256 das mesmas texturas do chão, aproximadamente 216 kB no total, tornam a paisagem inicial viável em conexões mais lentas. O shader, a geometria e o mapeamento permanecem iguais. Depois da entrada, as texturas originais são baixadas e enviadas à GPU antes da troca. Falha nessa melhoria mantém as texturas leves, sem ocultar o chão. A mesa mantém os assets originais.

Após a checagem de capacidade, o bootstrap antecipa mesa, monitor e dados do terreno sem importar Three. O gerenciador Three e esses preloads usam a mesma URL versionada. O build gera hashes do conteúdo; as respostas versionadas recebem um ano de cache imutável em produção. Arquivos gerados têm também o hash no nome. A revisita medida confirmou 57 respostas de `/lobby/` provenientes do cache em disco e aproximadamente 24 kB transferidos pela página no período observado. Isso foi verificado no servidor local, não em um CDN publicado.

Os grupos ficam ocultos enquanto uma fila compartilhada prepara suas texturas e `compileAsync` prepara seus materiais. A fila prioriza mesa e paisagem essencial, com orçamento de 6 ms **entre** uploads. Uma chamada nativa individual pode exceder esse intervalo; não é uma garantia de frames de 6 ms. Depois de os cinco grupos essenciais estarem prontos, `SceneReady` espera dois callbacks de frame para liberar o lobby. Erros opcionais continuam permitindo o fallback da mesa, e o botão de pular permanece disponível.

Detalhes entram por famílias depois da entrada: criaturas, personagens e vegetação complementar. Suspense e preparação de GPU continuam independentes por grupo. A síntese inicial de áudio foi adiada; vídeos e o fundo WebGL de contato só trabalham quando o portfólio está descoberto e a seção está visível. Mobile e preferência por movimento reduzido continuam evitando os assets do lobby.

Mover a parte estática para o **build** foi mais útil que executá-la novamente no servidor a cada visita. A preparação do contexto, materiais e texturas WebGL ainda acontece na máquina do visitante. Não foi introduzido streaming de vídeo nem renderização remota.

**Resultados finais**

Mesmo ambiente da auditoria: Next 16.1.2 em produção, Chromium com ANGLE/OpenGL na NVIDIA RTX 3050 Laptop, 1440×900, DPR 1. Casos sequenciais sem profiler V8. “Frio” significa contexto HTTP novo; caches de sistema/driver podem estar quentes e outras aplicações podem disputar recursos. Instrumentação também acrescenta algum overhead.

| Caso | Antes | Depois | Observação |
|---|---:|---:|---|
| Primeira visita, mediana de 3 | 9,16 s | **3,67 s** | Redução de 59,9%; novas execuções: 4,07 / 3,67 / 3,24 s |
| Nova página usando cache | 8,87 s | **3,58 s** | Uma execução; preparação da GPU ainda necessária |
| 20 Mbps / 40 ms simulados | 11,11 s | **5,52 s** | Uma execução; redução de 50,3% |
| CPU desacelerada 4× | Não chegou a `idle` em 35 s | **12,32 s** | Uma execução; chegou à cena sem acionar o escape |

O critério novo é mais exigente: além da mesa, espera explicitamente a paisagem essencial. Nenhum desses casos reteve artificialmente os assets do mundo. Todas as seis execuções terminaram em `idle`, sem erros de página ou console.

O payload total observado não diminuiu: o caso frio final transferiu aproximadamente 29,55 MB, contra 28,57 MB antes. Os dados pré-calculados e as texturas iniciais acrescentam bytes, mas retiram processamento e downloads pesados do caminho crítico. A observação encerra cerca de seis segundos após a captura inicial; não representa necessariamente o download completo do mundo, especialmente com rede limitada.

O trabalho posterior ainda provoca pausas: nos três casos frios, a maior tarefa longa após `idle` ficou entre 303 e 328 ms; com CPU 4× chegou a 1.003 ms. Esta rodada melhora a espera inicial, mas não comprova estabilidade de 60 FPS. Próximos candidatos, se necessário, são preparar geometrias/instâncias estáticas adicionais no build e reduzir os materiais/texturas dos maiores modelos com comparação visual específica. As medições WebGL registram tempo de CPU dentro das APIs, não tempo direto de execução da GPU.

**Conferência visual**

Uma versão intermediária revelou casas antes do chão em 20 Mbps. Ela foi descartada. O requisito explícito de paisagem essencial e as texturas iniciais corrigem esse caso; um teste segura o arquivo de alturas e verifica que a cobertura permanece até sua liberação.

[Entrada real, rede local](../implementation/loading-optimized/cold-ready.png) · [Entrada real a 20 Mbps](../implementation/loading-optimized/network-20-ready.png) · [Cena alguns segundos depois](../implementation/loading-optimized/cold-settled.png).

As capturas mostram o mesmo enquadramento. Na entrada, alguns vasos ainda não têm a vegetação complementar e os personagens distantes ainda podem estar carregando. Céu, chão, rio, vilas, montanhas e estrutura próxima já estão visíveis. Não é um poster. A captura posterior documenta o enriquecimento; seu nome `settled` não é uma medição automática de mundo totalmente concluído.

**Experimento KTX2**

O conversor reproduzível está em `scripts/encode-gpu-textures.mjs`. Foi testado com a mesa, preservando dimensões e verificando bytes de geometria, nós e slots de materiais:

| Variante | GLB |
|---|---:|
| Original com WebP | 747.208 bytes |
| KTX2 UASTC + mipmaps | 9.238.332 bytes |
| KTX2 ETC1S + mipmaps | 1.888.796 bytes |

Não foi integrado: esses candidatos aumentam o download crítico em 12,4× e 2,5×, além de exigir transcoder. O experimento parou nessa avaliação de bytes; **não houve comparação visual ou de GPU das variantes KTX2**. Isso não descarta KTX2 para modelos maiores ou outros parâmetros. [Evidência](../implementation/loading-optimized/ktx-evaluation.json).

**Validação e reprodução**

- Build de produção, TypeScript e ESLint dos arquivos alterados passaram.
- 39 testes unitários passaram, incluindo equivalência do terreno, hashes dos assets e priorização/cancelamento da fila.
- 12 testes de navegador com GPU nativa passaram: navegação pelo monitor/teclado, câmera fixa, interações da mesa, pular durante loading, transição direta, falhas opcionais, terreno atrasado, mobile, movimento reduzido, ausência de backdrops planos e pausa dos efeitos encobertos.
- Capturas da entrada local, entrada a 20 Mbps e cena posterior foram inspecionadas.

```bash
npm run build
npm run start -- --port 3004
# Em outro terminal; use o caminho do Chromium disponível no ambiente.
AUDIT_URL=http://localhost:3004 \
AUDIT_OUTPUT=/tmp/loading-shipped \
AUDIT_CASES=cold,repeat,cold-2,cold-3,network-20,cpu-4 \
AUDIT_SCREENSHOTS=1 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome \
node scripts/audit-lobby-loading.mjs
```

Os números acima são medições locais, não p75/p95 de visitantes reais. Não houve alteração da infraestrutura publicada nem nova medição de FPS sustentado nesta rodada.
