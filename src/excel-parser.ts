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
  // Fallback: partial match (header contains candidate or candidate contains header)
  for (const candidate of candidates) {
    const lc = candidate.toLowerCase();
    const idx = normalized.findIndex(h => h.includes(lc) || lc.includes(h));
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

const DRM_FILE_ERROR =
  'DRM_PROTECTED: This file is protected by Microsoft Information Protection (DRM). ' +
  'The data inside is encrypted and cannot be read directly.\n\n' +
  'To fix this automatically:\n' +
  '1. Click "Download Converter" below to get the helper script\n' +
  '2. Double-click the downloaded .ps1 file\n' +
  '3. Select your SAP Excel files in the dialog\n' +
  '4. Upload the newly created "_converted.xlsx" files here';

const UNREADABLE_FILE_ERROR =
  'Unable to read this Excel file. This can happen when:\n' +
  '• The file was exported from SAP in a legacy format\n' +
  '• The file uses an OLE2/CFB container wrapper\n' +
  '• The file extension doesn\'t match its actual format\n\n' +
  'To fix this:\n' +
  '1. Open the file in Microsoft Excel\n' +
  '2. Go to File → Save As\n' +
  '3. Choose format: "Excel Workbook (.xlsx)"\n' +
  '4. Click Save\n' +
  '5. Upload the newly saved file here';

// CFB/OLE2 magic bytes: D0 CF 11 E0
const CFB_HEADER = [0xd0, 0xcf, 0x11, 0xe0];

function isCfbFile(buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf);
  return bytes.length >= 4 &&
    bytes[0] === CFB_HEADER[0] && bytes[1] === CFB_HEADER[1] &&
    bytes[2] === CFB_HEADER[2] && bytes[3] === CFB_HEADER[3];
}

function isDrmProtected(buf: ArrayBuffer): boolean {
  if (!isCfbFile(buf)) return false;
  try {
    // Parse the CFB container and check for DRM streams
    const cfb = XLSX.CFB.read(new Uint8Array(buf), { type: 'array' });
    return cfb.FullPaths.some((p: string) => p.includes('DRMEncrypted'));
  } catch {
    return false;
  }
}

function arrayBufferToBinaryString(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    const slice = bytes.subarray(i, Math.min(i + 8192, bytes.length));
    chunks.push(String.fromCharCode(...slice));
  }
  return chunks.join('');
}

function safeReadWorkbook(file: ArrayBuffer): XLSX.WorkBook {
  // Fast check: DRM-protected files cannot be read in the browser
  if (isDrmProtected(file)) {
    throw new Error(DRM_FILE_ERROR);
  }

  const isCfb = isCfbFile(file);

  // For OLE2/CFB files (old .xls format)
  if (isCfb) {
    // Try binary string first (standard OLE2/XLS)
    try {
      const wb = XLSX.read(arrayBufferToBinaryString(file), { type: 'binary', cellDates: false, cellText: true });
      if (wb.SheetNames.length > 0) return wb;
    } catch {
      // CFB but not readable via binary — try array mode
    }
    // Fallback: try array mode (handles some ECMA-376 encrypted CFB without password)
    try {
      const wb = XLSX.read(new Uint8Array(file), { type: 'array', cellDates: false, cellText: true });
      if (wb.SheetNames.length > 0) return wb;
    } catch { /* */ }
    throw new Error(UNREADABLE_FILE_ERROR);
  }

  // For ZIP-based .xlsx files, ArrayBuffer read is fastest — single attempt
  try {
    const wb = XLSX.read(file, { type: 'array', cellDates: false, cellText: true });
    if (wb.SheetNames.length > 0) return wb;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Encrypted') || msg.includes('EncryptionInfo') || msg.includes('ECMA-376') || msg.includes('password')) {
      throw new Error(UNREADABLE_FILE_ERROR);
    }
    throw new Error(UNREADABLE_FILE_ERROR + '\n\nTechnical detail: ' + msg);
  }

  throw new Error(UNREADABLE_FILE_ERROR);
}

function safeParseSheet(file: ArrayBuffer): { raw: unknown[][]; headers: string[] } | ParseResult<never> {
  let wb: XLSX.WorkBook;
  try {
    wb = safeReadWorkbook(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: [], errors: [msg], rowCount: 0 };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, rawNumbers: false });

  if (raw.length < 2) {
    return { data: [], errors: ['File is empty or has no data rows.'], rowCount: 0 };
  }

  const headers = (raw[0] as string[]).map(String);
  return { raw, headers };
}

function isError<T>(result: { raw: unknown[][]; headers: string[] } | ParseResult<T>): result is ParseResult<T> {
  return 'errors' in result && (result as ParseResult<T>).errors.length > 0;
}

export function parseEdidcFile(file: ArrayBuffer): ParseResult<EdidcRecord> {
  const sheet = safeParseSheet(file);
  if (isError(sheet)) return sheet as ParseResult<EdidcRecord>;

  const { raw, headers } = sheet;
  const colMap = {
    messageType: findColumn(headers, 'Message Type', 'message type', 'msg type'),
    idocNumber: findColumn(headers, 'IDoc number', 'idoc number', 'idoc no', 'idoc no.'),
    idocStatus: findColumn(headers, 'IDoc Status', 'idoc status', 'status'),
    senderPartnerNo: findColumn(headers, 'Sender partner no.', 'sender partner no', 'sender partner', 'partner no'),
    logicalRecipient: findColumn(headers, 'Logical address of recipient', 'logical address of recipient', 'rcvpor', 'logical recipient', 'log.addr.of recip.', 'recipient port', 'receiver port'),
    logicalSender: findColumn(headers, 'Logical address of sender', 'logical address of sender', 'sndpor', 'logical sender', 'sender port'),
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
      logicalRecipient: getCellValue(row, colMap.logicalRecipient),
      logicalSender: getCellValue(row, colMap.logicalSender),
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
  const sheet = safeParseSheet(file);
  if (isError(sheet)) return sheet as ParseResult<RsnRecord>;

  const { raw, headers } = sheet;
  const rsnCol = findColumn(headers, 'RSN', 'rsn', 'rsn number', 'rsn no', 'CSC Parent Serial Number', 'csc parent serial number');

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
  const sheet = safeParseSheet(file);
  if (isError(sheet)) return sheet as ParseResult<EkesRecord>;

  const { raw, headers } = sheet;
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
  const sheet = safeParseSheet(file);
  if (isError(sheet)) return sheet as ParseResult<MsegRecord>;

  const { raw, headers } = sheet;
  const poCol = findColumn(headers, 'Purchase order', 'purchase order', 'po', 'po number');
  const shortTextCol = findColumn(headers, 'Short text', 'short text', 'text', 'description', 'sgtxt');
  const matDocCol = findColumn(headers, 'Material Document', 'material document', 'MBLNR', 'mblnr', 'Mat. Doc.', 'mat. doc.', 'Material Doc.', 'material doc.', 'MatDoc', 'matdoc');

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
      materialDocument: matDocCol >= 0 ? getCellValue(row, matDocCol) : '',
    };
    headers.forEach((h, idx) => {
      record[h.trim()] = getCellValue(row, idx);
    });
    data.push(record);
  }

  return { data, errors: [], rowCount: data.length };
}
