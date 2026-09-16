import { keccak256, toHex } from "viem";
import { wagmiConfig } from "@/lib/wagmi";

// Single source of truth: the chain the client actually connects to
// (see src/lib/wagmi.ts). Reintroduce a per-chain map if this goes multi-chain.
export const contractChainId = wagmiConfig.chains[0].id;

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? "";

export const contractAddress = rawAddress as `0x${string}`;

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(rawAddress);
}

export function toBytes32(value: string): `0x${string}` {
  return keccak256(toHex(value));
}

export const ROLE_IDS = {
  REGULATOR: keccak256(toHex("REGULATOR_ROLE")),
  VERIFIED_PROVIDER: keccak256(toHex("VERIFIED_PROVIDER_ROLE")),
  ER_SPECIALIST: keccak256(toHex("ER_SPECIALIST_ROLE")),
} as const;