"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: "Top 1%", label: "Brazil's Programming Olympiad — twice" },
  { value: "10+", label: "Hackathons across Solana, NEAR, AI, Replit" },
  { value: "20M+", label: "Users on infrastructure I've built" },
];

const STACK = [
  "TypeScript", "React", "Node.js", "Go", "Python",
  "Next.js", "Solana", "Ethereum", "NEAR", "Rust",
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Animate all revealable elements
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            end: "top 65%",
            scrub: 1,
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative px-6 py-32">
      <div className="mx-auto max-w-3xl">

        {/* Stats row */}
        <div data-reveal className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.value} className="text-center md:text-left">
              <div className="font-sans text-4xl font-black text-accent md:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 font-sans text-sm text-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div className="space-y-6">
          <p data-reveal className="font-sans text-lg leading-relaxed text-foreground md:text-xl">
            I started programming on Replit before I knew what a terminal was. No setup, no configuration — just open and write. That accessibility is what made the whole thing feel possible.
          </p>

          <p data-reveal className="font-sans text-base leading-relaxed text-muted">
            Since then I&apos;ve built B2B compliance infrastructure that handles 25+ transactions per second for 20M+ users, an autonomous coding agent that opens pull requests without human intervention, a Solana subscription billing protocol in Rust, and an open-source React component library that other developers actually use.
          </p>

          <p data-reveal className="font-sans text-base leading-relaxed text-muted">
            My stack centers on TypeScript, React, Node.js, Go, and Python — with Web3 experience across Ethereum, Solana, and NEAR. I use Claude Code and Cursor daily, not as autocomplete, but as a core part of how I reason about architecture and ship faster.
          </p>

          <p data-reveal className="font-sans text-base leading-relaxed text-foreground">
            Based in São Paulo. Open to international opportunities — remote or relocation. If you&apos;re building something interesting in AI infrastructure, developer tools, fintech, or Web3, I&apos;d like to hear about it.
          </p>
        </div>

        {/* Stack */}
        <div data-reveal className="mt-16 flex flex-wrap gap-2">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-premium hover:border-accent hover:text-accent"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
