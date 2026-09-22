# wagmi + HealthRecordSystem Contract Wiring Tutorial (Phase 2 — Real On-Chain Writes & Reads)

This is the step-by-step guide to wiring the deployed `HealthRecordSystem`
contract (`src/lib/contract.sol`) into the HealthRecord app, replacing the
throwing stubs in `src/lib/chain.ts` that Phase 1 explicitly left as
`TODO(wagmi)`.

After this phase, with `NEXT_PUBLIC_CONTRACT_ADDRESS` set and a wallet connected
to Sepolia:

- Every action that currently shows the amber *"Chain write not wired"* notice
  instead opens MetaMask, waits for the **receipt** (so `ok: true` only means the
  tx actually landed), and returns the tx hash.
- Read-only on-chain truth (registration, roles, consents via `hasValidAccess`,
  record anchors, emergency windows) is exposed through typed hooks in
  `src/hooks/useContract.ts`.
- A `OnChainStatus` pill in the sidebar shows network + contract + on-chain role
  state at a glance.

If the contract is **not** configured (no env address) or the wallet is not
connected to the right network, the exact same graceful degradation as Phase 1
applies — the app keeps working DB-first. Nothing in the six consumer components
(`Patients`, `Providers`, `Consents`, `Records`, `Emergency`, `Register`)
changes.

> Implementation status: this tutorial describes the shipped code exactly.

---

## 0. Assessment — the design choices

The existing seam is `src/lib/chain.ts`: 9 async `chain*()` functions that the
components already `await` inside event handlers and catch
`ChainNotWiredError` from. That pins down the whole design:

- **Imperative wagmi actions, not hooks.** The `chain*()` calls happen inside
  `onClick`/`onSubmit` handlers, not during render. `useWriteContract` is a hook
  and cannot live in a plain async function. wagmi's `actions` API
  (`writeContract`, `waitForTransactionReceipt`, `getAccount`, `getChainId`)
  exists exactly for this — same wallet, same reconnection, no refactor.
- **Receipt confirmation.** `writeContract` returns a hash after the wallet
  signs; the tx is not final. We `waitForTransactionReceipt` before returning
  `{ ok: true }` so the UI and the DB never report success for a reverted tx.
- **Static ABI, not generated, not `parseAbi`.** The contract is small (one
  file, no Hardhat artifact pipeline in this repo). We hand-author a static,
  `as const` typed ABI in `src/lib/health-record-abi.ts` — fully checked in,
  fully type-safe against the compiler, no runtime parsing.
- **Guards, not silent writes.** Several contract functions use `msg.sender`
  (`registerPatient`, `registerProvider`, `grantConsent`,
  `triggerEmergencyAccess`). The seam refuses to sign for a different address
  (`requireSignerMatch`) and instead throws `ChainNotWiredError` — reusing the
  existing amber-notice UI honestly.
- **`bytes32` canonicalisation.** The contract keys record anchors by `bytes32`.
  The DB stores `recordId`/`recordHash` as arbitrary hex strings (demo values
  are even truncated). We map any string deterministically with
  `toBytes32(x) = keccak256(toHex(x))` so the demo data works on-chain and
  `verifyRecordHash` is self-consistent.
- **One hook module.** All on-chain reads share the same ABI + address, so they
  live together in `src/hooks/useContract.ts` (thin `useReadContract` wrappers;
  split into per-hook files only if one grows real logic).

---

## 1. Prerequisites

1. Deploy `src/lib/contract.sol` to Sepolia (e.g. `npx hardhat run scripts/deploy.ts
   --network sepolia` from the contract repo, per `tutorial.md`). Note the
   deployed address.
2. Create your env file and add the contract:
   ```bash
   cp .env.local.example .env.local
   ```
   ```bash
   # .env.local
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id_here          # Phase 1
   NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com  # Phase 1
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xDeployed_Contract_Address
   ```
   - The chain the contract lives on is **not** configurable here — it is
     whatever `src/lib/wagmi.ts` configures (currently Sepolia); that file is
     the single source of truth for the client's network. Add the chain there
     first if you deploy elsewhere.
   - If `NEXT_PUBLIC_CONTRACT_ADDRESS` is empty **or** not a `0x` + 40-hex
     address the seam reports "not configured" and every write degrades
     gracefully (Phase 1 behavior).
3. The demo accounts in `src/lib/dummy-data.ts` use short placeholder addresses
   (e.g. `0x7C8d...a1B2`). Connect a **real** wallet and register fresh on-chain
   accounts to see writes succeed.

---

## 2. Files in this phase

