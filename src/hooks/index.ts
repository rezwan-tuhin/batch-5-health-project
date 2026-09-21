"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ConsentListItem,
  EmergencyListItem,
  IpfsStatus,
  PatientListItem,
  ProviderListItem,
  RecordListItem,
} from "@/lib/api";
import type { AuditEntry, PatientProfile, ProviderProfile, User } from "@/lib/dummy-data";

export const queryKeys = {
  patients: ["patients"] as const,
  providers: ["providers"] as const,
  consents: ["consents"] as const,
  records: ["records"] as const,
  emergency: ["emergency"] as const,
  audit: ["audit"] as const,
  users: ["users"] as const,
  ipfs: ["ipfs-status"] as const,
  patientProfile: (address: string) => ["patient-profile", address] as const,
  providerProfile: (address: string) => ["provider-profile", address] as const,
};

interface HookOptions {
  enabled?: boolean;
}

const defaultEnabled = { enabled: true };

export function usePatients(opts: HookOptions = defaultEnabled) {
  return useQuery<PatientListItem[]>({
    queryKey: queryKeys.patients,
    queryFn: api.patients.list,
    enabled: opts.enabled,
  });
}

export function useProviders(opts: HookOptions = defaultEnabled) {
  return useQuery<ProviderListItem[]>({
    queryKey: queryKeys.providers,
    queryFn: api.providers.list,
    enabled: opts.enabled,
  });
}

export function useConsents(opts: HookOptions = defaultEnabled) {
  return useQuery<ConsentListItem[]>({
    queryKey: queryKeys.consents,
    queryFn: api.consents.list,
    enabled: opts.enabled,
  });
}

export function useRecords(opts: HookOptions = defaultEnabled) {
  return useQuery<RecordListItem[]>({
    queryKey: queryKeys.records,
    queryFn: api.records.list,
    enabled: opts.enabled,
  });
}

export function useEmergency(opts: HookOptions = defaultEnabled) {
  return useQuery<EmergencyListItem[]>({
    queryKey: queryKeys.emergency,
    queryFn: api.emergency.list,
    enabled: opts.enabled,
  });
}

export function useAudit(opts: HookOptions = defaultEnabled) {
  return useQuery<AuditEntry[]>({
    queryKey: queryKeys.audit,
    queryFn: api.audit.list,
    enabled: opts.enabled,
  });
}

export function useUsers(opts: HookOptions = defaultEnabled) {
  return useQuery<User[]>({
    queryKey: queryKeys.users,
    queryFn: api.users.list,
    enabled: opts.enabled,
  });
}

export function useIpfsStatus(opts: HookOptions = defaultEnabled) {
  return useQuery<IpfsStatus>({
    queryKey: queryKeys.ipfs,
    queryFn: api.ipfs.status,
    enabled: opts.enabled,
    staleTime: 60_000,
  });
}

export function usePatientProfile(
  address: string,
  opts: HookOptions = defaultEnabled,
) {
  return useQuery<PatientProfile | null>({
    queryKey: queryKeys.patientProfile(address),
    queryFn: () => api.patientProfiles.get(address),
    enabled: !!address && opts.enabled,
  });
}

export function useProviderProfile(
  address: string,
  opts: HookOptions = defaultEnabled,
) {
  return useQuery<ProviderProfile | null>({
    queryKey: queryKeys.providerProfile(address),
    queryFn: () => api.providerProfiles.get(address),
    enabled: !!address && opts.enabled,
  });
}