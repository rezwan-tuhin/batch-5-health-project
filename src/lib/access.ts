import type {
  Role,
  User,
  Patient,
  Provider,
  Consent,
  RecordAnchor,
  EmergencyAccess,
} from "@/lib/dummy-data";

export const canViewPatients = (role: Role) =>
  role === "regulator" || role === "admin";

export const canViewProviders = (role: Role) =>
  role === "regulator" || role === "admin";

export const canManageConsents = (role: Role) =>
  role === "patient" || role === "regulator" || role === "admin";

export const canViewConsents = (role: Role) =>
  role === "patient" ||
  role === "provider" ||
  role === "regulator" ||
  role === "admin";

export const canViewEmergency = (role: Role) =>
  role === "er_specialist" || role === "regulator" || role === "admin";

export function visiblePatients(
  role: Role,
  user: User | null,
  patients: Patient[],
  consents: Consent[],
): Patient[] {
  if (role === "regulator" || role === "admin") return patients;
  if (role === "provider" && user) {
    const consented = consents
      .filter(
        (c) =>
          c.providerAddress === user.address && c.active,
      )
      .map((c) => c.patientAddress);
    return patients.filter((p) => consented.includes(p.address));
  }
  return [];
}

export function visibleProviders(
  role: Role,
  user: User | null,
  providers: Provider[],
  consents: Consent[],
): Provider[] {
  if (role === "regulator" || role === "admin") return providers;
  if (role === "patient" && user) {
    const consentedProviders = consents
      .filter(
        (c) =>
          c.patientAddress === user.address && c.active,
      )
      .map((c) => c.providerAddress);
    return providers.filter((p) => consentedProviders.includes(p.address));
  }
  return [];
}

export function visibleConsents(
  role: Role,
  user: User | null,
  consents: Consent[],
): Consent[] {
  if (role === "regulator" || role === "admin") return consents;
  if (user && (role === "patient" || role === "provider")) {
    return consents.filter(
      (c) =>
        c.patientAddress === user.address ||
        c.providerAddress === user.address,
    );
  }
  return [];
}

export function visibleRecords(
  role: Role,
  user: User | null,
  records: RecordAnchor[],
  consents: Consent[],
  emergency: EmergencyAccess[],
): RecordAnchor[] {
  if (role === "regulator" || role === "admin") return records;
  if (role === "patient" && user) {
    return records.filter((r) => r.patientAddress === user.address);
  }
  if (role === "provider" && user) {
    const consented = consents
      .filter(
        (c) =>
          c.providerAddress === user.address && c.active,
      )
      .map((c) => c.patientAddress);
    return records.filter(
      (r) =>
        consented.includes(r.patientAddress) ||
        r.anchoredBy === user.address,
    );
  }
  if (role === "er_specialist" && user) {
    const admitted = emergency
      .filter((e) => e.active)
      .map((e) => e.patientAddress);
    return records.filter((r) => admitted.includes(r.patientAddress));
  }
  return [];
}

export function visibleEmergency(
  role: Role,
  emergency: EmergencyAccess[],
): EmergencyAccess[] {
  if (role === "regulator" || role === "admin") return emergency;
  if (role === "er_specialist") return emergency;
  return [];
}