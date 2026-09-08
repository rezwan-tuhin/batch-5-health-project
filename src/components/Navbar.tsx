"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import type { Role } from "@/lib/dummy-data";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface RoleConfig {
  accent: string;
  activeBg: string;
  activeText: string;
  label: string;
}

const navByRole: Record<Role, NavItem[]> = {
  patient: [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/records", label: "My Records", icon: "▤" },
    { href: "/consents", label: "My Consents", icon: "❖" },
  ],
  provider: [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/patients", label: "My Patients", icon: "♟" },
    { href: "/records", label: "Patient Records", icon: "▤" },
    { href: "/consents", label: "Consents", icon: "❖" },
  ],
  regulator: [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/patients", label: "Patients", icon: "♟" },
    { href: "/providers", label: "Providers", icon: "✚" },
    { href: "/consents", label: "Consents", icon: "❖" },
    { href: "/records", label: "Records", icon: "▤" },
    { href: "/emergency", label: "Emergency", icon: "⚠" },
  ],
  er_specialist: [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/emergency", label: "Emergency Access", icon: "⚠" },
    { href: "/records", label: "Patient Records", icon: "▤" },
  ],
  admin: [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/patients", label: "Users", icon: "♟" },
    { href: "/providers", label: "Providers", icon: "✚" },
    { href: "/consents", label: "Consents", icon: "❖" },
    { href: "/records", label: "Records", icon: "▤" },
  ],
};

const roleConfig: Record<Role, RoleConfig> = {
  patient: {
    accent: "text-sky-400",
    activeBg: "bg-sky-500/15",
    activeText: "text-sky-300",
    label: "PATIENT",
  },
  provider: {
    accent: "text-emerald-400",
    activeBg: "bg-emerald-500/15",
    activeText: "text-emerald-300",
    label: "VERIFIED_PROVIDER_ROLE",
  },
  regulator: {
    accent: "text-violet-400",
    activeBg: "bg-violet-500/15",
    activeText: "text-violet-300",
    label: "REGULATOR_ROLE",
  },
  er_specialist: {
    accent: "text-red-400",
    activeBg: "bg-red-500/15",
    activeText: "text-red-300",
    label: "ER_SPECIALIST_ROLE",
  },
  admin: {
    accent: "text-amber-400",
    activeBg: "bg-amber-500/15",
    activeText: "text-amber-300",
    label: "ADMIN_ROLE",
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const wallet = useAppSelector((s) => s.auth.wallet);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role];
  const config = roleConfig[user.role];

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  const handleCopy = () => {
    if (!wallet) return;
    navigator.clipboard?.writeText(wallet.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
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
          <div className="text-sm font-semibold text-white">HealthRecord</div>
          <div className="text-xs text-zinc-500">Decentralized Ledger</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? `${config.activeBg} ${config.activeText}`
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate text-zinc-200">{user.name}</div>
            <div className={`${config.accent} font-mono text-[10px]`}>
              {config.label}
            </div>
          </div>
        </div>

        {wallet && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="truncate font-mono text-emerald-300">
                {wallet.address}
              </div>
              <div className="capitalize text-zinc-500">{wallet.provider}</div>
            </div>
            <button
              onClick={handleCopy}
              title="Copy wallet address"
              className="shrink-0 rounded-md border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          ← Disconnect & sign out
        </button>
      </div>
    </aside>
  );
}