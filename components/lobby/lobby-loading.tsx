export function LobbyLoading({ contained = false, onSkip }: { contained?: boolean; onSkip?: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-lobby-loading
      className={`${contained ? "pointer-events-none absolute z-10" : "fixed z-[60]"} inset-0 flex motion-reduce:hidden flex-col items-center justify-center bg-background`}
    >
      <span className="font-sans text-2xl font-black tracking-[-1px] text-foreground-bright">
        YURI <span className="text-accent">BODO</span>
      </span>
      <div aria-hidden className="mt-6 h-px w-32 overflow-hidden bg-border">
        <div className="lobby-loading-indicator h-full w-1/3 bg-accent" />
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[3px] text-foreground/50">
        Preparing your world…
      </p>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-8 min-h-11 px-4 font-mono text-[10px] uppercase tracking-[3px] text-foreground/70 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Skip to portfolio
        </button>
      )}
    </div>
  );
}
