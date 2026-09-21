import { randomUUID } from "node:crypto";
import type {
  AuditEntry,
  Consent,
  EmergencyAccess,
  Patient,
  PatientProfile,
  Provider,
  ProviderProfile,
  RecordAnchor,
  RecordContent,
  RecordType,
  Role,
  User,
} from "@/lib/dummy-data";
import {
  auditLog,
  initialConsents,
  initialEmergencyAccess,
  initialPatients,
  initialProviders,
  initialRecords,
  patientProfiles as seedPatientProfiles,
  providerProfiles as seedProviderProfiles,
  users as seedUsers,
} from "@/lib/dummy-data";

/**
 * In-memory "database" seeded from `dummy-data.ts`.
 *
 * This module is the single source of truth for demo data while the backend
 * isn't wired yet. Every `/api/*` route handler reads and writes through it, so
 * the UI behaves exactly as if a real database were present.
 *
 * TODO(mongodb): keep these function signatures identical and replace the
 * internals with Mongoose models (see tutorial Phase 4). The route handlers and
 * the React app never change — only this module does. Seed the real collections
 * with `scripts/seed.ts` from the same `dummy-data.ts` arrays so the UI is
 * pixel-identical.
 */

export interface AuditActor {
  name: string;
  role: string;
}

const users: User[] = seedUsers.map((u) => ({ ...u }));
const patients: Patient[] = initialPatients.map((p) => ({ ...p }));
const providers: Provider[] = initialProviders.map((p) => ({ ...p }));
const patientProfiles: PatientProfile[] = seedPatientProfiles.map((p) => ({
  ...p,
  allergies: [...p.allergies],
}));
const providerProfiles: ProviderProfile[] = seedProviderProfiles.map((p) => ({
  ...p,
}));
const consents: Consent[] = initialConsents.map((c) => ({ ...c }));
const records: RecordAnchor[] = structuredClone(initialRecords);
const emergency: EmergencyAccess[] = initialEmergencyAccess.map((e) => ({
  ...e,
}));
const audit: AuditEntry[] = auditLog.map((a) => ({ ...a }));

let nextUserId = Math.max(0, ...users.map((u) => u.id)) + 1;
let nextAuditId = Math.max(0, ...audit.map((a) => a.id)) + 1;

