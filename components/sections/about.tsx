"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TECH_BADGES = [
  { name: "TypeScript", icon: "TS" },
  { name: "React", icon: "⚛" },
  { name: "Next.js", icon: "▲" },
  { name: "Node.js", icon: "◆" },
  { name: "Go", icon: "Go" },
  { name: "Python", icon: "Py" },
  { name: "Rust", icon: "Rs" },
  { name: "Solana", icon: "◎" },
  { name: "Ethereum", icon: "Ξ" },
  { name: "NEAR", icon: "⬡" },
  { name: "AI/ML", icon: "◈" },
  { name: "Tailwind", icon: "tw" },
];

const INFO = [
  { label: "LOCATION", value: "São Paulo, BR", note: "Open to relocation" },
  { label: "STATUS", value: "Open to opportunities", note: "Remote or on-site" },
  { label: "FOCUS", value: "AI · Dev Tools · Web3", note: "Fintech welcome" },
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            end: "top 60%",
            scrub: 1,
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative px-6 py-40">
      <div className="mx-auto max-w-4xl">
        {/* Statement */}
        <h2
          data-reveal
          className="font-sans text-4xl font-black leading-[1.15] tracking-tight text-foreground-bright md:text-5xl lg:text-6xl"
        >
          Full stack engineer, frontend-leaning.{" "}
          <span className="text-accent">I build with AI, ship to Web3, and compete.</span>
        </h2>

        {/* Bio — recruiter-friendly, mentions projects by name */}
        <p
          data-reveal
          className="mt-10 max-w-3xl font-sans text-lg leading-relaxed text-foreground md:text-xl"
        >
          I&apos;ve built{" "}
          <a href="https://github.com/yuribodo/launchlist" target="_blank" rel="noopener noreferrer" className="text-accent transition-premium hover:opacity-70">LaunchList</a>
          {" "}(waitlist platform),{" "}
          <a href="https://github.com/yuribodo/auto-issue" target="_blank" rel="noopener noreferrer" className="text-accent transition-premium hover:opacity-70">Auto-Issue</a>
          {" "}(autonomous agent that opens PRs in Go),{" "}
          <a href="https://github.com/yuribodo/mario-charts" target="_blank" rel="noopener noreferrer" className="text-accent transition-premium hover:opacity-70">Mario Charts</a>
          {" "}(open-source React component library), and{" "}
          <a href="https://github.com/yuribodo/pattpay" target="_blank" rel="noopener noreferrer" className="text-accent transition-premium hover:opacity-70">PattPay</a>
          {" "}(Solana billing protocol in Rust). Top 1% in Brazil&apos;s Programming Olympiad — twice. 10+ hackathons, 2nd at Replit + Resend.
        </p>

        {/* Tech badges */}
        <div data-reveal className="mt-12 flex flex-wrap gap-2">
          {TECH_BADGES.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 transition-premium hover:border-accent hover:bg-surface-hover"
            >
              <span className="font-mono text-xs font-bold text-accent">
                {tech.icon}
              </span>
              <span className="font-sans text-sm text-foreground-bright">
                {tech.name}
              </span>
            </div>
          ))}
        </div>

        {/* Info grid */}
        <div
          data-reveal
          className="mt-16 grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-3"
        >
          {INFO.map((col) => (
            <div key={col.label}>
              <div className="font-mono text-[10px] tracking-[2px] text-subtle">
                {col.label}
              </div>
              <div className="mt-2 font-sans text-base font-semibold text-foreground-bright">
                {col.value}
              </div>
              <div className="mt-1 font-sans text-sm text-muted">
                {col.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
