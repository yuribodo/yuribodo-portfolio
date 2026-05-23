"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLobbyVisited } from "@/hooks/use-lobby-visited";
import { LobbyLoading } from "./lobby-loading";
import { useLobbyState } from "./use-lobby-state";

const DeskScene = dynamic(() => import("./desk-scene"), {
  ssr: false,
  loading: () => <LobbyLoading />,
});

interface LobbyGateProps {
  isMobile: boolean;
}

export function LobbyGate({ isMobile }: LobbyGateProps) {
  const reducedMotion = useReducedMotion();
  const { markVisited } = useLobbyVisited();
  const [state, dispatch] = useLobbyState();

  useEffect(() => {
    if (state === "done") markVisited();
  }, [state, markVisited]);

  if (isMobile || reducedMotion) return null;
  if (state === "done") return null;

  return <DeskScene state={state} dispatch={dispatch} />;
}
