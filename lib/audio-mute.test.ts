import assert from "node:assert/strict";
import { test } from "node:test";

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
  },
});

test("toggleMute notifies subscribers until they unsubscribe", async () => {
  const { getIsMuted, subscribeMuted, toggleMute } = await import("./audio-manager");
  let calls = 0;
  const unsubscribe = subscribeMuted(() => { calls++; });

  assert.equal(getIsMuted(), false);
  assert.equal(toggleMute(), true);
  assert.equal(calls, 1);
  assert.equal(getIsMuted(), true);
  assert.equal(storage.get("audio-muted"), "true");

  unsubscribe();
  toggleMute();
  assert.equal(calls, 1);
});
