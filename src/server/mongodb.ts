/**
 * MongoDB backend (Phase 4 — persistence).
 *
 * Mongoose implementation of every `src/server/db.ts` function, selected by the
 * facade when `MONGODB_URI` is configured. Seeded idempotently from
 * `dummy-data.ts` on first connect, so a fresh Atlas cluster is pixel-identical
 * to the in-memory demo.
 *
 * All reads project away `_id`/`__v` so API JSON matches the memory backend
 * exactly. Where a doc must be updated afterwards, it is re-read with `_id`
 * projected in and removed from the returned shape. Results are cast to the
 * `dummy-data.ts` shapes at the typed boundaries below.
 */
import mongoose from "mongoose";
import type {
  AuditEntry,
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
import {
  AuditModel,
  ConsentModel,
  EmergencyModel,
  PatientModel,
  PatientProfileModel,
  ProviderModel,
  ProviderProfileModel,
  PROJECTED_FIELDS,
  RecordAnchorModel,
  UserModel,
} from "@/server/models";
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

type Doc = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any -- Mongoose's generic query
   types (QueryWithHelpers, HydratedDocument, FlattenMaps…) decompile
   pathologically slow on this machine, so the model layer is typed `Model<any>`.
   Every result is cast to the `dummy-data.ts` shapes at the typed boundaries
   below, which is exactly what the memory backend guarantees at runtime. */
type MongoModel = mongoose.Model<any>;

export function isMongoConfigured(): boolean {
  return !!(process.env.MONGODB_URI ?? "").trim();
}

let connectPromise: Promise<void> | null = null;
let hasSeeded = false;

async function connectToDatabase(): Promise<void> {
  const uri = (process.env.MONGODB_URI ?? "").trim();
  if (!uri) {
    throw new Error(
      "[mongo] MONGODB_URI is not configured — cannot use the Mongo backend.",
    );
  }
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { dbName: "health" });
  }
  if (!hasSeeded) {
    await seedIfEmpty();
    hasSeeded = true;
  }
}

