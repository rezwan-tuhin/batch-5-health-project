"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import { shortWalletAddress } from "@/lib/format";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { api } from "@/lib/api";
import { chainRegisterPatient, chainRegisterProvider, ChainNotWiredError } from "@/lib/chain";
import { InlineNotice } from "@/components/QueryState";
import type { Role } from "@/lib/dummy-data";

const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500";
const labelClass = "mb-1.5 block text-xs text-zinc-500";

interface PatientFields {
  name: string;
  dob: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  primaryProvider: string;
  insurance: string;
}

interface ProviderFields {
  name: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  email: string;
}

const emptyPatient: PatientFields = {
  name: "",
  dob: "",
  bloodType: "O+",
  allergies: "",
  emergencyContact: "",
  primaryProvider: "",
  insurance: "",
};

const emptyProvider: ProviderFields = {
  name: "",
  specialty: "",
  licenseNumber: "",
  hospital: "",
  email: "",
};

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((s) => s.auth);

  const [role, setRole] = useState<"patient" | "provider">("patient");
  const [patient, setPatient] = useState<PatientFields>(emptyPatient);
  const [provider, setProvider] = useState<ProviderFields>(emptyProvider);
  const [didURI, setDidURI] = useState(
    auth.isWalletConnected && auth.address
      ? `did:ethr:${auth.address}`
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.user, router]);

  const effectiveDidURI =
    didURI ||
    (auth.isWalletConnected && auth.address ? `did:ethr:${auth.address}` : "");

  const splitAllergies = (raw: string): string[] =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.address) return;
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      const roleForAuth: Role = role;
      const { user } = await api.auth.signup({
        address: auth.address,
        name: role === "patient" ? patient.name : provider.name,
        didURI: effectiveDidURI,
        role: roleForAuth,
      });

      if (role === "patient") {
        await api.patientProfiles.update(auth.address, {
          name: patient.name,
          dob: patient.dob,
          bloodType: patient.bloodType,
          allergies: splitAllergies(patient.allergies),
          emergencyContact: patient.emergencyContact,
          primaryProvider: patient.primaryProvider,
          insurance: patient.insurance,
        });
        await api.patients.register({ address: auth.address, didURI });
        try {
          await chainRegisterPatient({ address: auth.address, didURI });
        } catch (err) {
          if (err instanceof ChainNotWiredError) {
            setNotice("DB registration complete — on-chain registration pending (wagmi not wired).");
          } else {
            throw err;
          }
        }
      } else {
        await api.providerProfiles.update(auth.address, {
          name: provider.name,
          specialty: provider.specialty,
          licenseNumber: provider.licenseNumber,
          hospital: provider.hospital,
          email: provider.email,
        });
        await api.providers.register({ address: auth.address, name: provider.name, didURI });
        try {
          await chainRegisterProvider({ address: auth.address, name: provider.name, didURI });
        } catch (err) {
          if (err instanceof ChainNotWiredError) {
            setNotice("DB registration complete — on-chain registration pending (wagmi not wired).");
          } else {
            throw err;
          }
        }
      }

      dispatch(setSession({ user, role: user.role }));
      router.push("/");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const setP = (patch: Partial<PatientFields>) => setPatient((p) => ({ ...p, ...patch }));
  const setPr = (patch: Partial<ProviderFields>) => setProvider((p) => ({ ...p, ...patch }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M10 11h4" />
          </svg>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">HealthRecord</div>
          <div className="text-sm text-zinc-500">Create your account</div>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {auth.isAuthenticated ? (
          <p className="text-center text-sm text-zinc-400">Redirecting to your workspace…</p>
        ) : auth.isWalletConnected && auth.address ? (
          <div>
            <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div>
                <div className="font-mono text-sm text-emerald-300">
                  {shortWalletAddress(auth.address)}
                </div>
                <div className="text-xs text-zinc-500">
                  {effectiveDidURI}
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole("patient")}
                className={`rounded-xl border px-5 py-4 text-left transition-colors ${
                  role === "patient"
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                }`}
              >
                <div className="text-lg text-sky-400">◉</div>
                <div className="mt-1 text-sm font-semibold text-white">I&apos;m a Patient</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Control my records, consents and emergency details.
                </div>
              </button>
              <button
                onClick={() => setRole("provider")}
                className={`rounded-xl border px-5 py-4 text-left transition-colors ${
                  role === "provider"
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                }`}
              >
                <div className="text-lg text-emerald-400">✚</div>
                <div className="mt-1 text-sm font-semibold text-white">I&apos;m a Provider</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Care for consented patients and anchor records.
                </div>
              </button>
            </div>

            <form onSubmit={submit} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-sm font-semibold text-white">
                {role === "patient" ? "Patient Profile" : "Provider Profile"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {role === "patient"
                  ? "These details live in the database and are visible to providers you consent."
                  : "Your profile is visible to regulators for verification."}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input
                    value={role === "patient" ? patient.name : provider.name}
                    onChange={(e) =>
                      role === "patient" ? setP({ name: e.target.value }) : setPr({ name: e.target.value })
                    }
                    placeholder="Jane Doe"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>DID URI</label>
                  <input
                    value={effectiveDidURI}
                    onChange={(e) => setDidURI(e.target.value)}
                    placeholder="did:ethr:0x…"
                    className={`${inputClass} font-mono text-xs`}
                  />
                </div>

                {role === "patient" ? (
                  <>
                    <div>
                      <label className={labelClass}>Date of birth</label>
                      <input
                        type="date"
                        value={patient.dob}
                        onChange={(e) => setP({ dob: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Blood type</label>
                      <select
                        value={patient.bloodType}
                        onChange={(e) => setP({ bloodType: e.target.value })}
                        className={inputClass}
                      >
                        {bloodTypes.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Allergies (comma separated)</label>
                      <input
                        value={patient.allergies}
                        onChange={(e) => setP({ allergies: e.target.value })}
                        placeholder="Penicillin, Latex"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Emergency contact</label>
                      <input
                        value={patient.emergencyContact}
                        onChange={(e) => setP({ emergencyContact: e.target.value })}
                        placeholder="Husband · +1 (555) 000-0000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Primary provider (optional)</label>
                      <input
                        value={patient.primaryProvider}
                        onChange={(e) => setP({ primaryProvider: e.target.value })}
                        placeholder="Dr. Emily Carter"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Insurance</label>
                      <input
                        value={patient.insurance}
                        onChange={(e) => setP({ insurance: e.target.value })}
                        placeholder="BlueCross Shield · Policy 0000-0000"
                        className={inputClass}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelClass}>Specialty</label>
                      <input
                        value={provider.specialty}
                        onChange={(e) => setPr({ specialty: e.target.value })}
                        placeholder="Cardiology"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Medical license #</label>
                      <input
                        value={provider.licenseNumber}
                        onChange={(e) => setPr({ licenseNumber: e.target.value })}
                        placeholder="MD-0000-PH"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Hospital / practice</label>
                      <input
                        value={provider.hospital}
                        onChange={(e) => setPr({ hospital: e.target.value })}
                        placeholder="City General Hospital"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={provider.email}
                        onChange={(e) => setPr({ email: e.target.value })}
                        placeholder="j.doe@hospital.org"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
              </div>

              {role === "provider" && (
                <div className="mt-4">
                  <InlineNotice>
                    Your account is registered immediately. A regulator must verify your license before
                    patients can consent to you.
                  </InlineNotice>
                </div>
              )}

              {formError && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
                  {formError}
                </div>
              )}
              {notice && (
                <div className="mt-4">
                  <InlineNotice tone="emerald">{notice}</InlineNotice>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (role === "patient" ? !patient.name : !provider.name)}
                className="mt-6 w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting
                  ? "Registering…"
                  : role === "patient"
                    ? "Register Patient Account"
                    : "Register Provider Account"}
              </button>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
            <div className="text-sm font-medium text-white">Connect a wallet to begin</div>
            <p className="mt-1 text-xs text-zinc-500">
              Your wallet address is your identity. It is stored as the patient/provider address and DID.
            </p>
            <div className="mt-5 flex justify-center">
              <WalletConnectButton />
            </div>
            <Link href="/login" className="mt-4 inline-block text-xs text-zinc-500 hover:text-zinc-300">
              Already registered? Sign in →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}