"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { patientProfiles } from "@/lib/dummy-data";
import { roleAccent } from "@/lib/roles";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

export default function ERDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const emergency = useAppSelector((s) => s.emergency.list);
  const records = useAppSelector((s) => s.records.list);
  const patients = useAppSelector((s) => s.patients.list);
  const accent = user ? roleAccent[user.role] : roleAccent.er_specialist;

  const activeSessions = emergency.filter((e) => e.active);
  const myActive = activeSessions.filter(
    (e) => e.doctorAddress === user?.address,
  );
  const admittedPatientAddrs = activeSessions.map((e) => e.patientAddress);
  const admittedRecords = records.filter(
    (r) => admittedPatientAddrs.includes(r.patientAddress) && !r.tombstoned,
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-800 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Emergency Department</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Break-glass access · Life-threatening situations only
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/emergency"
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-red-400"
            >
              Trigger Emergency Access
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              Active Sessions
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {activeSessions.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">network-wide</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Your Sessions
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {myActive.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">initiated by you</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Accessible Records
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {admittedRecords.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">via active sessions</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Active Emergency Sessions" subtitle="Break-glass events in progress">
            <ul className="divide-y divide-zinc-800">
              {activeSessions.map((e, i) => {
                const patient = patientProfiles.find(
                  (p) => p.address === e.patientAddress,
                );
                return (
                  <li key={i} className="rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {patient?.name ?? e.patientAddress}
                      </span>
                      <Badge tone="red">Break-glass</Badge>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Attending: <span className="text-zinc-200">{e.doctorName}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{e.justification}</div>
                    <div className="mt-1 text-[11px] font-mono text-red-300">
                      expires {new Date(e.validUntil).toLocaleString()}
                    </div>
                  </li>
                );
              })}
              {activeSessions.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No active emergency sessions.
                </li>
              )}
            </ul>
          </Card>

          <Card title="Admitted Patient Records" subtitle="Visible through active sessions">
            <ul className="divide-y divide-zinc-800">
              {admittedRecords.slice(0, 6).map((r) => (
                <li key={r.recordId} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-zinc-200">{r.title}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(r.date).toLocaleDateString()} · {r.hospital}
                    </div>
                  </div>
                  <Link
                    href="/records"
                    className="text-xs text-zinc-400 hover:text-red-300"
                  >
                    View →
                  </Link>
                </li>
              ))}
              {admittedRecords.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No records accessible yet. Trigger a session to view.
                </li>
              )}
            </ul>
          </Card>
        </div>

        <Card title="Registered Patients — Quick Lookup" subtitle="All on-chain patient identities">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients
              .filter((p) => p.registered)
              .map((p) => {
                const profile = patientProfiles.find((x) => x.address === p.address);
                const hasActive = activeSessions.some(
                  (e) => e.patientAddress === p.address,
                );
                return (
                  <div
                    key={p.address}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-200">
                        {profile?.name ?? p.address}
                      </span>
                      {hasActive ? (
                        <Badge tone="red">Active ER</Badge>
                      ) : (
                        <Badge tone="zinc">Standing</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Blood {profile?.bloodType ?? "—"} · {profile?.dob ?? "—"}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}