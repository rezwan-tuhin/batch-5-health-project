"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { queryKeys, useEmergency, usePatients, useProviders } from "@/hooks";
import { canViewEmergency } from "@/lib/access";
import {
  chainTriggerEmergencyAccess,
  chainExpireEmergencyAccess,
  ChainNotWiredError,
} from "@/lib/chain";
import type { EmergencyListItem } from "@/lib/api";
import { hoursFromNowIso, hoursFromNowUnix } from "@/lib/time";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";
import { QueryError, InlineNotice } from "@/components/QueryState";

export default function Emergency() {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const canView = !!user && canViewEmergency(user.role);

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [justification, setJustification] = useState("");
  const [hours, setHours] = useState("4");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: sessions,
    isLoading,
    isError,
    error,
  } = useEmergency({ enabled: canView });
  const { data: patients } = usePatients({ enabled: canView });
  const { data: providers } = useProviders({ enabled: canView });

  const erDoctors = (providers ?? []).filter((p) => p.verified && p.erQualified);

  if (!user) return null;
  if (!canViewEmergency(user.role)) {
    return (
      <AccessDenied description="Only ER specialists, regulators and admins can manage emergency access." />
    );
  }

  const isER = user.role === "er_specialist";
  const list: EmergencyListItem[] = sessions ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !doctor || !justification) return;
    const doc = erDoctors.find((d) => d.address === doctor);
    const validUntil = hoursFromNowIso(Number(hours || 0));
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      await api.emergency.trigger({
        patientAddress: patient,
        doctorAddress: doctor,
        doctorName: doc?.name ?? doctor,
        justification,
        validUntil,
        hours: Number(hours || 0),
      });
      try {
        await chainTriggerEmergencyAccess({
          patientAddress: patient,
          doctorAddress: doctor,
          justification,
          validUntil: hoursFromNowUnix(Number(hours || 0)),
        });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain session pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.emergency });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
      setPatient("");
      setDoctor("");
      setJustification("");
      setHours("4");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to trigger access");
    } finally {
      setSubmitting(false);
    }
  };

  const expire = async (c: EmergencyListItem) => {
    setNotice(null);
    setFormError(null);
    try {
      await api.emergency.expire({ patientAddress: c.patientAddress });
      try {
        await chainExpireEmergencyAccess({ patientAddress: c.patientAddress });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain expiry pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.emergency });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to expire session");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Emergency Access"
        description="Break-glass protocol for life-threatening situations"
      />

      <div className="flex-1 space-y-6 p-8">
        {isER && (
          <Card
            title="Trigger Emergency Access"
            subtitle="ER_SPECIALIST bypass of consent, time-bound"
          >
            <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_0.75fr_auto]">
              <select
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="">Patient…</option>
                {(patients ?? [])
                  .filter((p) => p.registered)
                  .map((p) => (
                    <option key={p.address} value={p.address}>
                      {p.name ?? p.address}
                    </option>
                  ))}
              </select>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="">ER specialist…</option>
                {erDoctors.map((d) => (
                  <option key={d.address} value={d.address}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Justification (required)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                type="number"
                min="1"
                placeholder="Duration (hours)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                onClick={submit}
                disabled={submitting}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-red-400 disabled:opacity-50"
              >
                {submitting ? "Triggering…" : "Trigger"}
              </button>
            </form>
            {formError && <QueryError error={new Error(formError)} />}
            {notice && <InlineNotice>{notice}</InlineNotice>}
          </Card>
        )}

        {!isER && (
          <InlineNotice tone="red">
            {user.role === "regulator" || user.role === "admin"
              ? "Regulator oversight — monitoring active break-glass sessions."
              : "Emergency sessions visible to authorized oversight roles only."}
          </InlineNotice>
        )}

        <Card
          title="Emergency Sessions"
          subtitle={`${list.filter((s) => s.active).length} active · all access is audited`}
        >
          {isLoading && (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
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
                    <th className="pb-2 pr-4">ER Specialist</th>
                    <th className="pb-2 pr-4">Justification</th>
                    <th className="pb-2 pr-4">Valid Until</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {list.map((s, i) => (
                    <tr
                      key={i}
                      className={s.active ? "bg-red-500/5" : undefined}
                    >
                      <td className="py-3 pr-4 text-zinc-300">
                        {s.patientName ?? s.patientAddress}
                        <div className="mt-0.5 font-mono text-[11px] text-zinc-600">
                          {s.patientAddress}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-zinc-200">{s.doctorName}</td>
                      <td className="py-3 pr-4 text-zinc-300">{s.justification}</td>
                      <td className="py-3 pr-4 text-xs text-zinc-400">
                        {new Date(s.validUntil).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        {s.active ? (
                          <Badge tone="red">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="zinc">Expired</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {s.active && (isER || user.role === "admin") ? (
                          <button
                            onClick={() => expire(s)}
                            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-400"
                          >
                            Expire
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
              No emergency sessions.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}