import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Projects } from "@/components/sections/projects";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <AsciiNoise />
      <Header />
      <main className="relative z-10">
        <Hero />
        <About />
        <section id="projects">
          <Projects />
        </section>
      </main>
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
