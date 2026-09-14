/**
 * On-chain operations seam.
 *
 * Every call here is a TODO(wagmi): replace the throwing stub with the
 * corresponding `useWriteContract`/`useReadContract` call against the deployed
 * HealthRecordSystem contract (see `src/lib/contract.sol` and tutorial.md
 * Phase 2). The UI already wraps these so that a `ChainNotWiredError` degrades
 * gracefully to a warning banner while the API (DB metadata) still succeeds.
 */
export class ChainNotWiredError extends Error {
  constructor(operation: string) {
    super(`[chain] not wired: ${operation}. Implement with wagmi/useWriteContract.`);
    this.name = "ChainNotWiredError";
  }
}

export interface ChainResult {
  transactionHash: string | null;
  ok: boolean;
}

const notWired = (label: string): never => {
  throw new ChainNotWiredError(label);
};

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

// Each function mirrors a contract function:
//   registerPatient(address, didURI)
export async function chainRegisterPatient(input: RegisterPatientInput): Promise<ChainResult> {
  return notWired(`registerPatient(address, didURI) for ${input.address}`);
}

//   registerProvider(address, name, didURI)
export async function chainRegisterProvider(input: RegisterProviderInput): Promise<ChainResult> {
  return notWired(`registerProvider(name=${input.name}, address=${input.address})`);
}

//   verifyProvider(address, isVerified, isERQualified) — REGULATOR_ROLE only
export async function chainVerifyProvider(input: VerifyProviderInput): Promise<ChainResult> {
  return notWired(`verifyProvider(address=${input.address}, verified=${input.isVerified})`);
}

//   grantConsent(patient, provider, purpose, expiresAt)
export async function chainGrantConsent(input: GrantConsentInput): Promise<ChainResult> {
  return notWired(`grantConsent(${input.patientAddress} -> ${input.providerAddress})`);
}

//   revokeConsent(patient, provider)
export async function chainRevokeConsent(input: RevokeConsentInput): Promise<ChainResult> {
  return notWired(`revokeConsent(${input.patientAddress} -> ${input.providerAddress})`);
}

//   anchorRecord(patient, recordId, recordHash, ipfsCid)
export async function chainAnchorRecord(input: AnchorRecordInput): Promise<ChainResult> {
  return notWired(`anchorRecord(${input.patientAddress} recordId=${input.recordId})`);
}

//   tombstoneRecord(patient, recordId)
export async function chainTombstoneRecord(input: TombstoneRecordInput): Promise<ChainResult> {
  return notWired(`tombstoneRecord(${input.patientAddress} recordId=${input.recordId})`);
}

//   triggerEmergencyAccess(patient, doctor, justification, validUntil)
export async function chainTriggerEmergencyAccess(input: TriggerEmergencyAccessInput): Promise<ChainResult> {
  return notWired(`triggerEmergencyAccess(${input.patientAddress} by ${input.doctorAddress})`);
}

//   expireEmergencyAccess(patient)
export async function chainExpireEmergencyAccess(input: ExpireEmergencyAccessInput): Promise<ChainResult> {
  return notWired(`expireEmergencyAccess(${input.patientAddress})`);
}