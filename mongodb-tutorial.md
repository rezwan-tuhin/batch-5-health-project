# MongoDB + API Tutorial (Phase 4 — Permanent Database Persistence)

## 1. What this phase does

Replaces the browser/demo-grade **in-memory** store (plain JS arrays seeded from
`dummy-data.ts`) with a **real MongoDB database** — MongoDB Atlas — while keeping
every `/api/*` response byte-identical for both backends.

Nothing on the client changes. Every API handler keeps the same shape and status
codes; only the behind-the-scenes storage differs.

### Design: the `db.ts` facade

`src/server/db.ts` is the single import point for all API routes. On module load
it checks `MONGODB_URI`:

| `MONGODB_URI` | Backend | Persistence |
| --- | --- | --- |
| empty | `src/server/memory-db.ts` | in-memory, resets on restart |
| set | `src/server/mongodb.ts` (Mongoose) | MongoDB Atlas, survives restart |

All facade functions are `async` so routes never need to know which backend is
live. Both backends implement the same 19 functions with identical JSON shapes.

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

> Leave `MONGODB_URI` empty to keep using the seeded in-memory store — the app
> behaves identically, but data is lost on restart.

## 4. Files in this phase

| File | Purpose |
| --- | --- |
| `src/server/db.ts` | Facade — picks memory vs Mongo, exports async functions |
| `src/server/memory-db.ts` | Old in-memory implementation (now the fallback) |
| `src/server/mongodb.ts` | Mongoose implementation of all db functions |
| `src/server/models.ts` | Mongoose schemas (9 collections) |
| `src/server/db-types.ts` | Shared input types for both backends |
| `scripts/seed.ts` | Drop + reseed script (`npm run seed`) |
| `tsconfig.scoped.json` | Fast type-check of server + scripts only |
| `tsconfig.probe-models.json` | Scope-check for `models.ts` during authoring |

### Collections (9)

`users`, `patients`, `patientProfiles`, `providers`, `providerProfiles`,
`consents`, `recordanchors`, `emergencyaccesses`, `audits`.

### Dependencies added

```bash
npm install mongoose          # runtime
npm install -D tsx            # runs scripts/seed.ts
```

`package.json` gains `"seed": "tsx scripts/seed.ts"`.

## 5. How it works

- **Connect + auto-seed** — `mongodb.ts` connects once (module-level promise,
  `dbName: "health"`) and seeds the 9 collections from `dummy-data.ts` on first
  connect, only when a collection is empty. A fresh Atlas cluster is therefore
  pixel-identical to the in-memory demo.
- **Projection** — every read projects away `_id`/`__v` (`PROJECTED_FIELDS`), so
  API JSON matches the memory backend exactly.
- **Profile merge** — `listPatients`/`listProviders`/`listConsents`/`listRecords`/
  `listEmergency` enrich rows with `patientName`/provider fields exactly like the
  memory backend does.
- **Audit** — writes append an entry to `audits` with an auto-incremented numeric
  `id`, matching the memory behavior.

## 6. Seeding / resetting

The app auto-seeds when `MONGODB_URI` is set and a collection is empty. To force
a clean slate (drop all collections, reseed from `dummy-data.ts`):

```bash
npm run seed
```

The script loads `.env.local` itself, so it works outside Next.js. Verify the
counts printed in the table match the seed data.

## 7. Verify

```bash
npm run lint
npm run build
npm run dev     # http://localhost:3000/login
```

1. **Without `MONGODB_URI`** → same app as before; register/upload data, restart
   the server, data resets to the seed.
2. **With `MONGODB_URI`** → use the app normally, restart the server, the data
   you created is still there.
3. **After `npm run seed`** → data resets to the seed.

## 8. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Every API call returns 500 after setting `MONGODB_URI` | Cluster unreachable: check the user/password, the connection string, and that your IP is whitelisted in Atlas **Network Access**. |
| `npm run seed` exits with "MONGODB_URI is not set" | Add it to `.env.local` (or pass it inline in the environment). |
| Data changes but a route still shows stale seed rows | The app connected to a *different* Atlas cluster/db than the one you seeded; confirm `MONGODB_URI` in `.env.local`. |
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

- **Auto-increment `id` race** — `nextNumericId()` reads the max `id` then
  inserts; two writes at the same instant can collide on the unique `id` index
  (E11000 → the request is rejected). Acceptable for demo traffic; a production
  version would use an atomic counter or ObjectId.
- **No graceful fallback** — once `MONGODB_URI` is set, an unreachable cluster
  makes API calls fail loudly (500) rather than silently falling back to memory,
  so misconfiguration is visible instead of hidden.