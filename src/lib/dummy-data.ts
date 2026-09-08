export type Role =
  | "patient"
  | "provider"
  | "regulator"
  | "er_specialist"
  | "admin";

export interface User {
  id: number;
  name: string;
  address: string;
  didURI: string;
  role: Role;
  initials: string;
}

export interface PatientProfile {
  address: string;
  name: string;
  dob: string;
  bloodType: string;
  allergies: string[];
  emergencyContact: string;
  primaryProvider: string;
  insurance: string;
}

export interface ProviderProfile {
  address: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  hospital: string;
  email: string;
  role: "provider" | "er_specialist";
}

export interface Patient {
  address: string;
  didURI: string;
  registered: boolean;
  name?: string;
}

export interface Provider {
  address: string;
  name: string;
  didURI: string;
  registered: boolean;
  verified: boolean;
  erQualified: boolean;
  specialty?: string;
  licenseNumber?: string;
  hospital?: string;
}

export interface Consent {
  patientAddress: string;
  providerAddress: string;
  providerName: string;
  active: boolean;
  expiresAt: number;
  purpose: string;
  grantedAt: string;
}

export type RecordType =
  | "lab_report"
  | "imaging"
  | "prescription"
  | "discharge_summary"
  | "ecg"
  | "allergy_panel"
  | "vaccination";

export interface RecordContent {
  summary?: string;
  findings?: Array<{ label: string; value: string; reference?: string; flag?: "normal" | "high" | "low" }>;
  medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
  diagnosis?: string;
  treatment?: string;
  impression?: string;
  imageType?: string;
  bodyPart?: string;
  rhythm?: string;
  rate?: string;
  interpretation?: string;
  allergens?: Array<{ name: string; severity: "mild" | "moderate" | "severe" }>;
  vaccines?: Array<{ name: string; dose: string; date: string }>;
  notes?: string;
}

export interface RecordAnchor {
  patientAddress: string;
  recordId: string;
  recordHash: string;
  pointer: string;
  ipfsCid: string;
  anchoredBy: string;
  anchoredAt: string;
  tombstoned: boolean;
  title: string;
  recordType: RecordType;
  date: string;
  providerName: string;
  hospital: string;
  content: RecordContent;
  hashVerified: boolean;
}

export interface EmergencyAccess {
  patientAddress: string;
  doctorAddress: string;
  doctorName: string;
  justification: string;
  validUntil: string;
  active: boolean;
}

export interface AuditEntry {
  id: number;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export const users: User[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    address: "0x7C8d...a1B2",
    didURI: "did:ethr:0x7C8d9Ef...a1B2",
    role: "patient",
    initials: "SM",
  },
  {
    id: 2,
    name: "Dr. Emily Carter",
    address: "0x5D6e...2f8B",
    didURI: "did:ethr:0x5D6e7A9...2f8B",
    role: "provider",
    initials: "EC",
  },
  {
    id: 3,
    name: "James Thornton",
    address: "0xF4C2...9e1A",
    didURI: "did:ethr:0xF4C28A1...9e1A",
    role: "regulator",
    initials: "JT",
  },
  {
    id: 4,
    name: "Dr. Marcus Lee",
    address: "0x8A4c...7e1D",
    didURI: "did:ethr:0x8A4c32B...7e1D",
    role: "er_specialist",
    initials: "ML",
  },
  {
    id: 5,
    name: "Aisha Rahman",
    address: "0x0B6d...4c2F",
    didURI: "did:ethr:0x0B6d81C...4c2F",
    role: "admin",
    initials: "AR",
  },
];

