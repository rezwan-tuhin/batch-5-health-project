import { NextResponse } from "next/server";
import { anchorRecord, listRecords } from "@/server/db";
import { addBytes, hashBytes, IpfsNotConfiguredError } from "@/lib/ipfs";
import type { RecordType } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

function formValue(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function GET() {
  return NextResponse.json(listRecords());
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const patientAddress = formValue(form, "patientAddress");
    const title = formValue(form, "title");
    if (!patientAddress || !title) {
      return NextResponse.json(
        { error: "patientAddress and title are required" },
        { status: 400 },
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "a PDF file is required" },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "only PDF documents are supported" },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileName = file.name || "record.pdf";
    let pointer: string | undefined;
    let ipfsCid: string | undefined;
    let ipfsSimulated = false;

    try {
      const { cid } = await addBytes(bytes, fileName);
      ipfsCid = cid;
      pointer = `ipfs://${cid}`;
    } catch (err) {
      if (err instanceof IpfsNotConfiguredError) {
        ipfsSimulated = true;
      } else {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "IPFS upload failed" },
          { status: 502 },
        );
      }
    }

    const record = anchorRecord({
      patientAddress,
      title,
      recordHash: hashBytes(bytes),
      pointer,
      ipfsCid,
      fileName,
      anchoredBy: formValue(form, "anchoredBy"),
      providerName: formValue(form, "providerName"),
      hospital: formValue(form, "hospital"),
      recordType: formValue(form, "recordType") as RecordType | undefined,
    });

    return NextResponse.json({ ...record, ipfsSimulated }, { status: 201 });
  }

  // Legacy JSON path (typed recordHash/pointer, structured content) — unchanged.
  const body = await request.json().catch(() => null);
  if (!body?.patientAddress || !body?.title || !body?.recordHash) {
    return NextResponse.json(
      { error: "patientAddress, title and recordHash are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(anchorRecord(body), { status: 201 });
}