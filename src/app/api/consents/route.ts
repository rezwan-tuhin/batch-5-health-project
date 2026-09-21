import { NextResponse } from "next/server";
import { grantConsent, listConsents } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listConsents());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body?.patientAddress ||
    !body?.providerAddress ||
    !body?.providerName ||
    typeof body?.purpose !== "string" ||
    typeof body?.expiresAt !== "number"
  ) {
    return NextResponse.json(
      { error: "patientAddress, providerAddress, providerName, purpose and expiresAt are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(await grantConsent(body), { status: 201 });
}