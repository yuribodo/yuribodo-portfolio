"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PretextHeadline } from "@/components/canvas/pretext-headline";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: "Top 1%", label: "OBP \u2014 twice" },
  { value: "10+", label: "Hackathons" },
  { value: "20M+", label: "Users served" },
];

const STACK = [
  "TypeScript", "React", "Node.js", "Go", "Python",
  "Next.js", "Solana", "Ethereum", "NEAR", "Rust",
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
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
    <section
      ref={sectionRef}
      className="relative px-6 py-32"
      style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #1e1a18 50%, #1a1a1a 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl">

        {/* Interactive Pretext headline */}
        <div data-reveal>
          <PretextHeadline
            text="I build things that compete."
            className="mb-16"
          />
        </div>

        {/* Stats */}
        <div data-reveal className="mb-16 grid grid-cols-3 gap-6">
          {STATS.map((stat) => (
            <div key={stat.value}>
              <div className="font-sans text-3xl font-black text-accent md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 font-sans text-xs text-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bio — short, direct, mostly bright */}
        <div className="space-y-5">
          <p data-reveal className="font-sans text-lg leading-relaxed text-foreground-bright">
            Full stack engineer from S&atilde;o Paulo. I ship production systems, AI agents, and Web3 protocols &mdash; then I go compete in hackathons with them.
          </p>

          <p data-reveal className="font-sans text-base leading-relaxed text-foreground">
            I&apos;ve built compliance infra handling 25+ TPS for 20M+ users, an autonomous agent that opens PRs without humans, a Solana billing protocol in Rust, and an open-source component library other devs actually use.
          </p>

          <p data-reveal className="font-sans text-base leading-relaxed text-foreground-bright">
            Open to international opportunities. If you&apos;re building in AI, dev tools, fintech, or Web3 &mdash; let&apos;s talk.
          </p>
        </div>

        {/* Stack */}
        <div data-reveal className="mt-12 flex flex-wrap gap-2">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-foreground-bright transition-premium hover:border-accent hover:text-accent"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
