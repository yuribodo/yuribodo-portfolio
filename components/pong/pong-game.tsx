"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PongEngine } from "./pong-engine";
import { usePongInput } from "@/hooks/use-pong-input";
import { cn } from "@/lib/utils";
import type { PongState, PongConfig } from "@/lib/pong-types";

const PONG_CONFIG: PongConfig = {
  winningScore: 3,
  ballSpeed: 750,
  paddleSpeed: 600,
  aiDifficulty: 0.75,
};

const INITIAL_STATE: PongState = {
  playerScore: 0,
  cpuScore: 0,
  gameStatus: "playing",
  winner: null,
};

export function PongGame({ onRestart }: { onRestart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PongEngine | null>(null);
  const [gameState, setGameState] = useState<PongState>(INITIAL_STATE);
  const [isPaused, setIsPaused] = useState(false);
  const paddleYRef = usePongInput(canvasRef);

  // Escape key toggles pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gameState.gameStatus !== "game-over") {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState.gameStatus]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    return { width: rect.width, height: rect.height };
  }, []);

  useEffect(() => {
    const dims = setupCanvas();
    if (!dims) return;

    engineRef.current = new PongEngine(dims.width, dims.height, PONG_CONFIG);

    const handleResize = () => {
      const newDims = setupCanvas();
      if (newDims && engineRef.current) {
        engineRef.current.resize(newDims.width, newDims.height);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  useEffect(() => {
    if (gameState.gameStatus === "game-over" || isPaused) return;

    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      engine.movePaddle(paddleYRef.current);
      const state = engine.update(deltaTime);

      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.render(ctx);
      ctx.restore();

      setGameState(state);

      if (state.gameStatus !== "game-over") {
        frameId = requestAnimationFrame(loop);
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [gameState.gameStatus, isPaused, paddleYRef]);

  return (
    <div className="fixed inset-0 bg-background">
      {/* Score HUD */}
      <div className="absolute top-6 left-0 right-0 z-10 flex justify-center gap-16 font-mono text-2xl md:text-4xl select-none pointer-events-none">
        <div className="text-center">
          <div className="text-xs md:text-sm text-terminal-amber mb-1">YOU</div>
          <div className="text-foreground">{gameState.playerScore}</div>
        </div>
        <div className="text-center">
          <div className="text-xs md:text-sm text-terminal-amber mb-1">CPU</div>
          <div className="text-foreground">{gameState.cpuScore}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-none"
        data-cursor="none"
        style={{ touchAction: "none" }}
      />

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && gameState.gameStatus !== "game-over" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-8"
            >
              <h1 className="text-5xl md:text-8xl font-bold font-mono text-terminal-amber">
                PAUSED
              </h1>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => setIsPaused(false)}
                className={cn(
                  "px-8 py-3 font-mono text-lg border-2 rounded transition-colors",
                  "border-zinc-700 hover:border-terminal-amber hover:text-terminal-amber text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-amber"
                )}
              >
                Resume [ESC]
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.gameStatus === "game-over" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-8"
            >
              <h1
                className={cn(
                  "text-5xl md:text-8xl font-bold font-mono",
                  gameState.winner === "player"
                    ? "text-terminal-green"
                    : "text-terminal-red"
                )}
              >
                {gameState.winner === "player" ? "YOU WIN!" : "GAME OVER"}
              </h1>

              <div className="flex gap-12 justify-center text-3xl md:text-5xl font-mono">
                <div className="text-center">
                  <div className="text-sm md:text-base text-terminal-amber mb-2">YOU</div>
                  <div className="text-foreground">{gameState.playerScore}</div>
                </div>
                <div className="text-zinc-600 self-end">-</div>
                <div className="text-center">
                  <div className="text-sm md:text-base text-terminal-amber mb-2">CPU</div>
                  <div className="text-foreground">{gameState.cpuScore}</div>
                </div>
              </div>

              {onRestart && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={onRestart}
                  className={cn(
                    "px-8 py-3 font-mono text-lg border-2 rounded transition-colors",
                    "border-zinc-700 hover:border-terminal-green hover:text-terminal-green text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-green"
                  )}
                >
                  Play Again
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
