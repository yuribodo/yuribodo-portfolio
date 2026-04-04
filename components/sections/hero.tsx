"use client";

import { useRef } from "react";
import { TextParticles } from "@/components/canvas/text-particles";
import { HeroScene } from "@/components/canvas/hero-scene";
import { startSoundtrack } from "@/lib/audio-manager";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  function handleBootComplete() {
    startSoundtrack("/audio/soundtrack.mp3");
  }

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      <TextParticles
        text="YURI BODO"
        fontSize={72}
        color="#ede4df"
        onBootComplete={handleBootComplete}
      />
      <HeroScene />

      {/* Subtitle — appears after boot */}
      <div className="pointer-events-none absolute bottom-[20%] left-1/2 -translate-x-1/2 text-center">
        <p className="font-sans text-sm font-semibold uppercase tracking-[4px] text-muted">
          Creative Frontend Developer
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs text-subtle">
        SCROLL ▼
      </div>
    </section>
  );
}
