"use client";

import { useSyncExternalStore } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const subscribe = () => () => {};
const getServerSnapshot = () => false;

export function WalletConnectButton() {
  const mounted = useSyncExternalStore(subscribe, () => true, getServerSnapshot);

  if (!mounted) {
    return (
      <button className="cursor-default rounded-2xl border border-zinc-700 bg-zinc-900/60 px-6 py-3.5 text-sm font-medium text-zinc-400">
        Connect Wallet
      </button>
    );
  }

  return <ConnectButton chainStatus="icon" showBalance={false} />;
}