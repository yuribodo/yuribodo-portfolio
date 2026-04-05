type SoundName = "boot" | "spawn" | "whoosh" | "card" | "achievement";

interface AudioManagerState {
  isMuted: boolean;
  audioContext: AudioContext | null;
  soundtrack: HTMLAudioElement | null;
  buffers: Map<SoundName, AudioBuffer>;
}

const state: AudioManagerState = {
  isMuted: typeof window !== "undefined"
    ? localStorage.getItem("audio-muted") === "true"
    : false,
  audioContext: null,
  soundtrack: null,
  buffers: new Map(),
};

function getContext(): AudioContext {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }
  return state.audioContext;
}

export async function loadSFX(name: SoundName, url: string): Promise<void> {
  const ctx = getContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  state.buffers.set(name, audioBuffer);
}

export function playSFX(name: SoundName): void {
  if (state.isMuted) return;
  const buffer = state.buffers.get(name);
  if (!buffer) return;

  const ctx = getContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = 0.3;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function startSoundtrack(url: string): void {
  if (state.soundtrack) return;

  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0;
  state.soundtrack = audio;

  if (!state.isMuted) {
    audio.play().catch(() => {
      // Autoplay blocked — will retry on user gesture
    });
    fadeSoundtrackTo(0.2, 3000);
  }
}

function fadeSoundtrackTo(target: number, durationMs: number): void {
  if (!state.soundtrack) return;
  const audio = state.soundtrack;
  const start = audio.volume;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    audio.volume = start + (target - start) * progress;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function toggleMute(): boolean {
  state.isMuted = !state.isMuted;
  localStorage.setItem("audio-muted", String(state.isMuted));

  if (state.soundtrack) {
    if (state.isMuted) {
      fadeSoundtrackTo(0, 500);
    } else {
      state.soundtrack.play().catch(() => {});
      fadeSoundtrackTo(0.2, 500);
    }
  }

  return state.isMuted;
}

export function getIsMuted(): boolean {
  return state.isMuted;
}

export function resumeOnGesture(): void {
  const ctx = state.audioContext;
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  if (state.soundtrack && state.soundtrack.paused && !state.isMuted) {
    state.soundtrack.play().catch(() => {});
    fadeSoundtrackTo(0.2, 1000);
  }
}
