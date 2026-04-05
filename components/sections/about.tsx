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
  { name: "AI Agents", icon: "◈" },
  { name: "Docker", icon: "🐳" },
];

const PROJECTS = [
  { name: "LaunchList", desc: "Waitlist SaaS — shipped in 8h, 2nd place hackathon", href: "https://github.com/yuribodo/launchlist" },
  { name: "Auto-Issue", desc: "Autonomous coding agent in Go — opens PRs without humans", href: "https://github.com/yuribodo/auto-issue" },
  { name: "Mario Charts", desc: "Open-source React component library", href: "https://github.com/yuribodo/mario-charts" },
  { name: "GiveMeMoney", desc: "Multi-chain crypto payments — Ethereum + Solana", href: "https://github.com/yuribodo/givememoney" },
  { name: "BugLess", desc: "Production AI pipeline for bug detection", href: "https://github.com/yuribodo/bugless" },
  { name: "PattPay", desc: "Solana subscription billing protocol in Rust", href: "https://github.com/yuribodo/pattpay" },
];

const INFO = [
  { label: "EXPERIENCE", value: "4+ years", note: "Full stack, frontend-leaning" },
  { label: "LOCATION", value: "Brazil (GMT-3)", note: "Remote · Open to visa sponsorship" },
  { label: "ACHIEVEMENTS", value: "Top 1% OBP ×2", note: "15,000+ participants · 10+ hackathons" },
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Section fade-in — smooth transition from hero
      gsap.from(sectionRef.current, {
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 95%",
          end: "top 70%",
          scrub: 1,
        },
      });

      // Headline: enters fast with zoom settle
      gsap.from("[data-about-headline]", {
        y: 100,
        scale: 1.1,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          end: "top 40%",
          scrub: 1,
        },
      });

      // Bio paragraphs: enter slower (depth layer)
      gsap.utils.toArray<HTMLElement>("[data-about-bio]").forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            end: "top 60%",
            scrub: 1,
          },
        });
      });

      // Tech badges: stagger from scale
      gsap.from("[data-about-badge]", {
        scale: 0.8,
        opacity: 0,
        stagger: 0.05,
        duration: 0.6,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: "[data-about-badges]",
          start: "top 90%",
          end: "top 65%",
          scrub: 1,
        },
      });

      // Info grid: enters slowest (deepest layer)
      gsap.from("[data-about-info]", {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "[data-about-info]",
          start: "top 92%",
          end: "top 65%",
          scrub: 1,
        },
      });

      // EXIT: scale down + fade as scrolling away
      gsap.to(sectionRef.current, {
        scale: 0.95,
        opacity: 0.3,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "bottom bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative px-6 py-40">
      <div className="mx-auto max-w-4xl">
        {/* Statement */}
        <h2
          data-about-headline
          className="font-sans text-4xl font-black leading-[1.15] tracking-tight text-foreground-bright md:text-5xl lg:text-6xl"
        >
          Engineer who ships fast.{" "}
          <span className="text-accent">AI, crypto, and hackathon-winning MVPs.</span>
        </h2>

        {/* Bio — what a recruiter needs */}
        <p
          data-about-bio
          className="mt-10 max-w-3xl font-sans text-lg leading-relaxed text-foreground-bright md:text-xl"
        >
          4+ years building production systems in TypeScript, React, Node.js, Go, and Python. Currently shipping features end-to-end at a B2B platform serving 20M+ users. Hands-on crypto payments experience across Ethereum, Solana, and NEAR. I use Claude Code, Cursor, and custom MCP integrations daily — not as autocomplete, but as core engineering infrastructure.
        </p>

        {/* Tech badges */}
        <div data-about-badges className="mt-12 flex flex-wrap gap-2">
          {TECH_BADGES.map((tech) => (
            <div
              key={tech.name}
              data-about-badge
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

        {/* Projects */}
        <div className="mt-16">
          <div className="mb-4 font-mono text-[10px] tracking-[2px] text-subtle">
            SELECTED PROJECTS
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PROJECTS.map((project) => (
              <a
                key={project.name}
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline justify-between rounded-md border border-border bg-surface px-4 py-3 transition-premium hover:border-accent hover:bg-surface-hover"
              >
                <div>
                  <span className="font-sans text-sm font-bold text-accent transition-premium group-hover:text-foreground-bright">
                    {project.name}
                  </span>
                  <span className="ml-2 font-sans text-xs text-muted">
                    {project.desc}
                  </span>
                </div>
                <span className="ml-2 font-mono text-xs text-subtle transition-premium group-hover:text-accent">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div
          data-about-info
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
