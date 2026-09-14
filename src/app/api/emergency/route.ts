import { NextResponse } from "next/server";
import { listEmergency, triggerEmergency } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listEmergency());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body?.patientAddress ||
    !body?.doctorAddress ||
    !body?.doctorName ||
    typeof body?.justification !== "string" ||
    typeof body?.validUntil !== "string" ||
    typeof body?.hours !== "number"
  ) {
    return NextResponse.json(
      { error: "patientAddress, doctorAddress, doctorName, justification, validUntil and hours are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(triggerEmergency(body), { status: 201 });
}