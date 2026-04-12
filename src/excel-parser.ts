import * as XLSX from 'xlsx';
import type { EdidcRecord, EkesRecord, MsegRecord, RsnRecord } from './types';

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_]+/g, ' ');
}

function findColumn(headers: string[], ...candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function getCellValue(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  const val = row[idx];
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  rowCount: number;
}

export function parseEdidcFile(file: ArrayBuffer): ParseResult<EdidcRecord> {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (raw.length < 2) return { data: [], errors: ['File is empty or has no data rows.'], rowCount: 0 };

  const headers = (raw[0] as string[]).map(String);
  const colMap = {
    messageType: findColumn(headers, 'Message Type', 'message type', 'msg type'),
    idocNumber: findColumn(headers, 'IDoc number', 'idoc number', 'idoc no', 'idoc no.'),
    idocStatus: findColumn(headers, 'IDoc Status', 'idoc status', 'status'),
    senderPartnerNo: findColumn(headers, 'Sender partner no.', 'sender partner no', 'sender partner', 'partner no'),
    ediArchiveKey: findColumn(headers, 'EDI Archive Key', 'edi archive key', 'archive key'),
    createdOn: findColumn(headers, 'Created On', 'created on', 'created date'),
    createdAt: findColumn(headers, 'Created at', 'created at', 'created time'),
    changedOn: findColumn(headers, 'Changed on', 'changed on', 'changed date'),
    timeChanged: findColumn(headers, 'Time changed', 'time changed', 'changed time'),
  };

  const missing: string[] = [];
  if (colMap.idocNumber < 0) missing.push('IDoc number');
  if (colMap.idocStatus < 0) missing.push('IDoc Status');
  if (colMap.ediArchiveKey < 0) missing.push('EDI Archive Key');

  if (missing.length > 0) {
    return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid EDIDC export.`], rowCount: 0 };
  }

  const data: EdidcRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    data.push({
      messageType: getCellValue(row, colMap.messageType),
      idocNumber: getCellValue(row, colMap.idocNumber),
      idocStatus: getCellValue(row, colMap.idocStatus),
      senderPartnerNo: getCellValue(row, colMap.senderPartnerNo),
      ediArchiveKey: getCellValue(row, colMap.ediArchiveKey),
      createdOn: getCellValue(row, colMap.createdOn),
      createdAt: getCellValue(row, colMap.createdAt),
      changedOn: getCellValue(row, colMap.changedOn),
      timeChanged: getCellValue(row, colMap.timeChanged),
    });
  }

  return { data, errors: [], rowCount: data.length };
}

export function parseRsnFile(file: ArrayBuffer): ParseResult<RsnRecord> {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (raw.length < 2) return { data: [], errors: ['File is empty or has no data rows.'], rowCount: 0 };

  const headers = (raw[0] as string[]).map(String);
  const rsnCol = findColumn(headers, 'RSN', 'rsn', 'rsn number', 'rsn no');

  if (rsnCol < 0) {
    return { data: [], errors: ["Expected column not found — Missing: 'RSN'. Please upload a valid RSN header export."], rowCount: 0 };
  }

  const data: RsnRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const rsn = getCellValue(row, rsnCol);
    if (rsn) {
      const record: RsnRecord = { rsn };
      headers.forEach((h, idx) => {
        record[h.trim()] = getCellValue(row, idx);
      });
      data.push(record);
    }
  }

  return { data, errors: [], rowCount: data.length };
}

export function parseEkesFile(file: ArrayBuffer): ParseResult<EkesRecord> {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (raw.length < 2) return { data: [], errors: ['File is empty or has no data rows.'], rowCount: 0 };

  const headers = (raw[0] as string[]).map(String);
  const purchDocCol = findColumn(headers, 'Purchasing document', 'purchasing document', 'purch doc', 'purchase document', 'po number');
  const refCol = findColumn(headers, 'Reference', 'reference', 'ref');

  const missing: string[] = [];
  if (purchDocCol < 0) missing.push('Purchasing document');
  if (refCol < 0) missing.push('Reference');

  if (missing.length > 0) {
    return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid EKES export.`], rowCount: 0 };
  }

  const data: EkesRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const record: EkesRecord = {
      purchasingDocument: getCellValue(row, purchDocCol),
      reference: getCellValue(row, refCol),
    };
    headers.forEach((h, idx) => {
      record[h.trim()] = getCellValue(row, idx);
    });
    data.push(record);
  }

  return { data, errors: [], rowCount: data.length };
}

export function parseMsegFile(file: ArrayBuffer): ParseResult<MsegRecord> {
  const wb = XLSX.read(file, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (raw.length < 2) return { data: [], errors: ['File is empty or has no data rows.'], rowCount: 0 };

  const headers = (raw[0] as string[]).map(String);
  const poCol = findColumn(headers, 'Purchase order', 'purchase order', 'po', 'po number');
  const shortTextCol = findColumn(headers, 'Short text', 'short text', 'text', 'description');

  const missing: string[] = [];
  if (poCol < 0) missing.push('Purchase order');
  if (shortTextCol < 0) missing.push('Short text');

  if (missing.length > 0) {
    return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid MSEG export.`], rowCount: 0 };
  }

  const data: MsegRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const record: MsegRecord = {
      purchaseOrder: getCellValue(row, poCol),
      shortText: getCellValue(row, shortTextCol),
    };
    headers.forEach((h, idx) => {
      record[h.trim()] = getCellValue(row, idx);
    });
    data.push(record);
  }

  return { data, errors: [], rowCount: data.length };
}
