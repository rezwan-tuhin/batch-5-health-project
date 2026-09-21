# Real IPFS Integration Tutorial (Phase 3 — Pin Medical PDFs, Anchor Real CIDs)

This is the step-by-step guide to wiring **real IPFS content-addressed storage**
into the HealthRecord app, replacing the *simulated* CIDs that Phases 1–2
generated in `src/server/db.ts` (`makeIpfsCid()`).

After this phase:

- The **Anchor Record** form on `/records` takes a **PDF file** instead of a
  typed `recordHash` string.
- The backend computes `keccak256(pdfBytes)`, pushes the PDF to IPFS, stores the
  real CID (`pointer = ipfs://<cid>`) in the in-memory DB, and anchors the hash +
  pointer on-chain exactly as before.
- The **RecordViewer** shows the pinned filename and an **"Open on IPFS"**
  gateway link for the CID.
- The **Admin** dashboard's *IPFS gateway* badge is now live (Online / Configured
  / Not configured) instead of hard-coded "Online".
- When IPFS is **not configured**, everything degrades gracefully back to the
  Phase 1/2 simulated-CID behaviour with an amber notice — no code changes needed.

> Implementation status: shipped code. `npm run lint`, `npm run build` and
> `npm run dev` all pass.

---

## 0. Assessment — the design choices

The existing on-chain seam set the pattern: an **env-gated module** that throws a
typed "not wired" error, which the UI catches and degrades gracefully.
`src/lib/chain.ts` does this with `ChainNotWiredError`; IPFS mirrors it with
`IpfsNotConfiguredError` in `src/lib/ipfs.ts`.

- **Server-side uploads, plain `fetch`.** No `ipfs-http-client`, no new
  dependency. The seam talks to either a Kubo-compatible node
  (`POST /api/v0/add?pin=true`) or Pinata v3 (`uploads.pinata.cloud/v3/files`)
  using standard multipart `FormData`. Server-side keeps `IPFS_API_TOKEN` out of
  the browser bundle.
- **Public gateway for reads.** `NEXT_PUBLIC_IPFS_READ_GATEWAY` (default
  `https://ipfs.io`) constructs the browser-facing open link; the server can also
  re-`fetchBytes` a CID to verify hashes.
- **Hash derived from the file.** Previously the user typed a `recordHash`.
  Now the hash is `keccak256` of the actual PDF bytes — so the on-chain hash
  genuinely fingerprints the pinned document.
- **DB stays the mirror.** The in-memory DB keeps storing `content`/metadata so
  the existing UI and API shapes are unchanged; IPFS is additive at the seams.
- **Route handler is the integration point.** `src/app/api/records/route.ts`
  already accepted a JSON `POST`; it now also accepts `multipart/form-data`.
  `src/server/db.ts` needed only *additive* optional input fields
  (`ipfsCid`, `fileName`, `content`) — no signature breaks.

---

## 1. Prerequisites

Pick one backend and get the credentials/endpoint:

| Backend | What to run / set | Upload endpoint used |
| --- | --- | --- |
| **Kubo / local node** | `ipfs init && ipfs daemon` → `http://127.0.0.1:5001` | `POST /api/v0/add?pin=true` |
| **Infura IPFS** | Dashboard → IPFS → endpoint URL + `projectId:secret` token | `POST /api/v0/add` |
| **Pinata** | https://app.pinata.cloud → Settings → API Keys → JWT | `POST https://uploads.pinata.cloud/v3/files` |

Create `.env.local` (copy the template) and add the relevant block:

```bash
# Kubo / Infura (Kubo-compatible) API
IPFS_BACKEND=http
IPFS_API_URL=http://127.0.0.1:5001          # or https://ipfs.infura.io:5001
IPFS_API_TOKEN=                             # projectId:secret for Infura, empty for local node

# Pinata alternative
# IPFS_BACKEND=pinata
# IPFS_API_URL=https://uploads.pinata.cloud/v3/files
# IPFS_API_TOKEN=your_pinata_jwt

# Browser-facing read gateway (optional, defaults to https://ipfs.io)
NEXT_PUBLIC_IPFS_READ_GATEWAY=https://ipfs.io
```

**Empty IPFS env = simulated mode.** If nothing is set, `/api/records` keeps the
old fake CID path and the Anchor form shows an amber "CID is simulated" notice.

---

## 2. Files in this phase

