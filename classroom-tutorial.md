# Classroom Tutorial — Live Demo + Homework (Database + IPFS + Smart Contract)

## 1. Why this slice

Only **one** feature exercises all three layers in a single action: **anchoring
a medical record**. A PDF upload does:

| Step | Layer | Where |
| --- | --- | --- |
| PDF → `keccak256` + pinned to IPFS (real CID) | **IPFS** | `src/lib/ipfs.ts` (`addBytes`, `hashBytes`) |
| Record written to Mongo (`recordanchors` doc) | **Database** | `src/server/mongodb.ts` (`anchorRecord`) |
| Hash + CID pointer recorded on-chain | **Smart contract** | `src/lib/chain.ts` (`chainAnchorRecord`) → `anchorRecord()` in `contract.sol` |

So the smallest live proof = a patient uploading their own PDF. It needs only
**one wallet** and **two transactions** (`registerPatient` + `anchorRecord`).

Everything else in the project follows the exact same pattern — show two
schemas, and the remaining seven becomes identical homework.

---

## 2. Before class (teacher checklist)

In `.env.local` (or the Vercel env vars):

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net   # Phase 4
IPFS_BACKEND=pinata                                               # Phase 3
IPFS_API_URL=https://uploads.pinata.cloud/v3/files
IPFS_API_TOKEN=<pinata_jwt>
NEXT_PUBLIC_IPFS_READ_GATEWAY=https://ipfs.io
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed HealthRecordSystem on Sepolia>  # Phase 2
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<real project id>           # Phase 1
```

- One **MetaMask wallet on Sepolia** with a little test ETH (covers 2 txs).
- Atlas whitelists your IP; `npm run seed` once so the 9 collections exist.
- Pinata key verified (upload a throwaway file from the Pinata UI first).
- The contract is deployed and `NEXT_PUBLIC_CONTRACT_ADDRESS` is valid.

---

## 3. Live demo (~12 minutes)

### 3.1 The pattern — two schemas (2 min)

Open `src/server/models.ts`. Point at `userSchema` and `recordAnchorSchema`:

- Every collection's fields mirror a type in `src/lib/dummy-data.ts`.
- Every read projects away `_id`/`__v` (`PROJECTED_FIELDS`) so API JSON matches
  the memory backend.
- Unique indexes where the app keys by address/`id`.

> "There are **9 collections** in `models.ts` and they all look like these two.
> User is the simplest (numeric `id`, unique `address`); RecordAnchor is the
> richest (`Mixed content`, enums, optional `fileName`). That's the whole
> pattern — the rest are copies."

### 3.2 The pattern — three db functions (2 min)

Open `src/server/mongodb.ts` for `listRecords`, `anchorRecord`; then
`src/server/db.ts` for the facade:

```ts
export async function anchorRecord(input, actor?) {
  return useMongo ? mongo.anchorRecord(input, actor) : memory.anchorRecord(input, actor);
}
```

> "Every collection needs the same 3 kinds of functions — list, create/update,
> and a delete/toggle. Each one exists in `memory-db.ts` and `mongodb.ts`, and
> `db.ts` just dispatches. Same signatures, identical JSON."

### 3.3 The pattern — the API seam (2 min)

Every feature is exposed through the **same 4-layer seam** —
`schema → db function → API route → hook`. You've seen the first two; now show
the top two on Records:

- **API route** — `src/app/api/records/route.ts`: `GET` returns
  `listRecords()`, and the multipart `POST` pins the PDF (`addBytes` +
  `hashBytes`) then calls `anchorRecord(...)` → `{ ...record, ipfsSimulated }`.
- **Client** — `api.records.anchor(...)` in `src/lib/api.ts` (FormData upload)
  + `useRecords()` in `src/hooks/index.ts`.

> "Records has all four: schema → fixed `mongodb.ts` function → `/api/records`
> route → `useRecords` hook. The other 8 collections follow the exact same 4
> layers — in your homework you build the middle (B) for 7 of them, the routes
> and hooks already exist."

### 3.4 The live flow (8 min)

1. `npm run dev` → **http://localhost:3000/login**.
2. **Connect wallet** → Land on Register (new wallet) → choose **Patient**,
   fill name → **Register**.
   - 🔵 *DB evidence:* user row + audit entry appear in Atlas (`users`,
     `audits`).
   - 🔵 *Chain evidence:* MetaMask **tx #1** `registerPatient(didURI)`.
3. Open **Records** → dropdown shows **You** → pick a `*.pdf` → **Anchor**.
   - *While you wait, point at `src/app/api/records/route.ts` — this POST
     handler is what just ran.*
   - 🔵 *IPFS evidence:* no amber warning; the record card shows a **real CID**.
   - 🔵 *Chain evidence:* MetaMask **tx #2** `anchorRecord(patient, recordId,
     recordHash, pointer)` — pointer is `ipfs://<real-cid>`.
   - 🔵 *DB evidence:* new `recordanchors` doc in Atlas with `recordHash`,
     `ipfsCid`, `pointer`, `anchoredBy`.
