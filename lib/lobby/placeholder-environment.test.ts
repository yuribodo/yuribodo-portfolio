import assert from 'node:assert/strict';
import test from 'node:test';
import { Color, Texture, type Scene, type Vector3, type WebGLRenderTarget } from 'three';
import {
  createPlaceholderEnvironment,
  ENVIRONMENT_PMREM,
  PLACEHOLDER_ENVIRONMENT,
  releasePlaceholderEnvironment,
  renderEnvironment,
} from './placeholder-environment';

interface Call {
  scene: Scene;
  args: [number, number, number, { size?: number; position?: Vector3 }];
}

function fakeGenerator() {
  const calls: Call[] = [];
  const targets: { texture: Texture; disposed: number; dispose: () => void }[] = [];
  return {
    calls,
    targets,
    fromScene(scene: Scene, ...args: Call['args']) {
      calls.push({ scene, args });
      const target = { texture: new Texture(), disposed: 0, dispose() { this.disposed++; } };
      targets.push(target);
      return target as unknown as WebGLRenderTarget;
    },
  };
}

test('ships enabled', () => {
  assert.equal(PLACEHOLDER_ENVIRONMENT, true);
});

test('the sky and the placeholder are rendered with identical PMREM parameters', () => {
  const generator = fakeGenerator();
  const sky = { name: 'sky' } as unknown as Scene;
  renderEnvironment(generator, sky);
  createPlaceholderEnvironment(generator);
  const [skyCall, placeholderCall] = generator.calls;
  assert.equal(skyCall.scene, sky);
  assert.deepEqual(placeholderCall.args.slice(0, 3), skyCall.args.slice(0, 3));
  assert.deepEqual(skyCall.args.slice(0, 3), [ENVIRONMENT_PMREM.sigma, ENVIRONMENT_PMREM.near, ENVIRONMENT_PMREM.far]);
  assert.equal(placeholderCall.args[3].size, skyCall.args[3].size);
  assert.equal(skyCall.args[3].size, ENVIRONMENT_PMREM.size);
  assert.deepEqual(placeholderCall.args[3].position?.toArray(), skyCall.args[3].position?.toArray());
});

test('the placeholder renders a black, empty scene', () => {
  const generator = fakeGenerator();
  createPlaceholderEnvironment(generator);
  const { scene } = generator.calls[0];
  assert.equal(scene.children.length, 0);
  assert.ok(scene.background instanceof Color);
  assert.equal((scene.background as Color).getHex(), 0x000000);
});

test('releasing disposes a placeholder once and ignores other textures', () => {
  const generator = fakeGenerator();
  const placeholder = createPlaceholderEnvironment(generator);
  assert.equal(releasePlaceholderEnvironment(new Texture()), false);
  assert.equal(releasePlaceholderEnvironment(null), false);
  assert.equal(releasePlaceholderEnvironment(placeholder.texture), true);
  placeholder.dispose();
  assert.equal(generator.targets[0].disposed, 1);
});

test('the sky texture is never released as a placeholder', () => {
  const generator = fakeGenerator();
  const sky = renderEnvironment(generator, {} as Scene);
  assert.equal(releasePlaceholderEnvironment(sky.texture), false);
  assert.equal(generator.targets[0].disposed, 0);
});
