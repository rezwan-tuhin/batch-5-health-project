import { NextResponse } from "next/server";
import { ipfsStatus } from "@/lib/ipfs";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await ipfsStatus());
}