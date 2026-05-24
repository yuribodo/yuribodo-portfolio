"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
    });

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);
    const tickerCb = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    // Lenis hijacks wheel events in JS, so CSS overflow:hidden on body
    // doesn't stop the page from scrolling underneath the lobby. Watch for
    // the lobby's data-lobby-active attribute and pause/resume Lenis to
    // match — this also prevents ScrollTrigger from firing while gated.
    const syncLobbyLock = () => {
      const locked = !!document.querySelector('[data-lobby-active="true"]');
      if (locked) lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLobbyLock);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-lobby-active"],
    });
    syncLobbyLock();

    return () => {
      observer.disconnect();
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
