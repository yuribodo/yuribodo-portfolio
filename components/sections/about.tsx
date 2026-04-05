"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiNodedotjs,
  SiGo,
  SiPython,
  SiRust,
  SiPostgresql,
  SiRedis,
  SiDocker,
  SiSolana,
  SiEthereum,
  SiNear,
  SiClaude,
  SiElectron,
} from "react-icons/si";
import type { IconType } from "react-icons";

gsap.registerPlugin(ScrollTrigger);

const TECH_BADGES: { name: string; Icon: IconType }[] = [
  { name: "TypeScript", Icon: SiTypescript },
  { name: "React", Icon: SiReact },
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "Node.js", Icon: SiNodedotjs },
  { name: "Go", Icon: SiGo },
  { name: "Python", Icon: SiPython },
  { name: "Rust", Icon: SiRust },
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "Redis", Icon: SiRedis },
  { name: "React Native", Icon: SiReact },
  { name: "Electron", Icon: SiElectron },
  { name: "Docker", Icon: SiDocker },
  { name: "Solana", Icon: SiSolana },
  { name: "Ethereum", Icon: SiEthereum },
  { name: "NEAR", Icon: SiNear },
  { name: "Claude Code", Icon: SiClaude },
];

const PROJECTS = [
  { name: "Mario Charts", desc: "Open-source React component library — CLI-driven (npx mario-charts)", href: "https://github.com/yuribodo/mario-charts" },
  { name: "CodeLord", desc: "Codebase architecture visualizer — Obsidian graph view for devs", href: "https://github.com/yuribodo/codelord" },
  { name: "BugLess", desc: "AI dev tool — real-time LLM streaming, Redis queues, React/Ink CLI", href: "https://github.com/yuribodo/bugless" },
  { name: "Auto-Issue", desc: "Autonomous coding agent in Go — opens PRs without humans", href: "https://github.com/yuribodo/auto-issue" },
  { name: "GiveMeMoney", desc: "Multi-chain crypto payments — Ethereum + Solana + NEAR", href: "https://github.com/yuribodo/givememoney" },
  { name: "PattPay", desc: "Solana subscription billing protocol in Rust", href: "https://github.com/yuribodo/pattpay" },
];

const INFO = [
  { label: "EXPERIENCE", value: "Full stack engineer", note: "TypeScript, React, Node.js, Go, Rust" },
  { label: "WEB3", value: "3 chains shipped", note: "Ethereum · Solana · NEAR — payments & billing infra" },
  { label: "COMPETITION", value: "Top 1% × 2", note: "Brazilian Programming Olympiad · 15,000+ participants" },
  { label: "HACKATHONS", value: "10+ entered, multiple wins", note: "2nd at ContCode (120+ teams) · 2nd at Replit + Resend" },
  { label: "OPEN SOURCE", value: "Library author", note: "Mario Charts — CLI-driven React components (npx)" },
  { label: "AVAILABILITY", value: "Brazil (GMT-3)", note: "Remote · Open to visa sponsorship" },
];

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Slow down video to 0.3x speed
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 0.3;
    }
  }, []);

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
      // TEMP: disabled to debug visibility issue
      // gsap.from("[data-about-badge]", {
      //   scale: 0.8,
      //   opacity: 0,
      //   stagger: 0.05,
      //   duration: 0.6,
      //   ease: "back.out(1.4)",
      //   scrollTrigger: {
      //     trigger: "[data-about-badges]",
      //     start: "top 90%",
      //     end: "top 65%",
      //     scrub: 1,
      //   },
      // });

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

      // Silhouette: gentle fade in
      gsap.from("[data-about-silhouette]", {
        x: 40,
        scale: 0.95,
        opacity: 0,
        duration: 2,
        ease: "power1.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 90%",
          end: "top 40%",
          scrub: 1.5,
        },
      });

      // EXIT: cinematic scale-down as scrolling away (no opacity — stays opaque)
      gsap.to(sectionRef.current, {
        scale: 0.92,
        borderRadius: "24px",
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
    <section ref={sectionRef} className="relative overflow-hidden bg-background px-6 py-40">
      {/* Mario silhouette */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        data-about-silhouette
        src="/mario.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 select-none object-contain mix-blend-screen md:right-[5%] md:h-[550px] md:w-[550px] lg:right-[8%] lg:h-[650px] lg:w-[650px]"
        style={{
          opacity: 0.08,
          filter: "blur(1px) saturate(0.3)",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-4xl">
        {/* Statement */}
        <h2
          data-about-headline
          className="font-sans text-4xl font-black leading-[1.15] tracking-tight text-foreground-bright md:text-5xl lg:text-6xl"
        >
          Ships fast. Owns the stack.{" "}
          <span className="text-accent">Builds tools other devs actually use.</span>
        </h2>

        {/* Bio — what a recruiter needs */}
        <p
          data-about-bio
          className="mt-10 max-w-3xl font-sans text-lg leading-relaxed text-foreground-bright md:text-xl"
        >
          Full-stack engineer building production systems in TypeScript, React, Node.js, Go, and Rust. Built a marketplace from zero and introduced engineering standards that cut production bugs by 60%. Deep in web3 — shipped multi-chain payment systems across Ethereum, Solana, and NEAR, and wrote a subscription billing protocol in Rust on Solana. I don&apos;t just use blockchains, I build infrastructure on them.
        </p>

        <p
          data-about-bio
          className="mt-6 max-w-3xl font-sans text-lg leading-relaxed text-foreground-bright md:text-xl"
        >
          Ranked Top 1% twice in Brazil&apos;s Programming Olympiad (15,000+ participants). Won prizes at hackathons by shipping complete products in hours, not days. Author of Mario Charts, an open-source React library with CLI-driven integration that external developers can actually use.
        </p>

        <p
          data-about-bio
          className="mt-6 max-w-3xl font-sans text-lg leading-relaxed text-foreground-bright md:text-xl"
        >
          I use Claude Code, Cursor, and custom MCP integrations as core engineering infrastructure — AI-native workflow, not autocomplete. Ambassador at Borderless Coding, where I mentor developers for international careers and organize hackathons. I ship clean, composable code that other engineers can read, extend, and build on.
        </p>

        {/* Tech badges */}
        <div data-about-badges className="mt-12 flex flex-wrap gap-2">
          {TECH_BADGES.map((tech) => (
            <div
              key={tech.name}
              data-about-badge
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 transition-premium hover:border-accent hover:bg-surface-hover"
            >
              <tech.Icon className="h-3.5 w-3.5 text-accent" />
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
          className="mt-16 grid grid-cols-1 gap-8 border-t border-border pt-8 sm:grid-cols-2 md:grid-cols-3"
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
