"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ProjectCard } from "@/components/ui/project-card";
import { projects } from "@/lib/projects-data";

gsap.registerPlugin(ScrollTrigger);

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(
    () => {
      // Label
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: labelRef.current, start: "top 85%" },
      });

      // Cards stagger entrance
      const cards = gsap.utils.toArray<HTMLElement>("[data-project-card]");
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          x: 60,
          rotation: 5 + i * 2,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: deckRef.current, start: "top 80%" },
          delay: i * 0.1,
        });
      });
    },
    { scope: sectionRef }
  );

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const cardWidth = 320 + 16; // card width + gap
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, projects.length - 1));
  }

  return (
    <section ref={sectionRef} className="relative min-h-screen py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          003 — Projects
        </div>

        <h2 className="mb-12 font-sans text-3xl font-black tracking-tight text-foreground-bright md:text-4xl">
          O deck.
        </h2>
      </div>

      {/* Horizontal scroll deck */}
      <div
        ref={deckRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-8 scrollbar-hide md:px-[calc(50vw-160px)]"
      >
        {projects.map((project, i) => (
          <div key={project.slug} data-project-card className="snap-center">
            <ProjectCard project={project} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      <div className="mt-4 flex justify-center gap-2">
        {projects.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-5 bg-accent"
                : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
