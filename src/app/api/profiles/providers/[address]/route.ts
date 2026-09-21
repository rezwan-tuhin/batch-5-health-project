import { NextResponse } from "next/server";
import { getProviderProfile, upsertProviderProfile } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  void request;
  const { address } = await params;
  const profile = await getProviderProfile(address);
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
    typeof body?.specialty !== "string" ||
    typeof body?.licenseNumber !== "string" ||
    typeof body?.hospital !== "string" ||
    typeof body?.email !== "string"
  ) {
    return NextResponse.json(
      { error: "name, specialty, licenseNumber, hospital and email are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(await upsertProviderProfile({ ...body, address }));
}