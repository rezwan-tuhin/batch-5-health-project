"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { grantConsent, revokeConsent } from "@/store/slices/consentsSlice";
import { canViewConsents, canManageConsents, visibleConsents } from "@/lib/access";
import { patientProfiles } from "@/lib/dummy-data";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";

export default function Consents() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const consents = useAppSelector((s) => s.consents.list);
  const patients = useAppSelector((s) => s.patients.list);
  const providers = useAppSelector((s) => s.providers.list);

  const verifiedProviders = providers.filter((p) => p.verified);

  const [patient, setPatient] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expiryDays, setExpiryDays] = useState("90");

  if (!user) return null;
  if (!canViewConsents(user.role)) {
    return <AccessDenied description="Only patients, providers, regulators and admins can view consents." />;
  }

  const canGrant = canManageConsents(user.role);
  const list = visibleConsents(user.role, user, consents);

  const patientName = (addr: string) =>
    patientProfiles.find((p) => p.address === addr)?.name ?? addr;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !provider || !purpose) return;
    const prov = providers.find((p) => p.address === provider);
    const expiresAt =
      Number(expiryDays) > 0
        ? Math.floor(Date.now() / 1000) + Number(expiryDays) * 86400
        : 0;
    dispatch(
      grantConsent({
        patientAddress: patient,
        providerAddress: provider,
        providerName: prov?.name ?? provider,
        purpose,
        expiresAt,
      }),
    );
    setPurpose("");
    setPatient("");
    setProvider("");
    setExpiryDays("90");
  };

  const revoke = (p: string, prov: string) => {
    dispatch(revokeConsent({ patientAddress: p, providerAddress: prov }));
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
                  patients
                    .filter((p) => p.registered)
                    .map((p) => (
                      <option key={p.address} value={p.address}>
                        {patientProfiles.find((x) => x.address === p.address)?.name ??
                          p.address}
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
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
              >
                Grant
              </button>
            </form>
          </Card>
        )}

        <Card title="Consents" subtitle={`${list.length} records`}>
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
                      {patientName(c.patientAddress)}
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
                          onClick={() => revoke(c.patientAddress, c.providerAddress)}
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
        </Card>
      </div>
    </div>
  );
}