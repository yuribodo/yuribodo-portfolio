import assert from 'node:assert/strict';
import test from 'node:test';
import { Color, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial } from 'three';
import { arrivalFadeMode } from './arrival-fade';

test('materials that read the arrival uniform are never cloned', () => {
  const patched = new MeshStandardMaterial();
  patched.onBeforeCompile = () => {};
  assert.equal(arrivalFadeMode(patched, true), 'shader');
});

test('stock materials with plain userData fall back to a clone', () => {
  const stock = new MeshStandardMaterial();
  stock.userData.worldEmissive = 0.18;
  assert.equal(arrivalFadeMode(stock, false), 'clone');
});

test('a clone would drop these, so they appear at once', () => {
  const patched = new MeshStandardMaterial();
  patched.onBeforeCompile = () => {};
  const keyed = new MeshStandardMaterial();
  keyed.customProgramCacheKey = () => 'x';
  const withColor = new MeshBasicMaterial();
  withColor.userData.worldBaseColor = new Color('#b5e3eb');
  const withHook = new MeshStandardMaterial();
  withHook.userData.setWorldDimmer = () => {};
  for (const material of [patched, keyed, withColor, withHook, new ShaderMaterial()]) {
    assert.equal(arrivalFadeMode(material, false), 'skip');
  }
});

test('Material.clone() really drops what the skip rules protect', () => {
  const source = new MeshStandardMaterial();
  source.onBeforeCompile = () => {};
  source.customProgramCacheKey = () => 'patched';
  source.userData.setWorldDimmer = () => {};
  const clone = source.clone();
  assert.notEqual(clone.onBeforeCompile, source.onBeforeCompile);
  assert.notEqual(clone.customProgramCacheKey(), 'patched');
  assert.equal(clone.userData.setWorldDimmer, undefined);
});
