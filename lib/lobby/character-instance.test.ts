import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, Bone, Box3, BoxGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, QuaternionKeyframeTrack, Skeleton, SkinnedMesh, Uint16BufferAttribute, Vector3 } from 'three';
import { createCharacterInstance } from './character-instance';

test('normalization grounds and centers an offset asset without changing the cached source', () => {
  const source = new Group(), geometry = new BoxGeometry(2, 4, 6), material = new MeshStandardMaterial();
  const mesh = new Mesh(geometry, material);mesh.position.set(8, 9, -12);source.add(mesh);
  let sourceDisposed = false;material.addEventListener('dispose', () => { sourceDisposed = true; });
  const a = createCharacterInstance(source, [], {size: 2, sizeAxis: 'y'});
  a.root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(a.root), center = box.getCenter(new Vector3());
  assert.equal(box.min.y, 0);assert.equal(box.max.y, 2);assert.equal(center.x, 0);assert.equal(center.z, 0);
  const copy = a.root.getObjectByProperty('type', 'Mesh') as Mesh;
  assert.equal(copy.geometry, geometry);assert.notEqual(copy.material, material);
  a.dispose();a.dispose();assert.equal(sourceDisposed, false);assert.deepEqual(mesh.position.toArray(), [8, 9, -12]);
  geometry.dispose();material.dispose();
});

test('a fresh setup still animates after cleanup, with its own skeleton and action', () => {
  const source = new Group(), bone = new Bone();bone.name = 'dance-arm';
  const geometry = new BoxGeometry(1, 2, 1), count = geometry.attributes.position.count;
  const weights = new Float32Array(count * 4);for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
  const mesh = new SkinnedMesh(geometry, new MeshStandardMaterial());mesh.add(bone);mesh.bind(new Skeleton([bone]));source.add(mesh);
  const clip = new AnimationClip('dance', 1, [new QuaternionKeyframeTrack('dance-arm.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, Math.sin(.5), Math.cos(.5)])]);
  const options = {size: 2, sizeAxis: 'y' as const, clip: 'dance'};
  const first = createCharacterInstance(source, [clip], options);first.update(.1);first.dispose();
  const second = createCharacterInstance(source, [clip], options);
  const moving = second.root.getObjectByName('dance-arm')!;
  const initial = moving.quaternion.clone();second.update(.1);
  assert.ok(initial.angleTo(moving.quaternion) > .01);
  assert.equal(bone.quaternion.z, 0);
  assert.notEqual((second.root.getObjectByProperty('type', 'SkinnedMesh') as SkinnedMesh).skeleton, mesh.skeleton);
  second.dispose();geometry.dispose();mesh.material.dispose();mesh.skeleton.dispose();
});

test('a missing named dance fails explicitly instead of silently displaying a static character', () => {
  assert.throws(() => createCharacterInstance(new Group(), [], {size: 2, sizeAxis: 'y', clip: 'Orange_Justice'}), /Missing character animation/);
});
