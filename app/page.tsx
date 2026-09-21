import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { KonamiCode } from "@/components/easter-eggs/konami-code";
import { LobbyGate } from "@/components/lobby/lobby-gate";

// Static HTML (no request headers): device gating happens client-side in
// LobbyGate, so the page can be CDN-cached and served instantly everywhere.
export default function Home() {
  return (
    <>
      <LobbyGate />
      <CustomCursor />
      <AsciiNoise />
      <Header />
      <Contact />
      <main className="relative z-10">
        <Hero />
        <About />
      </main>
      <div className="h-screen" data-reveal-spacer aria-hidden />
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
