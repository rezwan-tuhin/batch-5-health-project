import { NextResponse } from "next/server";
import { expireEmergency } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ patient: string }> },
) {
  void request;
  const { patient } = await params;
  return NextResponse.json(await expireEmergency({ patientAddress: patient }));
}