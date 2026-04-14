import * as XLSX from 'xlsx';

// ---- helpers (duplicated from excel-parser to keep worker self-contained) ----

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
    const cfb = XLSX.CFB.read(new Uint8Array(buf), { type: 'array' });
    return cfb.FullPaths.some((p: string) =>
      p.includes('DRMEncrypted') || p.includes('EncryptionInfo')
    );
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

function safeReadWorkbook(file: ArrayBuffer): XLSX.WorkBook {
  if (isDrmProtected(file)) throw new Error(DRM_FILE_ERROR);

  const isCfb = isCfbFile(file);

  if (isCfb) {
    try {
      const wb = XLSX.read(arrayBufferToBinaryString(file), { type: 'binary', dense: true });
      if (wb.SheetNames.length > 0) return wb;
    } catch { /* */ }
    throw new Error(UNREADABLE_FILE_ERROR);
  }

  try {
    const wb = XLSX.read(file, { type: 'array', dense: true });
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

function safeParseSheet(file: ArrayBuffer): { raw: unknown[][]; headers: string[] } | { errors: string[] } {
  let wb: XLSX.WorkBook;
  try {
    wb = safeReadWorkbook(file);
  } catch (e) {
    return { errors: [e instanceof Error ? e.message : String(e)] };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, rawNumbers: false });

  if (raw.length < 2) return { errors: ['File is empty or has no data rows.'] };

  const headers = (raw[0] as string[]).map(String);
  return { raw, headers };
}

// ---- parsers ----

interface ParseResult {
  data: Record<string, string>[];
  errors: string[];
  rowCount: number;
}

function parseEdidc(file: ArrayBuffer): ParseResult {
  const sheet = safeParseSheet(file);
  if ('errors' in sheet) return { data: [], errors: sheet.errors, rowCount: 0 };

  const { raw, headers } = sheet;
  const cm = {
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
  if (cm.idocNumber < 0) missing.push('IDoc number');
  if (cm.idocStatus < 0) missing.push('IDoc Status');
  if (cm.ediArchiveKey < 0) missing.push('EDI Archive Key');
  if (missing.length > 0) return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid EDIDC export.`], rowCount: 0 };

  const data: Record<string, string>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    data.push({
      messageType: getCellValue(row, cm.messageType),
      idocNumber: getCellValue(row, cm.idocNumber),
      idocStatus: getCellValue(row, cm.idocStatus),
      senderPartnerNo: getCellValue(row, cm.senderPartnerNo),
      ediArchiveKey: getCellValue(row, cm.ediArchiveKey),
      createdOn: getCellValue(row, cm.createdOn),
      createdAt: getCellValue(row, cm.createdAt),
      changedOn: getCellValue(row, cm.changedOn),
      timeChanged: getCellValue(row, cm.timeChanged),
    });
  }
  return { data, errors: [], rowCount: data.length };
}

function parseRsn(file: ArrayBuffer): ParseResult {
  const sheet = safeParseSheet(file);
  if ('errors' in sheet) return { data: [], errors: sheet.errors, rowCount: 0 };

  const { raw, headers } = sheet;
  const rsnCol = findColumn(headers, 'RSN', 'rsn', 'rsn number', 'rsn no');
  if (rsnCol < 0) return { data: [], errors: ["Expected column not found — Missing: 'RSN'. Please upload a valid RSN header export."], rowCount: 0 };

  const data: Record<string, string>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const rsn = getCellValue(row, rsnCol);
    if (rsn) {
      const record: Record<string, string> = { rsn };
      headers.forEach((h, idx) => { record[h.trim()] = getCellValue(row, idx); });
      data.push(record);
    }
  }
  return { data, errors: [], rowCount: data.length };
}

function parseEkes(file: ArrayBuffer): ParseResult {
  const sheet = safeParseSheet(file);
  if ('errors' in sheet) return { data: [], errors: sheet.errors, rowCount: 0 };

  const { raw, headers } = sheet;
  const purchDocCol = findColumn(headers, 'Purchasing document', 'purchasing document', 'purch doc', 'purchase document', 'po number');
  const refCol = findColumn(headers, 'Reference', 'reference', 'ref');

  const missing: string[] = [];
  if (purchDocCol < 0) missing.push('Purchasing document');
  if (refCol < 0) missing.push('Reference');
  if (missing.length > 0) return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid EKES export.`], rowCount: 0 };

  const data: Record<string, string>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const record: Record<string, string> = {
      purchasingDocument: getCellValue(row, purchDocCol),
      reference: getCellValue(row, refCol),
    };
    headers.forEach((h, idx) => { record[h.trim()] = getCellValue(row, idx); });
    data.push(record);
  }
  return { data, errors: [], rowCount: data.length };
}

function parseMseg(file: ArrayBuffer): ParseResult {
  const sheet = safeParseSheet(file);
  if ('errors' in sheet) return { data: [], errors: sheet.errors, rowCount: 0 };

  const { raw, headers } = sheet;
  const poCol = findColumn(headers, 'Purchase order', 'purchase order', 'po', 'po number');
  const shortTextCol = findColumn(headers, 'Short text', 'short text', 'text', 'description');

  const missing: string[] = [];
  if (poCol < 0) missing.push('Purchase order');
  if (shortTextCol < 0) missing.push('Short text');
  if (missing.length > 0) return { data: [], errors: [`Expected columns not found — Missing: ${missing.map(m => `'${m}'`).join(', ')}. Please upload a valid MSEG export.`], rowCount: 0 };

  const data: Record<string, string>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length === 0) continue;
    const record: Record<string, string> = {
      purchaseOrder: getCellValue(row, poCol),
      shortText: getCellValue(row, shortTextCol),
    };
    headers.forEach((h, idx) => { record[h.trim()] = getCellValue(row, idx); });
    data.push(record);
  }
  return { data, errors: [], rowCount: data.length };
}

// ---- worker message handler ----

const PARSER_MAP: Record<string, (buf: ArrayBuffer) => ParseResult> = {
  edidc: parseEdidc,
  mseg: parseMseg,
  ekes: parseEkes,
  rsn: parseRsn,
};

self.onmessage = (e: MessageEvent<{ fileType: string; buffer: ArrayBuffer }>) => {
  const { fileType, buffer } = e.data;
  const parser = PARSER_MAP[fileType];
  if (!parser) {
    self.postMessage({ error: `Unknown file type: ${fileType}` });
    return;
  }
  try {
    const result = parser(buffer);
    self.postMessage({ result });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
