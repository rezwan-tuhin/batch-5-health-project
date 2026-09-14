"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { queryKeys, useConsents, usePatients, useProviders } from "@/hooks";
import {
  canViewConsents,
  canManageConsents,
} from "@/lib/access";
import {
  chainGrantConsent,
  chainRevokeConsent,
  ChainNotWiredError,
} from "@/lib/chain";
import type { ConsentListItem } from "@/lib/api";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";
import { QueryError, InlineNotice } from "@/components/QueryState";

export default function Consents() {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const canView = !!user && canViewConsents(user.role);
  const canGrant = !!user && canManageConsents(user.role);

  const [patient, setPatient] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expiryDays, setExpiryDays] = useState("90");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: consents,
    isLoading,
    isError,
    error,
  } = useConsents({ enabled: canView });
  const { data: patients } = usePatients({ enabled: canGrant });
  const { data: providers } = useProviders({ enabled: canGrant });

  const verifiedProviders = (providers ?? []).filter((p) => p.verified);

  if (!user) return null;
  if (!canViewConsents(user.role)) {
    return (
      <AccessDenied description="Only patients, providers, regulators and admins can view consents." />
    );
  }

  const list = consents ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !provider || !purpose) return;
    const prov = (providers ?? []).find((p) => p.address === provider);
    const expiresAt =
      Number(expiryDays) > 0
        ? Math.floor(Date.now() / 1000) + Number(expiryDays) * 86400
        : 0;
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      await api.consents.grant({
        patientAddress: patient,
        providerAddress: provider,
        providerName: prov?.name ?? provider,
        purpose,
        expiresAt,
      });
      try {
        await chainGrantConsent({
          patientAddress: patient,
          providerAddress: provider,
          purpose,
          expiresAt,
        });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain consent pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.consents });
      setPurpose("");
      setPatient("");
      setProvider("");
      setExpiryDays("90");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to grant consent");
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (c: ConsentListItem) => {
    setNotice(null);
    setFormError(null);
    try {
      await api.consents.revoke({
        patientAddress: c.patientAddress,
        providerAddress: c.providerAddress,
      });
      try {
        await chainRevokeConsent({
          patientAddress: c.patientAddress,
          providerAddress: c.providerAddress,
        });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain revocation pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.consents });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to revoke consent");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Consents"
        description="Patient-granted access consent for verified providers"
      />

      <div className="flex-1 space-y-6 p-8">
        {canGrant && (
          <Card
            title="Grant Consent"
            subtitle={
              user.role === "patient"
                ? "Grant a verified provider access to your records"
                : "Grant a patient's consent to a verified provider"
            }
          >
            <form
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            >
              <select
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">
                  {user.role === "patient" ? "You (patient)" : "Patient…"}
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
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">Verified provider…</option>
                {verifiedProviders.map((p) => (
                  <option key={p.address} value={p.address}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Purpose (e.g. Cardiology)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <input
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                type="number"
                min="0"
                placeholder="Expiry (days, 0 = never)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Granting…" : "Grant"}
              </button>
            </form>
            {formError && <QueryError error={new Error(formError)} />}
            {notice && <InlineNotice>{notice}</InlineNotice>}
          </Card>
        )}

        <Card title="Consents" subtitle={`${list.length} records`}>
          {isLoading && (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-zinc-800/60" />
              ))}
            </div>
          )}
          {isError && <QueryError error={error} />}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-4">Patient</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Purpose</th>
                    <th className="pb-2 pr-4">Granted</th>
                    <th className="pb-2 pr-4">Expires</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {list.map((c, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 text-zinc-300">
                        {c.patientName ?? c.patientAddress}
                        <div className="mt-0.5 font-mono text-[11px] text-zinc-600">
                          {c.patientAddress}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-zinc-200">{c.providerName}</td>
                      <td className="py-3 pr-4 text-zinc-300">{c.purpose}</td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {new Date(c.grantedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {c.expiresAt === 0
                          ? "Never"
                          : new Date(c.expiresAt * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={c.active ? "emerald" : "red"}>
                          {c.active ? "Active" : "Revoked"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {c.active &&
                        (user.role === "regulator" ||
                          user.role === "admin" ||
                          c.patientAddress === user.address) ? (
                          <button
                            onClick={() => revoke(c)}
                            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-400"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && !isError && list.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-600">
              No consents visible to you.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}