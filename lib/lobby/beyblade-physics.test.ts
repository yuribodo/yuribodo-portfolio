import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PARAMS,
  initialState,
  launch,
  stepBeyblade,
  deriveTransform,
} from "./beyblade-physics";

test("initial state is idle at rest", () => {
  const s = initialState();
  assert.equal(s.phase, "idle");
  assert.equal(s.omega, 0);
  assert.equal(s.tilt, 0);
});

test("launch sets max omega and spinning phase", () => {
  const s = launch(initialState());
  assert.equal(s.phase, "spinning");
  assert.equal(s.omega, DEFAULT_PARAMS.maxOmega);
});

test("stepping bleeds omega by friction*dt", () => {
  const s = stepBeyblade(launch(initialState()), 1);
  assert.ok(Math.abs(s.omega - (DEFAULT_PARAMS.maxOmega - DEFAULT_PARAMS.friction)) < 1e-6);
});

test("spinAngle increases while spinning", () => {
  const s = stepBeyblade(launch(initialState()), 0.1);
  assert.ok(s.spinAngle > 0);
});

test("tilt grows as omega falls", () => {
  const fast = launch(initialState());
  // advance to a low-omega state
  let slow = fast;
  for (let i = 0; i < 200; i++) slow = stepBeyblade(slow, 0.1);
  assert.ok(slow.tilt > fast.tilt);
});

test("drops to toppled and clamps omega at the topple threshold", () => {
  let s = launch(initialState());
  for (let i = 0; i < 1000 && s.phase === "spinning"; i++) s = stepBeyblade(s, 0.1);
  assert.equal(s.phase, "toppled");
  assert.equal(s.omega, 0);
});

test("re-launch from spinning resets omega to max", () => {
  let s = stepBeyblade(launch(initialState()), 5);
  assert.ok(s.omega < DEFAULT_PARAMS.maxOmega);
  s = launch(s);
  assert.equal(s.omega, DEFAULT_PARAMS.maxOmega);
});

test("stepping idle is a no-op", () => {
  const s = stepBeyblade(initialState(), 0.5);
  assert.equal(s.omega, 0);
  assert.equal(s.phase, "idle");
});

test("deriveTransform maps precession into a tilted euler + xz offset", () => {
  let s = launch(initialState());
  for (let i = 0; i < 100; i++) s = stepBeyblade(s, 0.05);
  const { euler, offset } = deriveTransform(s, DEFAULT_PARAMS.wanderRadius);
  assert.equal(euler.length, 3);
  assert.equal(offset.length, 2);
  assert.ok(Math.abs(offset[0]) <= DEFAULT_PARAMS.wanderRadius + 1e-9);
});
