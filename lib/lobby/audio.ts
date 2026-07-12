// Lobby audio controller (issue #15). Procedural synthesis only — every cue
// is rendered to an AudioBuffer via OfflineAudioContext at preload, then
// played back through cheap AudioBufferSourceNodes. No asset files, no
// licensing exposure, no webm/mp3 fallback matrix.
//
// Topology:
//
//   per-cue source → cue gain → master gain → ctx.destination
//
// masterGain is the mute lever. Tweened (not snapped) so a mid-bed mute
// doesn't click. ambientGain hangs off masterGain too — when ambientSource
// is running and the user mutes, the bed fades to silence at the master
// level; unmute fades back in. Restarting the bed would seam-pop, so we
// keep the source running and just modulate gain.
//
// Concurrency: each cue keeps a ref to its latest source. play(id) stops
// any in-flight source for that id before starting a new one — rapid clicks
// restart cleanly instead of stacking voices and overloading the master.

export type AudioCueId =
  | "ds-chime"
  | "xbox-rumble"
  | "card-fan"
  | "yugioh-thwack"
  | "figure-spin"
  | "beyblade-launch"
  | "monitor-power"
  | "stinger";

const CUE_VOLUMES: Record<AudioCueId, number> = {
  "ds-chime": 0.5,
  "xbox-rumble": 0.55,
  "card-fan": 0.45,
  "yugioh-thwack": 0.5,
  "figure-spin": 0.35,
  "beyblade-launch": 0.5,
  "monitor-power": 0.5,
  stinger: 0.7,
};

const CUE_DURATIONS_S: Record<AudioCueId, number> = {
  "ds-chime": 0.45,
  "xbox-rumble": 0.65,
  "card-fan": 0.22,
  "yugioh-thwack": 0.35,
  "figure-spin": 0.18,
  "beyblade-launch": 0.5,
  "monitor-power": 0.55,
  stinger: 0.45,
};

const AMBIENT_VOLUME = 0.15;
const AMBIENT_LOOP_S = 8;
const AMBIENT_FADE_S = 1.2;
const MUTE_FADE_S = 0.25;
const SAMPLE_RATE = 44100;

const MUTE_STORAGE_KEY = "lobby-muted";

/** Read the initial mute state from localStorage. Falls back to muted=true
 *  when prefers-reduced-motion is set (users sensitive to motion are often
 *  also sensitive to audio) — but the toggle remains usable to opt in. */
export function readInitialMute(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type AudioContextCtor = typeof AudioContext;
type OfflineAudioContextCtor = typeof OfflineAudioContext;

// Safari < 14 ships these only under the `webkit` prefix on `window`. Cast
// through `unknown` because the prefixed names aren't on the standard Window
// interface — we know at runtime they may exist.
interface WebkitAudioGlobals {
  webkitAudioContext?: AudioContextCtor;
  webkitOfflineAudioContext?: OfflineAudioContextCtor;
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  if (typeof AudioContext !== "undefined") return AudioContext;
  const w = window as unknown as WebkitAudioGlobals;
  return w.webkitAudioContext ?? null;
}

function getOfflineCtor(): OfflineAudioContextCtor | null {
  if (typeof window === "undefined") return null;
  if (typeof OfflineAudioContext !== "undefined") return OfflineAudioContext;
  const w = window as unknown as WebkitAudioGlobals;
  return w.webkitOfflineAudioContext ?? null;
}

async function renderOffline(
  durationS: number,
  build: (ctx: OfflineAudioContext) => void,
): Promise<AudioBuffer | null> {
  const Ctor = getOfflineCtor();
  if (!Ctor) return null;
  const offline = new Ctor({
    numberOfChannels: 2,
    length: Math.ceil(durationS * SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
  });
  build(offline);
  return offline.startRendering();
}

// --- per-cue synthesis ---------------------------------------------------

// Nintendo DS — 8-bit-style rising arpeggio in C major. Square waves through
// a gentle lowpass so the harmonics don't pierce; envelopes hand-shaped so
// each note reads as a separate "bip" rather than a slur. Deliberately NOT
// the DS startup melody (trademark) — generic rising motif.
function buildDsChime(ctx: OfflineAudioContext): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const stagger = 0.08;
  const noteDur = 0.12;

  notes.forEach((freq, i) => {
    const t0 = i * stagger;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4800;
    lp.Q.value = 0.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.28, t0 + 0.008);
    env.gain.linearRampToValueAtTime(0.22, t0 + noteDur * 0.6);
    env.gain.linearRampToValueAtTime(0, t0 + noteDur);

    osc.connect(lp);
    lp.connect(env);
    env.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + noteDur + 0.01);
  });
}

