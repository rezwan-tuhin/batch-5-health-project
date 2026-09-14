export function QueryError({ error }: { error?: Error | null }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
      <span className="font-medium">Failed to load data.</span>{" "}
      <span className="text-red-300/80">
        {error.message ||
          "Check that the backend API routes are implemented."}
      </span>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
        >
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-3 w-2/3 rounded bg-zinc-800" />
          <div className="mt-2 h-3 w-full rounded bg-zinc-800/60" />
          <div className="mt-4 h-8 w-full rounded bg-zinc-800/60" />
        </div>
      ))}
    </div>
  );
}

export function InlineNotice({
  tone = "amber",
  children,
}: {
  tone?: "amber" | "emerald" | "red";
  children: React.ReactNode;
}) {
  const tones = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
  };
  return (
    <div className={`rounded-lg border px-5 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}