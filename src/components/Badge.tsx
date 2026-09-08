const toneMap: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300",
  red: "bg-red-500/15 text-red-300",
  amber: "bg-amber-500/15 text-amber-300",
  sky: "bg-sky-500/15 text-sky-300",
  zinc: "bg-zinc-500/15 text-zinc-300",
  violet: "bg-violet-500/15 text-violet-300",
};

export default function Badge({
  tone = "zinc",
  children,
}: {
  tone?: keyof typeof toneMap;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