| File | Purpose |
| --- | --- |
| `src/lib/health-record-abi.ts` | static typed ABI (`as const`) |
| `src/lib/contract.ts` | env config, `isContractConfigured`, `toBytes32`, role ids |
| `src/lib/chain.ts` | **rewritten** — real writes + receipt wait + guards |
| `src/hooks/useContract.ts` | `useReadContract`-based on-chain read hooks |
| `src/components/OnChainStatus.tsx` | sidebar status pill |
| `src/components/Navbar.tsx` | mounts `<OnChainStatus />` |
| `.env.local.example` | new env template |

---

## 3. Static ABI — `src/lib/health-record-abi.ts`

Hand-written, checked in, `as const` for full literal typing. Covers every
write used by the seam, every view used by the hooks, and the events for future
log decoding:

```ts
import type { Abi } from "viem";

export const healthRecordAbi = [
  // ---- registration ----
  {
    type: "function",
    name: "registerPatient",
    inputs: [{ name: "didURI", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registerProvider",
    inputs: [
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyProvider",
    inputs: [
      { name: "provider", type: "address" },
      { name: "isVerified", type: "bool" },
      { name: "isERQualified", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ---- consent ----
  {
    type: "function",
    name: "grantConsent",
    inputs: [
      { name: "provider", type: "address" },
      { name: "purpose", type: "string" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeConsent",
    inputs: [
      { name: "patient", type: "address" },
      { name: "provider", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ---- emergency (break-glass) ----
  {
    type: "function",
    name: "triggerEmergencyAccess",
    inputs: [
      { name: "patient", type: "address" },
      { name: "justification", type: "string" },
      { name: "duration", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ---- record anchoring ----
  {
    type: "function",
    name: "anchorRecord",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tombstoneRecord",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ---- views ----
  {
    type: "function",
    name: "verifyRecordHash",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
      { name: "candidateHash", type: "bytes32" },
    ],
    outputs: [
      { name: "matches", type: "bool" },
      { name: "tombstoned", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasValidAccess",
    inputs: [
      { name: "patient", type: "address" },
      { name: "accessor", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "patients",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "didURI", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "providers",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "verified", type: "bool" },
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recordAnchors",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "bytes32" },
    ],
    outputs: [
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
      { name: "anchoredBy", type: "address" },
      { name: "anchoredAt", type: "uint64" },
      { name: "tombstoned", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "emergencySessions",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "validUntil", type: "uint64" },
      { name: "doctor", type: "address" },
      { name: "justification", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // ---- events (informational; used for log decoding later) ----
  {
    type: "event",
    name: "PatientRegistered",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "didURI", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ProviderRegistered",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ProviderVerified",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "isVerified", type: "bool" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ConsentGranted",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "purpose", type: "string" },
      { name: "expiresAt", type: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ConsentRevoked",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordAnchored",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32", indexed: true },
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
      { name: "anchoredBy", type: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordTombstoned",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordAccessed",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32" },
      { name: "accessor", type: "address", indexed: true },
      { name: "purpose", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EmergencyAccessTriggered",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "doctor", type: "address", indexed: true },
      { name: "justification", type: "string" },
      { name: "validUntil", type: "uint64" },
    ],
    anonymous: false,
  },
] as const satisfies Abi;
```

---

## 4. Config + helpers — `src/lib/contract.ts`

Reads the env, validates it, and exports the few hashing helpers the seam and
hooks share:

```ts
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
```

Notes:
- `keccak256("REGULATOR_ROLE")` matches the contract's
  `bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE")`.
- `toBytes32(x)` maps any string (record id, record hash, CID) to a valid
  `bytes32` deterministically.

---

## 5. The seam rewrite — `src/lib/chain.ts`

Public API is unchanged (same exported names & types) so **no component edits
are required**. The throwing stubs become real writes with three blocks:

1. `requireWrite` — configured? wallet connected? right network? If any fail →
   `ChainNotWiredError` (existing amber-notice path).
2. `requireSignerMatch` — for `msg.sender`-only functions, the given address
   must equal the connected wallet.
3. `confirm` — `writeContract` then `waitForTransactionReceipt`; returns
   `{ ok: true, transactionHash }` only when the receipt says **success**.

`ChainNotWiredError` keeps its name and prefix so every
`err instanceof ChainNotWiredError` branch in the six components keeps working.

### 5.1 Slot-zero helpers

