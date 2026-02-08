"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LoadingPhase = "player1" | "3" | "2" | "1" | "go" | "done";

const PHASE_TIMINGS: Record<Exclude<LoadingPhase, "done">, number> = {
  player1: 1200,
  "3": 600,
  "2": 600,
  "1": 600,
  go: 800,
};

const COUNTDOWN_COLORS: Record<string, string> = {
  "3": "text-terminal-green",
  "2": "text-terminal-amber",
  "1": "text-terminal-red",
};

interface GameLoadingProps {
  onComplete: () => void;
}

export function GameLoading({ onComplete }: GameLoadingProps) {
  const [phase, setPhase] = useState<LoadingPhase>("player1");

  useEffect(() => {
    const phases: LoadingPhase[] = ["player1", "3", "2", "1", "go", "done"];
    let currentIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const advance = () => {
      if (currentIndex >= phases.length - 1) {
        onComplete();
        return;
      }
      const currentPhase = phases[currentIndex];
      const duration = PHASE_TIMINGS[currentPhase as Exclude<LoadingPhase, "done">];

      timeout = setTimeout(() => {
        currentIndex++;
        setPhase(phases[currentIndex]);
        advance();
      }, duration);
    };

    advance();
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "player1" && (
          <motion.div
            key="player1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm md:text-base text-terminal-amber font-mono tracking-widest uppercase"
            >
              — Stage 1 —
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-7xl font-bold font-mono text-terminal-green mt-4"
            >
              PLAYER 1
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="h-0.5 bg-terminal-green/30 mt-6 mx-auto w-48 md:w-64 origin-center"
            />
          </motion.div>
        )}

        {(phase === "3" || phase === "2" || phase === "1") && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 2.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center"
          >
            <span className={`text-8xl md:text-[12rem] font-bold font-mono ${COUNTDOWN_COLORS[phase]}`}>
              {phase}
            </span>
          </motion.div>
        )}

        {phase === "go" && (
          <motion.div
            key="go"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: [0.5, 1.15, 1] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center"
          >
            <h1 className="text-7xl md:text-[10rem] font-bold font-mono text-terminal-green">
              GO!
            </h1>
            {/* Flash effect */}
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-terminal-green/10 pointer-events-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
