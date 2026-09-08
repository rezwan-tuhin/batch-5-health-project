"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  connectWallet,
  loginAs,
  disconnectWallet,
  type WalletProvider,
} from "@/store/slices/authSlice";
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

const walletProviders: {
  id: WalletProvider;
  name: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "metamask",
    name: "MetaMask",
    desc: "Browser extension wallet",
    color: "text-orange-400",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    desc: "Scan with mobile wallet",
    color: "text-sky-400",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    desc: "Wallet + browser extension",
    color: "text-blue-400",
  },
];

export default function Login() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const wallet = useAppSelector((s) => s.auth.wallet);

  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState<WalletProvider | null>(null);

  const handleConnect = (provider: WalletProvider) => {
    setConnecting(provider);
    setTimeout(() => {
      dispatch(connectWallet(provider));
      setConnecting(null);
      setShowConnect(false);
    }, 700);
  };

  const handleLogin = (role: Role) => {
    dispatch(loginAs(role));
    router.push("/");
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
          Connect a wallet and select your role to preview the platform. This is
          a demo — no real signatures required.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          {wallet ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                <div>
                  <div className="font-mono text-sm text-emerald-300">
                    {wallet.address}
                  </div>
                  <div className="text-xs capitalize text-zinc-500">
                    {wallet.provider} · connected
                  </div>
                </div>
              </div>
              <button
                onClick={() => dispatch(disconnectWallet())}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/50 hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              disabled={connecting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-sm font-medium text-white transition-colors hover:border-emerald-500/50 hover:bg-zinc-900 disabled:opacity-60"
            >
              {connecting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Connecting to {connecting}…
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5 text-emerald-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          )}
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
            <div className="text-2xl text-zinc-700">?</div>
            <div className="mt-3 text-sm font-semibold text-zinc-400">
              New here?
            </div>
            <div className="mt-1 text-xs leading-relaxed text-zinc-600">
              In production, users authenticate via RainbowKit + a wallet
              signature and are mapped to their on-chain role.
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          Demo interface · Wallet connection and data are simulated for
          illustrative purposes
        </div>
      </div>

      {showConnect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowConnect(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Connect a wallet</h3>
              <button
                onClick={() => setShowConnect(false)}
                className="rounded-md border border-zinc-800 px-2 py-0.5 text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {walletProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleConnect(p.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <div>
                    <div className={`text-sm font-medium ${p.color}`}>{p.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{p.desc}</div>
                  </div>
                  <span className="text-zinc-500">→</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] text-zinc-600">
              Simulated wallet — no real signature happens in this demo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}