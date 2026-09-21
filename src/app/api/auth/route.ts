import { NextRequest, NextResponse } from "next/server";
import { resolveUser, signup } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }
  const user = await resolveUser(address);
  if (!user) {
    return NextResponse.json(
      { error: "Unknown wallet address — register an account first" },
      { status: 404 },
    );
  }
  return NextResponse.json({ user, role: user.role });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.address || !body?.name || !body?.didURI || !body?.role) {
    return NextResponse.json(
      { error: "address, name, didURI and role are required" },
      { status: 400 },
    );
  }
  const user = await signup(body);
  return NextResponse.json({ user, role: user.role }, { status: 201 });
}