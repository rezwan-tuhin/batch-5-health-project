"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { queryKeys, usePatients } from "@/hooks";
import { canViewPatients } from "@/lib/access";
import { chainRegisterPatient, ChainNotWiredError } from "@/lib/chain";
import type { PatientListItem } from "@/lib/api";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";
import { QueryError, CardGridSkeleton, InlineNotice } from "@/components/QueryState";

export default function Patients() {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const canView = !!user && canViewPatients(user.role);

  const [address, setAddress] = useState("");
  const [didURI, setDidURI] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: patients,
    isLoading,
    isError,
    error,
  } = usePatients({ enabled: canView });

  if (!user) return null;
  if (!canViewPatients(user.role)) {
    return (
      <AccessDenied
        title="Patients directory restricted"
        description="Only regulators and administrators can view the full patient directory. Providers see only their consented patients."
      />
    );
  }

  const canManage = user.role === "regulator" || user.role === "admin";
  const list: PatientListItem[] = patients ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !didURI) return;
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      await api.patients.register({ address, didURI });
      try {
        await chainRegisterPatient({ address, didURI });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain registration pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients });
      setAddress("");
      setDidURI("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={canManage ? "Patients" : "My Patients"}
        description={
          canManage
            ? "Registered patient identities with decentralized DIDs"
            : "Patients who have granted you consent to access their records"
        }
      />

      <div className="flex-1 space-y-6 p-8">
        {canManage && (
          <Card
            title="Register Patient"
            subtitle="Self-registration (whenNotPaused) — writes to DB + contract"
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
                disabled={submitting}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Registering…" : "Register"}
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
            {list.map((p) => (
              <div
                key={p.address}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {p.name ?? "Unregistered"}
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
                      {p.bloodType ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">DOB</span>
                    <span className="text-zinc-300">{p.dob ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Provider</span>
                    <span className="max-w-[55%] truncate text-zinc-300">
                      {p.primaryProvider ?? "—"}
                    </span>
                  </div>
                </div>
                {p.allergies && p.allergies.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <div className="mb-1.5 text-xs text-zinc-500">Allergies</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.allergies.map((a) => (
                        <Badge key={a} tone="red">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No patients visible to you.{" "}
            {!canManage && "Grant a consent to see patients."}
          </div>
        )}
      </div>
    </div>
  );
}