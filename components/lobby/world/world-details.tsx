"use client";

import { Children, startTransition, useEffect, useState, type ReactNode } from 'react';

/** The skyline, ground and village are already present. Mount detail families
 * only after desk readiness, yielding to input/painting between each family.
 * Once mounted they persist throughout the monitor dive.
 */
export function WorldDetails({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const items = Children.toArray(children);
  const [count, setCount] = useState(0);
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
  return <>{items.slice(0, count)}</>;
}
