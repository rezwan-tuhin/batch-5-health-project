import { NextResponse } from "next/server";
import { revokeConsent } from "@/server/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ patient: string; provider: string }> },
) {
  void request;
  const { patient, provider } = await params;
  return NextResponse.json(revokeConsent({ patientAddress: patient, providerAddress: provider }));
}