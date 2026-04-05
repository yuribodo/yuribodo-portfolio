import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <LoadingScreen />
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
