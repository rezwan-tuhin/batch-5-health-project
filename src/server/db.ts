/**
 * Database facade (Phase 4).
 *
 * Single import point for every `/api/*` route handler. When `MONGODB_URI` is
 * configured the app persists to MongoDB Atlas through `mongodb.ts` (Mongoose);
 * otherwise it falls back to the seeded in-memory store in `memory-db.ts`.
 *
 * All functions are async so the route handlers and the React app never need to
 * know which backend is live; the JSON shapes are identical either way.
 */
import { isMongoConfigured } from "@/server/mongodb";
import * as memory from "@/server/memory-db";
import * as mongo from "@/server/mongodb";

export type { AuditActor } from "@/server/db-types";

const useMongo = isMongoConfigured();

export async function resolveUser(address: string) {
  return useMongo ? mongo.resolveUser(address) : memory.resolveUser(address);
}

export async function listUsers() {
  return useMongo ? mongo.listUsers() : memory.listUsers();
}

export async function signup(input: Parameters<typeof memory.signup>[0]) {
  return useMongo ? mongo.signup(input) : memory.signup(input);
}

export async function listPatients() {
  return useMongo ? mongo.listPatients() : memory.listPatients();
}

export async function registerPatient(
  input: Parameters<typeof memory.registerPatient>[0],
  actor?: Parameters<typeof memory.registerPatient>[1],
) {
  return useMongo
    ? mongo.registerPatient(input, actor)
    : memory.registerPatient(input, actor);
}

export async function listProviders() {
  return useMongo ? mongo.listProviders() : memory.listProviders();
}

export async function registerProvider(
  input: Parameters<typeof memory.registerProvider>[0],
  actor?: Parameters<typeof memory.registerProvider>[1],
) {
  return useMongo
    ? mongo.registerProvider(input, actor)
    : memory.registerProvider(input, actor);
}

export async function verifyProvider(
  input: Parameters<typeof memory.verifyProvider>[0],
  actor?: Parameters<typeof memory.verifyProvider>[1],
) {
  return useMongo
    ? mongo.verifyProvider(input, actor)
    : memory.verifyProvider(input, actor);
}

export async function getPatientProfile(address: string) {
  return useMongo
    ? mongo.getPatientProfile(address)
    : memory.getPatientProfile(address);
}

export async function upsertPatientProfile(input: Parameters<typeof memory.upsertPatientProfile>[0]) {
  return useMongo
    ? mongo.upsertPatientProfile(input)
    : memory.upsertPatientProfile(input);
}

export async function getProviderProfile(address: string) {
  return useMongo
    ? mongo.getProviderProfile(address)
    : memory.getProviderProfile(address);
}

export async function upsertProviderProfile(input: Parameters<typeof memory.upsertProviderProfile>[0]) {
  return useMongo
    ? mongo.upsertProviderProfile(input)
    : memory.upsertProviderProfile(input);
}

export async function listConsents() {
  return useMongo ? mongo.listConsents() : memory.listConsents();
}

export async function grantConsent(
  input: Parameters<typeof memory.grantConsent>[0],
  actor?: Parameters<typeof memory.grantConsent>[1],
) {
  return useMongo
    ? mongo.grantConsent(input, actor)
    : memory.grantConsent(input, actor);
}

export async function revokeConsent(
  input: Parameters<typeof memory.revokeConsent>[0],
  actor?: Parameters<typeof memory.revokeConsent>[1],
) {
  return useMongo
    ? mongo.revokeConsent(input, actor)
    : memory.revokeConsent(input, actor);
}

export async function listRecords() {
  return useMongo ? mongo.listRecords() : memory.listRecords();
}

export async function anchorRecord(
  input: Parameters<typeof memory.anchorRecord>[0],
  actor?: Parameters<typeof memory.anchorRecord>[1],
) {
  return useMongo
    ? mongo.anchorRecord(input, actor)
    : memory.anchorRecord(input, actor);
}

export async function tombstoneRecord(
  input: Parameters<typeof memory.tombstoneRecord>[0],
  actor?: Parameters<typeof memory.tombstoneRecord>[1],
) {
  return useMongo
    ? mongo.tombstoneRecord(input, actor)
    : memory.tombstoneRecord(input, actor);
}

export async function listEmergency() {
  return useMongo ? mongo.listEmergency() : memory.listEmergency();
}

export async function triggerEmergency(
  input: Parameters<typeof memory.triggerEmergency>[0],
  actor?: Parameters<typeof memory.triggerEmergency>[1],
) {
  return useMongo
    ? mongo.triggerEmergency(input, actor)
    : memory.triggerEmergency(input, actor);
}

export async function expireEmergency(
  input: Parameters<typeof memory.expireEmergency>[0],
  actor?: Parameters<typeof memory.expireEmergency>[1],
) {
  return useMongo
    ? mongo.expireEmergency(input, actor)
    : memory.expireEmergency(input, actor);
}

export async function listAudit() {
  return useMongo ? mongo.listAudit() : memory.listAudit();
}