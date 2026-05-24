import { headers } from "next/headers";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Header } from "@/components/ui/header";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { AsciiNoise } from "@/components/ui/ascii-noise";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { KonamiCode } from "@/components/easter-eggs/konami-code";
import { LobbyGate } from "@/components/lobby/lobby-gate";
import { isMobileUserAgent } from "@/lib/lobby/is-mobile";

export default async function Home() {
  const headersList = await headers();
  const isMobile = isMobileUserAgent(headersList.get("user-agent"));

  return (
    <>
      {!isMobile && <LobbyGate isMobile={false} />}
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