export const patientProfiles: PatientProfile[] = [
  {
    address: "0x7C8d...a1B2",
    name: "Sarah Mitchell",
    dob: "1987-04-12",
    bloodType: "O+",
    allergies: ["Penicillin", "Sulfa drugs"],
    emergencyContact: "David Mitchell (Husband) · +1 (555) 204-1188",
    primaryProvider: "Dr. Emily Carter",
    insurance: "BlueCross Shield · Policy 8841-2230",
  },
  {
    address: "0x3Fb2...9c4D",
    name: "Robert Chen",
    dob: "1955-11-03",
    bloodType: "A-",
    allergies: ["Iodine contrast"],
    emergencyContact: "Grace Chen (Daughter) · +1 (555) 774-9012",
    primaryProvider: "Dr. Marcus Lee",
    insurance: "Aetna · Policy 4412-8890",
  },
  {
    address: "0x9Ae4...d8E7",
    name: "Miguel Alvarez",
    dob: "1992-07-28",
    bloodType: "B+",
    allergies: ["Latex"],
    emergencyContact: "Sofia Alvarez (Wife) · +1 (555) 331-4567",
    primaryProvider: "Dr. James Okafor",
    insurance: "UnitedHealth · Policy 9910-3345",
  },
  {
    address: "0x1Bc9...f0A5",
    name: "Hannah Kim",
    dob: "1978-02-19",
    bloodType: "AB+",
    allergies: ["None on file"],
    emergencyContact: "Daniel Kim (Brother) · +1 (555) 608-2245",
    primaryProvider: "—",
    insurance: "Cigna · Policy 2234-7701",
  },
];

export const providerProfiles: ProviderProfile[] = [
  {
    address: "0x5D6e...2f8B",
    name: "Dr. Emily Carter",
    specialty: "Cardiology",
    licenseNumber: "MD-4471-PH",
    hospital: "City General Hospital",
    email: "e.carter@citygeneral.org",
    role: "provider",
  },
  {
    address: "0x8A4c...7e1D",
    name: "Dr. Marcus Lee",
    specialty: "Emergency Medicine",
    licenseNumber: "MD-8820-ER",
    hospital: "City General Hospital",
    email: "m.lee@citygeneral.org",
    role: "er_specialist",
  },
  {
    address: "0x2E9f...5b3C",
    name: "Dr. Priya Patel",
    specialty: "Internal Medicine",
    licenseNumber: "MD-2205-IM",
    hospital: "Riverside Medical Center",
    email: "p.patel@riversidemed.com",
    role: "provider",
  },
  {
    address: "0x6C1a...8d4F",
    name: "Dr. James Okafor",
    specialty: "Orthopedics",
    licenseNumber: "MD-6654-OR",
    hospital: "City General Hospital",
    email: "j.okafor@citygeneral.org",
    role: "provider",
  },
];

export const initialPatients: Patient[] = [
  {
    address: "0x7C8d...a1B2",
    didURI: "did:ethr:0x7C8d9Ef...a1B2",
    registered: true,
    name: "Sarah Mitchell",
  },
  {
    address: "0x3Fb2...9c4D",
    didURI: "did:ethr:0x3Fb29A1...9c4D",
    registered: true,
    name: "Robert Chen",
  },
  {
    address: "0x9Ae4...d8E7",
    didURI: "did:ethr:0x9Ae45C2...d8E7",
    registered: true,
    name: "Miguel Alvarez",
  },
  {
    address: "0x1Bc9...f0A5",
    didURI: "did:ethr:0x1Bc98D4...f0A5",
    registered: false,
    name: "Hannah Kim",
  },
];

export const initialProviders: Provider[] = [
  {
    address: "0x5D6e...2f8B",
    name: "Dr. Emily Carter",
    didURI: "did:ethr:0x5D6e7A9...2f8B",
    registered: true,
    verified: true,
    erQualified: false,
    specialty: "Cardiology",
    licenseNumber: "MD-4471-PH",
    hospital: "City General Hospital",
  },
  {
    address: "0x8A4c...7e1D",
    name: "Dr. Marcus Lee",
    didURI: "did:ethr:0x8A4c32B...7e1D",
    registered: true,
    verified: true,
    erQualified: true,
    specialty: "Emergency Medicine",
    licenseNumber: "MD-8820-ER",
    hospital: "City General Hospital",
  },
  {
    address: "0x2E9f...5b3C",
    name: "Dr. Priya Patel",
    didURI: "did:ethr:0x2E9f10A...5b3C",
    registered: true,
    verified: false,
    erQualified: false,
    specialty: "Internal Medicine",
    licenseNumber: "MD-2205-IM",
    hospital: "Riverside Medical Center",
  },
  {
    address: "0x6C1a...8d4F",
    name: "Dr. James Okafor",
    didURI: "did:ethr:0x6C1a77E...8d4F",
    registered: true,
    verified: true,
    erQualified: false,
    specialty: "Orthopedics",
    licenseNumber: "MD-6654-OR",
    hospital: "City General Hospital",
  },
];

