"use client";

import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TerminalLine {
  type: "command" | "output";
  text: string;
  delay?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
  className?: string;
}

export function Terminal({ lines, title = "terminal", className }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [currentText, setCurrentText] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);

  useGSAP(() => {
    if (!linesRef.current) return;

    const typeText = async () => {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const delay = line.delay ?? (line.type === "command" ? 800 : 400);

        await new Promise(resolve => setTimeout(resolve, delay));

        setIsTyping(true);
        const text = line.text;

        for (let charIndex = 0; charIndex <= text.length; charIndex++) {
          setCurrentText(text.slice(0, charIndex));
          await new Promise(resolve =>
            setTimeout(resolve, line.type === "command" ? 50 : 35)
          );
        }

        setIsTyping(false);
        setVisibleLines(prev => prev + 1);
        setCurrentText("");
      }
    };

    typeText();
  }, [lines]);

  const displayedLines = lines.slice(0, visibleLines);
  const currentLine = lines[visibleLines];

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "w-full max-w-2xl rounded-lg overflow-hidden",
        "bg-zinc-900 border border-zinc-800",
        "shadow-2xl shadow-black/50",
        className
      )}
    >
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50">
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="ml-2 text-sm text-zinc-400 font-mono">
          yuribodo@portfolio ~ {title}
        </span>
      </div>

      {/* Terminal Content */}
      <div ref={linesRef} className="p-6 font-mono text-sm md:text-base min-h-[300px]">
        {displayedLines.map((line, index) => (
          <TerminalLineComponent key={index} line={line} />
        ))}

        {currentLine && (
          <div className="flex items-start gap-2">
            {currentLine.type === "command" ? (
              <>
                <span className="text-green-400 shrink-0">$</span>
                <span className="text-zinc-100">
                  {currentText}
                  <Cursor visible={isTyping} />
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-500 shrink-0">&gt;</span>
                <span className="text-amber-400">
                  {currentText}
                  <Cursor visible={isTyping} />
                </span>
              </>
            )}
          </div>
        )}

        {visibleLines === lines.length && (
          <div className="flex items-start gap-2 mt-2">
            <span className="text-green-400">$</span>
            <Cursor visible={true} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TerminalLineComponent({ line }: { line: TerminalLine }) {
  if (line.type === "command") {
    return (
      <div className="flex items-start gap-2 mb-1">
        <span className="text-green-400 shrink-0">$</span>
        <span className="text-zinc-100">{line.text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 mb-3">
      <span className="text-zinc-500 shrink-0">&gt;</span>
      <span className="text-amber-400">{line.text}</span>
    </div>
  );
}

function Cursor({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <span className="inline-block w-2 h-5 ml-0.5 bg-zinc-100 animate-blink align-middle" />
  );
}
