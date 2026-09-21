import { NextResponse } from "next/server";
import { verifyProvider } from "@/server/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isVerified !== "boolean") {
    return NextResponse.json(
      { error: "isVerified (boolean) is required" },
      { status: 400 },
    );
  }
  return NextResponse.json(
    await verifyProvider({
      address,
      isVerified: body.isVerified,
      erQualified: Boolean(body.erQualified),
    }),
  );
}