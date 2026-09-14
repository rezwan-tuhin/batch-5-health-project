import { NextResponse } from "next/server";
import { anchorRecord, listRecords } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listRecords());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.patientAddress || !body?.title || !body?.recordHash) {
    return NextResponse.json(
      { error: "patientAddress, title and recordHash are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(anchorRecord(body), { status: 201 });
}