| File | Purpose |
| --- | --- |
| `src/lib/ipfs.ts` | **new** — the IPFS seam (`addBytes`, `fetchBytes`, `hashBytes`, `ipfsStatus`, `urlFor`, gateway helpers) |
| `src/app/api/records/route.ts` | **edited** — `POST` accepts PDF multipart; uploads, derives hash, stores real CID |
| `src/server/db.ts` | **edited** — `anchorRecord` accepts optional `ipfsCid`/`fileName`/`content` (additive) |
| `src/lib/dummy-data.ts` | **edited** — `RecordAnchor` gains optional `fileName` |
| `src/lib/api.ts` | **edited** — `records.anchor` supports `File` via new `requestForm` |
| `src/components/Records.tsx` | **edited** — Anchor form: PDF file picker replaces hash input; simulated-CID notice |
| `src/components/RecordViewer.tsx` | **edited** — filename + "Open on IPFS" gateway link |
| `src/app/api/ipfs/status/route.ts` | **new** — `GET /api/ipfs/status` status probe |
| `src/hooks/index.ts` | **edited** — `useIpfsStatus()` (query + `queryKeys.ipfs`) |
| `src/components/admin/AdminDashboard.tsx` | **edited** — live IPFS gateway badge |
| `.env.local.example` | **edited** — IPFS env template |

---

## 3. The seam — `src/lib/ipfs.ts`

One module, two backends, zero deps. Core surface:

```ts
import { keccak256 } from "viem";

export class IpfsNotConfiguredError extends Error { /* ... */ }

export function isIpfsConfigured(): boolean {
  // "http"  -> IPFS_API_URL must be set
  // "pinata"-> IPFS_API_TOKEN (or IPFS_API_URL) must be set
}

export async function addBytes(bytes, filename): Promise<{ cid: string }> {
  // http backend  : POST `${IPFS_API_URL}/api/v0/add?pin=true`
  //                  multipart field `file`, parse JSON `.Hash`
  // pinata backend: POST `${IPFS_API_URL}/v3/files`
  //                  Authorization Bearer $IPFS_API_TOKEN, parse `.data.cid`
}

export function urlFor(cid)       { return `${readGateway()}/ipfs/${cid}`; }
export async function fetchBytes(cid): Promise<Uint8Array> { /* gateway read */ }
export function hashBytes(bytes)  { return keccak256(bytes); }
export async function ipfsStatus() { /* configured/backend/gateway/apiUrl/online */ }
```

Notes:
- `readGateway()` prefers `NEXT_PUBLIC_IPFS_READ_GATEWAY` (client-visible), so
  the browser can build open links; secret API fields are server-only env.
- Kubo's `/api/v0/version` ping powers the `online` probe for the admin badge.
  Pinata's `online` is best-effort (credentials present).
- `IpfsNotConfiguredError` mirrors `ChainNotWiredError`: same throw/catch idiom,
  same "final version degraded" story.

---

## 4. Route handler — `src/app/api/records/route.ts`

`POST` now branches on `Content-Type`:

```ts
if (contentType.includes("multipart/form-data")) {
  const form = await request.formData();
  const file = form.get("file");
  // ...validate patientAddress/title/file (must be application/pdf)...
  const bytes = new Uint8Array(await file.arrayBuffer());

  let pointer, ipfsCid, ipfsSimulated = false;
  try {
    const { cid } = await addBytes(bytes, file.name || "record.pdf");
    ipfsCid = cid;
    pointer = `ipfs://${cid}`;
  } catch (err) {
    if (err instanceof IpfsNotConfiguredError) ipfsSimulated = true;
    else return 502;                          // real backend failure
  }

  const record = await anchorRecord({
    patientAddress, title,
    recordHash: hashBytes(bytes),             // keccak256(pdf) — on-chain fingerprint
    pointer, ipfsCid, fileName: file.name || "record.pdf",
    /* optional: anchoredBy, providerName, hospital, recordType */
  });
  return NextResponse.json({ ...record, ipfsSimulated }, { status: 201 });
}
// legacy JSON POST (typed recordHash + pointer) is unchanged below
```

The `ipfsSimulated` flag tells the UI to show the amber "CID is simulated"
notice when IPFS isn't wired.

---

## 5. Storage seam — `src/server/db.ts`

`anchorRecord` gains **optional** inputs; the old JSON/`makeIpfsCid()` path is
byte-for-byte backward compatible:

```ts
anchorRecord(input: {
  patientAddress; title; recordHash;
  pointer?; ipfsCid?; fileName?; content?;   // new: additive
  anchoredBy?; providerName?; hospital?; recordType?;
})
// rec.ipfsCid  = input.ipfsCid ?? makeIpfsCid()
// rec.pointer  = input.pointer ?? `ipfs://${ipfsCid}`
// rec.content  = input.content ?? {}
// if (input.fileName) rec.fileName = input.fileName
```

`RecordAnchor` in `dummy-data.ts` adds `fileName?: string` (additive — seed rows
don't need it).

---

## 6. Client plumbing — `src/lib/api.ts` + `src/components/Records.tsx`

`api.records.anchor` grows a `file?: File` path that posts FormData:

```ts
anchor: (payload) => {
  if (payload.file) {
    const form = new FormData();
    form.append("patientAddress", payload.patientAddress);
    form.append("title", payload.title);
    form.append("file", payload.file);
    // optional metadata fields appended when present
    return requestForm<RecordListItem>("/api/records", form);
  }
  return request<RecordListItem>("/api/records", { method: "POST", body: JSON.stringify(payload) });
}
```

The Anchor form swaps the `recordHash` text input for:

```tsx
<input ref={fileInputRef} type="file" accept="application/pdf"
       onChange={(e) => setFile(e.target.files?.[0] ?? null)} ... />
