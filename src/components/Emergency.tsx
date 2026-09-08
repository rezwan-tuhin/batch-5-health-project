"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  triggerEmergencyAccess,
  expireSession,
} from "@/store/slices/emergencySlice";
import { canViewEmergency, visibleEmergency } from "@/lib/access";
import { patientProfiles } from "@/lib/dummy-data";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";

export default function Emergency() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const sessions = useAppSelector((s) => s.emergency.list);
  const patients = useAppSelector((s) => s.patients.list);
  const erDoctors = useAppSelector((s) =>
    s.providers.list.filter((p) => p.verified && p.erQualified),
  );

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [justification, setJustification] = useState("");
  const [hours, setHours] = useState("4");

  if (!user) return null;
  if (!canViewEmergency(user.role)) {
    return <AccessDenied description="Only ER specialists, regulators and admins can manage emergency access." />;
  }

  const isER = user.role === "er_specialist";
  const list = visibleEmergency(user.role, sessions);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !doctor || !justification) return;
    const doc = erDoctors.find((d) => d.address === doctor);
    const validUntil = new Date(
      Date.now() + Number(hours || 0) * 3600 * 1000,
    ).toISOString();
    dispatch(
      triggerEmergencyAccess({
        patientAddress: patient,
        doctorAddress: doctor,
        doctorName: doc?.name ?? doctor,
        justification,
        validUntil,
      }),
    );
    setPatient("");
    setDoctor("");
    setJustification("");
    setHours("4");
  };

  const expire = (p: string) => {
    dispatch(expireSession(p));
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
                {patients
                  .filter((p) => p.registered)
                  .map((p) => (
                    <option key={p.address} value={p.address}>
                      {patientProfiles.find((x) => x.address === p.address)?.name ??
                        p.address}
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
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-red-400"
              >
                Trigger
              </button>
            </form>
          </Card>
        )}

        {!isER && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            {user?.role === "regulator" || user?.role === "admin"
              ? "Regulator oversight — monitoring active break-glass sessions."
              : "Emergency sessions visible to authorized oversight roles only."}
          </div>
        )}

        <Card
          title="Emergency Sessions"
          subtitle={`${list.filter((s) => s.active).length} active · all access is audited`}
        >
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
                      {patientProfiles.find((p) => p.address === s.patientAddress)
                        ?.name ?? s.patientAddress}
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
                      {s.active && (isER || user?.role === "admin") ? (
                        <button
                          onClick={() => expire(s.patientAddress)}
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
        </Card>
      </div>
    </div>
  );
}