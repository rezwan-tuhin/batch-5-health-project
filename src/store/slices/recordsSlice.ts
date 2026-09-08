import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  initialRecords,
  type RecordAnchor,
  type RecordContent,
  type RecordType,
} from "@/lib/dummy-data";

interface RecordsState {
  list: RecordAnchor[];
}

const initialState: RecordsState = {
  list: initialRecords,
};

const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    anchorRecord: (
      state,
      action: PayloadAction<{
        patientAddress: string;
        recordId: string;
        recordHash: string;
        pointer: string;
        anchoredBy: string;
        anchoredAt: string;
        title?: string;
        recordType?: RecordType;
        ipfsCid?: string;
        date?: string;
        providerName?: string;
        hospital?: string;
        content?: RecordContent;
      }>,
    ) => {
      const {
        patientAddress,
        recordId,
        recordHash,
        pointer,
        anchoredBy,
        anchoredAt,
        title,
        recordType,
        ipfsCid,
        date,
        providerName,
        hospital,
        content,
      } = action.payload;
      state.list.push({
        patientAddress,
        recordId,
        recordHash,
        pointer,
        ipfsCid: ipfsCid ?? pointer.replace("ipfs://", ""),
        anchoredBy,
        anchoredAt,
        tombstoned: false,
        title: title ?? "Newly anchored record",
        recordType: recordType ?? "lab_report",
        date: date ?? anchoredAt.slice(0, 10),
        providerName: providerName ?? "Unspecified provider",
        hospital: hospital ?? "Unspecified facility",
        content: content ?? { summary: "Dummy record content stored on IPFS." },
        hashVerified: true,
      });
    },
    tombstoneRecord: (
      state,
      action: PayloadAction<{ patientAddress: string; recordId: string }>,
    ) => {
      const { patientAddress, recordId } = action.payload;
      const r = state.list.find(
        (x) => x.patientAddress === patientAddress && x.recordId === recordId,
      );
      if (r) r.tombstoned = true;
    },
  },
});

export const { anchorRecord, tombstoneRecord } = recordsSlice.actions;
export default recordsSlice.reducer;