4. **View Record** → **Open on IPFS** — the PDF renders via
   `https://ipfs.io/ipfs/<cid>`.
5. **Restart the server** (`Ctrl+C`, `npm run dev` again) → login again → the
   record is still there. *It survived a restart: real database.*
6. `npm run seed` → the record is gone again (fresh seed). *Same seam, same
   shapes — the demo store vs the real store are interchangeable.*

Optional 1 min: check the tx on Sepolia Etherscan — `pointer` and `recordHash`
are stored in the contract's `recordAnchors` mapping, and
`useVerifyRecordHash` (Records → Viewer) shows the on-chain hash matches.

---

## 4. Homework — rebuild the remaining schemas

**Setup (teacher prepares once):** give each student a clone of the project
with `src/server/models.ts`, `src/server/mongodb.ts`, `src/server/db-types.ts`,
and `scripts/seed.ts` **removed** (Phase 4 stripped to what it was before).
**Keep all `src/app/api/**` routes intact** — they will not compile or work
until you rebuild the db layer, and they are your acceptance test.

**Task:** re-create Phase 4 yourself using the two schemas shown in class as
your template.

1. Write the other **7 Mongoose schemas** — `Patient`, `PatientProfile`,
   `Provider`, `ProviderProfile`, `Consent`, `EmergencyAccess`, `Audit` — in
   `src/server/models.ts`, matching the interfaces in `src/lib/dummy-data.ts`.
2. Regenerate `src/server/mongodb.ts` functions for those collections so every
   `/api/*` response is **byte-identical** to `src/server/memory-db.ts` (which
   you keep as reference).
3. Add `MONGODB_URI` to `.env.local`, run the app against Atlas.

**Acceptance criteria:**

```bash
npm run lint
npx tsc --noEmit --incremental false -p tsconfig.scoped.json
npm run seed
npm run dev
```

- All pages render and write correct rows (check Atlas).
- Flip `MONGODB_URI` off (`memory`) vs on (`mongo`) → identical JSON on every
  page (no amber network errors).

---

## 5. Grading checklist

| # | Deliverable | Build from (reference) | Max |
| --- | --- | --- | --- |
| 1 | `userSchema` / `recordAnchorSchema` shown in class (pattern) | exists | — |
| 2 | 7 new Mongoose schemas | interfaces in `src/lib/dummy-data.ts` | 30 |
| 3 | 7 collections of `mongodb.ts` functions | `src/server/memory-db.ts` (copy the logic) | 40 |
| 4 | Projection `-__v -_id` and unique indexes on every schema | `PROJECTED_FIELDS` in `models.ts` | 10 |
| 5 | `npm run lint` + server `tsc` clean | — | 10 |
| 6 | Seed + backend parity (memory vs mongo JSON identical) | `npm run seed`, spot-check pages | 10 |
| 7 | Existing `/api/*` routes compile & return correct rows on every page (routes were kept intact — your db layer must satisfy them) | Atlas spot-check on all pages | 10 |
| 8 | *Bonus:* one fresh collection end-to-end (schema → db fn → route → hook) | Records feature as template | 10+ |

Deliverable files: `src/server/models.ts`, `src/server/mongodb.ts`,
`src/server/db.types.ts`, `scripts/seed.ts`, `path/package.json` (add `seed`,
`mongoose`, `tsx`).