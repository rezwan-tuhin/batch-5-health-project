# MongoDB + API Tutorial (Phase 4 — Permanent Database Persistence)

## 1. What this phase does

MongoDB is the app's **only** database backend. All UI reads/writes go through
`/api/*` route handlers backed by **MongoDB Atlas** via Mongoose. There is no
in-memory fallback and no seed data: collections start empty and are created on
first insert as the app is used.

Nothing on the client changes — MongoDB just gives the API permanent
persistence that survives server restarts.

### Design: the `db.ts` barrel

`src/server/db.ts` is the single import point for all API routes. It does not
pick between backends anymore (there is only one):

```ts
export * from "@/server/mongodb";     // every db function
export type { AuditActor } from "@/server/db-types";
```

All the exported functions are `async` (they lazily connect then query), so the
route handlers never deal with the connection lifecycle.

## 2. Prerequisites

- A **MongoDB Atlas** free cluster — https://www.mongodb.com/atlas
- In Atlas: **Database Access** → add a database *user* (note the password), and
  **Network Access** → allow your IP (or `0.0.0.0/0` for demos).
- Copy the `mongodb+srv://` connection string and replace `<password>`.

## 3. Configure `.env.local`

```env
# ---- MongoDB (Phase 4) ...
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net
```

`.env.local` is git-ignored. Copy `.env.local.example` for the full list of
environment variables used by earlier phases (wallet, contract, IPFS).

> `MONGODB_URI` is **required**. Without it every `/api/*` call fails loudly
> with `[mongo] MONGODB_URI is not configured`. There is no fallback to hide a
> missing connection string.

## 4. Files in this phase

| File | Purpose |
| --- | --- |
| `src/server/db.ts` | Barrel — re-exports all db functions, single import point |
| `src/server/mongodb.ts` | Mongoose implementation of all db functions |
| `src/server/models.ts` | Mongoose schemas (9 collections) |
| `src/server/db-types.ts` | Shared input types for the db layer |
| `tsconfig.scoped.json` | Fast type-check of the server layer only |
| `tsconfig.probe-models.json` | Scope-check for `models.ts` during authoring |

### Collections (9)

`users`, `patients`, `patientProfiles`, `providers`, `providerProfiles`,
`consents`, `recordanchors`, `emergencyaccesses`, `audits`.

Collections are created lazily by MongoDB on first insert — nothing seeds them.

### Dependencies added

```bash
npm install mongoose          # runtime — the only dependency this phase adds
```

## 5. How it works

- **Connect on demand** — the first db call connects once (a memoized
  module-level promise, `dbName: "health"`), then every function reuses that
  connection. Failure (bad URI, unreachable cluster) rejects loudly.
- **Projection** — every read projects away `_id`/`__v` (`PROJECTED_FIELDS`),
  so API JSON stays stable and compact.
- **Profile merge** — `listPatients`/`listProviders`/`listConsents`/`listRecords`/
  `listEmergency` enrich rows with `patientName`/provider fields.
- **Audit** — writes append an entry to `audits` with an auto-incremented numeric
  `id`.

## 6. Starting empty / resetting

There is **no seed script and no auto-seed**. A fresh cluster starts with 9
empty collections; your first `signup`/`registerPatient`/`anchorRecord` creates
them.

To reset the demo to a clean slate, delete the collections (or the whole
`health` database) in the Atlas UI, or run:

```bash
mongosh "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/health" --eval "db.dropDatabase()"
```

## 7. Verify

```bash
npm run lint
npm run build
npm run dev     # http://localhost:3000/login
```

1. With `MONGODB_URI` set → use the app normally (sign up, register a patient,
   anchor a record), restart the server, and the data you created is still there.
2. Open Atlas → the 9 collections now exist with rows matching your activity.
3. **Without `MONGODB_URI`** → every API call returns 500 with a clear
   `[mongo] MONGODB_URI is not configured` error. That is intentional — MongoDB
   is required.

## 8. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Every API call returns 500 with `MONGODB_URI is not configured` | `MONGODB_URI` is missing/empty in `.env.local` — add the Atlas connection string. |
| Every API call returns 500 (connection error) after setting `MONGODB_URI` | Cluster unreachable: check the user/password, the connection string, and that your IP is whitelisted in Atlas **Network Access**. |
| Pages show data you didn't create | `MONGODB_URI` points at a *different* Atlas cluster/db than the one you're inspecting; confirm the string in `.env.local`. |
| Duplicate key error on rapid writes (E11000) | Rare race in auto-incremented `id` allocation under concurrent writes — retry the request. |

## 9. Roadmap — SIWE-style API auth (how to add)

Currently `/api/*` has **no authentication**: a request simply passes the wallet
`address` as a query string (or in the body), and the server trusts it. Anyone
who knows the URL can create records, consents, providers, etc. On-chain writes
are protected by `msg.sender` (`src/lib/chain.ts`), but the API mirrors that
responsibility off-chain. This is a guide, not implemented code.

Goal: only the wallet that owns an address can act as that address, and roles
are enforced server-side.

1. **Install** `siwe` (`npm i siwe`) — works next to the existing viem stack.
2. **Client** (`src/lib/api.ts` + `src/store/slices/authSlice.ts`): on login,
   fetch a nonce from `GET /api/auth/nonce`, build a SIWE message, sign it with
   `signMessage`, then `POST /api/auth/verify` with `{ message, signature }`.
3. **Server** (`/api/auth`): verify with `siwe.verify({ message, signature,
   nonce })` — rejects wrong chain, expired, or replayed messages. On success,
   issue a session (httpOnly cookie or JWT) carrying `address` + `role` from the
   DB user record. Add `AUTH_SECRET` to `.env.local`.
4. **Protect reads**: replace the `?address=` lookup in `GET /api/auth` with the
   session address (no more trusting a query param).
5. **Protect writes**: add a `requireAuth(role?)` helper every `/api/*` write
   route calls before mutating (mirror what the UI already checks for
   admin/regulator). Reject missing/invalid sessions with `401`.

Files to touch if implemented: `src/lib/api.ts`, `src/lib/siwe.ts` (new),
`src/store/slices/authSlice.ts`, `src/app/api/auth/*`, plus a `requireAuth`
helper used by the route handlers.

---

## 10. Known limits (accepted for this phase)

- **MongoDB is required** — there is no in-memory fallback. Without
  `MONGODB_URI` the DB layer fails loudly (500), so a missing connection string
  is visible instead of silently hidden behind a throwaway store.
- **Auto-increment `id` race** — `nextNumericId()` reads the max `id` then
  inserts; two writes at the same instant can collide on the unique `id` index
  (E11000 → the request is rejected). Acceptable for demo traffic; a production
  version would use an atomic counter or ObjectId.