```

and after anchoring:

```tsx
if (record.ipfsSimulated) {
  setNotice("IPFS not configured — CID is simulated. Set IPFS_API_URL (or a
            Pinata JWT) and restart to pin real PDFs.");
}
// then chainAnchorRecord({ ... record.recordId, recordHash, pointer: record.pointer })
```

The on-chain write is untouched — it already forwarded `pointer`, now a real
`ipfs://<cid>`.

---

## 7. Reading — `src/components/RecordViewer.tsx`

Additive section inside the IPFS metadata card:

```tsx
const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_READ_GATEWAY?.replace(/\/+$/, "") || "https://ipfs.io";

{record.fileName && <div>Document · {record.fileName}</div>}
<code>{record.ipfsCid}</code>  {/* copy button as before */}
<button onClick={() => window.open(`${ipfsGateway}/ipfs/${record.ipfsCid}`, "_blank")}>
  Open on IPFS ({ipfsGateway.replace(/^https?:\/\//, "")})
</button>
```

Structured `content` sections still render for seed records (the DB mirror), so
nothing breaks for pre-existing rows.

---

## 8. Admin status — `/api/ipfs/status` + dashboard badge

`GET /api/ipfs/status` returns:

```json
{ "configured": true, "backend": "http", "gateway": "https://ipfs.io",
  "apiUrl": "http://127.0.0.1:5001", "online": true }
```

`useIpfsStatus()` (staleTime 60s) feeds the Network Health card:

```tsx
<Badge tone={!ipfs?.configured ? "zinc" : ipfs.online ? "emerald" : "amber"}>
  {!ipfs ? "Loading" : !ipfs.configured ? "Not configured"
    : ipfs.online ? "Online" : "Configured"}
</Badge>
```

---

## 9. Verify

```bash
npm run lint
npm run build
npm run dev   # http://localhost:3000/login
```

1. **Without IPFS env** → anchor a PDF → amber *"CID is simulated"* notice,
   records list shows a fake `Qm…` CID; admin badge **Not configured**.
2. **Local Kubo (`ipfs daemon`)**:
   - `curl http://127.0.0.1:5001/api/v0/version` responds → badge **Online**.
   - Anchor a PDF on `/records` → notice is gone, the record shows a **real**
     `Qm…` CID; click **Open on IPFS** → document resolves via the gateway.
3. Check the on-chain anchor still lands with `pointer = ipfs://<realcid>`
   (MetaMask prompt when `NEXT_PUBLIC_CONTRACT_ADDRESS` is set).

---

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Always amber "CID is simulated" | IPFS env not set; configure `IPFS_BACKEND`/`IPFS_API_URL`. |
| `[ipfs] node add failed (fetch failed)` | Node not running (`ipfs daemon`), wrong port, or CORS on a *local* Kubo node from the server — server-side fetch isn't CORS-bound; check the daemon is on `127.0.0.1:5001`. |
| `[ipfs] pinata upload failed (401)` | `IPFS_API_TOKEN` JWT invalid/expired; regenerate in Pinata. |
| Viewer's open link 404s | CID is real but not available on the public gateway yet; give the provider a moment to propagate (or use the same gateway as the upload). |
| Form rejects a valid PDF | Browser MIME sniffing; ensure `accept="application/pdf"` and the file truly is `application/pdf`. |
| `recordHash` never typed anymore | Intended — the hash is now `keccak256` of the PDF bytes, so on-chain `verifyRecordHash` fingerprints the actual document. |

---

## 11. Known limits (accepted for this phase)

- **CID persistence depends on the DB backend** (Phase 4 changed this): with
  `MONGODB_URI` set, records — and their CIDs — persist in MongoDB Atlas;
  without it the seeded in-memory store is used and CIDs vanish on restart.
  `anchorRecord` signatures are unchanged (now `async` through the `db.ts`
  facade).
- **Gateway reachability**: public gateways may be slow or block certain CIDs;
  the app doesn't retry behind-the-scenes on read.
- **Pinning persistence** is the provider's job: Pinata pins automatically; a
  local Kubo node only pinning via `add?pin=true` — restart-safe per se, but
  replication across nodes is out of scope.
- **No auth on `/api/*`** — consistent with the rest of the demo; a production
  deployment must add signing/consent enforcement around uploads.