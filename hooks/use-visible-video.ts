"use client";
import { useEffect, type RefObject } from 'react';
import { observePageAnimation } from '@/lib/observe-page-animation';

/** Videos opt into download/playback only when the portfolio is uncovered. */
export function useVisibleVideo(ref: RefObject<HTMLVideoElement | null>, rate: number) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.playbackRate = rate;
    let playing = false;
    const stop = observePageAnimation(video, active => {
      playing = active;
      if (!active) video.pause();
      else video.play().then(() => { if (!playing) video.pause(); }).catch(() => {});
    });
    return () => { playing = false; stop(); video.pause(); };
  }, [ref, rate]);
}
