import type {
  AuditEntry,
  Consent,
  EmergencyAccess,
  Patient,
  PatientProfile,
  Provider,
  ProviderProfile,
  RecordAnchor,
  Role,
  User,
} from "@/lib/dummy-data";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export type PatientListItem = Patient & Partial<PatientProfile>;
export type ProviderListItem = Provider & Partial<ProviderProfile>;
export type ConsentListItem = Consent & { patientName?: string };
export type RecordListItem = RecordAnchor & {
  patientName?: string;
  ipfsSimulated?: boolean;
};
export type EmergencyListItem = EmergencyAccess & { patientName?: string };

export interface AuthResult {
  user: User;
  role: Role;
}

export interface IpfsStatus {
  configured: boolean;
  backend: "http" | "pinata";
  gateway: string;
  apiUrl: string;
  online: boolean;
}

interface MockEndpointMap {
  auth: string;
  patients: string;
  providers: string;
  consents: string;
  records: string;
  emergency: string;
  audit: string;
  users: string;
  "patient-profiles": string;
  "provider-profiles": string;
}

const BASE: MockEndpointMap = {
  auth: "/api/auth",
  patients: "/api/patients",
  providers: "/api/providers",
  consents: "/api/consents",
  records: "/api/records",
  emergency: "/api/emergency",
  audit: "/api/audit",
  users: "/api/users",
  "patient-profiles": "/api/profiles/patients",
  "provider-profiles": "/api/profiles/providers",
};

const ep = (key: keyof MockEndpointMap, suffix = "") => BASE[key] + suffix;

export const api = {
  auth: {
    resolve: (address: string) =>
      request<AuthResult>(`${ep("auth")}?address=${encodeURIComponent(address)}`),
    signup: (payload: { address: string; name: string; didURI: string; role: Role }) =>
      request<AuthResult>(ep("auth"), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  users: {
    list: () => request<User[]>(ep("users")),
  },

  patients: {
    list: () => request<PatientListItem[]>(ep("patients")),
    register: (payload: { address: string; didURI: string }) =>
      request<PatientListItem>(ep("patients"), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  providers: {
    list: () => request<ProviderListItem[]>(ep("providers")),
    register: (payload: { address: string; name: string; didURI: string }) =>
      request<ProviderListItem>(ep("providers"), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    verify: (payload: {
      address: string;
      isVerified: boolean;
      erQualified: boolean;
    }) =>
      request<ProviderListItem>(ep("providers", `/${payload.address}`), {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  consents: {
    list: () => request<ConsentListItem[]>(ep("consents")),
    grant: (payload: {
      patientAddress: string;
      providerAddress: string;
      providerName: string;
      purpose: string;
      expiresAt: number;
    }) =>
      request<ConsentListItem>(ep("consents"), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    revoke: (payload: { patientAddress: string; providerAddress: string }) =>
      request<{ ok: true }>(
        ep(
          "consents",
          `/${encodeURIComponent(payload.patientAddress)}/${encodeURIComponent(
            payload.providerAddress,
          )}`,
        ),
        { method: "DELETE" },
      ),
  },

  records: {
    list: () => request<RecordListItem[]>(ep("records")),
    anchor: (payload: {
      patientAddress: string;
      title: string;
      recordHash?: string;
      pointer?: string;
      anchoredBy?: string;
      providerName?: string;
      hospital?: string;
      file?: File;
    }) => {
      if (payload.file) {
        const form = new FormData();
        form.append("patientAddress", payload.patientAddress);
        form.append("title", payload.title);
        form.append("file", payload.file);
        for (const key of [
          "recordHash",
          "pointer",
          "anchoredBy",
          "providerName",
          "hospital",
        ] as const) {
          if (payload[key]) form.append(key, payload[key]);
        }
        return requestForm<RecordListItem>(ep("records"), form);
      }
      return request<RecordListItem>(ep("records"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    tombstone: (payload: { patientAddress: string; recordId: string }) =>
      request<{ ok: true }>(
        ep(
          "records",
          `/${encodeURIComponent(payload.patientAddress)}/${encodeURIComponent(
            payload.recordId,
          )}`,
        ),
        { method: "PATCH", body: JSON.stringify({ tombstoned: true }) },
      ),
  },

  emergency: {
    list: () => request<EmergencyListItem[]>(ep("emergency")),
    trigger: (payload: {
      patientAddress: string;
      doctorAddress: string;
      doctorName: string;
      justification: string;
      validUntil: string;
      hours: number;
    }) =>
      request<EmergencyListItem>(ep("emergency"), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    expire: (payload: { patientAddress: string }) =>
      request<{ ok: true }>(
        ep("emergency", `/${encodeURIComponent(payload.patientAddress)}`),
        { method: "PATCH", body: JSON.stringify({ active: false }) },
      ),
  },

  audit: {
    list: () => request<AuditEntry[]>(ep("audit")),
  },

  ipfs: {
    status: () => request<IpfsStatus>("/api/ipfs/status"),
  },

  patientProfiles: {
    get: (address: string) =>
      request<PatientProfile | null>(
        `${ep("patient-profiles")}/${encodeURIComponent(address)}`,
      ),
    update: (
      address: string,
      payload: {
        name: string;
        dob: string;
        bloodType: string;
        allergies: string[];
        emergencyContact: string;
        primaryProvider: string;
        insurance: string;
      },
    ) =>
      request<PatientProfile>(
        `${ep("patient-profiles")}/${encodeURIComponent(address)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
  },

  providerProfiles: {
    get: (address: string) =>
      request<ProviderProfile | null>(
        `${ep("provider-profiles")}/${encodeURIComponent(address)}`,
      ),
    update: (
      address: string,
      payload: {
        name: string;
        specialty: string;
        licenseNumber: string;
        hospital: string;
        email: string;
      },
    ) =>
      request<ProviderProfile>(
        `${ep("provider-profiles")}/${encodeURIComponent(address)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
  },
};