# Beyblade Metal (Pegasus) na mesa da lobby — Design

**Data:** 2026-07-11
**Status:** Aprovado (aguardando sourcing do modelo)

## Objetivo

Adicionar um Beyblade da geração **Metal** — Storm/Cosmic Pegasus — à cena 3D
da lobby (`components/lobby/desk-scene.tsx`). Ao clicar, o pião dá um "rip" e
gira com **física giroscópica realista** (precessão + wobble crescente até
tombar). É uma nova referência de cultura gamer/anime na mesa, no mesmo espírito
das figures (Naruto, Pokémon, Drago) e dos decks (Pokémon, Yu-Gi-Oh).

Sem estourar (burst), sem lançador ripcord. **Tracer bullet:** um bey só, focado
em cravar a física, antes de qualquer expansão (L-Drago etc.).

## Decisões de design (do brainstorm)

| Decisão | Escolha |
|---|---|
| Franquia | Beyblade (não Bakugan — correção do usuário) |
| Geração | **Metal** (Pegasus/L-Drago era, metálico pesado) |
| Gimmick | **Só girar** com precessão/wobble realista e desaceleração |
| Quantidade | **1** — Storm/Cosmic Pegasus (herói azul) |
| Posição | Frente-direita da mesa, `~[0.38, 0, 0.0]` |
| Re-clique durante o giro | **Relançar (boost de volta ao máximo)** |
| Fonte do modelo | GLB livre caçado no Sketchfab (usuário escolhe entre candidatos) |

## Sistema de coordenadas da mesa (referência)

Origem no centro da mesa, topo em `y=0`. `+x`=direita, `+z`=frente (câmera),
`-z`=fundo. Largura útil ~`x: -0.8..+0.8`.

```
              FUNDO (-z)
 [macbook]   [monitor]   [Minato Seismi Drago]
   [DS]      [poke][yugioh]
 [keyboard]     [mouse]      [xbox]   ◉ Pegasus ~[0.38,0,0.0]
              FRENTE (+z, câmera)
```

O ponto escolhido tem folga (~15cm de raio) pra o pião precessar/vaguear sem
atravessar o mouse, o xbox ou as figures.

## Sourcing do modelo (primeiro passo, maior risco)

1. Abrir Sketchfab no navegador, filtrar por **downloadable + licença livre**
   (CC-BY / CC0), buscar "Storm Pegasus" / "Cosmic Pegasus" / "Beyblade metal".
2. Trazer 2–4 candidatos ao usuário (thumbnail, licença, poly count). **Usuário
   escolhe.**
3. Baixar `.glb`, comprimir com o script existente do repo, salvar em
   `public/lobby/models/beyblade-pegasus.glb`.

**Risco:** modelo Metal Pegasus livre e bom pode não existir. Planos B (confirmar
com o usuário antes de tratar modelo ruim): (a) beyblade metal genérico livre,
(b) usuário fornece o modelo, (c) modelo procedural simplificado.