export const initialConsents: Consent[] = [
  {
    patientAddress: "0x7C8d...a1B2",
    providerAddress: "0x5D6e...2f8B",
    providerName: "Dr. Emily Carter",
    active: true,
    expiresAt: 1773000000,
    purpose: "Cardiology consultation & treatment records",
    grantedAt: "2026-03-10T09:00:00Z",
  },
  {
    patientAddress: "0x7C8d...a1B2",
    providerAddress: "0x8A4c...7e1D",
    providerName: "Dr. Marcus Lee",
    active: true,
    expiresAt: 0,
    purpose: "Emergency & general treatment records",
    grantedAt: "2026-01-22T14:30:00Z",
  },
  {
    patientAddress: "0x3Fb2...9c4D",
    providerAddress: "0x8A4c...7e1D",
    providerName: "Dr. Marcus Lee",
    active: false,
    expiresAt: 1700000000,
    purpose: "Annual physical & routine checkup",
    grantedAt: "2025-11-05T11:00:00Z",
  },
  {
    patientAddress: "0x7C8d...a1B2",
    providerAddress: "0x6C1a...8d4F",
    providerName: "Dr. James Okafor",
    active: true,
    expiresAt: 1785000000,
    purpose: "Orthopedic follow-up for knee injury",
    grantedAt: "2026-07-15T16:45:00Z",
  },
];

