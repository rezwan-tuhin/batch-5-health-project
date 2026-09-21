/**
 * Database seeding script (Phase 4).
 *
 * Drops every collection and reseeds from `dummy-data.ts`, so the MongoDB
 * backend matches the in-memory demo exactly. Run with:
 *
 *   npm run seed
 *
 * Requires `MONGODB_URI` (read from `.env.local` if not already in the
 * environment) and a reachable MongoDB/Atlas cluster.
 *
 * NOTE: scripts execute outside Next.js, so `.env.local` is loaded manually.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { reseedDatabase, disconnectDatabase } from "@/server/mongodb";
import {
  AuditModel,
  ConsentModel,
  EmergencyModel,
  PatientModel,
  PatientProfileModel,
  ProviderModel,
  ProviderProfileModel,
  RecordAnchorModel,
  UserModel,
} from "@/server/models";

function loadLocalEnv(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  loadLocalEnv();
  const uri = (process.env.MONGODB_URI ?? "").trim();
  if (!uri) {
    console.error(
      "\n[seed] MONGODB_URI is not set.\n" +
        "       Add it to .env.local (e.g. MONGODB_URI=mongodb+srv://user:pass@cluster/…) " +
        "or pass it inline:  $env:MONGODB_URI='mongodb+srv://…'; npm run seed\n",
    );
    process.exit(1);
  }

  console.log("[seed] Dropping collections and reseeding from dummy-data.ts …");
  await reseedDatabase();

  const counts = {
    users: await UserModel.countDocuments(),
    patients: await PatientModel.countDocuments(),
    patientProfiles: await PatientProfileModel.countDocuments(),
    providers: await ProviderModel.countDocuments(),
    providerProfiles: await ProviderProfileModel.countDocuments(),
    consents: await ConsentModel.countDocuments(),
    records: await RecordAnchorModel.countDocuments(),
    emergencyAccess: await EmergencyModel.countDocuments(),
    auditEntries: await AuditModel.countDocuments(),
  };
  console.table(counts);
  console.log("[seed] Done. The app now reads/writes MongoDB Atlas.\n");

  await disconnectDatabase();
}

main().catch((err) => {
  console.error("[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});