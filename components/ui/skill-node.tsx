"use client";

import { useState } from "react";
import type { Skill } from "@/lib/skills-data";

interface SkillNodeProps {
  skill: Skill;
  angle: number;
  radius: number;
  isPaused: boolean;
  isHighlighted: boolean;
  onHover: (name: string | null) => void;
}

export function SkillNode({
  skill,
  angle,
  radius,
  isPaused,
  isHighlighted,
  onHover,
}: SkillNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const size = 32 + skill.proficiency * 24; // 32-56px based on proficiency

  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  function handleMouseEnter() {
    setShowTooltip(true);
    onHover(skill.name);
  }

  function handleMouseLeave() {
    setShowTooltip(false);
    onHover(null);
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all transition-premium"
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center justify-center rounded-full border bg-surface font-mono text-[10px] transition-all transition-premium ${
          isHighlighted
            ? "border-accent text-accent shadow-[0_0_16px_rgba(250,75,18,0.2)]"
            : "border-muted/30 text-muted"
        } ${isPaused && showTooltip ? "scale-125" : ""}`}
        style={{ width: size, height: size }}
      >
        {skill.name}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-3 py-2 text-center shadow-lg">
          <div className="font-sans text-xs font-bold text-foreground-bright">
            {skill.name}
          </div>
          <div className="mt-1 font-sans text-[10px] text-muted">
            {skill.description}
          </div>
        </div>
      )}
    </div>
  );
}