export const initialRecords: RecordAnchor[] = [
  {
    patientAddress: "0x7C8d...a1B2",
    recordId: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    recordHash: "0xdef123...89ab",
    pointer: "ipfs://QmXy1z2w3a4b5c6d7e8f9a0b1c2d3e4f5g6h7i8j9k0l",
    ipfsCid: "QmXy1z2w3a4b5c6d7e8f9a0b1c2d3e4f5g6h7i8j9k0l",
    anchoredBy: "0x5D6e...2f8B",
    anchoredAt: "2026-03-15T10:30:00Z",
    tombstoned: false,
    title: "Complete Blood Count (CBC) — Routine",
    recordType: "lab_report",
    date: "2026-08-15",
    providerName: "Dr. Emily Carter",
    hospital: "City General Hospital",
    content: {
      summary:
        "Routine CBC ordered during annual cardiovascular checkup. No clinically significant abnormalities detected.",
      findings: [
        { label: "White Blood Cells (WBC)", value: "6.2 ×10³/µL", reference: "4.5–11.0", flag: "normal" },
        { label: "Red Blood Cells (RBC)", value: "4.9 ×10⁶/µL", reference: "4.2–5.4", flag: "normal" },
        { label: "Hemoglobin (Hgb)", value: "14.2 g/dL", reference: "12.0–15.5", flag: "normal" },
        { label: "Hematocrit (Hct)", value: "42.1%", reference: "36–46", flag: "normal" },
        { label: "Platelets", value: "248 ×10³/µL", reference: "150–450", flag: "normal" },
        { label: "Neutrophils (Absolute)", value: "4.1 ×10³/µL", reference: "1.5–7.0", flag: "normal" },
      ],
      notes:
        "Patient reports feeling well. No symptoms of infection or anemia. Results consistent with prior baseline.",
    },
    hashVerified: true,
  },
  {
    patientAddress: "0x7C8d...a1B2",
    recordId: "0x1b2c3d4e5f60718293a4b5c6d7e8f9a0",
    recordHash: "0xabc456...12cd",
    pointer: "ipfs://QmZ8y7x6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f",
    ipfsCid: "QmZ8y7x6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f",
    anchoredBy: "0x7C8d...a1B2",
    anchoredAt: "2026-04-02T14:15:00Z",
    tombstoned: true,
    title: "Chest X-Ray — PA & Lateral",
    recordType: "imaging",
    date: "2026-04-01",
    providerName: "Dr. Emily Carter",
    hospital: "City General Hospital",
    content: {
      imageType: "Chest Radiograph",
      bodyPart: "Chest (PA & Lateral views)",
      summary:
        "Patient presented with mild chest tightness. Radiograph ordered to rule out cardiomegaly or pulmonary abnormality.",
      findings: [
        { label: "Cardiac silhouette", value: "Within normal limits", flag: "normal" },
        { label: "Lungs", value: "Clear, no focal opacities", flag: "normal" },
        { label: "Pleural spaces", value: "No effusion or pneumothorax", flag: "normal" },
        { label: "Bony thorax", value: "No acute fracture", flag: "normal" },
      ],
      impression:
        "Normal chest radiograph. No acute cardiopulmonary disease identified.",
      notes: "This record has been tombstoned and is no longer considered a valid clinical record.",
    },
    hashVerified: true,
  },
  {
    patientAddress: "0x3Fb2...9c4D",
    recordId: "0x2c3d4e5f60718293a4b5c6d7e8f9a0b1",
    recordHash: "0x9a8b...77ef",
    pointer: "ipfs://QmAbcD...Tuv9",
    ipfsCid: "QmAbcD12eF34gH56iJ78kL90mN12oP34qR56sT78uV",
    anchoredBy: "0x8A4c...7e1D",
    anchoredAt: "2026-05-20T09:45:00Z",
    tombstoned: false,
    title: "ECG — 12-Lead Resting",
    recordType: "ecg",
    date: "2026-05-20",
    providerName: "Dr. Marcus Lee",
    hospital: "City General Hospital",
    content: {
      rhythm: "Normal Sinus Rhythm",
      rate: "72 bpm",
      interpretation:
        "Normal sinus rhythm at 72 bpm. Normal PR and QT intervals. No ST-segment elevation or depression. No ectopy observed.",
      summary:
        "Routine ECG performed as part of pre-operative clearance. No arrhythmogenic findings.",
      notes: "Patient denied palpitations or chest pain. Findings within normal limits.",
    },
    hashVerified: true,
  },
  {
    patientAddress: "0x7C8d...a1B2",
    recordId: "0x3d4e5f60718293a4b5c6d7e8f9a0b1c2",
    recordHash: "0x77cd...12ab",
    pointer: "ipfs://QmT9v8u7w6x5y4z3a2b1c0d9e8f7g6h5i4j3k2l1m0n",
    ipfsCid: "QmT9v8u7w6x5y4z3a2b1c0d9e8f7g6h5i4j3k2l1m0n",
    anchoredBy: "0x5D6e...2f8B",
    anchoredAt: "2026-06-08T13:00:00Z",
    tombstoned: false,
    title: "Prescription — Atorvastatin 20 mg",
    recordType: "prescription",
    date: "2026-06-08",
    providerName: "Dr. Emily Carter",
    hospital: "City General Hospital",
    content: {
      summary:
        "Initiated statin therapy for borderline LDL cholesterol and positive family history of coronary artery disease.",
      medications: [
        {
          name: "Atorvastatin",
          dosage: "20 mg",
          frequency: "Once daily at bedtime",
          instructions: "Take with or without food. Avoid grapefruit juice.",
        },
        {
          name: "Aspirin",
          dosage: "81 mg",
          frequency: "Once daily",
          instructions: "Low-dose antiplatelet therapy. Take with food to reduce GI irritation.",
        },
      ],
      notes:
        "Follow up with lipid panel in 3 months. Advised lifestyle modification including diet and regular exercise.",
    },
    hashVerified: true,
  },
  {
    patientAddress: "0x9Ae4...d8E7",
    recordId: "0x4e5f60718293a4b5c6d7e8f9a0b1c2d3",
    recordHash: "0x34cd...ef89",
    pointer: "ipfs://QmR4e5d6c7b8a9z0y1x2w3v4u5t6s7r8q9p0o1n2m3l",
    ipfsCid: "QmR4e5d6c7b8a9z0y1x2w3v4u5t6s7r8q9p0o1n2m3l",
    anchoredBy: "0x8A4c...7e1D",
    anchoredAt: "2026-07-02T18:20:00Z",
    tombstoned: false,
    title: "MRI Brain — No Contrast",
    recordType: "imaging",
    date: "2026-07-02",
    providerName: "Dr. Marcus Lee",
    hospital: "City General Hospital",
    content: {
      imageType: "Magnetic Resonance Imaging",
      bodyPart: "Brain (Axial, Sagittal, Coronal)",
      summary:
        "MRI performed following transient episode of dizziness. Evaluated for structural abnormality.",
      findings: [
        { label: "Cerebral hemispheres", value: "Symmetric, no mass or infarct", flag: "normal" },
        { label: "Ventricles", value: "Normal size and position", flag: "normal" },
        { label: "Cerebellum & brainstem", value: "Unremarkable", flag: "normal" },
        { label: "Vascular flow voids", value: "Preserved", flag: "normal" },
      ],
      impression:
        "No acute intracranial abnormality. No mass, hemorrhage, or hydrocephalus identified.",
    },
    hashVerified: true,
  },
  {
    patientAddress: "0x1Bc9...f0A5",
    recordId: "0x5f60718293a4b5c6d7e8f9a0b1c2d3e4",
    recordHash: "0x12ab...45cd",
    pointer: "ipfs://QmP8q7r6s5t4u3v2w1x0y9z8a7b6c5d4e3f2g1h0i",
    ipfsCid: "QmP8q7r6s5t4u3v2w1x0y9z8a7b6c5d4e3f2g1h0i",
    anchoredBy: "0x5D6e...2f8B",
    anchoredAt: "2026-08-30T18:00:00Z",
    tombstoned: false,
    title: "Comprehensive Allergy Panel",
    recordType: "allergy_panel",
    date: "2026-08-29",
    providerName: "Dr. Emily Carter",
    hospital: "City General Hospital",
    content: {
      summary:
        "IgE panel performed following suspected reaction to medication. Results support penicillin allergy.",
      allergens: [
        { name: "Penicillin G", severity: "severe" },
        { name: "Amoxicillin", severity: "severe" },
        { name: "Sulfamethoxazole", severity: "moderate" },
        { name: "Latex", severity: "mild" },
        { name: "Nuts (peanut)", severity: "mild" },
      ],
      notes:
        "Patient advised to avoid all beta-lactam antibiotics. Medical alert bracelet recommended. Carry EpiPen at all times.",
    },
    hashVerified: true,
  },
];

