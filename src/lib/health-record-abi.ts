import type { Abi } from "viem";

export const healthRecordAbi = [
  {
    type: "function",
    name: "registerPatient",
    inputs: [{ name: "didURI", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registerProvider",
    inputs: [
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyProvider",
    inputs: [
      { name: "provider", type: "address" },
      { name: "isVerified", type: "bool" },
      { name: "isERQualified", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantConsent",
    inputs: [
      { name: "provider", type: "address" },
      { name: "purpose", type: "string" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeConsent",
    inputs: [
      { name: "patient", type: "address" },
      { name: "provider", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "triggerEmergencyAccess",
    inputs: [
      { name: "patient", type: "address" },
      { name: "justification", type: "string" },
      { name: "duration", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "anchorRecord",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tombstoneRecord",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyRecordHash",
    inputs: [
      { name: "patient", type: "address" },
      { name: "recordId", type: "bytes32" },
      { name: "candidateHash", type: "bytes32" },
    ],
    outputs: [
      { name: "matches", type: "bool" },
      { name: "tombstoned", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasValidAccess",
    inputs: [
      { name: "patient", type: "address" },
      { name: "accessor", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "patients",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "didURI", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "providers",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "verified", type: "bool" },
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recordAnchors",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "bytes32" },
    ],
    outputs: [
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
      { name: "anchoredBy", type: "address" },
      { name: "anchoredAt", type: "uint64" },
      { name: "tombstoned", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "emergencySessions",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "validUntil", type: "uint64" },
      { name: "doctor", type: "address" },
      { name: "justification", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PatientRegistered",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "didURI", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ProviderRegistered",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "didURI", type: "string" },
      { name: "name", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ProviderVerified",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "isVerified", type: "bool" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ConsentGranted",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "purpose", type: "string" },
      { name: "expiresAt", type: "uint64" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ConsentRevoked",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordAnchored",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32", indexed: true },
      { name: "recordHash", type: "bytes32" },
      { name: "pointer", type: "string" },
      { name: "anchoredBy", type: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordTombstoned",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RecordAccessed",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "recordId", type: "bytes32" },
      { name: "accessor", type: "address", indexed: true },
      { name: "purpose", type: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EmergencyAccessTriggered",
    inputs: [
      { name: "patient", type: "address", indexed: true },
      { name: "doctor", type: "address", indexed: true },
      { name: "justification", type: "string" },
      { name: "validUntil", type: "uint64" },
    ],
    anonymous: false,
  },
] as const satisfies Abi;