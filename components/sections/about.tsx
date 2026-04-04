"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PARAGRAPHS = [
  "Started on Replit before I knew what a terminal was. Since then — B2B compliance infra handling 25+ TPS for 20M+ users, autonomous agents that open PRs, a Solana billing protocol in Rust, and an open-source component library devs actually use.",
  "Placed in hackathons across Solana, NEAR, AI Agents, Cypherpunk, and Replit. Top 1% in Brazil's Programming Olympiad — twice.",
  "Based in São Paulo. Open to international opportunities in AI infrastructure, developer tools, fintech, or Web3.",
];

const STACK = [
  "TypeScript", "React", "Node.js", "Go", "Python",
  "Next.js", "Solana", "Ethereum", "NEAR", "Rust",
  "GSAP", "Tailwind",
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      // Label
      gsap.from(labelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: labelRef.current,
          start: "top 90%",
          end: "top 60%",
          scrub: 1,
        },
      });

      // Headline
      if (headlineRef.current) {
        gsap.from(headlineRef.current, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headlineRef.current,
            start: "top 90%",
            end: "top 60%",
            scrub: 1,
          },
        });
      }

      // Paragraphs
      gsap.utils.toArray<HTMLElement>("[data-about-paragraph]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            end: "top 60%",
            scrub: 1,
          },
        });
      });

      // Parallax depth on headline
      gsap.to(headlineRef.current, {
        y: -30,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative min-h-screen px-6 py-32">
      <div className="mx-auto max-w-2xl">
        <div
          ref={labelRef}
          className="mb-8 font-sans text-xs font-semibold uppercase tracking-[4px] text-subtle"
        >
          002 — About
        </div>

        <h2
          ref={headlineRef}
          className="mb-12 font-sans text-3xl font-black leading-tight tracking-tight text-foreground-bright md:text-4xl"
        >
          I ship code that{" "}
          <span className="text-accent">competes and scales</span>.
        </h2>

        <div className="flex flex-col gap-8">
          {PARAGRAPHS.map((text, i) => (
            <p
              key={i}
              data-about-paragraph
              className="border-l-2 border-border pl-4 font-sans text-sm leading-relaxed text-muted md:text-base"
            >
              {text}
            </p>
          ))}
        </div>

        {/* Stack */}
        <div className="mt-12 flex flex-wrap gap-2">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="rounded border border-border px-3 py-1 font-mono text-xs text-subtle transition-premium hover:border-accent hover:text-accent"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
