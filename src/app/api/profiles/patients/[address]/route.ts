import { NextResponse } from "next/server";
import { getPatientProfile, upsertPatientProfile } from "@/server/db";
import type { PatientProfile } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  void request;
  const { address } = await params;
  const profile = getPatientProfile(address);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body?.name !== "string" ||
    typeof body?.dob !== "string" ||
    typeof body?.bloodType !== "string" ||
    !Array.isArray(body?.allergies) ||
    typeof body?.emergencyContact !== "string" ||
    typeof body?.primaryProvider !== "string" ||
    typeof body?.insurance !== "string"
  ) {
    return NextResponse.json(
      { error: "name, dob, bloodType, allergies, emergencyContact, primaryProvider and insurance are required" },
      { status: 400 },
    );
  }
  const input: PatientProfile = { ...body, address };
  return NextResponse.json(upsertPatientProfile(input));
}