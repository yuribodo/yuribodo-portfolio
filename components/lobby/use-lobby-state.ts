"use client";

import { useReducer } from "react";

export type LobbyState =
  | "loading"
  | "idle"
  | "exploring"
  | "booting"
  | "done";

export type LobbyAction =
  | { type: "ASSETS_READY" }
  | { type: "DISCOVER" }
  | { type: "ENTER_CLICKED" }
  | { type: "BOOT_COMPLETE" }
  | { type: "SKIP" };

function reducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case "ASSETS_READY":
      return state === "loading" ? "idle" : state;
    case "DISCOVER":
      return state === "idle" ? "exploring" : state;
    case "ENTER_CLICKED":
      return state === "idle" || state === "exploring" ? "booting" : state;
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
