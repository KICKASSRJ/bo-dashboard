const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ---- Inline the parser logic (same as excel-parser.ts) ----

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/[\s_]+/g, ' ');
}

function findColumn(headers, ...candidates) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function getCellValue(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  const val = row[idx];
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

const IDOC_STATUS_MAP = {
  '53': 'Application document posted',
  '51': 'Application document not posted',
  '64': 'IDoc ready to be processed (inbound)',
  '68': 'Error, no further processing',
  '60': 'IDoc ready for dispatch (outbound)',
  '61': 'IDoc passed to port OK (outbound)',
};

function readFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  return raw;
}

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName} — ${detail || 'FAILED'}`);
    failed++;
  }
}

// ========== TEST 1: EDIDC Parsing (F2 - IDoc Status) ==========
console.log('\n📋 TEST 1: EDIDC File Parsing (F2 - IDoc Status)');
const edidcRaw = readFile(path.join(__dirname, 'test-data', 'edidc-test.xlsx'));
const edidcHeaders = edidcRaw[0].map(String);

assert(edidcRaw.length === 7, 'EDIDC has 6 data rows + 1 header', `Got ${edidcRaw.length}`);
assert(findColumn(edidcHeaders, 'IDoc number', 'idoc number') >= 0, 'Found IDoc number column');
assert(findColumn(edidcHeaders, 'IDoc Status', 'idoc status') >= 0, 'Found IDoc Status column');
assert(findColumn(edidcHeaders, 'EDI Archive Key', 'edi archive key') >= 0, 'Found EDI Archive Key column');
assert(findColumn(edidcHeaders, 'Message Type') >= 0, 'Found Message Type column');
assert(findColumn(edidcHeaders, 'Sender partner no.') >= 0, 'Found Sender partner no. column');

// Parse all rows
const idocStatusCol = findColumn(edidcHeaders, 'IDoc Status', 'idoc status');
const statuses = [];
for (let i = 1; i < edidcRaw.length; i++) {
  statuses.push(getCellValue(edidcRaw[i], idocStatusCol));
}
assert(statuses.includes('53'), 'Contains status 53 (posted)');
assert(statuses.includes('68'), 'Contains status 68 (error)');
assert(statuses.includes('51'), 'Contains status 51 (not posted)');
assert(IDOC_STATUS_MAP['53'] === 'Application document posted', 'Status 53 maps correctly');
assert(IDOC_STATUS_MAP['68'] === 'Error, no further processing', 'Status 68 maps correctly');

// ========== TEST 2: CID Processing Status (F3) ==========
console.log('\n🔍 TEST 2: CID Processing Status (F3)');
const archiveKeyCol = findColumn(edidcHeaders, 'EDI Archive Key', 'edi archive key');
const idocNumCol = findColumn(edidcHeaders, 'IDoc number', 'idoc number');

// Search for CID-001 — should return 2 records
const cid001Matches = [];
for (let i = 1; i < edidcRaw.length; i++) {
  if (getCellValue(edidcRaw[i], archiveKeyCol) === 'CID-001') {
    cid001Matches.push({
      idocNumber: getCellValue(edidcRaw[i], idocNumCol),
      status: getCellValue(edidcRaw[i], idocStatusCol),
    });
  }
}
assert(cid001Matches.length === 2, 'CID-001: Found 2 records (duplicate handling)', `Got ${cid001Matches.length}`);
assert(cid001Matches[0].status === '53', 'CID-001 first record: status 53');
assert(cid001Matches[1].status === '68', 'CID-001 second record: status 68');
assert(cid001Matches[0].idocNumber === '100001', 'CID-001 first IDoc: 100001');
assert(cid001Matches[1].idocNumber === '100002', 'CID-001 second IDoc: 100002');

// Search for CID-999 — should return 0
const cid999 = [];
for (let i = 1; i < edidcRaw.length; i++) {
  if (getCellValue(edidcRaw[i], archiveKeyCol) === 'CID-999') cid999.push(i);
}
assert(cid999.length === 0, 'CID-999: No records found (correct)');

// ========== TEST 3: RSN Status (F4) ==========
console.log('\n📦 TEST 3: RSN Status (F4)');
const rsnRaw = readFile(path.join(__dirname, 'test-data', 'rsn-test.xlsx'));
const rsnHeaders = rsnRaw[0].map(String);
const rsnCol = findColumn(rsnHeaders, 'RSN', 'rsn');
assert(rsnCol >= 0, 'Found RSN column');

const rsnSet = new Set();
for (let i = 1; i < rsnRaw.length; i++) {
  rsnSet.add(getCellValue(rsnRaw[i], rsnCol).toLowerCase());
}

const testRsns = ['RSN-1001', 'RSN-1002', 'RSN-1003', 'RSN-9999', 'RSN-8888'];
const rsnResults = testRsns.map(rsn => ({
  rsn,
  found: rsnSet.has(rsn.toLowerCase()),
  status: rsnSet.has(rsn.toLowerCase()) ? 'RSN successfully processed in SAP ECC' : 'RSN not available in SAP ECC',
}));

assert(rsnResults[0].found === true, 'RSN-1001: Found in SAP ECC');
assert(rsnResults[1].found === true, 'RSN-1002: Found in SAP ECC');
assert(rsnResults[2].found === true, 'RSN-1003: Found in SAP ECC');
assert(rsnResults[3].found === false, 'RSN-9999: Not available (correct)');
assert(rsnResults[4].found === false, 'RSN-8888: Not available (correct)');
assert(rsnResults.filter(r => r.found).length === 3, 'Batch: 3 of 5 found');

// ========== TEST 4: BOR/GR Mismatch (F5) ==========
console.log('\n⚠️  TEST 4: BOR/GR Mismatch (F5)');
const ekesRaw = readFile(path.join(__dirname, 'test-data', 'ekes-test.xlsx'));
const msegRaw = readFile(path.join(__dirname, 'test-data', 'mseg-test.xlsx'));
const ekesHeaders = ekesRaw[0].map(String);
const msegHeaders = msegRaw[0].map(String);

const purchDocCol = findColumn(ekesHeaders, 'Purchasing document');
const refCol = findColumn(ekesHeaders, 'Reference');
const poCol = findColumn(msegHeaders, 'Purchase order');
const shortTextCol = findColumn(msegHeaders, 'Short text');

assert(purchDocCol >= 0, 'EKES: Found Purchasing document column');
assert(refCol >= 0, 'EKES: Found Reference column');
assert(poCol >= 0, 'MSEG: Found Purchase order column');
assert(shortTextCol >= 0, 'MSEG: Found Short text column');

// Test: BO-5000 + PID100
const PID_PREFIXES = ['P_', 'W_', 'F_'];
function checkMismatch(bo, pid) {
  const results = [];
  const ekesMatches = [];
  for (let i = 1; i < ekesRaw.length; i++) {
    if (getCellValue(ekesRaw[i], purchDocCol).toLowerCase() === bo.toLowerCase()) {
      ekesMatches.push(ekesRaw[i]);
    }
  }

  for (const prefix of PID_PREFIXES) {
    const prefixedPid = prefix + pid;
    for (const row of ekesMatches) {
      if (getCellValue(row, refCol).toLowerCase() === prefixedPid.toLowerCase()) {
        const borPid = getCellValue(row, refCol);
        // Check MSEG for GR
        let grPid = '';
        for (let j = 1; j < msegRaw.length; j++) {
          if (getCellValue(msegRaw[j], poCol).toLowerCase() === bo.toLowerCase() &&
              getCellValue(msegRaw[j], shortTextCol).toLowerCase() === prefixedPid.toLowerCase()) {
            grPid = getCellValue(msegRaw[j], shortTextCol);
            break;
          }
        }
        let mismatch = '';
        if (borPid.toUpperCase().startsWith('F_') && !grPid) {
          mismatch = 'BOR FG and GR Mismatch';
        }
        results.push({ bo, borPid, grPid: grPid || '—', mismatch: mismatch || '—' });
      }
    }
  }
  return results;
}

// BO-5000 + PID100: F_PID100 has no GR match, P_PID100 has GR match
const test1 = checkMismatch('BO-5000', 'PID100');
assert(test1.length === 2, 'BO-5000/PID100: Found 2 BOR entries (F_ and P_)', `Got ${test1.length}`);
const fEntry = test1.find(r => r.borPid === 'F_PID100');
const pEntry = test1.find(r => r.borPid === 'P_PID100');
assert(fEntry && fEntry.mismatch === 'BOR FG and GR Mismatch', 'F_PID100: Mismatch detected (no GR)');
assert(pEntry && pEntry.mismatch === '—', 'P_PID100: No mismatch (GR exists)');

// BO-5000 + PID200: W_PID200 has GR match
const test2 = checkMismatch('BO-5000', 'PID200');
assert(test2.length === 1, 'BO-5000/PID200: Found 1 BOR entry (W_)');
assert(test2[0].mismatch === '—', 'W_PID200: No mismatch (GR exists)');

// BO-6000 + PID300: F_PID300 has no GR match (MSEG has F_PID400, not F_PID300)
const test3 = checkMismatch('BO-6000', 'PID300');
assert(test3.length === 1, 'BO-6000/PID300: Found 1 BOR entry (F_)');
assert(test3[0].mismatch === 'BOR FG and GR Mismatch', 'F_PID300: Mismatch detected (GR is for different PID)');

// BO-9999 — nonexistent
const test4 = checkMismatch('BO-9999', 'PID100');
assert(test4.length === 0, 'BO-9999: No records found (correct)');

// ========== TEST 5: Column validation errors ==========
console.log('\n🚫 TEST 5: Column Validation (Bad Files)');
// Create a bad EDIDC file missing required columns
const badData = [['Foo', 'Bar', 'Baz'], ['1', '2', '3']];
const badHeaders = badData[0].map(String);
assert(findColumn(badHeaders, 'IDoc number', 'idoc number') === -1, 'Bad file: IDoc number column NOT found (correct)');
assert(findColumn(badHeaders, 'EDI Archive Key') === -1, 'Bad file: EDI Archive Key NOT found (correct)');

// ========== TEST 6: Read strategies ==========
console.log('\n📂 TEST 6: File Read Strategies');
// Test reading each file with different strategies
for (const file of ['edidc-test.xlsx', 'rsn-test.xlsx', 'ekes-test.xlsx', 'mseg-test.xlsx']) {
  const buf = fs.readFileSync(path.join(__dirname, 'test-data', file));
  try {
    const wb = XLSX.read(buf, { type: 'buffer' });
    assert(wb.SheetNames.length > 0, `${file}: Read OK (${wb.SheetNames.length} sheet(s))`);
  } catch (e) {
    assert(false, `${file}: Read failed`, e.message);
  }
}

// ========== SUMMARY ==========
console.log(`\n${'='.repeat(50)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) process.exit(1);