export async function ensureConnected(): Promise<void> {
  connectPromise ??= connectToDatabase().catch((err) => {
    connectPromise = null;
    throw err;
  });
  await connectPromise;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seedIfEmpty(): Promise<void> {
  const seeds: Array<[MongoModel, unknown[]]> = [
    [UserModel, seedUsers],
    [PatientModel, initialPatients],
    [PatientProfileModel, seedPatientProfiles],
    [ProviderModel, initialProviders],
    [ProviderProfileModel, seedProviderProfiles],
    [ConsentModel, initialConsents],
    [RecordAnchorModel, initialRecords],
    [EmergencyModel, initialEmergencyAccess],
    [AuditModel, auditLog],
  ];
  for (const [model, docs] of seeds) {
    const count = await model.countDocuments();
    if (count === 0 && docs.length > 0) {
      await (model as unknown as {
        insertMany: (d: unknown[]) => Promise<unknown>;
      }).insertMany(docs);
    }
  }
}

/** Drop every collection and reseed from `dummy-data.ts` (used by `npm run seed`). */
export async function reseedDatabase(): Promise<void> {
  await ensureConnected();
  await Promise.all(
    [UserModel, PatientModel, PatientProfileModel, ProviderModel,
      ProviderProfileModel, ConsentModel, RecordAnchorModel, EmergencyModel,
      AuditModel].map((m) => m.deleteMany({})),
  );
  await seedIfEmpty();
  hasSeeded = true;
}

/** Disconnect so standalone scripts can exit cleanly. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  hasSeeded = false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitials(name: string): string {
  const parts = (name.trim() || "?").split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function makeRecordId(): string {
  return `0x${crypto.randomUUID().replace(/-/g, "")}`;
}

function makeIpfsCid(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "Qm";
  for (let i = 0; i < 44; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function nextNumericId(model: MongoModel): Promise<number> {
  const last = (await model.findOne().sort({ id: -1 }).select("id").lean()) as
    | { id?: number }
    | null;
  return (last?.id ?? 0) + 1;
}

function strip<T extends object>(doc: T): T {
  const { _id: _dropped, __v: _legacy, ...rest } = doc as T & {
    _id?: unknown;
    __v?: unknown;
  };
  void _dropped;
  void _legacy;
  return rest as T;
}

async function appendAudit(
  actor: AuditActor | undefined,
  action: string,
  target: string,
  details: string,
): Promise<void> {
  const id = await nextNumericId(AuditModel);
  await AuditModel.create({
    id,
    actorName: actor?.name ?? "System",
    actorRole: actor?.role ?? "Admin",
    action,
    target,
    timestamp: new Date().toISOString(),
    details,
  });
}

async function patientName(address: string): Promise<string | undefined> {
  const prof = (await PatientProfileModel.findOne({ address })
    .select(PROJECTED_FIELDS)
    .lean()) as { name?: string } | null;
  if (prof?.name) return prof.name;
  const p = (await PatientModel.findOne({ address })
    .select(PROJECTED_FIELDS)
    .lean()) as { name?: string } | null;
  return p?.name ?? undefined;
}

// ---------------------------------------------------------------------------
// Auth / users
// ---------------------------------------------------------------------------

export async function resolveUser(address: string): Promise<User | null> {
  await ensureConnected();
  return (await UserModel.findOne({ address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as User | null;
}

export async function listUsers(): Promise<User[]> {
  await ensureConnected();
  return (await UserModel.find().select(PROJECTED_FIELDS).sort({ id: 1 }).lean()) as unknown as User[];
}

export async function signup(input: SignupInput): Promise<User> {
  await ensureConnected();
  const existing = (await UserModel.findOne({ address: input.address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as User | null;
  if (existing) {
    await UserModel.updateOne(
      { address: input.address },
      {
        $set: {
          name: input.name,
          didURI: input.didURI,
          role: input.role,
          initials: makeInitials(input.name),
        },
      },
    );
    return (await UserModel.findOne({ address: input.address })
      .select(PROJECTED_FIELDS)
      .lean()) as unknown as User;
  }
  const user = await UserModel.create({
    id: await nextNumericId(UserModel),
    name: input.name,
    address: input.address,
    didURI: input.didURI,
    role: input.role,
    initials: makeInitials(input.name),
  });
  await appendAudit(
    undefined,
    "Account Created",
    user.name,
    `${user.role} account created with DID ${user.didURI}`,
  );
  return strip(user);
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export async function listPatients(): Promise<Array<Patient & Partial<PatientProfile>>> {
  await ensureConnected();
  const [patients, profiles] = await Promise.all([
    PatientModel.find().select(PROJECTED_FIELDS).lean(),
    PatientProfileModel.find().select(PROJECTED_FIELDS).lean(),
  ]);
  return (patients as unknown as Patient[]).map((p) => {
    const prof = (profiles as unknown as PatientProfile[]).find((x) => x.address === p.address);
    return prof ? { ...p, ...prof } : { ...p };
  });
}

export async function registerPatient(
  input: RegisterPatientInput,
  actor?: AuditActor,
): Promise<Patient> {
  await ensureConnected();
  const p = (await PatientModel.findOneAndUpdate(
    { address: input.address },
    { $set: { registered: true, didURI: input.didURI } },
    { new: true, upsert: true },
  )
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as Patient;
  await appendAudit(
    actor,
    "Patient Registered",
    p.address,
    "Patient identity registered with DID.",
  );
  return p;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export async function listProviders(): Promise<Array<Provider & Partial<ProviderProfile>>> {
  await ensureConnected();
  const [providers, profiles] = await Promise.all([
    ProviderModel.find().select(PROJECTED_FIELDS).lean(),
    ProviderProfileModel.find().select(PROJECTED_FIELDS).lean(),
  ]);
  return (providers as unknown as Provider[]).map((p) => {
    const prof = (profiles as unknown as ProviderProfile[]).find((x) => x.address === p.address);
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

export async function registerProvider(
  input: RegisterProviderInput,
  actor?: AuditActor,
): Promise<Provider> {
  await ensureConnected();
  const p = (await ProviderModel.findOneAndUpdate(
    { address: input.address },
    {
      $set: { name: input.name, didURI: input.didURI, registered: true },
      $setOnInsert: { verified: false, erQualified: false },
    },
    { new: true, upsert: true },
  )
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as Provider;
  await appendAudit(
    actor,
    "Provider Registered",
    p.name,
    "Provider identity registered with DID.",
  );
  return p;
}

export async function verifyProvider(
  input: VerifyProviderInput,
  actor?: AuditActor,
): Promise<Provider> {
  await ensureConnected();
  const p = (await ProviderModel.findOne({ address: input.address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as Provider | null;
  if (!p) throw new Error("Provider not found");
  const isVerified = input.isVerified;
  const erQualified = isVerified ? input.erQualified : false;
  const updated = (await ProviderModel.findOneAndUpdate(
    { address: input.address },
    { $set: { verified: isVerified, erQualified } },
    { new: true },
  )
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as Provider;
  await appendAudit(
    actor,
    isVerified ? "Provider Verified" : "Provider Unverified",
    updated.name,
    `ER qualified: ${erQualified ? "yes" : "no"}`,
  );
  return updated;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function getPatientProfile(
  address: string,
): Promise<PatientProfile | null> {
  await ensureConnected();
  return (await PatientProfileModel.findOne({ address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as PatientProfile | null;
}

export async function upsertPatientProfile(
  input: PatientProfile,
): Promise<PatientProfile> {
  await ensureConnected();
  const prof = await PatientProfileModel.findOneAndUpdate(
    { address: input.address },
    {
      $set: {
        name: input.name,
        dob: input.dob,
        bloodType: input.bloodType,
        allergies: [...input.allergies],
        emergencyContact: input.emergencyContact,
        primaryProvider: input.primaryProvider,
        insurance: input.insurance,
        address: input.address,
      },
    },
    { new: true, upsert: true },
  )
    .select(PROJECTED_FIELDS)
    .lean();
  await PatientModel.updateOne(
    { address: input.address },
    { $set: { name: input.name } },
  );
  const u = (await UserModel.findOne({ address: input.address }).lean()) as
    | Doc
    | null;
  if (u) {
    await UserModel.updateOne(
      { address: input.address },
      { $set: { name: input.name, initials: makeInitials(input.name) } },
    );
  }
  return prof as unknown as PatientProfile;
}

export async function getProviderProfile(
  address: string,
): Promise<ProviderProfile | null> {
  await ensureConnected();
  return (await ProviderProfileModel.findOne({ address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as ProviderProfile | null;
}

export async function upsertProviderProfile(
  input: UpsertProviderProfileInput,
): Promise<ProviderProfile> {
  await ensureConnected();
  const existing = (await ProviderProfileModel.findOne({ address: input.address })
    .select(PROJECTED_FIELDS)
    .lean()) as { role?: string } | null;
  const role = existing?.role ?? "provider";
  await ProviderProfileModel.updateOne(
    { address: input.address },
    {
      $set: {
        name: input.name,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
        hospital: input.hospital,
        email: input.email,
        role,
        address: input.address,
      },
    },
    { upsert: true },
  );
  const prof = (await ProviderProfileModel.findOne({ address: input.address })
    .select(PROJECTED_FIELDS)
    .lean()) as unknown as ProviderProfile;
  await ProviderModel.updateOne(
    { address: input.address },
    { $set: { name: input.name } },
  );
  const u = (await UserModel.findOne({ address: input.address }).lean()) as
    | Doc
    | null;
  if (u) {
    await UserModel.updateOne(
      { address: input.address },
      { $set: { name: input.name, initials: makeInitials(input.name) } },
    );
  }
  return prof;
}

// ---------------------------------------------------------------------------
// Consents
// ---------------------------------------------------------------------------

export async function listConsents(): Promise<Array<Consent & { patientName?: string }>> {
  await ensureConnected();
  const consents = (await ConsentModel.find().select(PROJECTED_FIELDS).lean()) as unknown as Consent[];
  return Promise.all(
    consents.map(async (c) => ({
      ...c,
      patientName: (await patientName(c.patientAddress)) ?? c.patientAddress,
    })),
  );
}

export async function grantConsent(
  input: GrantConsentInput,
  actor?: AuditActor,
): Promise<Consent> {
  await ensureConnected();
  await ConsentModel.deleteMany({
    patientAddress: input.patientAddress,
    providerAddress: input.providerAddress,
  });
  const created = await ConsentModel.create({
    patientAddress: input.patientAddress,
    providerAddress: input.providerAddress,
    providerName: input.providerName,
    active: true,
    expiresAt: input.expiresAt,
    purpose: input.purpose,
    grantedAt: new Date().toISOString(),
  });
  await appendAudit(
    actor,
    "Consent Granted",
    input.providerName,
    `Patient ${input.patientAddress} granted access. Expires ${new Date(
      input.expiresAt * 1000,
    ).toISOString()}.`,
  );
  return strip(created);
}

export async function revokeConsent(
  input: RevokeConsentInput,
  actor?: AuditActor,
): Promise<{ ok: true }> {
  await ensureConnected();
  const c = (await ConsentModel.findOne({
    patientAddress: input.patientAddress,
    providerAddress: input.providerAddress,
  })
    .select("-__v")
    .lean()) as Doc | null;
  if (c) {
    await ConsentModel.updateOne(
      { _id: c._id },
      { $set: { active: false } },
    );
    await appendAudit(
      actor,
      "Consent Revoked",
      String(c.providerName),
      `Patient ${input.patientAddress} revoked access.`,
    );
  }
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export async function listRecords(): Promise<Array<RecordAnchor & { patientName?: string }>> {
  await ensureConnected();
  const records = (await RecordAnchorModel.find().select(PROJECTED_FIELDS).lean()) as unknown as RecordAnchor[];
  return Promise.all(
    records.map(async (r) => ({
      ...r,
      patientName: (await patientName(r.patientAddress)) ?? r.patientAddress,
    })),
  );
}

export async function anchorRecord(
  input: AnchorRecordInput,
  actor?: AuditActor,
): Promise<RecordAnchor> {
  await ensureConnected();
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
  const created = await RecordAnchorModel.create(rec);
  const name = (await patientName(input.patientAddress)) ?? input.patientAddress;
  await appendAudit(
    actor,
    "Record Anchored",
    name,
    `${input.title.slice(0, 48)} hash anchored to ledger. CID ${ipfsCid}.`,
  );
  return strip(created);
}

export async function tombstoneRecord(
  input: TombstoneRecordInput,
  actor?: AuditActor,
): Promise<{ ok: true }> {
  await ensureConnected();
  const r = (await RecordAnchorModel.findOne({
    patientAddress: input.patientAddress,
    recordId: input.recordId,
  })
    .select("-__v")
    .lean()) as Doc | null;
  if (!r) throw new Error("Record not found");
  await RecordAnchorModel.updateOne(
    { _id: r._id },
    { $set: { tombstoned: true } },
  );
  await appendAudit(
    actor,
    "Record Tombstoned",
    String(r.title),
    "Record marked invalid and removed from active feed.",
  );
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Emergency access
// ---------------------------------------------------------------------------

export async function listEmergency(): Promise<Array<EmergencyAccess & { patientName?: string }>> {
  await ensureConnected();
  const entries = (await EmergencyModel.find().select(PROJECTED_FIELDS).lean()) as unknown as EmergencyAccess[];
  return Promise.all(
    entries.map(async (e) => ({
      ...e,
      patientName: (await patientName(e.patientAddress)) ?? e.patientAddress,
    })),
  );
}

export async function triggerEmergency(
  input: TriggerEmergencyInput,
  actor?: AuditActor,
): Promise<EmergencyAccess> {
  await ensureConnected();
  const created = await EmergencyModel.create({
    patientAddress: input.patientAddress,
    doctorAddress: input.doctorAddress,
    doctorName: input.doctorName,
    justification: input.justification,
    validUntil: input.validUntil,
    active: true,
  });
  const name = (await patientName(input.patientAddress)) ?? input.patientAddress;
  await appendAudit(
    actor,
    "Emergency Access",
    name,
    `${input.doctorName} triggered break-glass access for ${input.hours}h.`,
  );
  return strip(created);
}

export async function expireEmergency(
  input: ExpireEmergencyInput,
  actor?: AuditActor,
): Promise<{ ok: true }> {
  await ensureConnected();
  const e = (await EmergencyModel.findOne({ patientAddress: input.patientAddress })
    .select("-__v")
    .lean()) as Doc | null;
  if (e) {
    await EmergencyModel.updateOne(
      { _id: e._id },
      { $set: { active: false } },
    );
    const name =
      (await patientName(input.patientAddress)) ?? input.patientAddress;
    await appendAudit(
      actor,
      "Emergency Access Expired",
      name,
      "Break-glass session ended.",
    );
  }
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export async function listAudit(): Promise<AuditEntry[]> {
  await ensureConnected();
  return (await AuditModel.find().select(PROJECTED_FIELDS).sort({ id: -1 }).lean()) as unknown as AuditEntry[];
}