function makeInitials(name: string): string {
  const parts = (name.trim() || "?").split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function appendAudit(
  actor: AuditActor | undefined,
  action: string,
  target: string,
  details: string,
) {
  audit.unshift({
    id: nextAuditId++,
    actorName: actor?.name ?? "System",
    actorRole: actor?.role ?? "Admin",
    action,
    target,
    timestamp: new Date().toISOString(),
    details,
  });
}

// ---------------------------------------------------------------------------
// Auth / users
// ---------------------------------------------------------------------------

export function resolveUser(address: string): User | null {
  return users.find((u) => u.address === address) ?? null;
}

export function listUsers(): User[] {
  return [...users].sort((a, b) => a.id - b.id);
}

export function signup(input: {
  address: string;
  name: string;
  didURI: string;
  role: Role;
}): User {
  const existing = users.find((u) => u.address === input.address);
  if (existing) {
    existing.name = input.name;
    existing.didURI = input.didURI;
    existing.role = input.role;
    existing.initials = makeInitials(input.name);
    return { ...existing };
  }
  const user: User = {
    id: nextUserId++,
    name: input.name,
    address: input.address,
    didURI: input.didURI,
    role: input.role,
    initials: makeInitials(input.name),
  };
  users.push(user);
  appendAudit(
    undefined,
    "Account Created",
    user.name,
    `${user.role} account created with DID ${user.didURI}`,
  );
  return { ...user };
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export function listPatients() {
  return patients.map((p) => {
    const prof = patientProfiles.find((x) => x.address === p.address);
    return prof ? { ...p, ...prof } : { ...p };
  });
}

export function registerPatient(
  input: { address: string; didURI: string },
  actor?: AuditActor,
) {
  let p = patients.find((x) => x.address === input.address);
  if (!p) {
    p = { address: input.address, didURI: input.didURI, registered: true };
    patients.push(p);
  } else {
    p.registered = true;
    p.didURI = input.didURI;
  }
  appendAudit(actor, "Patient Registered", p.address, "Patient identity registered with DID.");
  return { ...p };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export function listProviders() {
  return providers.map((p) => {
    const prof = providerProfiles.find((x) => x.address === p.address);
    if (!prof) return { ...p };
    return {
      ...p,
      name: prof.name || p.name,
      specialty: prof.specialty,
      licenseNumber: prof.licenseNumber,
      hospital: prof.hospital,
      email: prof.email,
      role: prof.role,
    };
  });
}

export function registerProvider(
  input: { address: string; name: string; didURI: string },
  actor?: AuditActor,
) {
  let p = providers.find((x) => x.address === input.address);
  if (!p) {
    p = {
      address: input.address,
      name: input.name,
      didURI: input.didURI,
      registered: true,
      verified: false,
      erQualified: false,
    };
    providers.push(p);
  } else {
    p.registered = true;
    p.name = input.name;
    p.didURI = input.didURI;
  }
  appendAudit(actor, "Provider Registered", p.name, "Provider identity registered with DID.");
  return { ...p };
}

export function verifyProvider(
  input: { address: string; isVerified: boolean; erQualified: boolean },
  actor?: AuditActor,
) {
  const p = providers.find((x) => x.address === input.address);
  if (!p) throw new Error("Provider not found");
  p.verified = input.isVerified;
  p.erQualified = input.isVerified ? input.erQualified : false;
  appendAudit(
    actor,
    p.verified ? "Provider Verified" : "Provider Unverified",
    p.name,
    `ER qualified: ${p.erQualified ? "yes" : "no"}`,
  );
  return { ...p };
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function getPatientProfile(address: string): PatientProfile | null {
  return patientProfiles.find((x) => x.address === address) ?? null;
}

export function upsertPatientProfile(input: PatientProfile): PatientProfile {
  let prof = patientProfiles.find((x) => x.address === input.address);
  if (!prof) {
    prof = { ...input, allergies: [...input.allergies] };
    patientProfiles.push(prof);
  } else {
    prof.name = input.name;
    prof.dob = input.dob;
    prof.bloodType = input.bloodType;
    prof.allergies = [...input.allergies];
    prof.emergencyContact = input.emergencyContact;
    prof.primaryProvider = input.primaryProvider;
    prof.insurance = input.insurance;
  }
  const p = patients.find((x) => x.address === input.address);
  if (p) p.name = input.name;
  const u = users.find((x) => x.address === input.address);
  if (u) {
    u.name = input.name;
    u.initials = makeInitials(input.name);
  }
  return { ...prof };
}

export function getProviderProfile(address: string): ProviderProfile | null {
  return providerProfiles.find((x) => x.address === address) ?? null;
}

export function upsertProviderProfile(input: {
  address: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  email: string;
}): ProviderProfile {
  let prof = providerProfiles.find((x) => x.address === input.address);
  const role = prof?.role ?? "provider";
  if (!prof) {
    prof = { ...input, role };
    providerProfiles.push(prof);
  } else {
    prof.name = input.name;
    prof.specialty = input.specialty;
    prof.licenseNumber = input.licenseNumber;
    prof.hospital = input.hospital;
    prof.email = input.email;
  }
  const p = providers.find((x) => x.address === input.address);
  if (p) p.name = input.name;
  const u = users.find((x) => x.address === input.address);
  if (u) {
    u.name = input.name;
    u.initials = makeInitials(input.name);
  }
  return { ...prof };
}

// ---------------------------------------------------------------------------
// Consents
// ---------------------------------------------------------------------------

export function listConsents() {
  return consents.map((c) => {
    const prof = patientProfiles.find((x) => x.address === c.patientAddress);
    const p = patients.find((x) => x.address === c.patientAddress);
    return {
      ...c,
      patientName: prof?.name ?? p?.name ?? c.patientAddress,
    };
  });
}

export function grantConsent(
  input: {
    patientAddress: string;
    providerAddress: string;
    providerName: string;
    purpose: string;
    expiresAt: number;
  },
  actor?: AuditActor,
) {
  const entry: Consent = {
    patientAddress: input.patientAddress,
    providerAddress: input.providerAddress,
    providerName: input.providerName,
    active: true,
    expiresAt: input.expiresAt,
    purpose: input.purpose,
    grantedAt: new Date().toISOString(),
  };
  const idx = consents.findIndex(
    (c) =>
      c.patientAddress === input.patientAddress &&
      c.providerAddress === input.providerAddress,
  );
  if (idx >= 0) consents[idx] = entry;
  else consents.push(entry);
  appendAudit(
    actor,
    "Consent Granted",
    input.providerName,
    `Patient ${input.patientAddress} granted access. Expires ${new Date(
      input.expiresAt * 1000,
    ).toISOString()}.`,
  );
  return { ...entry };
}

export function revokeConsent(
  input: { patientAddress: string; providerAddress: string },
  actor?: AuditActor,
) {
  const c = consents.find(
    (x) =>
      x.patientAddress === input.patientAddress &&
      x.providerAddress === input.providerAddress,
  );
  if (c) {
    c.active = false;
    appendAudit(
      actor,
      "Consent Revoked",
      c.providerName,
      `Patient ${input.patientAddress} revoked access.`,
    );
  }
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function makeRecordId(): string {
  return `0x${randomUUID().replace(/-/g, "")}`;
}

function makeIpfsCid(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "Qm";
  for (let i = 0; i < 44; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function listRecords() {
  return records.map((r) => {
    const prof = patientProfiles.find((x) => x.address === r.patientAddress);
    const p = patients.find((x) => x.address === r.patientAddress);
    return {
      ...r,
      patientName: prof?.name ?? p?.name ?? r.patientAddress,
    };
  });
}

export function anchorRecord(
  input: {
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
  },
  actor?: AuditActor,
) {
  const ipfsCid = input.ipfsCid ?? makeIpfsCid();
  const rec: RecordAnchor = {
    patientAddress: input.patientAddress,
    recordId: makeRecordId(),
    recordHash: input.recordHash,
    pointer: input.pointer ?? `ipfs://${ipfsCid}`,
    ipfsCid,
    anchoredBy: input.anchoredBy ?? actor?.name ?? "system",
    anchoredAt: new Date().toISOString(),
    tombstoned: false,
    title: input.title,
    recordType: input.recordType ?? "lab_report",
    date: new Date().toISOString().slice(0, 10),
    providerName: input.providerName ?? actor?.name ?? "Unknown physician",
    hospital: input.hospital ?? "—",
    content: input.content ?? {},
    hashVerified: true,
  };
  if (input.fileName) rec.fileName = input.fileName;
  records.push(rec);
  const patient = patients.find((x) => x.address === input.patientAddress);
  appendAudit(
    actor,
    "Record Anchored",
    patient?.name ?? input.patientAddress,
    `${input.title.slice(0, 48)} hash anchored to ledger. CID ${ipfsCid}.`,
  );
  return { ...rec };
}

export function tombstoneRecord(
  input: { patientAddress: string; recordId: string },
  actor?: AuditActor,
) {
  const r = records.find(
    (x) => x.patientAddress === input.patientAddress && x.recordId === input.recordId,
  );
  if (!r) throw new Error("Record not found");
  r.tombstoned = true;
  appendAudit(actor, "Record Tombstoned", r.title, "Record marked invalid and removed from active feed.");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Emergency access
// ---------------------------------------------------------------------------

export function listEmergency() {
  return emergency.map((e) => {
    const prof = patientProfiles.find((x) => x.address === e.patientAddress);
    const p = patients.find((x) => x.address === e.patientAddress);
    return {
      ...e,
      patientName: prof?.name ?? p?.name ?? e.patientAddress,
    };
  });
}

export function triggerEmergency(
  input: {
    patientAddress: string;
    doctorAddress: string;
    doctorName: string;
    justification: string;
    validUntil: string;
    hours: number;
  },
  actor?: AuditActor,
) {
  const entry: EmergencyAccess = {
    patientAddress: input.patientAddress,
    doctorAddress: input.doctorAddress,
    doctorName: input.doctorName,
    justification: input.justification,
    validUntil: input.validUntil,
    active: true,
  };
  emergency.push(entry);
  const patient = patients.find((x) => x.address === input.patientAddress);
  appendAudit(
    actor,
    "Emergency Access",
    patient?.name ?? input.patientAddress,
    `${input.doctorName} triggered break-glass access for ${input.hours}h.`,
  );
  return { ...entry };
}

export function expireEmergency(
  input: { patientAddress: string },
  actor?: AuditActor,
) {
  const e = emergency.find((x) => x.patientAddress === input.patientAddress);
  if (e) {
    e.active = false;
    const patient = patients.find((x) => x.address === input.patientAddress);
    appendAudit(actor, "Emergency Access Expired", patient?.name ?? input.patientAddress, "Break-glass session ended.");
  }
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function listAudit(): AuditEntry[] {
  return [...audit].sort((a, b) => b.id - a.id);
}