export const initialEmergencyAccess: EmergencyAccess[] = [
  {
    patientAddress: "0x9Ae4...d8E7",
    doctorAddress: "0x8A4c...7e1D",
    doctorName: "Dr. Marcus Lee",
    justification: "Unconscious trauma patient, life-threatening condition, no consent on file",
    validUntil: "2026-09-11T09:00:00Z",
    active: true,
  },
  {
    patientAddress: "0x1Bc9...f0A5",
    doctorAddress: "0x8A4c...7e1D",
    doctorName: "Dr. Marcus Lee",
    justification: "Severe anaphylaxis, unable to obtain consent, emergency protocol invoked",
    validUntil: "2026-08-30T18:00:00Z",
    active: false,
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: 1,
    actorName: "Dr. Emily Carter",
    actorRole: "Provider",
    action: "Record Accessed",
    target: "CBC — Sarah Mitchell",
    timestamp: "2026-09-08T10:32:00Z",
    details: "Record read under active cardiology consent. IPFS content retrieved.",
  },
  {
    id: 2,
    actorName: "Dr. Marcus Lee",
    actorRole: "ER Specialist",
    action: "Emergency Access",
    target: "Miguel Alvarez",
    timestamp: "2026-09-08T08:15:00Z",
    details: "Break-glass session triggered. Unconscious trauma patient.",
  },
  {
    id: 3,
    actorName: "James Thornton",
    actorRole: "Regulator",
    action: "Provider Verified",
    target: "Dr. James Okafor",
    timestamp: "2026-09-07T14:05:00Z",
    details: "License MD-6654-OR confirmed against state registry.",
  },
  {
    id: 4,
    actorName: "Sarah Mitchell",
    actorRole: "Patient",
    action: "Consent Granted",
    target: "Dr. James Okafor",
    timestamp: "2026-09-06T11:40:00Z",
    details: "Orthopedic follow-up consent approved with 12-month expiry.",
  },
  {
    id: 5,
    actorName: "Aisha Rahman",
    actorRole: "Admin",
    action: "System Config",
    target: "Access Policies",
    timestamp: "2026-09-05T16:22:00Z",
    details: "Updated IPFS gateway rotation and daily CID health check cadence.",
  },
  {
    id: 6,
    actorName: "Dr. Emily Carter",
    actorRole: "Provider",
    action: "Record Anchored",
    target: "CBC — Sarah Mitchell",
    timestamp: "2026-08-15T10:30:00Z",
    details: "Lab report hash anchored to ledger. IPFS CID registered.",
  },
];
