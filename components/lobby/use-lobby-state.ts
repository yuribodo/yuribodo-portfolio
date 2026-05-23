"use client";

import { useReducer } from "react";

export type LobbyState =
  | "loading"
  | "idle"
  | "exploring"
  | "holding"
  | "booting"
  | "done";

export type LobbyAction =
  | { type: "ASSETS_READY" }
  | { type: "DISCOVER" }
  | { type: "HOLD_START" }
  | { type: "HOLD_CANCEL" }
  | { type: "HOLD_COMPLETE" }
  | { type: "BOOT_COMPLETE" }
  | { type: "SKIP" };

function reducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case "ASSETS_READY":
      return state === "loading" ? "idle" : state;
    case "DISCOVER":
      return state === "idle" ? "exploring" : state;
    case "HOLD_START":
      return state === "idle" || state === "exploring" ? "holding" : state;
    case "HOLD_CANCEL":
      return state === "holding" ? "exploring" : state;
    case "HOLD_COMPLETE":
      return state === "holding" ? "booting" : state;
    case "BOOT_COMPLETE":
      return state === "booting" ? "done" : state;
    case "SKIP":
      return "done";
    default:
      return state;
  }
}

export function useLobbyState(initial: LobbyState = "loading") {
  return useReducer(reducer, initial);
}
