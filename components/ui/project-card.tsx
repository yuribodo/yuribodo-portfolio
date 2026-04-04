"use client";

import { useRef } from "react";
import type { Project } from "@/lib/projects-data";

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
}

export function ProjectCard({ project, isActive }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) scale(${isActive ? 1.05 : 1})`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)`;
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-[280px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-surface transition-all transition-premium md:w-[320px] ${
        project.featured
          ? "border-accent shadow-[0_0_30px_rgba(250,75,18,0.08)]"
          : "border-border"
      }`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Preview area */}
      <div className="h-[160px] bg-surface-hover md:h-[180px]" />

      {/* Content */}
      <div className="p-4">
        <h3 className="font-sans text-base font-bold text-foreground-bright">
          {project.title}
          {project.featured && (
            <span className="ml-2 text-accent">★</span>
          )}
        </h3>
        <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
          {project.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.tech.map((tech) => (
            <span
              key={tech}
              className={`rounded font-mono text-[10px] px-2 py-0.5 ${
                project.featured
                  ? "border border-accent/30 text-accent"
                  : "border border-border text-subtle"
              }`}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
