import { NextResponse } from "next/server";
import { listProviders, registerProvider } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listProviders());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.address || !body?.name || !body?.didURI) {
    return NextResponse.json(
      { error: "address, name and didURI are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(registerProvider(body), { status: 201 });
}