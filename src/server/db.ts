/**
 * Database facade.
 *
 * Single import point for every `/api/*` route handler. MongoDB (via Mongoose
 * in `mongodb.ts`) is the only backend — there is no in-memory fallback and no
 * seeding. `MONGODB_URI` must be configured or every DB call throws loudly.
 *
 * All functions re-exported from `mongodb.ts` are async, so route handlers and
 * the React app never need to know where the connection lives.
 */
export * from "@/server/mongodb";
export type { AuditActor } from "@/server/db-types";