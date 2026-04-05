"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/yuribodo", icon: "GH" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/mario-lara-1a801b272/", icon: "LI" },
  { label: "Email", href: "mailto:contact@yuribodo.dev", icon: "EM" },
] as const;

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!headerRef.current) return;

    gsap.fromTo(
      headerRef.current,
      { yPercent: -100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "+=600",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 z-40 flex w-full items-center justify-between border-b border-border bg-background/80 px-6 py-3 opacity-0 backdrop-blur-md"
    >
      <span className="font-sans text-sm font-black tracking-tight text-foreground-bright">
        YURI <span className="text-accent">BODO</span>
      </span>

      <nav className="flex items-center gap-4">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="font-mono text-xs text-subtle transition-colors transition-premium hover:text-accent"
            aria-label={link.label}
          >
            {link.icon}
          </a>
        ))}
      </nav>
    </header>
  );
}
