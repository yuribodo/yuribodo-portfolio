"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "lobbySeen";

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

interface UseLobbyVisitedReturn {
  hasVisited: boolean;
  markVisited: () => void;
}

export function useLobbyVisited(): UseLobbyVisitedReturn {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false,
  );
  const [overridden, setOverridden] = useState(false);

  const markVisited = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore quota / disabled storage
    }
    setOverridden(true);
  }, []);

  return { hasVisited: stored || overridden, markVisited };
}
