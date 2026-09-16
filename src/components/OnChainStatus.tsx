"use client";

import { useChainStatus, useHasRole } from "@/hooks/useContract";
import { ROLE_IDS } from "@/lib/contract";

const roleRows: Array<{ label: string; tone: string }> = [
  {
    label: "VERIFIED PROVIDER",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    label: "REGULATOR",
    tone: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  {
    label: "ER SPECIALIST",
    tone: "border-red-500/30 bg-red-500/10 text-red-400",
  },
];

export default function OnChainStatus() {
  const status = useChainStatus();
  const isVerifiedProvider = useHasRole(ROLE_IDS.VERIFIED_PROVIDER, status.address);
  const isRegulator = useHasRole(ROLE_IDS.REGULATOR, status.address);
  const isER = useHasRole(ROLE_IDS.ER_SPECIALIST, status.address);

  const label =
    !status.isWalletConnected
      ? "Wallet required"
      : !status.isConfigured
        ? "Contract not deployed"
        : !status.onCorrectChain
          ? `Switch to chain ${status.expectedChainId}`
          : `Chain ${status.chainId} · Contract on`;

  return (
    <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            status.ready ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span className="text-zinc-400">{label}</span>
      </div>
      {status.ready && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[isVerifiedProvider.data && 0, isRegulator.data && 1, isER.data && 2]
            .filter((i): i is number => i !== false)
            .map((i) => (
              <span
                key={roleRows[i].label}
                className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${roleRows[i].tone}`}
              >
                {roleRows[i].label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}