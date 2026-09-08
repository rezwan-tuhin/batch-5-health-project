"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerPatientAsync } from "@/store/slices/patientsSlice";
import {
  canViewPatients,
  visiblePatients,
} from "@/lib/access";
import { patientProfiles } from "@/lib/dummy-data";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";

export default function Patients() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const patients = useAppSelector((s) => s.patients.list);
  const consents = useAppSelector((s) => s.consents.list);
  const registering = useAppSelector((s) => s.patients.registering);

  const [address, setAddress] = useState("");
  const [didURI, setDidURI] = useState("");

  if (!user) return null;
  if (!canViewPatients(user.role)) {
    return (
      <AccessDenied
        title="Patients directory restricted"
        description="Only regulators and administrators can view the full patient directory. Providers see only their consented patients."
      />
    );
  }

  const isFullAccess = user.role === "regulator" || user.role === "admin";
  const list = visiblePatients(user.role, user, patients, consents);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !didURI) return;
    dispatch(registerPatientAsync({ address, didURI }));
    setAddress("");
    setDidURI("");
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={isFullAccess ? "Patients" : "My Patients"}
        description={
          isFullAccess
            ? "Registered patient identities with decentralized DIDs"
            : "Patients who have granted you consent to access their records"
        }
      />

      <div className="flex-1 space-y-6 p-8">
        {isFullAccess && (
          <Card
            title="Register Patient"
            subtitle="Self-registration (whenNotPaused)"
          >
            <form
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Wallet address (0x…)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <input
                value={didURI}
                onChange={(e) => setDidURI(e.target.value)}
                placeholder="did:ethr:…"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={registering}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {registering ? "Registering…" : "Register"}
              </button>
            </form>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const profile = patientProfiles.find((x) => x.address === p.address);
            return (
              <div
                key={p.address}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {profile?.name ?? "Unregistered"}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-zinc-500">
                      {p.address}
                    </div>
                  </div>
                  <Badge tone={p.registered ? "emerald" : "zinc"}>
                    {p.registered ? "Registered" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Blood type</span>
                    <span className="text-zinc-300">
                      {profile?.bloodType ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">DOB</span>
                    <span className="text-zinc-300">{profile?.dob ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Provider</span>
                    <span className="max-w-[55%] truncate text-zinc-300">
                      {profile?.primaryProvider ?? "—"}
                    </span>
                  </div>
                </div>
                {profile?.allergies && profile.allergies.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <div className="mb-1.5 text-xs text-zinc-500">Allergies</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.allergies.map((a) => (
                        <Badge key={a} tone="red">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No patients visible to you. {!isFullAccess && "Grant a consent to see patients."}
          </div>
        )}
      </div>
    </div>
  );
}