// Xbox — short low rumble + 4 staggered button clicks. Rumble is a 55Hz sine
// with an 18Hz LFO writing into its frequency for the "motor vibrating"
// character; clicks are bandpass-filtered noise bursts at ~2.2kHz with fast
// exponential decay (mechanical button thunk).
function buildXboxRumble(ctx: OfflineAudioContext): void {
  const rumble = ctx.createOscillator();
  rumble.type = "sine";
  rumble.frequency.value = 55;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(rumble.frequency);

  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0, 0);
  rumbleGain.gain.linearRampToValueAtTime(0.4, 0.02);
  rumbleGain.gain.linearRampToValueAtTime(0.32, 0.16);
  rumbleGain.gain.linearRampToValueAtTime(0, 0.24);
  rumble.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumble.start(0);
  rumble.stop(0.26);
  lfo.start(0);
  lfo.stop(0.26);

  for (let i = 0; i < 4; i++) {
    const t = 0.18 + i * 0.1;
    const clickDur = 0.045;
    const buf = ctx.createBuffer(
      1,
      Math.max(1, Math.ceil(clickDur * ctx.sampleRate)),
      ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let j = 0; j < data.length; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (data.length * 0.18));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.value = 0.45;
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(t);
  }
}

// Card flick — highpassed noise burst with fast exponential decay. Reads as
// paper sliding against paper. Used by both decks.
function buildCardFan(ctx: OfflineAudioContext): void {
  const dur = 0.16;
  const buf = ctx.createBuffer(
    1,
    Math.ceil(dur * ctx.sampleRate),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    const env =
      Math.exp(-j / (data.length * 0.22)) * (1 - (j / data.length) * 0.3);
    data[j] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1600;
  const g = ctx.createGain();
  g.gain.value = 0.6;
  src.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  src.start(0);
}

// Yu-Gi-Oh thwack — low-mid thump that supplements card-fan on the Mago
// Negro hero rise. 110Hz sine dropping to 55Hz over 200ms with a quick
// noise transient for the impact.
function buildYugiohThwack(ctx: OfflineAudioContext): void {
  const dur = 0.22;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, 0);
  osc.frequency.exponentialRampToValueAtTime(55, dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.5, 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, dur);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(0);
  osc.stop(dur + 0.01);

  // Brief noise transient at the start for the impact "thwk".
  const tDur = 0.04;
  const buf = ctx.createBuffer(
    1,
    Math.ceil(tDur * ctx.sampleRate),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (data.length * 0.15));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const tg = ctx.createGain();
  tg.gain.value = 0.35;
  src.connect(lp);
  lp.connect(tg);
  tg.connect(ctx.destination);
  src.start(0);
}

