/**
 * Mongoose schemas (Phase 4 — MongoDB persistence).
 *
 * Models mirror the `dummy-data.ts` types one-to-one. Every read path projects
 * away `_id`/`__v`, so API responses stay byte-identical to the in-memory
 * backend. Numeric `id` is kept for User/AuditEntry because the UI renders
 * those keys.
 *
 * NOTE: schemas are deliberately untyped. Mongoose's generic `Schema<T>` /
 * `model<T>` types decompile the checker pathologically slow (>5 min / OOM on
 * this machine), so the models are `Model<any>` and strong typing lives on the
 * db function boundaries in `mongodb.ts` (which cast results to the
 * `dummy-data.ts` shapes).
 *
 * eslint-disable @typescript-eslint/no-explicit-any is applied at the getModel
 * helper below for the same reason.
 */
import { Schema, type Model, model, models } from "mongoose";

/** Mongo projection used on every read so API JSON matches the memory backend. */
export const PROJECTED_FIELDS = "-_id -__v";

export const ROLES = [
  "patient",
  "provider",
  "regulator",
  "er_specialist",
  "admin",
] as const;

export const RECORD_TYPES = [
  "lab_report",
  "imaging",
  "prescription",
  "discharge_summary",
  "ecg",
  "allergy_panel",
  "vaccination",
] as const;

const userSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  didURI: { type: String, required: true },
  role: { type: String, enum: ROLES, required: true },
  initials: { type: String, required: true },
});
userSchema.index({ address: 1 }, { unique: true });
userSchema.index({ id: 1 }, { unique: true });

const patientSchema = new Schema({
  address: { type: String, required: true },
  didURI: { type: String, required: true },
  registered: { type: Boolean, required: true },
  name: { type: String },
});
patientSchema.index({ address: 1 }, { unique: true });

const patientProfileSchema = new Schema({
  address: { type: String, required: true },
  name: { type: String, required: true },
  dob: { type: String, required: true },
  bloodType: { type: String, required: true },
  allergies: { type: [String], required: true },
  emergencyContact: { type: String, required: true },
  primaryProvider: { type: String, required: true },
  insurance: { type: String, required: true },
});
patientProfileSchema.index({ address: 1 }, { unique: true });

const providerSchema = new Schema({
  address: { type: String, required: true },
  name: { type: String, required: true },
  didURI: { type: String, required: true },
  registered: { type: Boolean, required: true },
  verified: { type: Boolean, required: true },
  erQualified: { type: Boolean, required: true },
  specialty: { type: String },
  licenseNumber: { type: String },
  hospital: { type: String },
});
providerSchema.index({ address: 1 }, { unique: true });

const providerProfileSchema = new Schema({
  address: { type: String, required: true },
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  hospital: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ["provider", "er_specialist"], required: true },
});
providerProfileSchema.index({ address: 1 }, { unique: true });

const consentSchema = new Schema({
  patientAddress: { type: String, required: true },
  providerAddress: { type: String, required: true },
  providerName: { type: String, required: true },
  active: { type: Boolean, required: true },
  expiresAt: { type: Number, required: true },
  purpose: { type: String, required: true },
  grantedAt: { type: String, required: true },
});
consentSchema.index({ patientAddress: 1, providerAddress: 1 });

const recordAnchorSchema = new Schema({
  patientAddress: { type: String, required: true },
  recordId: { type: String, required: true },
  recordHash: { type: String, required: true },
  pointer: { type: String, required: true },
  ipfsCid: { type: String, required: true },
  anchoredBy: { type: String, required: true },
  anchoredAt: { type: String, required: true },
  tombstoned: { type: Boolean, required: true },
  title: { type: String, required: true },
  recordType: { type: String, enum: RECORD_TYPES, required: true },
  date: { type: String, required: true },
  providerName: { type: String, required: true },
  hospital: { type: String, required: true },
  content: { type: Schema.Types.Mixed, default: {} },
  hashVerified: { type: Boolean, required: true },
  fileName: { type: String },
});
recordAnchorSchema.index({ patientAddress: 1, recordId: 1 });

const emergencySchema = new Schema({
  patientAddress: { type: String, required: true },
  doctorAddress: { type: String, required: true },
  doctorName: { type: String, required: true },
  justification: { type: String, required: true },
  validUntil: { type: String, required: true },
  active: { type: Boolean, required: true },
});
emergencySchema.index({ patientAddress: 1 });

const auditSchema = new Schema({
  id: { type: Number, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, required: true },
  timestamp: { type: String, required: true },
  details: { type: String, required: true },
});
auditSchema.index({ id: 1 }, { unique: true });

/* eslint-disable @typescript-eslint/no-explicit-any -- keep model typing monomorphic:
   generic Schema<T>/model<T> decompiles pathologically slow on this machine. The
   typed boundaries live in mongodb.ts, which casts results to dummy-data shapes. */
function getModel(name: string, schema: Schema): Model<any> {
  return (models[name] as Model<any> | undefined) ?? model(name, schema);
}

export const UserModel = getModel("User", userSchema);
export const PatientModel = getModel("Patient", patientSchema);
export const PatientProfileModel = getModel("PatientProfile", patientProfileSchema);
export const ProviderModel = getModel("Provider", providerSchema);
export const ProviderProfileModel = getModel("ProviderProfile", providerProfileSchema);
export const ConsentModel = getModel("Consent", consentSchema);
export const RecordAnchorModel = getModel("RecordAnchor", recordAnchorSchema);
export const EmergencyModel = getModel("EmergencyAccess", emergencySchema);
export const AuditModel = getModel("Audit", auditSchema);