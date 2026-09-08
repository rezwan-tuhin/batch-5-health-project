"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { users, auditLog } from "@/lib/dummy-data";
import { roleAccent } from "@/lib/roles";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

export default function AdminDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const patients = useAppSelector((s) => s.patients.list);
  const providers = useAppSelector((s) => s.providers.list);
  const consents = useAppSelector((s) => s.consents.list);
  const records = useAppSelector((s) => s.records.list);
  const emergency = useAppSelector((s) => s.emergency.list);
  const accent = user ? roleAccent[user.role] : roleAccent.admin;

  const byRole = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const totalUsers = users.length;
  const verifiedProviders = providers.filter((p) => p.verified).length;
  const activeConsents = consents.filter((c) => c.active).length;
  const activeEmergency = emergency.filter((e) => e.active).length;
  const anchoredRecords = records.filter((r) => !r.tombstoned).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-800 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">System Administration</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Users, roles, network health and audit trail
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
            >
              Manage Users
            </Link>
            <Link
              href="/records"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-amber-500/50 hover:text-amber-300"
            >
              All Records
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Users
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {totalUsers}
            </div>
            <div className="mt-1 text-xs text-zinc-500">across 5 roles</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Providers Verified
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {verifiedProviders}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              of {providers.length} registered
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Anchors
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {anchoredRecords}
            </div>
            <div className="mt-1 text-xs text-zinc-500">active on ledger</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Active Consents
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {activeConsents}
            </div>
            <div className="mt-1 text-xs text-zinc-500">incl. {activeEmergency} ER</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Users by Role" subtitle="Access control overview">
            <ul className="space-y-3 text-sm">
              {(
                [
                  ["patient", "Patient"],
                  ["provider", "Provider"],
                  ["regulator", "Regulator"],
                  ["er_specialist", "ER Specialist"],
                  ["admin", "Admin"],
                ] as const
              ).map(([role, label]) => (
                <li key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${roleAccent[role].dot}`}
                    />
                    <span className="text-zinc-300">{label}</span>
                  </div>
                  <span className="text-zinc-400">{byRole[role] ?? 0}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Network Health" subtitle="System status summary">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Ledger status</span>
                <Badge tone="emerald">Healthy</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">IPFS gateway</span>
                <Badge tone="emerald">Online</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Contract paused</span>
                <Badge tone="zinc">No</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Consent enforcement</span>
                <Badge tone="emerald">Active</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-zinc-400">Patients registered</span>
                <span className="text-zinc-200">
                  {patients.filter((p) => p.registered).length}
                </span>
              </li>
            </ul>
          </Card>

          <Card title="System Audit Trail" subtitle="Latest security events">
            <ul className="divide-y divide-zinc-800">
              {auditLog.slice(0, 5).map((a) => (
                <li key={a.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-zinc-300">{a.action}</span>
                    <span className="shrink-0 text-[10px] text-zinc-600">
                      {new Date(a.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">{a.actorName}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}