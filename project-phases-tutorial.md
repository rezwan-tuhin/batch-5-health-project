# Project Phases & Coding Flow Tutorial

## 1. What this project is

A decentralized medical-record demo. Data flows through four layers, each added
one phase at a time, each an **env-gated seam** you can turn on/off without
breaking the rest of the app:

- **Wallet auth** — sign in with a real Ethereum wallet (wagmi + RainbowKit).
- **REST API** — all UI reads/writes go through `/api/*` handlers over a
  database facade.
- **Smart contract** — on-chain ledger of record hashes, consents, providers.
- **IPFS** — real content-addressed storage for the PDFs themselves.
- **MongoDB** — permanent persistence behind the same API.

Build order = dependency order. Each phase leaves the API JSON shapes unchanged,
so later phases never require rewriting earlier ones.

## 2. Phase map

| Phase | Name | Tutorial | Env to enable | Depends on |
| --- | --- | --- | --- | --- |
| 0 | Foundation — scaffold + UI shell | — | none | — |
| 1 | Wallet auth + REST API + database facade | `wagmi-setup-tutorial.md` | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | 0 |
| 2 | Smart contract ledger | `wagmi-contract-tutorial.md` | `NEXT_PUBLIC_CONTRACT_ADDRESS` | 1 |
| 3 | IPFS file storage | `ipfs-tutorial.md` | `IPFS_BACKEND`, `IPFS_API_URL`, `IPFS_API_TOKEN`, `NEXT_PUBLIC_IPFS_READ_GATEWAY` | 2 |
| 4 | MongoDB persistence (only backend) | `mongodb-tutorial.md` | `MONGODB_URI` (required) | 1 (independent of 2/3) |

The dependency order is reflected in the git history:

```
4b6f0d0 ipfs                        (Phase 3)
bc0372c chain integrated            (Phase 2)
745e23a wagmi and rainbow integrated (Phase 1)
2d52618 first commit                (Phase 0)
```

---

## 3. Phase 0 — Foundation (scaffold + UI shell)

Standalone Next.js app with mock data, role-gated pages, and an offline Redux
store. No real wallet, no network, no database.

### Files

| Path | Role |
| --- | --- |
| `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` | Scaffold |
| `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` | Root shell |
| `src/app/login/page.tsx`, `src/app/register/page.tsx` | Auth pages |
| `src/app/patients/page.tsx`, `src/app/providers/page.tsx`, `src/app/consents/page.tsx`, `src/app/records/page.tsx`, `src/app/emergency/page.tsx` | Feature pages |
| `src/lib/dummy-data.ts` | Shared domain types + demo data (kept as reference; no longer seeded into the DB) |
| `src/lib/roles.ts`, `src/lib/access.ts`, `src/lib/record-meta.ts` | Role rules, access gating, record metadata helpers |
| `src/lib/contract.sol` | The smart-contract source (compile + deploy elsewhere) |
| `src/store/store.ts`, `src/store/hooks.ts`, `src/store/Providers.tsx`, `src/store/slices/*` | Offline Redux store |
| `src/components/AppShell.tsx`, `src/components/AuthGuard.tsx`, `src/components/Navbar.tsx`, `src/components/AccessDenied.tsx`, `src/components/Badge.tsx`, `src/components/Card.tsx`, `src/components/PageHeader.tsx`, `src/components/StatCard.tsx`, `src/components/Dashboard.tsx` | Shared UI |
| `src/components/Login.tsx`, `src/components/Patients.tsx`, `src/components/Providers.tsx`, `src/components/Consents.tsx`, `src/components/Records.tsx`, `src/components/Emergency.tsx`, `src/components/RecordViewer.tsx` | Feature components |
| `src/components/admin/AdminDashboard.tsx`, `src/components/regulator/RegulatorDashboard.tsx`, `src/components/provider/ProviderDashboard.tsx`, `src/components/patient/PatientDashboard.tsx`, `src/components/er/ERDashboard.tsx` | Role dashboards |

---

## 4. Phase 1 — Wallet auth + REST API + database facade

The app becomes real: sign in with a wallet, and every screen now reads/writes
through `/api/*` handlers backed by a database facade (`db.ts`). The Phase-1
backend was an in-memory store seeded from `dummy-data.ts`; Phase 4 replaced it
with MongoDB, so `db.ts` is now a thin re-export of the Mongo backend.

### Files

