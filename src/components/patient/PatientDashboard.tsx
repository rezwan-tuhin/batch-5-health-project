"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { patientProfiles, auditLog } from "@/lib/dummy-data";
import { roleAccent } from "@/lib/roles";
import { typeMeta } from "@/lib/record-meta";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

export default function PatientDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const records = useAppSelector((s) => s.records.list);
  const consents = useAppSelector((s) => s.consents.list);
  const accent = user ? roleAccent[user.role] : roleAccent.patient;

  if (!user) return null;

  const profile = patientProfiles.find((p) => p.address === user.address);
  const myRecords = records.filter(
    (r) => r.patientAddress === user.address && !r.tombstoned,
  );
  const myConsents = consents.filter(
    (c) => c.patientAddress === user.address && c.active,
  );
  const recentActivity = auditLog
    .filter((a) => a.actorName === user.name || a.target.includes(user.name))
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-800 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Your health records, consents and access activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/records"
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-sky-400"
            >
              View My Records
            </Link>
            <Link
              href="/consents"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-sky-500/50 hover:text-sky-300"
            >
              Manage Consents
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
          <Card title="Patient Profile" subtitle="Identity & emergency details">
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-zinc-500">DID</span>
                <span className="font-mono text-xs text-zinc-300">{user.didURI}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Blood Type</span>
                <Badge tone="red">{profile?.bloodType ?? "—"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Date of Birth</span>
                <span className="text-zinc-300">{profile?.dob ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Primary Provider</span>
                <span className="text-zinc-300">{profile?.primaryProvider ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Insurance</span>
                <span className="text-xs text-zinc-300">{profile?.insurance ?? "—"}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <div className="mb-1.5 text-xs text-zinc-500">Allergies</div>
                {profile?.allergies?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.allergies.map((a) => (
                      <Badge key={a} tone="red">
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">None on file</span>
                )}
                <div className="mt-3 mb-1.5 text-xs text-zinc-500">Emergency Contact</div>
                <div className="text-xs text-zinc-400">{profile?.emergencyContact}</div>
              </div>
            </div>
          </Card>
          </div>

          <div className="grid gap-6 lg:col-span-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  My Records
                </div>
                <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
                  {myRecords.length}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  active, hash-verified anchors
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Active Consents
                </div>
                <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
                  {myConsents.length}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  providers with access right now
                </div>
              </div>
            </div>

            <Card title="Recent Records" subtitle="Latest anchored medical documents">
              <ul className="divide-y divide-zinc-800">
                {myRecords.slice(0, 3).map((r) => {
                  const meta = typeMeta[r.recordType];
                  return (
                    <li key={r.recordId} className="flex items-center gap-3 py-3">
                      <span className="text-lg">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-zinc-200">{r.title}</div>
                        <div className="text-xs text-zinc-500">
                          {r.date} · {r.providerName}
                        </div>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </li>
                  );
                })}
                {myRecords.length === 0 && (
                  <li className="py-6 text-center text-sm text-zinc-600">
                    No records yet
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Who Can Access My Data" subtitle="Active consents granted">
            <ul className="divide-y divide-zinc-800">
              {myConsents.map((c) => (
                <li key={c.providerAddress} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{c.providerName}</div>
                    <div className="text-xs text-zinc-500">{c.purpose}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-600">
                      {c.expiresAt === 0
                        ? "No expiry"
                        : `Expires ${new Date(c.expiresAt * 1000).toLocaleDateString()}`}
                    </div>
                  </div>
                  <Badge tone="emerald">Active</Badge>
                </li>
              ))}
              {myConsents.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No active consents. Your data stays private.
                </li>
              )}
            </ul>
          </Card>

          <Card title="Recent Activity" subtitle="Audit trail on your records">
            <ul className="divide-y divide-zinc-800">
              {recentActivity.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-200">{a.action}</span>
                    <span className="text-xs text-zinc-600">
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {a.actorName} · {a.details}
                  </div>
                </li>
              ))}
              {recentActivity.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No activity on record
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}