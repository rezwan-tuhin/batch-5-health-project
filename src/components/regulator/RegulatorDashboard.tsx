"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  usePatients,
  useProviders,
  useConsents,
  useRecords,
  useEmergency,
  useAudit,
} from "@/hooks";
import { roleAccent } from "@/lib/roles";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { QueryError, CardGridSkeleton } from "@/components/QueryState";

export default function RegulatorDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const accent = user ? roleAccent[user.role] : roleAccent.regulator;

  const { data: patients } = usePatients({ enabled: !!user });
  const { data: providers } = useProviders({ enabled: !!user });
  const { data: consents } = useConsents({ enabled: !!user });
  const { data: records } = useRecords({ enabled: !!user });
  const { data: emergency } = useEmergency({ enabled: !!user });
  const {
    data: audit,
    isLoading: auditLoading,
    isError,
    error,
  } = useAudit({ enabled: !!user });

  if (!user) return null;

  const providerList = providers ?? [];
  const consentList = consents ?? [];
  const recordList = records ?? [];
  const emergencyList = emergency ?? [];

  const verifiedProviders = providerList.filter((p) => p.verified).length;
  const unverifiedProviders = providerList.filter((p) => !p.verified).length;
  const activeConsents = consentList.filter((c) => c.active).length;
  const activeEmergency = emergencyList.filter((e) => e.active).length;
  const activeRecords = recordList.filter((r) => !r.tombstoned).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-800 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Regulator Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Network-wide oversight · Provider verification · Compliance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/providers"
              className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-violet-400"
            >
              Verify Providers
            </Link>
            <Link
              href="/emergency"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-violet-500/50 hover:text-violet-300"
            >
              Review Emergency
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        {isError && <QueryError error={error} />}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Patients
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {(patients ?? []).filter((p) => p.registered).length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">registered</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Providers
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {verifiedProviders}
              <span className="text-sm text-zinc-500">
                {" "}
                / {providerList.length}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">verified</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Active Consents
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {activeConsents}
            </div>
            <div className="mt-1 text-xs text-zinc-500">in force</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Anchored Records
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {activeRecords}
            </div>
            <div className="mt-1 text-xs text-zinc-500">on ledger</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              ER Sessions
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {activeEmergency}
            </div>
            <div className="mt-1 text-xs text-zinc-500">break-glass active</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Provider Verification Queue" subtitle="Awaiting regulator decision">
            <ul className="divide-y divide-zinc-800">
              {providerList
                .filter((p) => !p.verified)
                .map((p) => (
                  <li
                    key={p.address}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-200">
                        {p.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {p.specialty} · {p.hospital}
                      </div>
                    </div>
                    <Badge tone="amber">Pending</Badge>
                  </li>
                ))}
              {unverifiedProviders === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  All providers verified. Queue is clear.
                </li>
              )}
            </ul>
          </Card>

          <Card title="Active Emergency Sessions" subtitle="Break-glass events requiring review">
            <ul className="divide-y divide-zinc-800">
              {emergencyList
                .filter((e) => e.active)
                .map((e, i) => (
                  <li key={i} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-200">
                        {e.doctorName}
                      </span>
                      <Badge tone="red">Active</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {e.justification}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-600">
                      Valid until {new Date(e.validUntil).toLocaleString()}
                    </div>
                  </li>
                ))}
              {!emergencyList.some((e) => e.active) && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No active emergency sessions.
                </li>
              )}
            </ul>
          </Card>
        </div>

        <Card title="Recent Network Activity" subtitle="Latest audit log entries">
          {auditLoading && <CardGridSkeleton count={4} />}
          {!auditLoading && (
            <ul className="divide-y divide-zinc-800">
              {(audit ?? []).slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">
                        {a.action}
                      </span>
                      <Badge tone="zinc">{a.actorRole}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {a.actorName} → {a.target}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {new Date(a.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}