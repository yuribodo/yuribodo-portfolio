"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const INFO_COLUMNS = [
  {
    label: "LOCATION",
    primary: "São Paulo, BR",
    secondary: "Open to relocation",
  },
  {
    label: "ACHIEVEMENTS",
    primary: "Top 1% OBP ×2",
    secondary: "10+ hackathons placed",
  },
  {
    label: "STACK",
    primary: "TS · React · Go · Python",
    secondary: "Solana · Ethereum · NEAR",
  },
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
        {/* Giant statement */}
        <h2
          data-reveal
          className="font-sans text-4xl font-black leading-[1.15] tracking-tight text-foreground-bright md:text-5xl lg:text-6xl"
        >
          I build production systems, AI agents, and Web3 infrastructure.{" "}
          <span className="text-accent">Then I compete with them.</span>
        </h2>

        {/* Bio */}
        <p
          data-reveal
          className="mt-10 max-w-2xl font-sans text-base leading-relaxed text-foreground"
        >
          I started on Replit before I knew what a terminal was. Since then
          I&apos;ve built compliance infra for 20M+ users, autonomous agents
          that ship code, and Web3 protocols in Rust. I placed in hackathons
          across Solana, NEAR, AI, and Replit — including 2nd at the Replit +
          Resend Hackathon.
        </p>

        {/* Info grid */}
        <div
          data-reveal
          className="mt-16 grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-3"
        >
          {INFO_COLUMNS.map((col) => (
            <div key={col.label}>
              <div className="font-mono text-[10px] tracking-[2px] text-subtle">
                {col.label}
              </div>
              <div className="mt-2 font-sans text-base font-semibold text-foreground-bright">
                {col.primary}
              </div>
              <div className="mt-1 font-sans text-sm text-muted">
                {col.secondary}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
