"use client";
interface Props {loading:boolean;busy:boolean;firstVisit:boolean;onEnter:()=>void;onSkip:()=>void}

// One object, one line: a pale glass pill that reads like the courtyard stone,
// with a single ink chip carrying the arrow. Press feedback and hover lift are
// transform-only; reduced motion keeps the colour changes and drops the movement.
const EASE='ease-[cubic-bezier(0.23,1,0.32,1)]';

const button=[
 'world-button group relative inline-flex h-11 items-center gap-3 rounded-full pl-5 pr-1.5',
 'border border-white/70 bg-[#f4efe2]/78 text-[#0e2029] backdrop-blur-xl backdrop-saturate-150',
 'shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_-1px_0_rgba(14,32,41,0.06)_inset,0_1px_2px_rgba(14,32,41,0.12),0_14px_32px_-14px_rgba(14,32,41,0.45)]',
 `transition-[transform,background-color,border-color,box-shadow] duration-200 ${EASE}`,
 'hover:-translate-y-px hover:border-white hover:bg-[#f9f5ea]/90 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_-1px_0_rgba(14,32,41,0.06)_inset,0_2px_4px_rgba(14,32,41,0.12),0_20px_40px_-16px_rgba(14,32,41,0.5)]',
 'active:translate-y-0 active:scale-[0.97] active:duration-100',
 'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0e2029]',
 'aria-busy:cursor-wait aria-busy:hover:translate-y-0 aria-busy:active:scale-100',
 'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
].join(' ');

const chip=[
 'relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0e2029] text-[#f4efe2]',
 'shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(14,32,41,0.3)]',
 `transition-[background-color] duration-200 ${EASE} group-hover:bg-[#16323f]`,
].join(' ');

const arrow=`absolute size-4 transition-transform duration-200 ${EASE} motion-reduce:transition-none`;

export function WorldControls({loading,busy,firstVisit,onEnter,onSkip}:Props){
 // The label stays put while entering; the chip alone reports progress, so the pill never reflows.
 return <>
  {firstVisit && !loading && !busy && (
    <p data-lobby-chrome className="world-chrome-enter pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/70 bg-[#f4efe2]/78 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0e2029]">
      Click the desk. Esc skips to the site.
    </p>
  )}
  <div data-lobby-chrome className="world-chrome-enter absolute bottom-6 right-6 z-20">
   <button className={button} disabled={busy} aria-busy={busy||undefined} onClick={(event) => loading || event.detail === 0 ? onSkip() : onEnter()}>
    <span className="font-sans text-[14px] font-medium tracking-[-0.01em]">{loading?'Skip to portfolio':'Enter portfolio'}</span>
    <span aria-hidden className={chip}>
     {busy
      ? <span className="size-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-[spin_650ms_linear_infinite] motion-reduce:animate-none motion-reduce:border-t-current motion-reduce:opacity-60"/>
      : <>
       <ArrowIcon className={`${arrow} translate-x-0 group-hover:translate-x-[26px] motion-reduce:group-hover:translate-x-0`}/>
       <ArrowIcon className={`${arrow} -translate-x-[26px] group-hover:translate-x-0 motion-reduce:hidden`}/>
      </>}
    </span>
   </button>
  </div>
  <p className="sr-only" role="status" aria-live="polite">{busy?'Entering the portfolio.':loading?'Loading the desk. You can skip to the portfolio.':'At the desk. Explore its objects or enter the portfolio.'}</p>
 </>;
}

function ArrowIcon({className}:{className:string}){
 return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d="M3 8h10"/><path d="M9 4l4 4-4 4"/>
 </svg>;
}
