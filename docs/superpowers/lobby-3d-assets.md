# Lobby — 3D Asset Registry

This is the source of truth for every 3D model used in **"The Desk"** lobby. Each object has a **primary candidate** (download this first) and **alternatives** to fall back to if the primary has problems (bad topology, weird UVs, license issues, etc).

When implementing an issue, verify the model **before downloading at scale**:

1. Preview on Sketchfab/source — does it have separable sub-meshes (e.g., screen vs body for the monitor)?
2. Inspect topology — is the polycount reasonable for our 60fps target?
3. Check materials — does it have PBR textures or just a flat color?
4. Confirm license — anything other than CC0 or "free for commercial" requires attribution; add to `CREDITS.md`.

If primary fails: try alternative 1, then 2. If all alternatives are bad, comment on the issue and we'll find a fresh one.

---

## Hero objects

### Monitor (gaming, 27")
**Issue**: [#7](https://github.com/yuribodo/yuribodo-portfolio/issues/7)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Monitor — Blender / GLB / FBX | [Sketchfab — Juan111](https://sketchfab.com/3d-models/monitor-blender-glb-fbx-c378c509e8c24188a291be19ca284006) | Free | Clean topology, real-world scale, native GLB |
| 🥈 | PC Monitor 27 inch | [Sketchfab — Annelida](https://sketchfab.com/3d-models/pc-monitor-27-inch-06fb18eec19245d4811c4c3c8c7ea567) | Free | Huawei MateView style, **separate screen material** (huge plus for emissive boot screen) |
| 🥉 | PC MONITOR HP 27 INCH | [Sketchfab Store — a.ariaszorrilla](https://sketchfab.com/3d-models/pc-monitor-hp-27-inch-461e3d9268ca45ac8e70dd1bac90051f) | Paid | Premium PBR baked textures if free options look weak |

**Critical requirement**: the screen mesh MUST be separable from the body — we apply an emissive material to it for the boot screen + transition target. If primary doesn't have it, swap to Annelida (which explicitly lists separate screen material).

---

### Razer BlackWidow keyboard
**Issue**: [#8](https://github.com/yuribodo/yuribodo-portfolio/issues/8)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | RAZER BlackWidow Chroma | [Sketchfab — Mieshu](https://sketchfab.com/3d-models/razer-blackwidow-chroma-c4c42707816b40f2b5f5fe1bae89dfb5) | Free | **Actual BlackWidow Chroma**, what we want |
| 🥈 | Razer Keyboard | [Sketchfab — Iman.Cruz](https://sketchfab.com/3d-models/razer-keyboard-3f406d119ad54a7f8cdb3adf1b3ff1c5) | Free | Generic Razer, can pass for BlackWidow if primary has bad UVs |
| 🥉 | Razer BlackWidow TE Chroma | [3DModels.org](https://3dmodels.org/3d-models/razer-blackwidow-tournament-edition-chroma/) | Paid | Premium fallback, multiple formats |

**Critical requirement**: per-key UV islands (or per-key mesh) for the RGB wave animation. If keys are baked into a single texture without UV separation, the wave effect needs to be fragment-shader driven via UV.x position — still workable but more code.

---

### Razer mouse (DeathAdder)
**Issue**: [#8](https://github.com/yuribodo/yuribodo-portfolio/issues/8)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Mouse - Razer DeathAdder | [Sketchfab — gimora](https://sketchfab.com/3d-models/mouse-razer-deathadder-783913c7b9df441ab99ec666eee4e052) | Free | Free, named exactly DeathAdder |
| 🥈 | Razer Mouse | [Sketchfab — Fred Drabble](https://sketchfab.com/3d-models/razer-mouse-9f0a3283cbca4454bf04c8d43494247a) | Free | Low poly, 3dsMAX + Substance Painter texture |

**Critical requirement**: emissive zones identified for the scroll wheel and side logo so RGB cycle animation can target them.

---

### Mousepad
**Issue**: [#8](https://github.com/yuribodo/yuribodo-portfolio/issues/8)

No external model — built as a **plane** in code with a custom texture (no brand, generic black matte cloth with subtle stitched edge).

- Geometry: `<planeGeometry args={[0.35, 0.30]} />`
- Texture: stitched-edge mousepad. Source: render in Blender or find a CC0 fabric texture on Polyhaven (`https://polyhaven.com/textures/cloth`) and add edge detail in Figma/Photoshop.

---

### MacBook
**Issue**: [#9](https://github.com/yuribodo/yuribodo-portfolio/issues/9)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | MacBook Pro Closed | [Sketchfab — NoXiou5](https://sketchfab.com/3d-models/macbook-pro-closed-d04673abef734de880de4f9842126b0d) | Free | **Already in closed state** — saves us from animating a static closed pose |
| 🥈 | Macbook Pro M1 - GLB | [Sketchfab — RedStripes](https://sketchfab.com/3d-models/macbook-pro-m1-glb-192d15826c8b4ea5a17511c33fc21b22) | Free | M1 specifically, native GLB |
| 🥉 | Macbook Pro 13 inch 2020 | [Sketchfab — timblewee](https://sketchfab.com/3d-models/macbook-pro-13-inch-2020-efab224280fd4c3993c808107f7c0b38) | Free | Older but well-modeled |

**Critical requirement**: lid mesh must be separable from base so we can animate the lid opening (hinge rotation). If primary has them fused, fall back to alternative or split in Blender.

---

### Nintendo DS Lite
**Issue**: [#11](https://github.com/yuribodo/yuribodo-portfolio/issues/11)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Nintendo DS Lite | [Sketchfab — zombitt](https://sketchfab.com/3d-models/nintendo-ds-lite-b13d2c9ac9404958b8358f9af871f2dc) | Free | **Blender source + PBR 4K materials** — confirmed in spec |
| 🥈 | Nintendo Ds | [Sketchfab — WillBourke](https://sketchfab.com/3d-models/nintendo-ds-17bb501614e64d6cb7a92e39f5a71e83) | Free | Generic DS, simpler |

**Critical requirement**: upper + lower halves separable for clamshell hinge animation. Primary has Blender source so we can fix if needed.

---

### Xbox Series X controller
**Issue**: [#12](https://github.com/yuribodo/yuribodo-portfolio/issues/12)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Xbox Controller-Black | [Sketchfab — SomeRandomGirl°](https://sketchfab.com/3d-models/xbox-controller-black-755a3876d0284b629a8e9de89facd1b5) | Free | Black variant, ready to use |
| 🥈 | XBOX SERIES X CONTROLLER | [Sketchfab — gregorymora](https://sketchfab.com/3d-models/xbox-series-x-controller-0573fe6e27ec4e26a8849f5c3bc0df0f) | Free | More accurate Series X shape |
| 🥉 | Xbox Series X Controller PBR | [Superhive (Blender Market)](https://superhivemarket.com/products/xbox-series-x-controller-pbr-3d-model) | Paid | If free options have weak materials |

**Critical requirement**: Xbox home button, A/B/X/Y face buttons as separate meshes for individual emissive animations.

---

### Pokémon deck
**Issue**: [#13](https://github.com/yuribodo/yuribodo-portfolio/issues/13)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Pokemon Card 3D | [Sketchfab — Johana-PS](https://sketchfab.com/3d-models/pokemon-card-3d-bf8b809b801248e7a316d4ad7727345a) | Free | Holographic texture pre-applied — perfect for hero card |
| 🥈 | POKEMON CARDS 7/9 | [Sketchfab — tobyporter](https://sketchfab.com/3d-models/pokemon-cards-79-cedffde11c0045aca5d267a57ca6a2a1) | Free | Multiple cards |
| 🥉 | Booster Pack (TCG) | [Sketchfab — Hasan Ajami](https://sketchfab.com/3d-models/booster-pack-tcg-pack-3b9affa6b3d647fdb35487ee7bc34525) | Free | Booster pack alternative if cards-only doesn't fit composition |

**Critical requirement**: card edges should be clean (no Z-fighting on stack). Top 3 cards as separate meshes; rest as a single block geometry.

**Texture choice for hero card**: Charizard (classic base set). Source the front image from official scans, NOT generated. Apply as `albedoMap`.

---

### Yu-Gi-Oh deck
**Issue**: [#13](https://github.com/yuribodo/yuribodo-portfolio/issues/13)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Trading Card Pack (generic) | [Sketchfab — Mhew2 / goonmize1](https://sketchfab.com/3d-models/trading-card-pack-26d1a87e47814d0ea3a710d169e3a671) | Free | **Designed for re-texturing** — author lists Pokémon, Magic, YGO as use cases |

**Critical requirement**: re-texture top card and card back with Yu-Gi-Oh art. Hero card: **Dark Magician (Mago Negro)**. Source from official YGO assets — Konami's TCG product images.

---

### Anime figures

#### Minato Namikaze (Naruto)
**Issue**: [#14](https://github.com/yuribodo/yuribodo-portfolio/issues/14)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | FreeFire Minato Namikaze | [Sketchfab — 3DJagat](https://sketchfab.com/3d-models/freefire-new-3d-character-minato-namikaze-d7a786ae01074e6798633a8d62b3c66c) | Free | Full character |
| 🥈 | Minato Namikaze's Bust | [Sketchfab — FacFox](https://sketchfab.com/3d-models/minato-namikaze-039s-bust-eb1553ec66504ec4b42288199ccbc820) | Free | Bust only — works if we want them at desk-figure scale |

**Tip**: a bust scales well for desk figures (real shelf statues are often busts). Try alternative 1 first if visual scale matches better.

---

#### Seismitoad (Pokémon)
**Issue**: [#14](https://github.com/yuribodo/yuribodo-portfolio/issues/14)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Seismitoad | [Sketchfab — nguyenlouis32](https://sketchfab.com/3d-models/seismitoad-12a0d0539b984262842b10e093057cbe) | Free | Direct match, exactly what we want |
| 🥈 | (Meshy Pokémon search) | [Meshy — Pokémon tag](https://www.meshy.ai/tags/pokemon) | CC0 | 276+ models — search Seismitoad there as fallback |

---

#### Lelouch Lamperouge (Code Geass)
**Issue**: [#14](https://github.com/yuribodo/yuribodo-portfolio/issues/14)

| # | Model | Source | License | Notes |
|---|---|---|---|---|
| 🥇 | Lelouch from Code Geass | [Sketchfab — squill](https://sketchfab.com/3d-models/lelouch-from-code-geass-0fc3e980eb0944569152b510949dfbe0) | Free | Direct character, well-modeled |
| 🥈 | (Cults3D Lelouch tag) | [Cults3D — Lelouch](https://cults3d.com/en/tags/lelouch) | Free STL (convert to GLB) | 27 free models — STL format, would need Blender conversion |

---

## Generic asset sources (search hubs)

If a primary + alternatives all fail, broaden the search to these hubs:

- [Sketchfab](https://sketchfab.com/) — main source, native GLB downloads, filter by license
- [Meshy.ai](https://www.meshy.ai/) — CC0 models, easier licensing
- [CGTrader](https://www.cgtrader.com/3d-models) — premium + free options, often higher quality
- [Polyhaven](https://polyhaven.com/) — CC0 textures + HDRis (use for materials, lighting)
- [Free3D](https://free3d.com/) — varied, license per model
- [TurboSquid](https://www.turbosquid.com/) — premium, last resort

---

## Pipeline reminder (compress before commit)

Every GLB committed to `public/lobby/models/` should be processed through:

```bash
# Install once
pnpm dlx @gltf-transform/cli -V

# Compress geometry (Draco) + textures (KTX2) — typical 60-80% size reduction
gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --simplify 0.5
```

Target: every individual GLB ≤ 1.5MB after compression. Bundle target: 8MB total (per issue [#16](https://github.com/yuribodo/yuribodo-portfolio/issues/16)).

---

## Attribution

For any model that requires attribution (anything other than CC0), add a line to `CREDITS.md` at repo root:

```
- "Razer BlackWidow Chroma" by Mieshu — Sketchfab, CC BY 4.0
```

Build attribution into the lobby's `aria-` mirror DOM or in a small "credits" footer link if licenses require visible attribution.
