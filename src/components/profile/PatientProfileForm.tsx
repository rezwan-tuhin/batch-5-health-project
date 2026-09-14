"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/slices/authSlice";
import { api } from "@/lib/api";
import { queryKeys } from "@/hooks";
import type { PatientProfile } from "@/lib/dummy-data";

const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-sky-500";
const labelClass = "mb-1.5 block text-xs text-zinc-500";

export default function PatientProfileForm({
  address,
  initial,
  onClose,
}: {
  address: string;
  initial: PatientProfile | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [dob, setDob] = useState(initial?.dob ?? "");
  const [bloodType, setBloodType] = useState(initial?.bloodType ?? "O+");
  const [allergies, setAllergies] = useState((initial?.allergies ?? []).join(", "));
  const [emergencyContact, setEmergencyContact] = useState(initial?.emergencyContact ?? "");
  const [primaryProvider, setPrimaryProvider] = useState(initial?.primaryProvider ?? "");
  const [insurance, setInsurance] = useState(initial?.insurance ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const allergiesList = allergies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const saved = await api.patientProfiles.update(address, {
        name,
        dob,
        bloodType,
        allergies: allergiesList,
        emergencyContact,
        primaryProvider,
        insurance,
      });
      dispatch(updateUser({ name: saved.name }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patientProfile(address) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.patients }),
        queryClient.invalidateQueries({ queryKey: queryKeys.consents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users }),
      ]);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-white">Edit Patient Profile</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Saved to the database and visible to providers you consent.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-800 px-2.5 py-1 text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Blood type</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className={inputClass}
              >
                {bloodTypes.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Allergies (comma separated)</label>
              <input
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Penicillin, Latex"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Emergency contact</label>
              <input
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Primary provider</label>
              <input
                value={primaryProvider}
                onChange={(e) => setPrimaryProvider(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Insurance</label>
              <input
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-sky-400 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}