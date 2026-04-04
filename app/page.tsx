import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Projects } from "@/components/sections/projects";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiDivider } from "@/components/ui/ascii-divider";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <AsciiNoise />
      <Header />
      <main className="relative z-10">
        <Hero />
        <AsciiDivider pattern={0} />
        <About />
        <AsciiDivider pattern={1} />
        <section id="projects">
          <Projects />
        </section>
      </main>
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
