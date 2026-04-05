"use client";

import { useEffect, useRef, forwardRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LiquidBackground } from "./contact-liquid-bg";
import { LiquidText } from "./contact-liquid-text";

gsap.registerPlugin(ScrollTrigger);

const CONTACT_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/yuribodo",
    handle: "@yuribodo",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/mario-lara-1a801b272/",
    handle: "/in/mario-lara",
  },
] as const;

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const squirtleRef = useRef<HTMLVideoElement>(null);
  const yugiRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (squirtleRef.current) squirtleRef.current.playbackRate = 0.8;
    if (yugiRef.current) yugiRef.current.playbackRate = 0.8;
  }, []);

  useGSAP(
    () => {
      if (reducedMotion || !contentRef.current) return;

      gsap.set(contentRef.current, { opacity: 0, y: 30 });

      const spacer = document.querySelector("[data-reveal-spacer]");
      if (spacer) {
        ScrollTrigger.create({
          trigger: spacer,
          start: "top bottom",
          end: "center bottom",
          scrub: 0.5,
          onUpdate: (self) => {
            gsap.set(contentRef.current, {
              opacity: self.progress,
              y: 30 * (1 - self.progress),
            });
          },
        });
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Contact"
      className="fixed inset-x-0 bottom-0 z-[1] h-screen overflow-hidden bg-background"
    >
      {/* Squirtle silhouette — left side */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={squirtleRef}
        src="/squirtle.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[15%] left-0 z-[2] h-[300px] w-[300px] select-none object-contain mix-blend-screen md:left-[5%] md:h-[400px] md:w-[400px] lg:left-[8%]"
        style={{
          opacity: 0.08,
          filter: "blur(1px) saturate(0.3)",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Yugi silhouette — right side */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={yugiRef}
        src="/yugi.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[10%] z-[2] h-[300px] w-[300px] select-none object-contain mix-blend-screen md:right-[5%] md:h-[400px] md:w-[400px] lg:right-[8%]"
        style={{
          opacity: 0.08,
          filter: "blur(1px) saturate(0.3)",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Liquid reactive background */}
      <LiquidBackground reducedMotion={reducedMotion} />

      {/* Content — normal HTML, fully interactive */}
      <div
        ref={contentRef}
        className="relative z-10 flex h-full w-full flex-col items-center justify-center"
      >
        <LiquidText text="LET'S TALK" reducedMotion={reducedMotion} />

        <blockquote className="mt-8 flex flex-col items-center gap-1">
          <p className="text-center font-sans text-lg italic tracking-wide text-foreground/50 sm:text-xl">
            &ldquo;1 year as a tiger or 20 as a turtle?&rdquo;
          </p>
        </blockquote>

        <nav className="mt-[clamp(2.5rem,5vw,4rem)] flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          {CONTACT_LINKS.map((link) => (
            <ContactLink key={link.href} {...link} reducedMotion={reducedMotion} />
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-6 flex justify-between px-8 font-mono text-[11px] text-foreground/25">
          <span>&copy; 2026 Yuri Bodo</span>
          <span>Built with obsession</span>
          <span>São Paulo, BR</span>
        </div>
      </div>
    </section>
  );
}

// --- Contact Link ---

interface ContactLinkProps {
  label: string;
  href: string;
  handle: string;
  reducedMotion: boolean;
}

const ContactLink = forwardRef<HTMLAnchorElement, ContactLinkProps>(
  function ContactLink({ label, href, handle, reducedMotion }, ref) {
    const innerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
      if (reducedMotion || !innerRef.current) return;
      const original = innerRef.current.querySelector("[data-text='original']") as HTMLElement;
      const clone = innerRef.current.querySelector("[data-text='clone']") as HTMLElement;
      if (original && clone) {
        gsap.to(original, { yPercent: -100, duration: 0.3, ease: "power2.inOut" });
        gsap.to(clone, { yPercent: -100, duration: 0.3, ease: "power2.inOut" });
      }
    };

    const handleMouseLeave = () => {
      if (reducedMotion || !innerRef.current) return;
      const original = innerRef.current.querySelector("[data-text='original']") as HTMLElement;
      const clone = innerRef.current.querySelector("[data-text='clone']") as HTMLElement;
      if (original && clone) {
        gsap.to(original, { yPercent: 0, duration: 0.3, ease: "power2.inOut" });
        gsap.to(clone, { yPercent: 0, duration: 0.3, ease: "power2.inOut" });
      }
    };

    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-full border border-accent/30 px-6 py-3 transition-colors hover:border-accent/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
          {label}
        </span>
        <div ref={innerRef} className="relative overflow-hidden">
          <div data-text="original" className="text-sm leading-tight text-foreground">
            {handle}
          </div>
          <div
            data-text="clone"
            className="absolute inset-x-0 top-full text-sm leading-tight text-foreground-bright"
            aria-hidden
          >
            {handle}
          </div>
        </div>
        <span className="text-subtle transition-colors group-hover:text-accent">↗</span>
      </a>
    );
  }
);