**Atualização (execução):** o risco se materializou. O primeiro pick ("Storm
Pegasus 105 RF", uid `2093ae37…`, 762k tris / 63MB, export CAD) resistiu à
decimação automática — topologia estilhaçada, o simplificador meshopt não
colapsava (só ~2% de redução em qualquer ratio). Trocado por um modelo
game-ready: **"Storm Pegasus" por RECZ P3D**, uid `70e9b69eef4e4d529d69acce7073c2d8`,
**8.493 tris / 0.44 MB / 0 texturas**, CC-BY — cabe direto no budget sem
decimação.

## Arquitetura

Espelha o padrão de `components/lobby/objects/anime-figures.tsx`.

### Novo componente: `components/lobby/objects/beyblade.tsx`

Parametrizado por config pra facilitar adicionar mais beys depois:

```ts
interface BeybladeConfig {
  id: string;              // "pegasus"
  modelPath: string;       // LOBBY_MODELS.beybladePegasus
  position: [number, number, number];
  targetHeight: number;    // altura final em metros (~0.04–0.05m)
}
```

- **Normalização Box3** reutilizada das figures, MAS com o **tip (ponta
  inferior) no pivô** em vez do centro — o pião gira/precessa em torno do ponto
  de contato, não do centro de massa. Ou seja: offset pra `y=0` = base, e o
  eixo de rotação passa pela ponta.
- Clona materiais por instância (isolamento), reusa emissive de hover.
- Expõe handle imperativo `{ activate() }` pro surrogate de teclado.

### Física do giro (`useFrame`, não GSAP)

Integrador leve com máquina de estados. GSAP é scriptado demais; um integrador
por frame dá o comportamento orgânico "how did they do that".

Estado interno: `omega` (velocidade angular, rad/s), `phase`
(`idle|rip|sleep|decay|topple`), tilt do eixo `theta`, direção de precessão.

1. **idle** — parado; `omega=0`.
2. **rip** (clique) — acelera `omega` até `MAX_OMEGA` num tempo curto; dispara
   cue de áudio de lançamento.
3. **sleep** — gira em `MAX_OMEGA`, eixo quase vertical (`theta≈0`), leve
   shimmer.
4. **decay** — `omega` cai por atrito (`omega -= FRICTION * delta`). Conforme
   `omega` diminui, `theta` (inclinação) **cresce** e a **taxa de precessão**
   aumenta (giroscópio real: precessão ∝ 1/omega). Eixo traça um cone que
   alarga. Leve *wander* posicional em xz, escalado por `omega`.
5. **topple** — abaixo de um `omega` mínimo, wobbla forte, tomba e assenta em
   repouso; volta pra `idle`.

Frame-rate independente (usa `delta`), igual ao lerp da `camera-rig.tsx`.

**Re-clique durante `sleep`/`decay`:** re-boost `omega` de volta ao máximo
(relançar), reseta `theta`.

**`prefers-reduced-motion`:** clique faz um giro suave e curto (fade de rotação
por GSAP), sem wobble/topple violento.

## Interação, áudio e acessibilidade

- **Hover:** lift sutil + emissive rim (padrão das figures).
- **Cursor:** `pointer` no hover.
- **Surrogate de teclado:** botão sr-only em `desk-scene.tsx` — "Spin Pegasus
  beyblade" — chama `beybladeRef.current?.activate()`. Tab em ordem de
  scene-graph, Enter/Space dispara.
- **Pulse de descoberta:** registra `id` no `usePulseTarget` pra participar do
  first-pointermove sweep.
- **Áudio:** cue novo no controller de áudio da lobby — zing de lançamento
  metálico + whir contínuo cujo **pitch abaixa** conforme `omega` decai (ligar o
  playbackRate/detune ao `omega`, ou pelo menos um whir que faz fade-out no
  decay). Segue o padrão dos cues existentes (`figure-spin`, `xbox-rumble`).

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `lib/lobby/assets.ts` | `beybladePegasus` no manifesto + preload |
| `components/lobby/objects/beyblade.tsx` | **novo** — componente + física |
| `components/lobby/desk-scene.tsx` | render, ref, surrogate de teclado |
| controller/hook de áudio da lobby | cue novo de beyblade |
| `public/lobby/models/beyblade-pegasus.glb` | **novo** asset (comprimido) |

## Fora de escopo (YAGNI)

- Burst / estourar em camadas.
- Lançador ripcord.
- Beystadium / bowl.
- Múltiplos beys (L-Drago etc.) — estrutura fica pronta, mas não implementa
  agora.
- Marca de arranhão/scuff onde gira.

## Critérios de sucesso

- [ ] Pegasus aparece na frente-direita da mesa, escalado e assentado na ponta.
- [ ] Clique → giro rápido que desacelera com precessão e wobble crescentes até
      tombar, tudo em ~60fps.
- [ ] Re-clique relança.
- [ ] Hover dá lift + emissive; cursor vira pointer.
- [ ] Surrogate de teclado gira o bey via Enter/Space.
- [ ] Cue de áudio de lançamento + whir que decai.
- [ ] `prefers-reduced-motion` respeitado (giro suave, sem wobble violento).
- [ ] Sem `any`, sem warning de ESLint, sem regressão de perf na lobby.
