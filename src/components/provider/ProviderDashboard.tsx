"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  useProviderProfile,
  usePatients,
  useRecords,
  useConsents,
  useProviders,
} from "@/hooks";
import { roleAccent } from "@/lib/roles";
import { typeMeta } from "@/lib/record-meta";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import ProviderProfileForm from "@/components/profile/ProviderProfileForm";
import { QueryError, CardGridSkeleton } from "@/components/QueryState";

export default function ProviderDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const accent = user ? roleAccent[user.role] : roleAccent.provider;
  const [editingProfile, setEditingProfile] = useState(false);

  const { data: profile } = useProviderProfile(user?.address ?? "");
  const {
    data: patients,
    isLoading: patientsLoading,
    isError: patientsError,
    error: patientsErr,
  } = usePatients({ enabled: !!user });
  const {
    data: records,
    isLoading: recordsLoading,
    isError: recordsError,
    error: recordsErr,
  } = useRecords({ enabled: !!user });
  const {
    data: consents,
    isLoading: consentsLoading,
    isError: consentsError,
    error: consentsErr,
  } = useConsents({ enabled: !!user });
  const { data: providers } = useProviders({ enabled: !!user });

  if (!user) return null;

  const self = (providers ?? []).find((p) => p.address === user.address);
  const isVerified = self?.verified ?? false;
  const myPatients = patients ?? [];
  const myConsents = (consents ?? []).filter(
    (c) => c.providerAddress === user.address && c.active,
  );
  const consentedPatientAddresses = myConsents.map((c) => c.patientAddress);
  const myPatientsRecords = (records ?? []).filter(
    (r) => consentedPatientAddresses.includes(r.patientAddress) && !r.tombstoned,
  );

  const loading = patientsLoading || recordsLoading || consentsLoading;
  const hasError = patientsError || recordsError || consentsError;
  const error = patientsErr ?? recordsErr ?? consentsErr;

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
            <button
              onClick={() => setEditingProfile(true)}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        {hasError && <QueryError error={error} />}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Active Consents
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {consentsLoading ? "…" : myConsents.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">patients granted access</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Patients
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {patientsLoading ? "…" : myPatients.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">under your care</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Records
            </div>
            <div className={`mt-2 text-3xl font-semibold ${accent.text}`}>
              {recordsLoading ? "…" : myPatientsRecords.length}
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
            <div className="mt-1 text-xs text-zinc-500">
              license {profile?.licenseNumber}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Consented Patients" subtitle="Patients who granted you access">
            {loading && !myPatients.length && <CardGridSkeleton count={3} />}
            {!loading && (
              <ul className="divide-y divide-zinc-800">
                {myPatients.map((p) => (
                  <li
                    key={p.address}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-200">
                        {p.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {p.bloodType} ·{" "}
                        {p.allergies?.length
                          ? p.allergies.join(", ")
                          : "No allergies"}
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
            )}
          </Card>

          <Card title="Recent Accessible Records" subtitle="Latest documents you can view">
            {loading && !myPatientsRecords.length && <CardGridSkeleton count={4} />}
            {!loading && (
              <ul className="divide-y divide-zinc-800">
                {myPatientsRecords.slice(0, 5).map((r) => {
                  const meta = typeMeta[r.recordType];
                  return (
                    <li key={r.recordId} className="flex items-center gap-3 py-3">
                      <span className="text-lg">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-zinc-200">
                          {r.title}
                        </div>
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
            )}
          </Card>
        </div>
      </div>
      {editingProfile && user && (
        <ProviderProfileForm
          address={user.address}
          initial={profile ?? null}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </div>
  );
}