import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <AsciiNoise />
      <Header />
      <main className="relative z-10">
        <Hero />
        <About />
      </main>
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
