import { NextResponse } from "next/server";
import { listPatients, registerPatient } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPatients());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.address || !body?.didURI) {
    return NextResponse.json(
      { error: "address and didURI are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(registerPatient(body), { status: 201 });
}