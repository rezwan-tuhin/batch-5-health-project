"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { anchorRecord, tombstoneRecord } from "@/store/slices/recordsSlice";
import { visibleRecords } from "@/lib/access";
import { patientProfiles, providerProfiles } from "@/lib/dummy-data";
import { typeMeta } from "@/lib/record-meta";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import RecordViewer from "@/components/RecordViewer";

export default function Records() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const records = useAppSelector((s) => s.records.list);
  const patients = useAppSelector((s) => s.patients.list);
  const consents = useAppSelector((s) => s.consents.list);
  const emergency = useAppSelector((s) => s.emergency.list);

  const [viewing, setViewing] = useState<(typeof records)[number] | null>(null);
  const [patient, setPatient] = useState("");
  const [title, setTitle] = useState("");
  const [recordHash, setRecordHash] = useState("");

  if (!user) return null;

  const isReadOnly = user.role === "er_specialist";
  const list = visibleRecords(user.role, user, records, consents, emergency);

  const patientName = (addr: string) =>
    patientProfiles.find((p) => p.address === addr)?.name ?? addr;
  const providerName = (addr: string) =>
    providerProfiles.find((p) => p.address === addr)?.name ?? "Self";

  const submitAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !title || !recordHash) return;
    const cid =
      "Qm" +
      Array.from({ length: 44 }, () =>
        "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)],
      ).join("");
    dispatch(
      anchorRecord({
        patientAddress: patient,
        recordId: "0x" + Array.from({ length: 64 }, () =>
          "0123456789abcdef"[Math.floor(Math.random() * 16)],
        ).join(""),
        recordHash,
        pointer: `ipfs://${cid}`,
        anchoredBy: user.address,
        anchoredAt: new Date().toISOString(),
      }),
    );
    setPatient("");
    setTitle("");
    setRecordHash("");
  };

  const tombstone = (p: string, id: string) => {
    dispatch(tombstoneRecord({ patientAddress: p, recordId: id }));
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={
          user.role === "patient"
            ? "My Records"
            : isReadOnly
              ? "Patient Records"
              : "Records"
        }
        description="IPFS-hosted medical documents with on-chain hash anchors"
      />

      <div className="flex-1 space-y-6 p-8">
        {isReadOnly ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
            Record access is limited to patients with an active emergency
            session.
          </div>
        ) : (
          <Card title="Anchor Record" subtitle="Store record hash + IPFS CID on-chain">
            <form
              onSubmit={submitAnchor}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1.5fr_auto]"
            >
              <select
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">
                  {user.role === "patient" ? "You" : "Patient…"}
                </option>
                {user.role === "patient" ? (
                  <option value={user.address}>{user.name}</option>
                ) : (
                  patients
                    .filter((p) => p.registered)
                    .map((p) => (
                      <option key={p.address} value={p.address}>
                        {patientProfiles.find((x) => x.address === p.address)?.name ??
                          p.address}
                      </option>
                    ))
                )}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Record title (e.g. CBC — Routine)"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <input
                value={recordHash}
                onChange={(e) => setRecordHash(e.target.value)}
                placeholder="Record hash (bytes32)"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
              >
                Anchor
              </button>
            </form>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...list]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((r) => {
              const meta = typeMeta[r.recordType];
              return (
                <div
                  key={r.recordId}
                  className={`flex flex-col rounded-lg border bg-zinc-900/40 p-5 ${
                    r.tombstoned ? "border-zinc-800" : "border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </span>
                    </div>
                    {r.tombstoned ? (
                      <Badge tone="red">Tombstoned</Badge>
                    ) : (
                      <Badge tone="emerald">
                        {r.hashVerified ? "Hash OK" : "Mismatch"}
                      </Badge>
                    )}
                  </div>
                  <h4 className="mt-3 text-sm font-semibold leading-snug text-white">
                    {r.title}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500">
                    {patientName(r.patientAddress)} · {r.date}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">{r.hospital}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Anchored by</span>
                    <span className="text-zinc-400">
                      {providerName(r.anchoredBy)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">IPFS CID</span>
                    <code className="max-w-[140px] truncate font-mono text-sky-400">
                      {r.ipfsCid}
                    </code>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setViewing(r)}
                      className="flex-1 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      View Record
                    </button>
                    {!r.tombstoned &&
                      !isReadOnly &&
                      (user.role === "patient"
                        ? r.patientAddress === user.address
                        : user.role === "regulator" || user.role === "admin") && (
                        <button
                          onClick={() => tombstone(r.patientAddress, r.recordId)}
                          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500 hover:text-red-400"
                        >
                          Tombstone
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
        </div>

        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No records available to you.
          </div>
        )}
      </div>

      {viewing && <RecordViewer record={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}