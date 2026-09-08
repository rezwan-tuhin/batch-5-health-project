"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  providerProfiles,
  patientProfiles,
  type PatientProfile,
} from "@/lib/dummy-data";
import { roleAccent } from "@/lib/roles";
import { typeMeta } from "@/lib/record-meta";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

export default function ProviderDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const records = useAppSelector((s) => s.records.list);
  const consents = useAppSelector((s) => s.consents.list);
  const accent = user ? roleAccent[user.role] : roleAccent.provider;

  if (!user) return null;

  const profile = providerProfiles.find((p) => p.address === user.address);
  const isVerified = true;
  const myConsents = consents.filter(
    (c) => c.providerAddress === user.address && c.active,
  );
  const consentedPatientAddresses = myConsents.map((c) => c.patientAddress);
  const myPatients = patientProfiles.filter((p) =>
    consentedPatientAddresses.includes(p.address),
  ) as PatientProfile[];
  const myPatientsRecords = records.filter(
    (r) => consentedPatientAddresses.includes(r.patientAddress) && !r.tombstoned,
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-800 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{user.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {profile?.specialty} · {profile?.hospital}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
            >
              My Patients
            </Link>
            <Link
              href="/records"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              Patient Records
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Active Consents
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {myConsents.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">patients granted access</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Patients
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {myPatients.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">under your care</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Records
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {myPatientsRecords.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">accessible right now</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Verification
            </div>
            <div className="mt-2">
              <Badge tone={isVerified ? "emerald" : "amber"}>
                {isVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-zinc-500">license {profile?.licenseNumber}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Consented Patients" subtitle="Patients who granted you access">
            <ul className="divide-y divide-zinc-800">
              {myPatients.map((p) => (
                <li key={p.address} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{p.name}</div>
                    <div className="text-xs text-zinc-500">
                      {p.bloodType} · {p.allergies.length ? p.allergies.join(", ") : "No allergies"}
                    </div>
                  </div>
                  <Badge tone="emerald">Consented</Badge>
                </li>
              ))}
              {myPatients.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No patients have granted you access yet.
                </li>
              )}
            </ul>
          </Card>

          <Card title="Recent Accessible Records" subtitle="Latest documents you can view">
            <ul className="divide-y divide-zinc-800">
              {myPatientsRecords.slice(0, 5).map((r) => {
                const meta = typeMeta[r.recordType];
                return (
                  <li key={r.recordId} className="flex items-center gap-3 py-3">
                    <span className="text-lg">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-200">{r.title}</div>
                      <div className="text-xs text-zinc-500">
                        {r.date} · {r.hospital}
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
              {myPatientsRecords.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-600">
                  No records available under active consents.
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}