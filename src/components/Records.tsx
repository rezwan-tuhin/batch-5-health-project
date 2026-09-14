"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { queryKeys, useRecords, usePatients } from "@/hooks";
import { chainAnchorRecord, chainTombstoneRecord, ChainNotWiredError } from "@/lib/chain";
import { typeMeta } from "@/lib/record-meta";
import type { RecordListItem } from "@/lib/api";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import RecordViewer from "@/components/RecordViewer";
import { QueryError, CardGridSkeleton, InlineNotice } from "@/components/QueryState";

export default function Records() {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const canAnchor =
    !!user && ["provider", "patient", "regulator", "admin"].includes(user.role);

  const [viewing, setViewing] = useState<RecordListItem | null>(null);
  const [patient, setPatient] = useState("");
  const [title, setTitle] = useState("");
  const [recordHash, setRecordHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: records,
    isLoading,
    isError,
    error,
  } = useRecords({ enabled: !!user });
  const { data: patients } = usePatients({ enabled: canAnchor });

  if (!user) return null;

  const isReadOnly = user.role === "er_specialist";
  const list: RecordListItem[] = records ?? [];

  const submitAnchor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !title || !recordHash) return;
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      const record = await api.records.anchor({
        patientAddress: patient,
        title,
        recordHash,
        anchoredBy: user.address,
        providerName: user.name,
      });
      try {
        await chainAnchorRecord({
          patientAddress: patient,
          recordId: record.recordId,
          recordHash,
          pointer: record.pointer,
        });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — metadata saved, on-chain anchor pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
      setPatient("");
      setTitle("");
      setRecordHash("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to anchor record");
    } finally {
      setSubmitting(false);
    }
  };

  const tombstone = async (p: string, id: string) => {
    setNotice(null);
    setFormError(null);
    try {
      await api.records.tombstone({ patientAddress: p, recordId: id });
      try {
        await chainTombstoneRecord({ patientAddress: p, recordId: id });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — metadata updated, on-chain tombstone pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to tombstone record");
    }
  };

  const canTombstone = (r: RecordListItem) =>
    !isReadOnly &&
    (user.role === "patient"
      ? r.patientAddress === user.address
      : user.role === "regulator" || user.role === "admin") &&
    !r.tombstoned;

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
          <InlineNotice tone="amber">
            Record access is limited to patients with an active emergency session.
          </InlineNotice>
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
                  (patients ?? [])
                    .filter((p) => p.registered)
                    .map((p) => (
                      <option key={p.address} value={p.address}>
                        {p.name ?? p.address}
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
                disabled={submitting}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Anchoring…" : "Anchor"}
              </button>
            </form>
            {formError && <QueryError error={new Error(formError)} />}
            {notice && <InlineNotice>{notice}</InlineNotice>}
          </Card>
        )}

        {isLoading && <CardGridSkeleton count={6} />}
        {isError && <QueryError error={error} />}
        {!isLoading && !isError && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...list]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((r) => {
                const meta = typeMeta[r.recordType];
                return (
                  <div
                    key={r.recordId}
                    className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
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
                      {r.patientName ?? r.patientAddress} · {r.date}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600">{r.hospital}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Anchored by</span>
                      <span className="text-zinc-400">{r.anchoredBy}</span>
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
                      {canTombstone(r) && (
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
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No records available to you.
          </div>
        )}
      </div>

      {viewing && <RecordViewer record={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}