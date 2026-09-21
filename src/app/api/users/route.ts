import { NextResponse } from "next/server";
import { listUsers } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listUsers());
}