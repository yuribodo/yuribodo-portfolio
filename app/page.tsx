"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "@/components/ui/terminal";
import { GameLoading } from "@/components/ui/game-loading";
import { PongGame } from "@/components/pong/pong-game";

const terminalLines = [
  { type: "command" as const, text: "whoami", delay: 1000 },
  { type: "output" as const, text: "Yuri Bodo" },
  { type: "command" as const, text: "cat status.txt" },
  { type: "output" as const, text: "Building something awesome..." },
  { type: "command" as const, text: "echo $ETA" },
  { type: "output" as const, text: "Coming Soon" },
  { type: "output" as const, text: "Wanna play while you wait? [Y/N]", delay: 800 },
];

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [pongKey, setPongKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Background music — try autoplay, fallback to first interaction
  useEffect(() => {
    const audio = new Audio("/audio/soundtrack.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Autoplay blocked — start on first user interaction
      const startOnInteraction = () => {
        audio.play().catch(() => {});
        window.removeEventListener("click", startOnInteraction);
        window.removeEventListener("keydown", startOnInteraction);
      };
      window.addEventListener("click", startOnInteraction);
      window.addEventListener("keydown", startOnInteraction);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const handleTerminalComplete = useCallback(() => {
    setShowButtons(true);
  }, []);

  const handleAccept = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    setIsPlaying(true);
  }, []);

  const handleRestart = useCallback(() => {
    setPongKey(prev => prev + 1);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <AnimatePresence mode="wait">
        {!isPlaying && !isLoading && (
          <motion.div
            key="terminal"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col items-center"
          >
            <Terminal lines={terminalLines} onComplete={handleTerminalComplete}>
              {showButtons && <TerminalInput onAccept={handleAccept} />}
            </Terminal>
            <p className="mt-8 text-sm text-zinc-500 font-mono">
              <span className="text-zinc-600">&gt;</span> portfolio.init()
            </p>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
          >
            <GameLoading onComplete={handleLoadingComplete} />
          </motion.div>
        )}

        {isPlaying && (
          <motion.div
            key={`pong-${pongKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-50"
          >
            <PongGame onRestart={handleRestart} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

const DECLINE_RESPONSES = [
  "Wrong answer. Try again.",
  "Come on, just press Y.",
  "I don't think you understand. Press Y.",
  "N is not an option here.",
  "You're not leaving without playing.",
  "...",
  "Y. Press Y. Now.",
];

function TerminalInput({ onAccept }: { onAccept: () => void }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [declineMsg, setDeclineMsg] = useState<string | null>(null);
  const [declineCount, setDeclineCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const handleDecline = useCallback(() => {
    if (isLocked) return;
    setIsLocked(true);
    setAnswer("n");

    const msgIndex = Math.min(declineCount, DECLINE_RESPONSES.length - 1);
    setTimeout(() => {
      setDeclineMsg(DECLINE_RESPONSES[msgIndex]);
      setDeclineCount(prev => prev + 1);

      setTimeout(() => {
        setAnswer(null);
        setDeclineMsg(null);
        setIsLocked(false);
      }, 1500);
    }, 400);
  }, [isLocked, declineCount]);

  const handleAcceptInput = useCallback(() => {
    if (isLocked || answer === "y") return;
    setAnswer("y");
    setTimeout(onAccept, 500);
  }, [isLocked, answer, onAccept]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y") handleAcceptInput();
      else if (e.key === "n" || e.key === "N") handleDecline();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAcceptInput, handleDecline]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-1"
    >
      <button
        onClick={handleAcceptInput}
        className="flex items-start gap-2 w-full text-left focus-visible:outline-none"
        autoFocus
      >
        <span className="text-green-400 shrink-0">$</span>
        {answer === null ? (
          <span className="text-zinc-100">
            <span className="inline-block w-2 h-5 ml-0.5 bg-zinc-100 animate-blink align-middle" />
          </span>
        ) : (
          <span className={answer === "y" ? "text-terminal-green" : "text-terminal-red"}>
            {answer}
          </span>
        )}
      </button>

      {declineMsg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex items-start gap-2"
        >
          <span className="text-zinc-500 shrink-0">&gt;</span>
          <span className="text-terminal-red">{declineMsg}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
