/**
 * IPFS seam (Phase 3).
 *
 * Real content-addressed storage for medical documents, added the same way the
 * on-chain seam (`src/lib/chain.ts`) was: an env-gated module with explicit
 * "not configured" degradation so the app keeps working DB-first when IPFS is
 * not set up.
 *
 * Backends (chosen via `IPFS_BACKEND`):
 *   - "http"  (default) — any Kubo-compatible API endpoint
 *               (`http://127.0.0.1:5001`, Infura, a Helia node, …). Uses the
 *               standard `POST /api/v0/add?pin=true` multipart endpoint, no
 *               credentials required for a local node.
 *   - "pinata" — Pinata v3 uploads (`https://uploads.pinata.cloud/v3/files`)
 *               using a JWT in `IPFS_API_TOKEN`.
 *
 * Reading is always done through a public gateway (`NEXT_PUBLIC_IPFS_READ_GATEWAY`,
 * default https://ipfs.io) so the client can render/open documents without
 * server round-trips. Server-side verification re-fetches via `fetchBytes`.
 *
 * Everything is plain `fetch` — no runtime dependency is added.
 */
import { keccak256 } from "viem";

export class IpfsNotConfiguredError extends Error {
  constructor(operation: string, detail?: string) {
    super(`[ipfs] not configured: ${operation}${detail ? ` — ${detail}` : ""}`);
    this.name = "IpfsNotConfiguredError";
  }
}

export type IpfsBackend = "http" | "pinata";

function readBackend(): IpfsBackend {
  const backend = (process.env.IPFS_BACKEND ?? "").trim().toLowerCase();
  return backend === "pinata" ? "pinata" : "http";
}

export function isIpfsConfigured(): boolean {
  const backend = readBackend();
  const apiUrl = (process.env.IPFS_API_URL ?? "").trim();
  const token = (process.env.IPFS_API_TOKEN ?? "").trim();
  if (backend === "pinata") return !!token || !!apiUrl;
  return !!apiUrl;
}

function apiBase(): string {
  return (process.env.IPFS_API_URL ?? "").trim().replace(/\/+$/, "");
}

function pinataUploadUrl(): string {
  return (
    (process.env.IPFS_API_URL ?? "").trim().replace(/\/+$/, "") ||
    "https://uploads.pinata.cloud/v3/files"
  );
}

export function readGateway(): string {
  return (
    (process.env.NEXT_PUBLIC_IPFS_READ_GATEWAY ?? "")
      .trim()
      .replace(/\/+$/, "") || "https://ipfs.io"
  );
}

export function urlFor(cid: string): string {
  return `${readGateway()}/ipfs/${cid}`;
}

export interface IpfsAddResult {
  cid: string;
  size?: number;
}

/**
 * Push raw bytes (a PDF document) to the configured backend and return the
 * resulting content identifier (CID).
 */
export async function addBytes(
  bytes: Uint8Array,
  filename = "record.pdf",
): Promise<IpfsAddResult> {
  if (!isIpfsConfigured()) {
    throw new IpfsNotConfiguredError(
      "add",
      "Set IPFS_BACKEND + IPFS_API_URL (or Pinata JWT) to pin real documents.",
    );
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)]), filename);

  if (readBackend() === "pinata") {
    const token = (process.env.IPFS_API_TOKEN ?? "").trim();
    if (!token) {
      throw new IpfsNotConfiguredError(
        "add",
        "IPFS_API_TOKEN is required for the pinata backend.",
      );
    }
    form.append("name", filename);
    const res = await fetch(pinataUploadUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as {
      data?: { cid?: string };
    } | null;
    if (!res.ok || !json?.data?.cid) {
      throw new Error(
        `[ipfs] pinata upload failed (${res.status}): ${JSON.stringify(json)}`,
      );
    }
    return { cid: json.data.cid };
  }

  // http (Kubo-compatible) backend
  const url = `${apiBase()}/api/v0/add?pin=true`;
  const res = await fetch(url, { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as {
    Hash?: string;
    Size?: number;
  } | null;
  if (!res.ok || !json?.Hash) {
    throw new Error(
      `[ipfs] node add failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return { cid: json.Hash, size: json.Size };
}

/**
 * Fetch the raw document bytes for a CID through the configured read gateway.
 * Useful for server-side hash verification against the on-chain anchor.
 */
export async function fetchBytes(cid: string): Promise<Uint8Array> {
  const url = urlFor(cid);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`[ipfs] read failed (${res.status}) for ${url}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** keccak256 of the raw document bytes — the value anchored on-chain. */
export function hashBytes(bytes: Uint8Array): string {
  return keccak256(bytes);
}

/**
 * Lightweight status probe for `GET /api/ipfs/status` (admin dashboard).
 * `online` is best-effort: a Kubo `version` ping for the http backend, and
 * "ready" for pinata once credentials are present.
 */
export async function ipfsStatus(): Promise<{
  configured: boolean;
  backend: IpfsBackend;
  gateway: string;
  apiUrl: string;
  online: boolean;
}> {
  const configured = isIpfsConfigured();
  const backend = readBackend();
  const gateway = readGateway();
  const apiUrl = backend === "pinata" ? pinataUploadUrl() : apiBase();
  if (!configured) return { configured, backend, gateway, apiUrl, online: false };

  try {
    if (backend === "pinata") {
      return {
        configured,
        backend,
        gateway,
        apiUrl,
        online: !!(process.env.IPFS_API_TOKEN ?? "").trim(),
      };
    }
    const res = await fetch(`${apiBase()}/api/v0/version`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return {
      configured,
      backend,
      gateway,
      apiUrl,
      online: res.ok,
    };
  } catch {
    return { configured, backend, gateway, apiUrl, online: false };
  }
}