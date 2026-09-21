/**
 * In-memory "database" seeded from `dummy-data.ts`.
 *
 * This is the fallback backend used when `MONGODB_URI` is not configured. It is
 * the original implementation of `db.ts` moved here so the module keeps the
 * exact same runtime behavior (arrays, same seed arrays) while `db.ts` became a
 * facade. Every function here is synchronous; the facade wraps it in a Promise.
 */
import { randomUUID } from "node:crypto";
import type {
  Consent,
  EmergencyAccess,
  Patient,
  PatientProfile,
  Provider,
  ProviderProfile,
  RecordAnchor,
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
import type {
  AnchorRecordInput,
  AuditActor,
  ExpireEmergencyInput,
  GrantConsentInput,
  RegisterPatientInput,
  RegisterProviderInput,
  RevokeConsentInput,
  SignupInput,
  TombstoneRecordInput,
  TriggerEmergencyInput,
  UpsertProviderProfileInput,
  VerifyProviderInput,
} from "@/server/db-types";

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
const emergency = initialEmergencyAccess.map((e) => ({ ...e }));
const audit = auditLog.map((a) => ({ ...a }));

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

export function signup(input: SignupInput): User {
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

export function listPatients(): Array<Patient & Partial<PatientProfile>> {
  return patients.map((p) => {
    const prof = patientProfiles.find((x) => x.address === p.address);
    return prof ? { ...p, ...prof } : { ...p };
  });
}

export function registerPatient(
  input: RegisterPatientInput,
  actor?: AuditActor,
): Patient {
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

export function listProviders(): Array<Provider & Partial<ProviderProfile>> {
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
  input: RegisterProviderInput,
  actor?: AuditActor,
): Provider {
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
  input: VerifyProviderInput,
  actor?: AuditActor,
): Provider {
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

export function upsertProviderProfile(
  input: UpsertProviderProfileInput,
): ProviderProfile {
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

export function grantConsent(input: GrantConsentInput, actor?: AuditActor): Consent {
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
  input: RevokeConsentInput,
  actor?: AuditActor,
): { ok: true } {
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
  input: AnchorRecordInput,
  actor?: AuditActor,
): RecordAnchor {
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
  input: TombstoneRecordInput,
  actor?: AuditActor,
): { ok: true } {
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
  input: TriggerEmergencyInput,
  actor?: AuditActor,
): EmergencyAccess {
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
  input: ExpireEmergencyInput,
  actor?: AuditActor,
): { ok: true } {
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

export function listAudit() {
  return [...audit].sort((a, b) => b.id - a.id);
}