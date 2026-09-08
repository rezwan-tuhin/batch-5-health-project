import type { Role } from "@/lib/dummy-data";

export const roleAccent: Record<
  Role,
  { text: string; bg: string; ring: string; dot: string; gradient: string }
> = {
  patient: {
    text: "text-sky-400",
    bg: "bg-sky-500/15",
    ring: "ring-sky-500/30",
    dot: "bg-sky-400",
    gradient: "from-sky-500/10",
  },
  provider: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-400",
    gradient: "from-emerald-500/10",
  },
  regulator: {
    text: "text-violet-400",
    bg: "bg-violet-500/15",
    ring: "ring-violet-500/30",
    dot: "bg-violet-400",
    gradient: "from-violet-500/10",
  },
  er_specialist: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    ring: "ring-red-500/30",
    dot: "bg-red-400",
    gradient: "from-red-500/10",
  },
  admin: {
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/30",
    dot: "bg-amber-400",
    gradient: "from-amber-500/10",
  },
};