```ts
import {
  getAccount,
  getChainId,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import { healthRecordAbi } from "@/lib/health-record-abi";
import {
  contractAddress,
  contractChainId,
  isContractConfigured,
  toBytes32,
} from "@/lib/contract";

export class ChainNotWiredError extends Error {
  constructor(operation: string, detail?: string) {
    super(`[chain] not wired: ${operation}${detail ? ` — ${detail}` : ""}`);
    this.name = "ChainNotWiredError";
  }
}

export interface ChainResult {
  transactionHash: string | null;
  ok: boolean;
}

function requireWrite(operation: string): void {
  if (!isContractConfigured()) {
    throw new ChainNotWiredError(
      operation,
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not configured.",
    );
  }
  const account = getAccount(wagmiConfig);
  if (!account.address) {
    throw new ChainNotWiredError(operation, "No wallet connected.");
  }
  if (getChainId(wagmiConfig) !== contractChainId) {
    throw new ChainNotWiredError(
      operation,
      `Connected to chain ${getChainId(wagmiConfig)}, expected ${contractChainId}.`,
    );
  }
}

function requireSignerMatch(operation: string, given: string): void {
  const account = getAccount(wagmiConfig);
  if (account.address?.toLowerCase() !== given.toLowerCase()) {
    throw new ChainNotWiredError(
      operation,
      "This contract function uses msg.sender — connect the wallet that owns the address.",
    );
  }
}

async function confirm(
  operation: string,
  write: () => Promise<`0x${string}`>,
): Promise<ChainResult> {
  const hash = await write();
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  if (receipt.status !== "success") {
    throw new Error(`[chain] ${operation}: transaction reverted.`);
  }
  return { ok: true, transactionHash: hash };
}
```

### 5.2 Wiring table

| `chain.ts` export | Contract call | Guard |
| --- | --- | --- |
| `chainRegisterPatient` | `registerPatient(didURI)` | signer must own `input.address` |
| `chainRegisterProvider` | `registerProvider(didURI, name)` | signer must own `input.address` |
| `chainVerifyProvider` | `verifyProvider(address, isVerified, isERQualified)` | signer must hold `REGULATOR_ROLE` (contract enforces) |
| `chainGrantConsent` | `grantConsent(provider, purpose, expiresAt)` | signer must be the patient |
| `chainRevokeConsent` | `revokeConsent(patient, provider)` | contract allows patient or regulator |
| `chainAnchorRecord` | `anchorRecord(patient, toBytes32(recordId), toBytes32(recordHash), pointer)` | contract enforces `msg.sender == patient \|\| hasValidAccess` |
| `chainTombstoneRecord` | `tombstoneRecord(patient, toBytes32(recordId))` | contract allows patient or regulator |
| `chainTriggerEmergencyAccess` | `triggerEmergencyAccess(patient, justification, duration)` | signer must own `input.doctorAddress`; contract enforces `ER_SPECIALIST_ROLE` |
| `chainExpireEmergencyAccess` | **no-op on-chain** — see below | — |

`uint64` arguments are passed as `BigInt(...)` (the ABI type maps to `bigint`):

```ts
// e.g. triggerEmergencyAccess — convert absolute validUntil to a duration
const duration = Math.max(0, input.validUntil - Math.floor(Date.now() / 1000));
// ...
functionName: "triggerEmergencyAccess",
args: [input.patientAddress as `0x${string}`, input.justification, BigInt(duration)],
```

**Why is `chainExpireEmergencyAccess` still a `ChainNotWiredError`?**
The deployed `HealthRecordSystem` has **no expire/revoke function** for
emergency sessions — a session self-expires when `validUntil < block.timestamp`
(`hasValidAccess` checks that). There is nothing to write on-chain. The seam
therefore throws `ChainNotWiredError("expireEmergencyAccess(patient) — on-chain
sessions expire automatically at validUntil; no contract function exists")`,
so the UI keeps its honest "DB updated, on-chain expiry is time-based" style
notice. The `useEmergencySession` read hook shows the actual on-chain window.

**Why is there a signer guard at all?** The staff/admin "Register Patient"
form (`src/components/Patients.tsx`) can type an arbitrary `address`, but the
contract only records `msg.sender`. Without the guard the admin would silently
register *themselves* on-chain. With it, that path correctly shows the amber
"on-chain registration pending" notice instead of performing a wrong write.

### 5.3 One-line summary of each write

```ts
export async function chainRegisterPatient(
  input: RegisterPatientInput,
): Promise<ChainResult> {
  const op = "registerPatient(address, didURI)";
  requireWrite(op);
  requireSignerMatch(op, input.address);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "registerPatient",
      args: [input.didURI],
    }),
  );
}
```

Every other function follows the same shape; see the source for the exact
argument lists (this tutorial lists all mappings in 5.2).

---

## 6. Read hooks — `src/hooks/useContract.ts`

Thin, typed `useReadContract` wrappers. All are **auto-disabled** whenever the
contract is unconfigured or the required parameter is missing, so they are safe
to render unconditionally:

```ts
"use client";

import { useReadContract } from "wagmi";
import { useAccount, useChainId } from "wagmi";
import type { Address } from "viem";
import { healthRecordAbi } from "@/lib/health-record-abi";
import {
  contractAddress,
  contractChainId,
  isContractConfigured,
  ROLE_IDS,
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
    args: patient && recordId ? [patient as Address, toBytes32(recordId)] : undefined,
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
        ? [patient as Address, toBytes32(recordId), toBytes32(candidateHash)]
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
```

