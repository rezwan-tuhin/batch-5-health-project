"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import { demoUserForRole } from "@/lib/demo";
import type { Role } from "@/lib/dummy-data";

interface RoleOption {
  role: Role;
  title: string;
  desc: string;
  icon: string;
  color: string;
  glow: string;
}

const roleOptions: RoleOption[] = [
  {
    role: "patient",
    title: "Patient",
    desc: "View your own medical records, DIDs and who has access to your data.",
    icon: "◉",
    color: "text-sky-400",
    glow: "hover:border-sky-500/60 hover:shadow-sky-500/10",
  },
  {
    role: "provider",
    title: "Provider",
    desc: "Manage consented patients, access their records and anchor new data.",
    icon: "✚",
    color: "text-emerald-400",
    glow: "hover:border-emerald-500/60 hover:shadow-emerald-500/10",
  },
  {
    role: "regulator",
    title: "Regulator",
    desc: "Verify providers, oversee the network and review emergency access.",
    icon: "⚖",
    color: "text-violet-400",
    glow: "hover:border-violet-500/60 hover:shadow-violet-500/10",
  },
  {
    role: "er_specialist",
    title: "ER Specialist",
    desc: "Break-glass emergency access for life-threatening situations.",
    icon: "⚠",
    color: "text-red-400",
    glow: "hover:border-red-500/60 hover:shadow-red-500/10",
  },
  {
    role: "admin",
    title: "Admin",
    desc: "Full system oversight, user management and audit log access.",
    icon: "◈",
    color: "text-amber-400",
    glow: "hover:border-amber-500/60 hover:shadow-amber-500/10",
  },
];

export default function Login() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user && window.location.pathname === "/login") {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.user, router]);

  const handleLogin = (role: Role) => {
    const demo = demoUserForRole(role);
    if (demo) {
      dispatch(setSession({ user: demo, role }));
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M10 11h4" />
          </svg>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">HealthRecord</div>
          <div className="text-sm text-zinc-500">
            Decentralized Medical Records · IPFS + Blockchain
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <h1 className="text-center text-2xl font-semibold text-white">
          Sign in to your workspace
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Connect a wallet and select your role to preview the platform.
        </p>

        {auth.status === "error" && auth.unknownWallet && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-center text-xs text-sky-200">
            This wallet has no account registered yet.{" "}
            <Link href="/register" className="font-medium underline hover:text-sky-100">
              Register now →
            </Link>
          </div>
        )}
        {auth.status === "error" && !auth.unknownWallet && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-200">
            Identity service unreachable ({auth.error}).
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <WalletConnectButton />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roleOptions.map((opt) => (
            <button
              key={opt.role}
              onClick={() => handleLogin(opt.role)}
              className={`group rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:bg-zinc-900/70 ${opt.glow}`}
            >
              <div className={`text-2xl ${opt.color}`}>{opt.icon}</div>
              <div className="mt-3 text-sm font-semibold text-white">
                {opt.title}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                {opt.desc}
              </div>
              <div className="mt-4 text-xs font-medium text-zinc-600 transition-colors group-hover:text-zinc-300">
                Continue as {opt.title} →
              </div>
            </button>
          ))}

          <div className="flex flex-col justify-between rounded-xl border border-dashed border-zinc-800 bg-transparent p-5">
            <div className="text-2xl text-sky-700">✚</div>
            <div className="mt-3 text-sm font-semibold text-zinc-400">
              New here?
            </div>
            <div className="mt-1 text-xs leading-relaxed text-zinc-600">
              Create a patient or provider account with your wallet and set up
              your profile.
            </div>
            <Link
              href="/register"
              className="mt-4 rounded-md border border-sky-500/40 px-3 py-1.5 text-center text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/10"
            >
              Register →
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          Wallet connected via RainbowKit · Backend and contract writes simulated
          · IPFS activates when configured
        </div>
      </div>
    </div>
  );
}