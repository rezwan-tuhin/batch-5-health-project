import type { RecordType } from "@/lib/dummy-data";

export const typeMeta: Record<
  RecordType,
  { label: string; tone: "emerald" | "sky" | "amber" | "violet" | "red" | "zinc"; icon: string }
> = {
  lab_report: { label: "Lab Report", tone: "emerald", icon: "🔬" },
  imaging: { label: "Imaging", tone: "sky", icon: "🩻" },
  prescription: { label: "Prescription", tone: "amber", icon: "💊" },
  discharge_summary: { label: "Discharge Summary", tone: "violet", icon: "📋" },
  ecg: { label: "ECG", tone: "red", icon: "📈" },
  allergy_panel: { label: "Allergy Panel", tone: "zinc", icon: "🧬" },
  vaccination: { label: "Vaccination", tone: "emerald", icon: "💉" },
};

export function formatBytes32(hex: string): string {
  if (hex.length <= 14) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

export function shortAddress(addr: string): string {
  return addr;
}