// Figure spin — barely-there filtered noise "tk". Brief and subliminal so
// it reads as "subtle plastic" and not "cute squeak".
function buildFigureSpin(ctx: OfflineAudioContext): void {
  const dur = 0.13;
  const buf = ctx.createBuffer(
    1,
    Math.ceil(dur * ctx.sampleRate),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    const env = Math.exp(-j / (data.length * 0.18));
    data[j] = (Math.random() * 2 - 1) * env * 0.55;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.value = 0.4;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(0);
}

// Beyblade rip — a metallic launcher zip: a fast downward pitch sweep (the
// ripcord) layered with bright bandpassed noise (metal-on-metal). Short,
// aggressive, then gone.
function buildBeybladeLaunch(ctx: OfflineAudioContext): void {
  const dur = 0.5;

  // Ripcord sweep: sawtooth 520Hz → 130Hz, quick attack, exponential fall.
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(520, 0);
  osc.frequency.exponentialRampToValueAtTime(130, dur);
  const oscEnv = ctx.createGain();
  oscEnv.gain.setValueAtTime(0, 0);
  oscEnv.gain.linearRampToValueAtTime(0.4, 0.02);
  oscEnv.gain.exponentialRampToValueAtTime(0.001, dur);
  const oscLp = ctx.createBiquadFilter();
  oscLp.type = "lowpass";
  oscLp.frequency.value = 2200;
  osc.connect(oscLp);
  oscLp.connect(oscEnv);
  oscEnv.connect(ctx.destination);
  osc.start(0);
  osc.stop(dur + 0.02);

  // Metal shimmer: bandpassed noise burst that decays fast.
  const buf = ctx.createBuffer(1, Math.ceil(dur * ctx.sampleRate), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    const env = Math.exp(-j / (data.length * 0.25));
    data[j] = (Math.random() * 2 - 1) * env * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.35;
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(0);
}

// Monitor power-on hum — rising sine sweep with a small click transient at
// the start. CRT-style "thock then warm up" rather than a melodic chime.
function buildMonitorPower(ctx: OfflineAudioContext): void {
  const dur = 0.5;
  // Sine sweep 35Hz → 70Hz.
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(35, 0);
  osc.frequency.linearRampToValueAtTime(70, dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.5, 0.18);
  env.gain.linearRampToValueAtTime(0.42, dur - 0.08);
  env.gain.linearRampToValueAtTime(0, dur);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(0);
  osc.stop(dur + 0.02);

  // Higher partial for warmth — sine an octave above, much quieter.
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(70, 0);
  osc2.frequency.linearRampToValueAtTime(140, dur);
  const env2 = ctx.createGain();
  env2.gain.setValueAtTime(0, 0);
  env2.gain.linearRampToValueAtTime(0.12, 0.22);
  env2.gain.linearRampToValueAtTime(0, dur);
  osc2.connect(env2);
  env2.connect(ctx.destination);
  osc2.start(0);
  osc2.stop(dur + 0.02);

  // Click transient — CRT "thock" at t=0.
  const clickDur = 0.025;
  const buf = ctx.createBuffer(
    1,
    Math.ceil(clickDur * ctx.sampleRate),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let j = 0; j < data.length; j++) {
    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (data.length * 0.1));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400;
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.value = 0.4;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(0);
}

// Transition stinger — short bass impact + airy whoosh. Drops the listener
// into the soundtrack handoff at t=2.10s in transition.ts. Volume tuned
// against soundtrack's 0.2 target so the stinger lands as a beat, not a
// blanket.
function buildStinger(ctx: OfflineAudioContext): void {
  const dur = 0.4;
  // Bass impact 130Hz → 35Hz.
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, 0);
  osc.frequency.exponentialRampToValueAtTime(35, dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, 0);
  env.gain.linearRampToValueAtTime(0.7, 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, dur);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(0);
  osc.stop(dur);

  // Airy whoosh — pink-ish filtered noise bursts upward in frequency.
  const noiseBuf = ctx.createBuffer(
    1,
    Math.ceil(dur * ctx.sampleRate),
    ctx.sampleRate,
  );
  const noiseData = noiseBuf.getChannelData(0);
  for (let j = 0; j < noiseData.length; j++) {
    noiseData[j] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(800, 0);
  bp.frequency.linearRampToValueAtTime(4000, dur);
  bp.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, 0);
  ng.gain.linearRampToValueAtTime(0.25, 0.08);
  ng.gain.linearRampToValueAtTime(0, dur);
  src.connect(bp);
  bp.connect(ng);
  ng.connect(ctx.destination);
  src.start(0);
}

const CUE_BUILDERS: Record<AudioCueId, (ctx: OfflineAudioContext) => void> = {
  "ds-chime": buildDsChime,
  "xbox-rumble": buildXboxRumble,
  "card-fan": buildCardFan,
  "yugioh-thwack": buildYugiohThwack,
  "figure-spin": buildFigureSpin,
  "beyblade-launch": buildBeybladeLaunch,
  "monitor-power": buildMonitorPower,
  stinger: buildStinger,
};

// Ambient bed — brown-ish noise base + occasional distant "typing" (filtered
// noise blips spaced at randomised intervals). Volume target is subliminal
// — if a user notices it, it's too loud. Rendered at 8s and looped; the
// brown noise alone is seam-safe (no transient at the boundary), and the
// typing blips are placed clear of the loop join so a tail/head overlap
// isn't audible.
function buildAmbientBed(ctx: OfflineAudioContext, durationS: number): void {
  // Brown noise — integrate white noise.
  const noiseBuf = ctx.createBuffer(
    1,
    Math.ceil(durationS * ctx.sampleRate),
    ctx.sampleRate,
  );
  const noiseData = noiseBuf.getChannelData(0);
  let last = 0;
  for (let j = 0; j < noiseData.length; j++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    noiseData[j] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  const g = ctx.createGain();
  g.gain.value = 0.55;
  src.connect(lp);
  lp.connect(g);
  g.connect(ctx.destination);
  src.start(0);

  // Distant typing. Each keystroke = brief bandpass noise burst at ~3kHz.
  // Cluster of 4–8 keys, then long pause. Position keys in the middle of
  // the loop so the seam at t=0 and t=duration has only ambient noise.
  const seamGuard = 0.6;
  let cursor = seamGuard;
  while (cursor < durationS - seamGuard) {
    const burstCount = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < burstCount; i++) {
      if (cursor > durationS - seamGuard) break;
      const keyDur = 0.025;
      const keyBuf = ctx.createBuffer(
        1,
        Math.ceil(keyDur * ctx.sampleRate),
        ctx.sampleRate,
      );
      const keyData = keyBuf.getChannelData(0);
      for (let j = 0; j < keyData.length; j++) {
        keyData[j] =
          (Math.random() * 2 - 1) * Math.exp(-j / (keyData.length * 0.2));
      }
      const ksrc = ctx.createBufferSource();
      ksrc.buffer = keyBuf;
      const kbp = ctx.createBiquadFilter();
      kbp.type = "bandpass";
      kbp.frequency.value = 2400 + Math.random() * 1200;
      kbp.Q.value = 4;
      const kg = ctx.createGain();
      // Very low — distant typing should sit BENEATH conscious attention.
      kg.gain.value = 0.04 + Math.random() * 0.03;
      ksrc.connect(kbp);
      kbp.connect(kg);
      kg.connect(ctx.destination);
      ksrc.start(cursor);
      cursor += 0.08 + Math.random() * 0.16;
    }
    // Pause between clusters.
    cursor += 1.4 + Math.random() * 2.2;
  }
}

// -------------------------------------------------------------------------

export class LobbyAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<AudioCueId, AudioBuffer>();
  private cueGains = new Map<AudioCueId, GainNode>();
  private activeSources = new Map<AudioCueId, AudioBufferSourceNode>();
  private ambientBuffer: AudioBuffer | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private muted: boolean;
  private preloadPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(initialMuted: boolean) {
    this.muted = initialMuted;
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) return this.ctx;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.masterGain = master;
    return ctx;
  }

  /** Idempotent. Synthesises every cue + the ambient bed in parallel. Safe
   *  to call before the user has gestured — OfflineAudioContext doesn't
   *  require a gesture, only AudioContext output does. */
  preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = (async () => {
      const cueIds = Object.keys(CUE_BUILDERS) as AudioCueId[];
      const cueResults = await Promise.all(
        cueIds.map(async (id) => {
          const buf = await renderOffline(CUE_DURATIONS_S[id], (offline) =>
            CUE_BUILDERS[id](offline),
          );
          return [id, buf] as const;
        }),
      );
      cueResults.forEach(([id, buf]) => {
        if (buf) this.buffers.set(id, buf);
      });
      const ambient = await renderOffline(AMBIENT_LOOP_S, (offline) =>
        buildAmbientBed(offline, AMBIENT_LOOP_S),
      );
      if (ambient) this.ambientBuffer = ambient;
    })();
    return this.preloadPromise;
  }

  /** Fire-and-forget cue playback. Stops any prior source for the same id
   *  so rapid clicks restart cleanly instead of stacking voices. */
  play(id: AudioCueId): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const buf = this.buffers.get(id);
    if (!buf) return;

    // Resume context on every play call — first play may happen on the
    // user's first gesture; subsequent plays are no-ops if already running.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const prior = this.activeSources.get(id);
    if (prior) {
      try {
        prior.stop();
      } catch {
        // Already stopped.
      }
    }

    let gain = this.cueGains.get(id);
    if (!gain) {
      gain = ctx.createGain();
      gain.gain.value = CUE_VOLUMES[id];
      gain.connect(this.masterGain);
      this.cueGains.set(id, gain);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.onended = () => {
      if (this.activeSources.get(id) === src) {
        this.activeSources.delete(id);
      }
    };
    src.start();
    this.activeSources.set(id, src);
  }

  /** Idempotent. Starts the looping ambient bed and fades it in from 0.
   *  Safe to call before preload completes — the start is queued onto the
   *  preload promise so a fast first-pointermove doesn't silently drop the
   *  bed. Also safe to call before the user's first gesture; the
   *  AudioContext is resumed lazily on the first play() once they
   *  interact. */
  startAmbient(): void {
    if (this.disposed) return;
    if (this.ambientSource) return;
    // Safari only accepts ctx.resume() when the call originates inside the
    // synchronous stack of a user gesture. If startAmbient() runs before
    // the preload promise resolves, the actual playback would happen on a
    // later microtask outside that stack and Safari would silently keep
    // the context suspended. Resuming here — synchronously, in whatever
    // gesture handler called us — secures the gesture credit upfront so
    // the deferred startAmbientNow() lands on a running context.
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    if (this.ambientBuffer) {
      this.startAmbientNow();
      return;
    }
    if (!this.preloadPromise) return;
    this.preloadPromise.then(() => {
      if (this.disposed) return;
      if (this.ambientSource) return;
      this.startAmbientNow();
    });
  }

  private startAmbientNow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.ambientBuffer) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const src = ctx.createBufferSource();
    src.buffer = this.ambientBuffer;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.masterGain);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, now + AMBIENT_FADE_S);

    src.start();
    this.ambientSource = src;
    this.ambientGain = gain;
  }

  stopAmbient(): void {
    if (!this.ambientSource || !this.ambientGain || !this.ctx) return;
    const ctx = this.ctx;
    const src = this.ambientSource;
    const gain = this.ambientGain;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + AMBIENT_FADE_S);
    try {
      src.stop(now + AMBIENT_FADE_S + 0.05);
    } catch {
      // Already stopped.
    }
    this.ambientSource = null;
    this.ambientGain = null;
  }

  /** Persists to localStorage. Tweens masterGain so a mid-bed mute doesn't
   *  click — fade rather than snap. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    }
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + MUTE_FADE_S);
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Tears the AudioContext down. Lobby calls this on state === "done" so
   *  no orphan loops bleed into Hero's soundtrack. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Already stopped.
      }
    });
    this.activeSources.clear();
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch {
        // Already stopped.
      }
      this.ambientSource = null;
    }
    this.ambientGain = null;
    this.cueGains.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
  }
}
