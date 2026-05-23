export function LobbyLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background"
    >
      <p className="font-mono text-xs uppercase tracking-[6px] text-foreground/50">
        loading…
      </p>
    </div>
  );
}
