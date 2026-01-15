import { Terminal } from "@/components/ui/terminal";

const terminalLines = [
  { type: "command" as const, text: "whoami", delay: 1000 },
  { type: "output" as const, text: "Yuri Bodo" },
  { type: "command" as const, text: "cat status.txt" },
  { type: "output" as const, text: "Building something awesome..." },
  { type: "command" as const, text: "echo $ETA" },
  { type: "output" as const, text: "Coming Soon" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Terminal lines={terminalLines} />

      <p className="mt-8 text-sm text-zinc-500 font-mono">
        <span className="text-zinc-600">&gt;</span> portfolio.init()
      </p>
    </main>
  );
}