| Path | Role |
| --- | --- |
| `src/lib/wagmi.ts` | wagmi + RainbowKit config (Sepolia, WalletConnect projectId) |
| `src/components/WalletBridge.tsx`, `src/components/WalletConnectButton.tsx` | Connect wallet → Redux session + hydration-safe button |
| `src/store/Providers.tsx`, `src/store/slices/authSlice.ts`, `src/hooks/index.ts` | Query + auth store, data hooks |
| `src/lib/api.ts` | Typed fetch client for every endpoint |
| `src/server/db.ts` | Database facade (in-memory in Phase 1; MongoDB since Phase 4) |
| `src/app/api/auth/route.ts` | `GET` resolve wallet, `POST` signup |
| `src/app/api/patients/route.ts`, `src/app/api/providers/route.ts`, `src/app/api/providers/[address]/route.ts` | Patients / providers + verify |
| `src/app/api/profiles/patients/[address]/route.ts`, `src/app/api/profiles/providers/[address]/route.ts` | Profile get/update |
| `src/app/api/consents/route.ts`, `src/app/api/consents/[patient]/[provider]/route.ts` | Grant / revoke consent |
| `src/app/api/records/route.ts` (JSON path), `src/app/api/records/[patient]/[recordId]/route.ts` | Anchor / tombstone records |
| `src/app/api/emergency/route.ts`, `src/app/api/emergency/[patient]/route.ts`, `src/app/api/audit/route.ts`, `src/app/api/users/route.ts` | Emergency access + audit + users |
| `src/components/QueryState.tsx` | Shared loading/error renderer |
| `src/components/register/Register.tsx`, `src/components/profile/PatientProfileForm.tsx`, `src/components/profile/ProviderProfileForm.tsx` | Signup + profile editing |
| `src/lib/demo.ts`, `src/lib/format.ts`, `src/lib/time.ts` | Demo helpers, formatting |

**Enable:** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (+ optional `NEXT_PUBLIC_RPC_URL`).

---

## 5. Phase 2 — Smart contract ledger

On-chain writes/reads land: record anchoring, consents, provider verification,
emergency access — everything that was DB-only now also hits the deployed
`HealthRecordSystem` contract with amber "chain not wired" degradation.

### Files

| Path | Role |
| --- | --- |
| `src/lib/health-record-abi.ts` | Static ABI of the deployed contract |
| `src/lib/contract.ts` | Address/chain config + bytes32 helpers + role IDs |
| `src/lib/chain.ts` | On-chain operation seam (`writeContract` + receipt wait) |
| `src/hooks/useContract.ts` | Read hooks + slot-zero helpers for on-chain state |
| `src/components/OnChainStatus.tsx` | Connection/chain status for the network card |

**Enable:** `NEXT_PUBLIC_CONTRACT_ADDRESS` (deployed contract on Sepolia).

---

## 6. Phase 3 — IPFS file storage

PDF uploads are pinned to real IPFS and the record anchors the resulting CID;
hash = `keccak256(pdf)`. Without IPFS configured, uploads degrade to simulated
CIDs with an amber notice.

### Files

| Path | Role |
| --- | --- |
| `src/lib/ipfs.ts` | IPFS seam (`addBytes`, `fetchBytes`, `hashBytes`, `urlFor`, status probe) |
| `src/app/api/ipfs/status/route.ts` | Admin status endpoint |
| `src/app/api/records/route.ts` | Multipart `POST` — pin PDF + anchor record |
| `src/components/Records.tsx`, `src/components/RecordViewer.tsx`, `src/components/admin/AdminDashboard.tsx` | Upload form, open-on-gateway, network-health badge |
| `src/hooks/index.ts` (`useIpfsStatus`), `src/lib/api.ts` (file upload + status) | Client plumbing |
| `src/lib/dummy-data.ts` (`fileName`) | Additive `fileName` field on `RecordAnchor` |

**Enable:** `IPFS_BACKEND` (`http` or `pinata`), `IPFS_API_URL`, `IPFS_API_TOKEN`, `NEXT_PUBLIC_IPFS_READ_GATEWAY`.

---

## 7. Phase 4 — MongoDB persistence

MongoDB becomes the **only** backend: the Phase-1 in-memory store is removed,
and all the seed tooling goes with it. `db.ts` is now a thin barrel that
re-exports the Mongoose backend, so the API JSON shapes stay untouched.

### Files

| Path | Role |
| --- | --- |
| `src/server/db.ts` | Barrel — re-exports every db function from `mongodb.ts` |
| `src/server/mongodb.ts` | Mongoose implementation of every db function (lazy connect, projection, audit) |
| `src/server/models.ts` | Mongoose schemas (9 collections) |
| `src/server/db-types.ts` | Shared input types for the db layer |
| `tsconfig.scoped.json`, `tsconfig.probe-models.json` | Fast type-check scopes for the server layer |
| `src/app/api/**` | Route handlers (unchanged — they already `await` the async facade) |

**Required:** `MONGODB_URI` — there is no fallback and no seeding. The
`scripts/seed.ts` file and `npm run seed` script were removed; collections
start empty and are created on first insert.

---

## 8. Any-phase reference

- **`src/lib/access.ts` + `src/lib/roles.ts`** — always the source of truth for
  who may do what (UI-enforced; the contract enforces on-chain for phase 2
  writes).
- **`src/lib/api.ts` + `src/hooks/index.ts`** — the only client↔server bridge;
  if an endpoint's JSON shape changed in a later phase, both must stay in sync.
- **`.env.local.example`** — the full, phase-annotated env var list. Copy to
  `.env.local` and fill in as you enable each phase.
- **Tutorial order** — read Phase 0 → 1 → 2 → 3 → 4 in sequence; each tutorial
  assumes the previous phase is already wired.