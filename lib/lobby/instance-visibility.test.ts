import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Frustum, Matrix4, PerspectiveCamera, Sphere, Vector3 } from 'three';
import { visibleInstances } from './instance-visibility';

test('instance visibility includes intersecting crowns and respects parent transforms and camera turns', () => {
  const camera = new PerspectiveCamera(50, 16/9, .05, 3200);
  const frustum = new Frustum(), scratch = new Sphere();
  const update = () => { camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); };
  const bounds = [new Sphere(new Vector3(0,0,-10),1), new Sphere(new Vector3(0,0,10),1), new Sphere(new Vector3(10,0,-10),3)];
  update();
  assert.deepEqual(visibleInstances(bounds, frustum, new Matrix4(), scratch), [0,2]);
  assert.deepEqual(visibleInstances(bounds, frustum, new Matrix4().makeTranslation(0,0,-30), scratch), [0,1,2]);
  camera.rotation.y = Math.PI; update();
  assert.deepEqual(visibleInstances(bounds, frustum, new Matrix4(), scratch), [1]);
  assert.equal(bounds[0].radius, 1, 'bounds must not accumulate padding');
});
