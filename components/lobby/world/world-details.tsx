"use client";

import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { Children, startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Mesh, type Material, type Object3D } from 'three';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { arrivalFadeMode } from '@/lib/lobby/arrival-fade';
import { OutdoorArrival, arrivalShaded } from './outdoor-lighting';

let remaining = 0;
const listeners = new Set<() => void>();

function publish(next: number) {
  if (next === remaining) return;
  remaining = next;
  listeners.forEach(listener => listener());
}

export function worldStillArriving(): boolean {
  return remaining > 0;
}

export function subscribeWorldArriving(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isShown(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

interface Swap { object: Mesh; original: Material | Material[]; applied: Material | Material[] }

/** Each family eases in through its own `arrival` uniform, read by applyOutdoorLight
 * (and the waterfall and chimney smoke). Cloning a material would drop its
 * shader patches and uniform links, so only stock materials are cloned, once
 * per source, and swapped back when the fade ends. */
function FadeFamily({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const started = useRef(false);
  const [arrival] = useState(() => ({ value: 1 }));
  const reducedMotion = useReducedMotion();
  useFrame(() => {
    if (started.current || reducedMotion || !ref.current) return;
    const clones = new Map<Material, Material>();
    const swaps: Swap[] = [];
    let shown = false;
    const fadeIn = (source: Material) => {
      if (arrivalFadeMode(source, arrivalShaded.has(source)) !== 'clone') return source;
      let clone = clones.get(source);
      if (!clone) {
        clone = source.clone();
        clone.transparent = true;
        clone.opacity = 0;
        clones.set(source, clone);
      }
      return clone;
    };
    ref.current.traverse(object => {
      if (!(object instanceof Mesh) || !isShown(object)) return;
      shown = true;
      const original = object.material;
      const applied = Array.isArray(original) ? original.map(fadeIn) : fadeIn(original);
      const swapped = Array.isArray(original) ? original.some((material, index) => material !== (applied as Material[])[index]) : original !== applied;
      if (!swapped) return;
      object.material = applied;
      swaps.push({ object, original, applied });
    });
    if (!shown) return;
    started.current = true;
    gsap.fromTo(arrival, { value: 0 }, {
      value: 1,
      duration: 0.5,
      ease: 'power1.out',
      onUpdate: () => { for (const clone of clones.values()) clone.opacity = arrival.value; },
      onComplete: () => {
        for (const { object, original, applied } of swaps) if (object.material === applied) object.material = original;
        for (const clone of clones.values()) clone.dispose();
      },
    });
  });
  return <group ref={ref}><OutdoorArrival arrival={arrival}>{children}</OutdoorArrival></group>;
}

/** The skyline, ground and village are already present. Mount detail families
 * only after desk readiness, yielding to input/painting between each family.
 * Once mounted they persist throughout the monitor dive.
 */
export function WorldDetails({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const items = Children.toArray(children);
  const [count, setCount] = useState(0);
  useEffect(() => {
    publish(enabled ? items.length - count : 0);
  }, [enabled, count, items.length]);
  useEffect(() => () => publish(0), []);
  useEffect(() => {
    if (!enabled || count >= items.length) return;
    const reveal = () => startTransition(() => setCount(value => value + 1));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(reveal, { timeout: 500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(id);
  }, [enabled, count, items.length]);
  return <>{items.slice(0, count).map((item, index) => <FadeFamily key={index}>{item}</FadeFamily>)}</>;
}
