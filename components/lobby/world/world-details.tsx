"use client";

import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { Children, startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Mesh, type Material, type Object3D } from 'three';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

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

function FadeFamily({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const started = useRef(false);
  const reducedMotion = useReducedMotion();
  useFrame(() => {
    if (started.current || reducedMotion || !ref.current) return;
    const materials: Material[] = [];
    let shown = false;
    ref.current.traverse(object => {
      if (!(object instanceof Mesh) || !isShown(object)) return;
      shown = true;
      const sources = Array.isArray(object.material) ? object.material : [object.material];
      const clones = sources.map(source => {
        const clone = source.clone();
        clone.transparent = true;
        clone.opacity = 0;
        clone.userData.arrivalWasTransparent = source.transparent;
        materials.push(clone);
        return clone;
      });
      object.material = Array.isArray(object.material) ? clones : clones[0];
    });
    if (!shown) return;
    started.current = true;
    gsap.to(materials, {
      opacity: 1,
      duration: 0.5,
      ease: 'power1.out',
      onComplete: () => {
        for (const material of materials) {
          material.opacity = 1;
          if (!material.userData.arrivalWasTransparent) material.transparent = false;
        }
      },
    });
  });
  return <group ref={ref}>{children}</group>;
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
