import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches
pptx.author = "Supply Chain Operations";
pptx.title = "BO Self Serve Dashboard — Feature Walkthrough";

// ── Colors ──
const TEAL = "0f6b5e";
const NAVY = "1b3a4b";
const LIGHT_TEAL = "4dd9c0";
const BG_LIGHT = "f0f4f5";
const WHITE = "FFFFFF";
const DARK_BG = "0a0a0a";

// ── Helpers ──
function imgData(filename) {
  const p = path.join("Screenshot", filename);
  if (!fs.existsSync(p)) {
    console.warn(`⚠ Missing: ${p}`);
    return null;
  }
  const buf = fs.readFileSync(p);
  return `image/png;base64,${buf.toString("base64")}`;
}

function addGradientBg(slide, c1, c2) {
  slide.background = { fill: c1 };
}

// ══════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addGradientBg(s, NAVY);
  s.addText("SUPPLY CHAIN OPERATIONS", {
    x: 0, y: 1.2, w: "100%", fontSize: 13, fontFace: "Segoe UI",
    color: WHITE, align: "center", letterSpacing: 4, bold: true, transparency: 40,
  });
  s.addText("BO Self Serve Dashboard", {
    x: 0, y: 2.0, w: "100%", fontSize: 44, fontFace: "Segoe UI",
    color: WHITE, align: "center", bold: true,
  });
  s.addText("A complete walkthrough of every feature — how it works,\nwhat it shows, and the value it delivers to supply chain teams.", {
    x: 2, y: 3.3, w: 9.33, fontSize: 18, fontFace: "Segoe UI",
    color: WHITE, align: "center", transparency: 20, lineSpacingMultiple: 1.4,
  });
  s.addText("Status & Anomaly Detection  ·  5 Core Features  ·  Zero SAP Access Required", {
    x: 0, y: 5.5, w: "100%", fontSize: 12, fontFace: "Segoe UI",
    color: WHITE, align: "center", transparency: 50,
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 2 — Dashboard Home
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: WHITE };
  s.addText("HOME SCREEN", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("🏠  Dashboard Landing Page", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "A clean, card-based home screen that gives users one-click access to every capability.\n\n" +
    "✓  5 feature cards with clear descriptions\n" +
    "✓  Upload badge shows file readiness\n" +
    "✓  Intuitive icons for instant recognition\n" +
    "✓  Supply chain branded color theme\n" +
    "✓  Works on desktop and tablet",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  const img = imgData("Dashboard home.png");
  if (img) s.addImage({ data: img, x: 5.4, y: 0.5, w: 7.5, h: 6.2, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 3 — SAP Input Data (File Upload)
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: BG_LIGHT };
  s.addText("FEATURE 1", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("📁  SAP Input Data", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "Upload 4 SAP Excel exports — EDIDC, MSEG, EKES, and RSN — individually or all at once.\n\n" +
    "✓  Bulk upload with auto file-type detection\n" +
    "✓  Row counts shown per file (e.g. 7,368 rows)\n" +
    "✓  Background parsing via Web Worker\n" +
    "✓  DRM-protected file detection with guidance\n" +
    "✓  Replace or remove files at any time\n" +
    "✓  Data persists across page refreshes (IndexedDB)",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  const img = imgData("File upload.png");
  if (img) s.addImage({ data: img, x: 5.4, y: 0.4, w: 7.5, h: 6.4, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 4 — BOR and GR Message Status
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: WHITE };
  s.addText("FEATURE 2", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("📋  BOR & GR Message Status", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "Displays all IDoc records from EDIDC with full status descriptions, sortable columns, and a real-time text filter.\n\n" +
    "✓  Full table of 1,000+ IDoc records at a glance\n" +
    "✓  Click any column header to sort\n" +
    "✓  Filter by Message Type, IDoc Number, or Status\n" +
    "✓  Human-readable status descriptions\n" +
    "✓  EDI Archive Key visible for CID cross-reference",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  const img = imgData("BOR-GR-Status.png");
  if (img) s.addImage({ data: img, x: 5.4, y: 0.3, w: 7.5, h: 6.8, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 5 — CID Processing Status
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: BG_LIGHT };
  s.addText("FEATURE 3", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("🔎  CID Processing Status", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "Look up any Correlation ID (EDI Archive Key) to instantly find its IDoc number, processing status, and creation date.\n\n" +
    "✓  Paste a CID and hit Search — results in ms\n" +
    "✓  Sample CIDs from uploaded data as clickable buttons\n" +
    "✓  Shows all matching records for the same CID\n" +
    "✓  Color-coded result rows for quick scanning",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  // Two screenshots stacked
  s.addText("INPUT — Sample CIDs from uploaded data", {
    x: 5.4, y: 0.3, w: 7, fontSize: 10, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 1.5,
  });
  const img1 = imgData("CID input 2.png");
  if (img1) s.addImage({ data: img1, x: 5.4, y: 0.6, w: 7.5, h: 2.8, rounding: true });

  s.addText("OUTPUT — Search result", {
    x: 5.4, y: 3.65, w: 7, fontSize: 10, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 1.5,
  });
  const img2 = imgData("CID output.png");
  if (img2) s.addImage({ data: img2, x: 5.4, y: 3.95, w: 7.5, h: 2.8, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 6 — RSN Status
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: WHITE };
  s.addText("FEATURE 4", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("✅  RSN Status Verification", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "Verify whether Return Service Notification numbers have been successfully received into SAP ECC.\n\n" +
    "✓  Enter RSNs comma-separated or one per line\n" +
    "✓  Sample RSN values shown as clickable buttons\n" +
    '✓  Clear "found in SAP ECC" confirmation badge\n' +
    "✓  Batch check multiple RSNs simultaneously",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  s.addText("INPUT — Sample RSNs from uploaded data", {
    x: 5.4, y: 0.3, w: 7, fontSize: 10, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 1.5,
  });
  const img1 = imgData("RSN input.png");
  if (img1) s.addImage({ data: img1, x: 5.4, y: 0.6, w: 7.5, h: 2.8, rounding: true });

  s.addText("OUTPUT — Verification result", {
    x: 5.4, y: 3.65, w: 7, fontSize: 10, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 1.5,
  });
  const img2 = imgData("RSN output.png");
  if (img2) s.addImage({ data: img2, x: 5.4, y: 3.95, w: 7.5, h: 2.8, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 7 — BOR / GR Mismatch Detection
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: BG_LIGHT };
  s.addText("FEATURE 5", {
    x: 0.5, y: 0.3, w: 4, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("⚠️  BOR / GR Mismatch Detection", {
    x: 0.5, y: 0.7, w: 4.5, fontSize: 26, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });
  s.addText(
    "Automatically compares every EKES (BOR) record against MSEG (Goods Receipt) data and flags mismatches.\n\n" +
    "✓  All 7,000+ records compared automatically\n" +
    '✓  Green rows = "BOR and GR are in sync"\n' +
    '✓  Red rows = "BOR FG and GR Mismatch"\n' +
    "✓  Filter buttons: All / Mismatches / In Sync\n" +
    "✓  Search by BO number or PID\n" +
    "✓  Material Document column for traceability",
    {
      x: 0.5, y: 1.6, w: 4.5, fontSize: 13, fontFace: "Segoe UI",
      color: "444444", lineSpacingMultiple: 1.5, valign: "top",
    }
  );
  const img = imgData("Mismatch all.png");
  if (img) s.addImage({ data: img, x: 5.4, y: 0.3, w: 7.5, h: 6.8, rounding: true });
}

// ══════════════════════════════════════════════════════
// SLIDE 8 — Feature Overview
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { fill: WHITE };
  s.addText("AT A GLANCE", {
    x: 0.5, y: 0.3, w: 12, fontSize: 11, fontFace: "Segoe UI",
    color: TEAL, bold: true, letterSpacing: 3,
  });
  s.addText("5 Features, One Dashboard", {
    x: 0.5, y: 0.7, w: 12, fontSize: 32, fontFace: "Segoe UI",
    color: NAVY, bold: true,
  });

  const features = [
    { icon: "📁", title: "SAP Input\nData", desc: "Bulk upload 4 Excel files with auto-detection. Web Worker parsing. IndexedDB persistence." },
    { icon: "📋", title: "BOR & GR\nMessage Status", desc: "Full IDoc table with sorting, filtering, and human-readable status descriptions." },
    { icon: "🔎", title: "CID Processing\nStatus", desc: "Instant CID lookup with sample data buttons and multi-record results." },
    { icon: "✅", title: "RSN\nStatus", desc: "Batch RSN verification against SAP ECC with clear pass/fail indicators." },
    { icon: "⚠️", title: "BOR / GR\nMismatch", desc: "Auto-compare all EKES vs MSEG. Green/red row coloring for anomaly detection." },
  ];

  features.forEach((f, i) => {
    const x = 0.5 + i * 2.5;
    // Card background
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.7, w: 2.3, h: 4.8,
      fill: { color: BG_LIGHT }, rectRadius: 0.15,
      line: { color: "d0d8da", width: 1 },
    });
    s.addText(f.icon, {
      x, y: 1.9, w: 2.3, fontSize: 36, fontFace: "Segoe UI",
      align: "center",
    });
    s.addText(f.title, {
      x: x + 0.15, y: 2.8, w: 2.0, fontSize: 15, fontFace: "Segoe UI",
      color: TEAL, bold: true, align: "center", lineSpacingMultiple: 1.2,
    });
    s.addText(f.desc, {
      x: x + 0.15, y: 3.8, w: 2.0, fontSize: 11, fontFace: "Segoe UI",
      color: "555555", align: "center", lineSpacingMultiple: 1.4,
    });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 9 — Impact & Metrics
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addGradientBg(s, NAVY);
  s.addText("IMPACT", {
    x: 0.5, y: 0.4, w: 12, fontSize: 11, fontFace: "Segoe UI",
    color: WHITE, bold: true, letterSpacing: 3, transparency: 35,
  });
  s.addText("What This Means for the Team", {
    x: 0.5, y: 0.8, w: 12, fontSize: 34, fontFace: "Segoe UI",
    color: WHITE, bold: true,
  });

  const metrics = [
    { value: "0", label: "SAP logins needed\nfor status checks" },
    { value: "90%", label: "Reduction in manual\nlookup time" },
    { value: "7K+", label: "Records compared\nautomatically" },
    { value: "1", label: "Upload to see\neverything" },
  ];

  metrics.forEach((m, i) => {
    const x = 0.6 + i * 3.15;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.2, w: 2.85, h: 3.5,
      fill: { color: "1a3344" }, rectRadius: 0.15,
      line: { color: "2a5566", width: 1 },
    });
    s.addText(m.value, {
      x, y: 2.6, w: 2.85, fontSize: 44, fontFace: "Segoe UI",
      color: LIGHT_TEAL, bold: true, align: "center",
    });
    s.addText(m.label, {
      x, y: 3.9, w: 2.85, fontSize: 14, fontFace: "Segoe UI",
      color: WHITE, align: "center", transparency: 30, lineSpacingMultiple: 1.3,
    });
  });

  s.addText("Data stays in the browser — nothing leaves the user's machine.\nFully client-side, zero infrastructure cost.", {
    x: 1.5, y: 6.0, w: 10, fontSize: 14, fontFace: "Segoe UI",
    color: WHITE, align: "center", transparency: 45, lineSpacingMultiple: 1.4,
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 10 — Closing CTA
// ══════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addGradientBg(s, TEAL);
  s.addText("SUPPLY CHAIN OPERATIONS", {
    x: 0, y: 1.5, w: "100%", fontSize: 13, fontFace: "Segoe UI",
    color: WHITE, align: "center", letterSpacing: 4, bold: true, transparency: 40,
  });
  s.addText("Ready to Try It?", {
    x: 0, y: 2.5, w: "100%", fontSize: 44, fontFace: "Segoe UI",
    color: WHITE, align: "center", bold: true,
  });
  s.addText(
    "Upload your SAP exports and start getting answers in seconds —\nno SAP access, no waiting, no dependencies on other teams.",
    {
      x: 2, y: 3.8, w: 9.33, fontSize: 18, fontFace: "Segoe UI",
      color: WHITE, align: "center", transparency: 15, lineSpacingMultiple: 1.5,
    }
  );
  s.addText("Built with React  ·  Runs in Any Browser  ·  100% Client-Side", {
    x: 0, y: 5.5, w: "100%", fontSize: 13, fontFace: "Segoe UI",
    color: WHITE, align: "center", transparency: 45,
  });
}

// ── Write file ──
const outPath = "BO-Self-Serve-Dashboard-Features.pptx";
await pptx.writeFile({ fileName: outPath });
console.log(`✅ Created: ${outPath}`);
