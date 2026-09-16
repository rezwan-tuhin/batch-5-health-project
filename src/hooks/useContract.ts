/**
 * On-chain read hooks.
 *
 * Thin wrappers over wagmi's useReadContract against the deployed
 * HealthRecordSystem. All hooks are auto-disabled (react-query `enabled`)
 * whenever the contract is not configured or a required parameter is missing,
 * so they are safe to render unconditionally.
 *
 * Co-located in one module because every hook shares the same ABI/address
 * plumbing; split into per-hook files only if one grows real logic.
 */
"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import type { Address } from "viem";
import { healthRecordAbi } from "@/lib/health-record-abi";
import {
  contractAddress,
  contractChainId,
  isContractConfigured,
  toBytes32,
} from "@/lib/contract";

export function useChainStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  return {
    isWalletConnected: isConnected,
    address,
    isConfigured: isContractConfigured(),
    chainId,
    expectedChainId: contractChainId,
    onCorrectChain: chainId === contractChainId,
    ready: isConnected && isContractConfigured() && chainId === contractChainId,
  };
}

export function usePatientOnChain(address?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "patients",
    args: address ? [address as Address] : undefined,
    query: { enabled: isContractConfigured() && !!address },
  });
}

export function useProviderOnChain(address?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "providers",
    args: address ? [address as Address] : undefined,
    query: { enabled: isContractConfigured() && !!address },
  });
}

export function useHasValidAccess(patient?: string, accessor?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "hasValidAccess",
    args:
      patient && accessor
        ? [patient as Address, accessor as Address]
        : undefined,
    query: { enabled: isContractConfigured() && !!patient && !!accessor },
  });
}

export function useRecordAnchor(patient?: string, recordId?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "recordAnchors",
    args:
      patient && recordId
        ? [patient as Address, toBytes32(recordId)]
        : undefined,
    query: { enabled: isContractConfigured() && !!patient && !!recordId },
  });
}

export function useEmergencySession(address?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "emergencySessions",
    args: address ? [address as Address] : undefined,
    query: { enabled: isContractConfigured() && !!address },
  });
}

export function useVerifyRecordHash(
  patient?: string,
  recordId?: string,
  candidateHash?: string,
) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "verifyRecordHash",
    args:
      patient && recordId && candidateHash
        ? [
            patient as Address,
            toBytes32(recordId),
            toBytes32(candidateHash),
          ]
        : undefined,
    query: {
      enabled:
        isContractConfigured() && !!patient && !!recordId && !!candidateHash,
    },
  });
}

export function useHasRole(role: `0x${string}`, address?: string) {
  return useReadContract({
    address: contractAddress,
    abi: healthRecordAbi,
    functionName: "hasRole",
    args: role && address ? [role, address as Address] : undefined,
    query: { enabled: isContractConfigured() && !!role && !!address },
  });
}