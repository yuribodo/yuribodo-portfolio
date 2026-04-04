import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Projects } from "@/components/sections/projects";
import { Skills } from "@/components/sections/skills";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { KonamiCode } from "@/components/easter-eggs/konami-code";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <section id="projects">
          <Projects />
        </section>
        <Skills />
      </main>
      <AudioToggle />
      <KonamiCode />
    </>
  );
}
