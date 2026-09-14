"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/slices/authSlice";
import { api } from "@/lib/api";
import { queryKeys } from "@/hooks";
import type { ProviderProfile } from "@/lib/dummy-data";

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500";
const labelClass = "mb-1.5 block text-xs text-zinc-500";

export default function ProviderProfileForm({
  address,
  initial,
  onClose,
}: {
  address: string;
  initial: ProviderProfile | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber ?? "");
  const [hospital, setHospital] = useState(initial?.hospital ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const saved = await api.providerProfiles.update(address, {
        name,
        specialty,
        licenseNumber,
        hospital,
        email,
      });
      dispatch(updateUser({ name: saved.name }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.providerProfile(address) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.providers }),
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
            <h3 className="text-base font-semibold text-white">Edit Provider Profile</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Saved to the database and used by regulators for verification.
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
              <label className={labelClass}>Specialty</label>
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Medical license #</label>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Hospital / practice</label>
              <input
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}