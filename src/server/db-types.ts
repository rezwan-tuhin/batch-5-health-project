import type { RecordContent, RecordType, Role } from "@/lib/dummy-data";

/** Shared input types for the two db backends (memory + mongo). */
export interface AuditActor {
  name: string;
  role: string;
}

export interface SignupInput {
  address: string;
  name: string;
  didURI: string;
  role: Role;
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
  providerName: string;
  purpose: string;
  expiresAt: number;
}

export interface RevokeConsentInput {
  patientAddress: string;
  providerAddress: string;
}

export interface AnchorRecordInput {
  patientAddress: string;
  title: string;
  recordHash: string;
  pointer?: string;
  ipfsCid?: string;
  fileName?: string;
  content?: RecordContent;
  anchoredBy?: string;
  providerName?: string;
  hospital?: string;
  recordType?: RecordType;
}

export interface TombstoneRecordInput {
  patientAddress: string;
  recordId: string;
}

export interface TriggerEmergencyInput {
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  justification: string;
  validUntil: string;
  hours: number;
}

export interface ExpireEmergencyInput {
  patientAddress: string;
}

export interface UpsertProviderProfileInput {
  address: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  email: string;
}