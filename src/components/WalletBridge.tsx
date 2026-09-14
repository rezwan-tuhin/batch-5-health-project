"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  connectWallet,
  disconnectWallet,
  resolveAuth,
} from "@/store/slices/authSlice";

export function WalletBridge() {
  const dispatch = useAppDispatch();
  const { address, connector } = useAccount();
  const authAddress = useAppSelector((s) => s.auth.address);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!address) {
      if (authAddress || isAuthenticated) dispatch(disconnectWallet());
      return;
    }
    if (authAddress === address) return;

    dispatch(disconnectWallet());
    dispatch(
      connectWallet({ address, provider: connector?.name ?? "unknown" }),
    );
    dispatch(resolveAuth(address));
  }, [address, connector, authAddress, isAuthenticated, dispatch]);

  return null;
}