Usage example (consents page, one day): a provider can show an on-chain badge —
`useHasValidAccess(patient, user.address)` from the hook above beats trusting
the DB when it matters for record access.

Return shapes come straight from the ABI outputs (wagmi decodes tuples into
named objects): `{ registered, didURI }`, `{ registered, verified, didURI,
name }`, `{ matches, tombstoned }`, `{ recordHash, pointer, anchoredBy,
anchoredAt, tombstoned }`, `{ validUntil, doctor, justification }`.

---

## 7. Status component — `src/components/OnChainStatus.tsx`

A small pill for the sidebar: network name, whether the contract is configured,
and — when ready — which on-chain roles the connected wallet holds. Everything
is derived from `useChainStatus` + `useHasRole`, so it needs no props and is
hydration safe:

```tsx
"use client";

import { useChainStatus, useHasRole } from "@/hooks/useContract";
import { ROLE_IDS } from "@/lib/contract";

const rolePills = [
  { id: ROLE_IDS.VERIFIED_PROVIDER, label: "VERIFIED PROVIDER", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: ROLE_IDS.REGULATOR, label: "REGULATOR", tone: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { id: ROLE_IDS.ER_SPECIALIST, label: "ER SPECIALIST", tone: "text-red-400 border-red-500/30 bg-red-500/10" },
];

export default function OnChainStatus() {
  const status = useChainStatus();
  const roles = status.ready
    ? rolePills.map((p) => ({ ...p, has: useHasRole(p.id, status.address).data }))
    : [];

  return (
    <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            status.ready ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span className="text-zinc-400">
          {!status.isWalletConnected
            ? "Wallet required"
            : !status.isConfigured
              ? "Contract not deployed"
              : !status.onCorrectChain
                ? `Switch to chain ${status.expectedChainId}`
                : `Chain ${status.chainId} · Contract on`}
        </span>
      </div>
      {status.ready && roles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {roles.map((r) => (
            <span key={r.label} className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${r.tone}`}>
              {r.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

> Rule note: hooks (here `useHasRole`) may not be called inside `.map`. In the
> shipped component we call the three hooks unconditionally on the happy path
> and conditionally render the pills (see source) — this sketch shows intent.

Mount it in `src/components/Navbar.tsx` under the wallet chip:

```tsx
import OnChainStatus from "@/components/OnChainStatus";
// ...
{wallet && (
  <div className="mt-2 flex items-center gap-2 ...">…wallet chip…</div>
)}
<OnChainStatus />
```

---

## 8. Verify

```bash
npm run lint
npm run build
npm run dev   # http://localhost:3000/login
```

With `NEXT_PUBLIC_CONTRACT_ADDRESS` set and a Sepolia account:

1. **Register on /register** → MetaMask prompt → tx confirmed → the status pill
   lights up with the right role pills. Reload reconnects.
2. **Records → Anchor** → enters a real tx; the form only resets after the
   receipt is `success`.
3. **Without** a contract address (delete the env var) → everything still works
   with the amber "chain write not wired" notices.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Always amber notice "not configured" | `NEXT_PUBLIC_CONTRACT_ADDRESS` unset/empty or not `0x`+40-hex. |
| "Connected to chain X, expected 11155111" | Wallet on the wrong network; switch in MetaMask/RainbowKit. |
| "uses msg.sender — connect the wallet that owns the address" | Admin forms can only *mirror* on-chain registrations for arbitrary addresses; register that wallet itself for a real on-chain write. |
| MetaMask "execution reverted" on verify | Signer lacks `REGULATOR_ROLE`, or provider not registered (`NotRegistered`). |
| Record anchor "Invalid bytes32" (shouldn't happen) | An arg was passed raw instead of through `toBytes32`. |
| `chainExpireEmergencyAccess` still amber | Expected — no on-chain expire function exists. |
| Warnings about `@react-native-async-storage` / `@x402/core` | Known harmless Phase 1 build warnings from RainbowKit deps. |

---

## 10. Known limits (accepted for this phase)

- **DB-first, chain-second** orchestration stays as Phase 1 designed: metadata
  saves, then the write is attempted; a failed write leaves the DB ahead of the
  chain. Recipient confirmation prevents reporting a *success* for a reverted
  tx (todo: surface the tx-hash in audit UI).
- **One network** (Sepolia). Multi-chain would generalize `contract.ts` to a
  per-chain address map; deferred.
- **No relayer/`msg.sender` proxy**: on-chain admin registration of third-party
  addresses is impossible by contract design; use self-registration flows.
- **ABI is hand-written**, not generated from a Hardhat artifact. Fine while
  the contract is small and frozen; switch to `npx @wagmi/cli` when it grows.