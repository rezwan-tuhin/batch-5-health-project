"use client";

import { useState } from "react";
import Badge from "@/components/Badge";
import type { RecordAnchor, RecordType } from "@/lib/dummy-data";

const typeMeta: Record<RecordType, { label: string; tone: "emerald" | "sky" | "amber" | "violet" | "red" | "zinc" }> = {
  lab_report: { label: "Lab Report", tone: "emerald" },
  imaging: { label: "Imaging", tone: "sky" },
  prescription: { label: "Prescription", tone: "amber" },
  discharge_summary: { label: "Discharge Summary", tone: "violet" },
  ecg: { label: "ECG", tone: "red" },
  allergy_panel: { label: "Allergy Panel", tone: "zinc" },
  vaccination: { label: "Vaccination", tone: "emerald" },
};

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function RecordViewer({
  record,
  onClose,
}: {
  record: RecordAnchor;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const meta = typeMeta[record.recordType];

  const handleCopy = () => {
    copyToClipboard(record.ipfsCid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{record.title}</h3>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {record.hospital} · {record.date} · Ordered by {record.providerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-800 px-2.5 py-1 text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {record.content.summary && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Summary
              </h4>
              <p className="text-sm leading-relaxed text-zinc-300">
                {record.content.summary}
              </p>
            </section>
          )}

          {record.content.findings && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Findings
              </h4>
              <div className="overflow-hidden rounded-md border border-zinc-800">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-800">
                    {record.content.findings.map((f, i) => (
                      <tr key={i} className="bg-zinc-900/40">
                        <td className="px-4 py-2.5 text-zinc-300">{f.label}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-white">
                          {f.value}
                        </td>
                        {f.reference && (
                          <td className="px-4 py-2.5 text-right text-xs text-zinc-600">
                            ref {f.reference}
                          </td>
                        )}
                        {f.flag && (
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`text-xs font-medium ${
                                f.flag === "normal"
                                  ? "text-emerald-400"
                                  : f.flag === "high"
                                    ? "text-red-400"
                                    : "text-amber-400"
                              }`}
                            >
                              {f.flag.toUpperCase()}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {record.content.medications && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Medications
              </h4>
              <div className="space-y-2">
                {record.content.medications.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{m.name}</span>
                      <span className="text-sm text-zinc-400">{m.dosage}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{m.frequency}</div>
                    {m.instructions && (
                      <div className="mt-1 text-xs text-zinc-600">{m.instructions}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {record.content.impression && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Impression
              </h4>
              <p className="text-sm text-zinc-300">{record.content.impression}</p>
            </section>
          )}

          {record.content.allergens && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Allergens Detected
              </h4>
              <div className="space-y-2">
                {record.content.allergens.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-2.5"
                  >
                    <span className="text-sm text-zinc-300">{a.name}</span>
                    <Badge
                      tone={
                        a.severity === "severe"
                          ? "red"
                          : a.severity === "moderate"
                            ? "amber"
                            : "zinc"
                      }
                    >
                      {a.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {record.content.rhythm && (
            <section className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <div className="text-xs text-zinc-500">Rhythm</div>
                <div className="mt-1 text-sm font-medium text-white">
                  {record.content.rhythm}
                </div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <div className="text-xs text-zinc-500">Heart Rate</div>
                <div className="mt-1 text-sm font-medium text-white">
                  {record.content.rate}
                </div>
              </div>
            </section>
          )}

          {record.content.notes && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Clinical Notes
              </h4>
              <p className="text-sm leading-relaxed text-zinc-400">
                {record.content.notes}
              </p>
            </section>
          )}

          <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                IPFS Content Identifier
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="truncate font-mono text-xs text-sky-300">
                  {record.ipfsCid}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">On-chain hash integrity</span>
              <Badge tone={record.hashVerified ? "emerald" : "red"}>
                {record.hashVerified ? "Hash Verified" : "Hash Mismatch"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Anchor status</span>
              <Badge tone={record.tombstoned ? "red" : "emerald"}>
                {record.tombstoned ? "Tombstoned" : "Active Anchor"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Anchored by</span>
              <span className="font-mono text-zinc-400">{record.anchoredBy}</span>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}