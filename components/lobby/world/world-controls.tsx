"use client";
interface Props {loading:boolean;busy:boolean;onEnter:()=>void;onSkip:()=>void}
const button='world-button inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-white/25 bg-[#132a35]/90 px-5 font-mono text-xs text-[#f1f3e7] shadow-lg transition-colors hover:bg-[#274450] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff2c7] disabled:cursor-wait disabled:opacity-60';
export function WorldControls({loading,busy,onEnter,onSkip}:Props){
 return <>
  <div className="pointer-events-none absolute left-6 top-6 z-20 text-[#183743]">
   <p className="font-mono text-[10px] font-medium tracking-[0.25em]">YURI’S WORLD</p>
   <p className="mt-1 font-mono text-[10px] opacity-75">At the desk</p>
  </div>
  <div className="absolute bottom-6 right-6 z-20"><button className={button} disabled={busy} onClick={loading?onSkip:onEnter}>{loading?'Skip to portfolio':'Enter portfolio'}<span aria-hidden>↗</span></button></div>
  <p className="sr-only" role="status" aria-live="polite">{loading?'Loading the desk. You can skip to the portfolio.':'At the desk. Explore its objects or enter the portfolio.'}</p>
 </>;
}
