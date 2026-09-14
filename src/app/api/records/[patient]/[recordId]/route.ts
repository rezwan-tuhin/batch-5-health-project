import { NextResponse } from "next/server";
import { tombstoneRecord } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ patient: string; recordId: string }> },
) {
  const { patient, recordId } = await params;
  return NextResponse.json(
    tombstoneRecord({ patientAddress: patient, recordId }),
  );
}