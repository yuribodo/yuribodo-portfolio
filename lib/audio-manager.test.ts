import assert from "node:assert/strict";
import { test } from "node:test";
import { startSoundtrack } from "./audio-manager";

test("soundtrack fade tolerates a frame timestamp earlier than its start", (t) => {
  const callbacks: FrameRequestCallback[] = [];
  const volumes: number[] = [];
  class AudioStub {
    loop = false;
    private currentVolume = 0;
    get volume() { return this.currentVolume; }
    set volume(value: number) {
      if (value < 0 || value > 1) throw new RangeError("Invalid media volume");
      this.currentVolume = value; volumes.push(value);
    }
    play() { return Promise.resolve(); }
  }
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const originalFrame = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: AudioStub });
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => { callbacks.push(callback); return callbacks.length; } });
  t.mock.method(performance, "now", () => 1000);
  t.after(() => {
    if (originalAudio) Object.defineProperty(globalThis, "Audio", originalAudio); else Reflect.deleteProperty(globalThis, "Audio");
    if (originalFrame) Object.defineProperty(globalThis, "requestAnimationFrame", originalFrame); else Reflect.deleteProperty(globalThis, "requestAnimationFrame");
  });
  startSoundtrack("/test-soundtrack.ogg");
  callbacks.shift()!(999); // Same frame, before performance.now() at scheduling.
  assert.equal(volumes.at(-1), 0);
  callbacks.shift()!(2500);
  assert.equal(volumes.at(-1), .1);
  callbacks.shift()!(4000);
  assert.equal(volumes.at(-1), .2);
  assert.equal(callbacks.length, 0);
});
