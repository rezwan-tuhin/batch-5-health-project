/**
 * On-chain operations seam.
 *
 * Every write here goes through wagmi imperative actions (writeContract +
 * waitForTransactionReceipt) against the deployed HealthRecordSystem (ABI in
 * `src/lib/health-record-abi.ts`, address in `src/lib/contract.ts`).
 *
 * Components call these from event handlers (not during render), so wagmi
 * hooks cannot be used here — the actions API is the correct fit.
 *
 * If the contract is not configured, no wallet is connected, or the connected
 * chain differs from `contractChainId`, a `ChainNotWiredError` is thrown. The
 * UI already catches this exact class and degrades gracefully (DB-first,
 * amber "chain write not wired" notice). Any other error is rethrown and
 * surfaces in the form error UI (e.g. MetaMask rejection, contract reverts).
 */
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
  const chainId = getChainId(wagmiConfig);
  if (chainId !== contractChainId) {
    throw new ChainNotWiredError(
      operation,
      `Connected to chain ${chainId}, expected ${contractChainId}.`,
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

export interface RegisterPatientInput {
  address: string;
  didURI: string;
}

export interface RegisterProviderInput {
  address: string;
  name: string;
  didURI: string;
}

export interface VerifyProviderInput {
  address: string;
  isVerified: boolean;
  erQualified: boolean;
}

export interface GrantConsentInput {
  patientAddress: string;
  providerAddress: string;
  purpose: string;
  expiresAt: number;
}

export interface RevokeConsentInput {
  patientAddress: string;
  providerAddress: string;
}

export interface AnchorRecordInput {
  patientAddress: string;
  recordId: string;
  recordHash: string;
  pointer: string;
}

export interface TombstoneRecordInput {
  patientAddress: string;
  recordId: string;
}

export interface TriggerEmergencyAccessInput {
  patientAddress: string;
  doctorAddress: string;
  justification: string;
  validUntil: number;
}

export interface ExpireEmergencyAccessInput {
  patientAddress: string;
}

const asAddress = (value: string): `0x${string}` => value as `0x${string}`;

// registerPatient(didURI) — msg.sender is the patient.
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

// registerProvider(didURI, name) — msg.sender is the provider.
export async function chainRegisterProvider(
  input: RegisterProviderInput,
): Promise<ChainResult> {
  const op = "registerProvider(name, address)";
  requireWrite(op);
  requireSignerMatch(op, input.address);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "registerProvider",
      args: [input.didURI, input.name],
    }),
  );
}

// verifyProvider(address, isVerified, isERQualified) — REGULATOR_ROLE only.
export async function chainVerifyProvider(
  input: VerifyProviderInput,
): Promise<ChainResult> {
  const op = "verifyProvider(address, isVerified, isERQualified)";
  requireWrite(op);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "verifyProvider",
      args: [asAddress(input.address), input.isVerified, input.erQualified],
    }),
  );
}

// grantConsent(provider, purpose, expiresAt) — msg.sender is the patient.
export async function chainGrantConsent(
  input: GrantConsentInput,
): Promise<ChainResult> {
  const op = "grantConsent(patient, provider, purpose, expiresAt)";
  requireWrite(op);
  requireSignerMatch(op, input.patientAddress);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "grantConsent",
      args: [
        asAddress(input.providerAddress),
        input.purpose,
        BigInt(input.expiresAt),
      ],
    }),
  );
}

// revokeConsent(patient, provider) — contract allows the patient or a regulator.
export async function chainRevokeConsent(
  input: RevokeConsentInput,
): Promise<ChainResult> {
  const op = "revokeConsent(patient, provider)";
  requireWrite(op);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "revokeConsent",
      args: [asAddress(input.patientAddress), asAddress(input.providerAddress)],
    }),
  );
}

// anchorRecord(patient, recordId, recordHash, pointer) — anchoredBy msg.sender.
// recordId/recordHash are mapped to bytes32 via keccak256 (see src/lib/contract.ts).
export async function chainAnchorRecord(
  input: AnchorRecordInput,
): Promise<ChainResult> {
  const op = "anchorRecord(patient, recordId, recordHash, pointer)";
  requireWrite(op);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "anchorRecord",
      args: [
        asAddress(input.patientAddress),
        toBytes32(input.recordId),
        toBytes32(input.recordHash),
        input.pointer,
      ],
    }),
  );
}

// tombstoneRecord(patient, recordId) — contract allows the patient or a regulator.
export async function chainTombstoneRecord(
  input: TombstoneRecordInput,
): Promise<ChainResult> {
  const op = "tombstoneRecord(patient, recordId)";
  requireWrite(op);
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "tombstoneRecord",
      args: [asAddress(input.patientAddress), toBytes32(input.recordId)],
    }),
  );
}

// triggerEmergencyAccess(patient, justification, duration) — msg.sender is the
// ER specialist; the contract enforces ER_SPECIALIST_ROLE. The seam receives an
// absolute validUntil (unix seconds) and converts it to the required duration.
export async function chainTriggerEmergencyAccess(
  input: TriggerEmergencyAccessInput,
): Promise<ChainResult> {
  const op = "triggerEmergencyAccess(patient, justification, duration)";
  requireWrite(op);
  requireSignerMatch(op, input.doctorAddress);
  const duration = Math.max(0, input.validUntil - Math.floor(Date.now() / 1000));
  return confirm(op, () =>
    writeContract(wagmiConfig, {
      address: contractAddress,
      abi: healthRecordAbi,
      functionName: "triggerEmergencyAccess",
      args: [
        asAddress(input.patientAddress),
        input.justification,
        BigInt(duration),
      ],
    }),
  );
}

// There is no expire/revoke function for emergency sessions in the contract —
// a session self-expires when validUntil < block.timestamp (hasValidAccess). No
// write exists on-chain, so this throws ChainNotWiredError and the UI shows its
// honest "DB updated, on-chain expiry is time-based" style notice.
export async function chainExpireEmergencyAccess(
  input: ExpireEmergencyAccessInput,
): Promise<ChainResult> {
  const op = `expireEmergencyAccess(${input.patientAddress})`;
  throw new ChainNotWiredError(
    op,
    "on-chain emergency sessions expire automatically at validUntil; no contract function exists.",
  );
}