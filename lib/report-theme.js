/**
 * report-theme.js  —  Slabstack CS report theme
 * --------------------------------------------------------------------------
 * Shared formatting layer for every report in the cs-repo. Reports import
 * this module and assemble content from its components instead of hand-rolling
 * docx-js objects. This keeps branding identical across all reports and means
 * a style change is made once, here.
 *
 *   const T = require("../lib/report-theme");
 *   const doc = T.buildDocument({ headerRight: "Q2 Go-Live Plan", children: [
 *     T.titleBanner({ eyebrow: "...", title: "...", subtitle: [...] }),
 *     ...T.sectionHead("Executive Summary"),
 *     T.para("..."),
 *   ]});
 *   T.render(doc, "out/My_Report.docx");
 *
 * Requires:  npm install docx
 * --------------------------------------------------------------------------
 */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, TabStopType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak,
} = require("docx");

// ============================================================
// BRAND TOKENS  — the single source of truth for colour & layout
// ============================================================
const COLORS = {
  navy: "1B2A4A", navySoft: "2C3E63",
  teal: "007B7F", tealDk: "00696D", tealBg: "E4F1F1",
  grayLt: "F1F3F6", grayMd: "E7EAEF", grayBd: "D5DAE2", grayTx: "59626F",
  ink: "1F2733", white: "FFFFFF",
  green: "2E7D32", greenBg: "E9F2E9",
  amber: "9C6B14", amberBg: "FAF0DA",
  red: "B23A2E",
  codeBg: "152038", codeText: "E7EBF0", codeComment: "8FB3B5",
};

const PAGE = {
  width: 12240, height: 15840,                 // US Letter, DXA
  margin: { top: 1100, right: 1440, bottom: 1180, left: 1440 },
  contentWidth: 9360,                            // width - L - R margins
};
const CW = PAGE.contentWidth;

// Semantic styling for callout() — info / warn / success / neutral
const CALLOUT_KINDS = {
  info:    { accent: COLORS.teal,  bg: COLORS.tealBg,  tagColor: COLORS.tealDk },
  warn:    { accent: COLORS.amber, bg: COLORS.amberBg, tagColor: COLORS.amber },
  success: { accent: COLORS.green, bg: COLORS.greenBg, tagColor: COLORS.green },
  neutral: { accent: COLORS.navy,  bg: COLORS.grayLt,  tagColor: COLORS.navySoft },
};

// Trend-cell presets for dataTable() — pass via cell() as a styled cell
const TREND = {
  up:      { fill: COLORS.greenBg, color: COLORS.green,  bold: true },
  down:    { fill: COLORS.amberBg, color: COLORS.amber,  bold: true },
  flat:    { fill: COLORS.grayMd,  color: COLORS.grayTx, bold: true },
};

// ============================================================
// LOW-LEVEL HELPERS
// ============================================================
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB,
                    insideHorizontal: NB, insideVertical: NB };
const _b = { style: BorderStyle.SINGLE, size: 2, color: COLORS.grayBd };
const cellBorders = { top: _b, bottom: _b, left: _b, right: _b };

/** A styled text run. opts: size(half-pt*2 i.e. 21≈10.5pt), bold, italics,
 *  color, caps, spacing(letter-spacing). */
function run(text, opts = {}) {
  return new TextRun({
    text, font: "Arial",
    size: opts.size || 21,
    bold: !!opts.bold, italics: !!opts.italics,
    color: opts.color || COLORS.ink,
    allCaps: !!opts.caps,
    characterSpacing: opts.spacing || 0,
  });
}

/** A body paragraph. Pass a string or an array of runs. */
function para(text, opts = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : [run(text, opts)],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0,
               after: opts.after != null ? opts.after : 140,
               line: opts.line || 288 },
    indent: opts.indent || undefined,
  });
}

/** Vertical spacer of exact height h (DXA). */
function gap(h = 120) {
  return new Paragraph({ spacing: { before: 0, after: 0, line: h, lineRule: "exact" }, children: [] });
}

/** A hard page break (must live in a paragraph). */
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Build a styled table cell object for dataTable rows.
 *  cell("text", { fill, color, bold }) — or pass TREND.up etc. as the 2nd arg. */
function cell(text, style = {}) {
  return { text, ...style };
}

// ============================================================
// COMPONENTS
// ============================================================

/** Navy title banner. subtitle = array of {text,color,bold} run specs. */
function titleBanner({ eyebrow, title, subtitle }) {
  const kids = [];
  if (eyebrow) kids.push(new Paragraph({ spacing: { before: 0, after: 90 },
    children: [run(eyebrow, { size: 19, bold: true, color: "8FB8BA", spacing: 30 })] }));
  kids.push(new Paragraph({ spacing: { before: 0, after: subtitle ? 40 : 0 },
    children: [run(title, { size: 52, bold: true, color: COLORS.white })] }));
  if (subtitle) kids.push(new Paragraph({ spacing: { before: 0, after: 0 },
    children: subtitle.map((s) => run(s.text, { size: 23, color: s.color || "C7D0DD", bold: !!s.bold })) }));
  return _fullCell(kids, COLORS.navy, { top: 360, bottom: 360, left: 420, right: 420 });
}

/** Teal metadata strip — left text, optional right text. */
function metaStrip(leftText, rightText) {
  const kids = [run(leftText, { size: 17, color: COLORS.white, bold: true })];
  const tabs = [];
  if (rightText) {
    kids.push(new TextRun({ text: "\t" + rightText, font: "Arial", size: 17,
      color: COLORS.white, bold: true, characterSpacing: 14 }));
    tabs.push({ type: TabStopType.RIGHT, position: CW - 840 });
  }
  return _fullCell([new Paragraph({ spacing: { before: 0, after: 0 }, tabStops: tabs, children: kids })],
    COLORS.teal, { top: 90, bottom: 90, left: 420, right: 420 });
}

/** Standard report cover: navy title banner + teal meta strip + KPI grid
 *  with matching spacing. Returns an array — spread it into `children`:
 *
 *      children.push(...T.coverBlock({
 *        eyebrow:    "CUSTOMER SUCCESS INTELLIGENCE",
 *        title:      `Daily Snapshot — ${d.period}`,
 *        dateRange:  d.dateRange,
 *        generated:  d.generated,
 *        preparedBy: d.preparedBy,
 *        kpis:       d.kpis,
 *      }));
 *
 *  `classification` defaults to "CONFIDENTIAL"; pass "CUSTOMER SHARED"
 *  for outbound reports and "INTERNAL" for executive briefings.
 */
function coverBlock({ eyebrow, title, dateRange, generated, preparedBy, kpis, classification = "CONFIDENTIAL" }) {
  return [
    titleBanner({
      eyebrow,
      title,
      // Defensive: empty/undefined dateRange renders no whitespace, matching
      // the per-report guard the customer-health / executive-summary /
      // renewal-health reports used inline before the helper landed.
      subtitle: [
        { text: dateRange ? dateRange + "  " : "", color: "C7D0DD" },
        { text: "· " + generated,                   color: "8FB8BA", bold: true },
      ],
    }),
    metaStrip(`Prepared ${generated} · ${preparedBy}`, classification),
    gap(320),
    kpiStrip(kpis),
    gap(100),
  ];
}

/** Navy section header bar with teal accent rail. Returns an array
 *  (spacer + bar + spacer) — spread it: ...sectionHead("Title"). */
function sectionHead(label) {
  const bar = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [70, CW - 70], borders: noBorders,
    rows: [new TableRow({ children: [
      _plainCell(70, COLORS.teal),
      new TableCell({
        width: { size: CW - 70, type: WidthType.DXA },
        shading: { fill: COLORS.navy, type: ShadingType.CLEAR },
        margins: { top: 150, bottom: 150, left: 220, right: 220 },
        borders: noBorders, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ spacing: { before: 0, after: 0 },
          children: [run(label, { size: 24, bold: true, color: COLORS.white, caps: true, spacing: 14 })] })],
      }),
    ] })],
  });
  return [gap(260), bar, gap(160)];
}

/** Smaller sub-heading inside a section (teal underline). */
function subHead(text) {
  return new Paragraph({
    spacing: { before: 280, after: 150 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.teal, space: 5 } },
    children: [run(text, { size: 21, bold: true, color: COLORS.navy, caps: true, spacing: 12 })],
  });
}

/** Centred grey caption (use above charts/images). */
function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 70 },
    children: [run(text, { size: 16, bold: true, color: COLORS.grayTx, caps: true, spacing: 12 })] });
}

/** Compute kpiStrip column widths. Exported for testability — guarantees the
 *  returned array always sums to exactly CW so docx-js doesn't reflow. */
function kpiWidths(n, gw = 130, totalW = CW) {
  const baseCardW = Math.floor((totalW - gw * (n - 1)) / n);
  const remainder = totalW - gw * (n - 1) - baseCardW * n;
  const widths = [];
  for (let i = 0; i < n; i++) {
    widths.push(i === n - 1 ? baseCardW + remainder : baseCardW);
    if (i < n - 1) widths.push(gw);
  }
  return widths;
}

/** KPI card strip. cards = [{ value, label, delta, fill?, valueColor?, deltaColor? }]. */
function kpiStrip(cards) {
  const gw = 130, n = cards.length;
  const widths = kpiWidths(n, gw, CW);
  const cells = [];
  cards.forEach((c, i) => {
    const cardW = widths[i * 2];
    widths.push(cardW);
    cells.push(new TableCell({
      width: { size: cardW, type: WidthType.DXA },
      shading: { fill: c.fill || COLORS.tealBg, type: ShadingType.CLEAR },
      margins: { top: 200, bottom: 200, left: 160, right: 160 },
      borders: noBorders,
      children: [
        new Paragraph({ spacing: { before: 0, after: 30 },
          children: [run(c.value, { size: 40, bold: true, color: c.valueColor || COLORS.navy })] }),
        new Paragraph({ spacing: { before: 0, after: 36 },
          children: [run(c.label, { size: 16, bold: true, color: COLORS.grayTx, caps: true, spacing: 8 })] }),
        new Paragraph({ spacing: { before: 0, after: 0 },
          children: [run(c.delta != null ? String(c.delta) : "", { size: 17, bold: true, color: c.deltaColor || COLORS.teal })] }),
      ],
    }));
    if (i < n - 1) cells.push(_plainCell(gw, null));
  });
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    borders: noBorders, rows: [new TableRow({ children: cells })] });
}

/** Branded data table.
 *  columnWidths: number[] summing to 9360
 *  header: string[]
 *  rows: (string | {text,fill?,color?,bold?})[][]
 *  align: AlignmentType[] (optional, per column) */
function dataTable({ columnWidths, header, rows, align }) {
  const headRow = new TableRow({ tableHeader: true,
    children: header.map((h, i) => new TableCell({
      width: { size: columnWidths[i], type: WidthType.DXA },
      shading: { fill: COLORS.navy, type: ShadingType.CLEAR },
      margins: { top: 110, bottom: 110, left: 130, right: 130 },
      borders: { top: _navyB(), bottom: _navyB(), left: _navyB(), right: _navyB() },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: (align && align[i]) || AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [run(h, { size: 17, bold: true, color: COLORS.white, caps: true, spacing: 6 })] })],
    })),
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, ci) => {
      const obj = c && typeof c === "object" && !Array.isArray(c);
      const text = obj ? c.text : c;
      const fill = (obj && c.fill) || (ri % 2 === 1 ? COLORS.grayLt : COLORS.white);
      return new TableCell({
        width: { size: columnWidths[ci], type: WidthType.DXA },
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 92, bottom: 92, left: 130, right: 130 },
        borders: cellBorders, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: (align && align[ci]) || AlignmentType.LEFT,
          spacing: { before: 0, after: 0 },
          children: [run(text, { size: 19, bold: obj ? !!c.bold : false, color: (obj && c.color) || COLORS.ink })] })],
      });
    }),
  }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths,
    borders: cellBorders, rows: [headRow, ...bodyRows] });
}

/** Callout box with a coloured accent rail.
 *  kind: "info" | "warn" | "success" | "neutral"
 *  body: string OR array of runs. */
function callout({ tag, kind = "info", body }) {
  const k = CALLOUT_KINDS[kind] || CALLOUT_KINDS.info;
  const bodyRuns = Array.isArray(body) ? body : [run(body)];
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [60, CW - 60], borders: noBorders,
    rows: [new TableRow({ children: [
      _plainCell(60, k.accent),
      new TableCell({
        width: { size: CW - 60, type: WidthType.DXA },
        shading: { fill: k.bg, type: ShadingType.CLEAR },
        margins: { top: 170, bottom: 170, left: 240, right: 240 }, borders: noBorders,
        children: [
          new Paragraph({ spacing: { before: 0, after: 60 },
            children: [run(tag, { size: 16, bold: true, color: k.tagColor, caps: true, spacing: 10 })] }),
          new Paragraph({ spacing: { before: 0, after: 0, line: 288 }, children: bodyRuns }),
        ],
      }),
    ] })],
  });
}

/** Numbered recommendation block: navy number chip + grey body panel. */
function recBlock({ num, title, tag, tagColor, body }) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [620, CW - 620], borders: noBorders,
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: 620, type: WidthType.DXA },
        shading: { fill: COLORS.navy, type: ShadingType.CLEAR },
        margins: { top: 150, bottom: 150, left: 0, right: 0 },
        borders: noBorders, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
          children: [run(String(num), { size: 34, bold: true, color: COLORS.white })] })],
      }),
      new TableCell({
        width: { size: CW - 620, type: WidthType.DXA },
        shading: { fill: COLORS.grayLt, type: ShadingType.CLEAR },
        margins: { top: 150, bottom: 160, left: 240, right: 220 }, borders: noBorders,
        children: [
          new Paragraph({ spacing: { before: 0, after: 70 }, children: [
            run(title, { size: 21, bold: true, color: COLORS.navy }),
            run(tag ? "   " + tag : "", { size: 15, bold: true, color: tagColor || COLORS.tealDk, caps: true, spacing: 8 }),
          ] }),
          new Paragraph({ spacing: { before: 0, after: 0, line: 280 },
            children: [run(body, { size: 19, color: COLORS.ink })] }),
        ],
      }),
    ] })],
  });
}

/** Dark monospace code block. lines = string[]; lines starting with # are
 *  rendered as muted comments. */
function codeBlock(lines) {
  const rows = lines.map((line) => new Paragraph({
    spacing: { before: 0, after: 0, line: 252, lineRule: "exact" },
    children: [new TextRun({
      text: line === "" ? " " : line, font: "Courier New", size: 17,
      color: line.trimStart().startsWith("#") ? COLORS.codeComment : COLORS.codeText,
    })],
  }));
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [70, CW - 70], borders: noBorders,
    rows: [new TableRow({ children: [
      _plainCell(70, COLORS.teal),
      new TableCell({
        width: { size: CW - 70, type: WidthType.DXA },
        shading: { fill: COLORS.codeBg, type: ShadingType.CLEAR },
        margins: { top: 240, bottom: 240, left: 300, right: 260 }, borders: noBorders,
        children: rows,
      }),
    ] })],
  });
}

/** Inline chart/image from a PNG on disk. w/h in px. */
function chartImage(path, w, h) {
  let data;
  try {
    data = fs.readFileSync(path);
  } catch (err) {
    throw new Error(`chartImage: could not read "${path}" — ${err.message}`);
  }
  return new ImageRun({
    type: "png", data,
    transformation: { width: w, height: h },
    altText: { title: "Chart", description: "Report chart", name: "chart" },
  });
}

/** Centre a single image in its own paragraph. */
function centeredImage(path, w, h, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER,
    spacing: { before: opts.before || 0, after: opts.after != null ? opts.after : 160 },
    children: [chartImage(path, w, h)] });
}

// ============================================================
// DOCUMENT WRAPPER
// ============================================================
/** Wrap assembled `children` in a fully-configured US-Letter Document with
 *  the standard running header and footer. */
function buildDocument({ children, headerLeft, headerRight, footerLeft }) {
  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 21, color: COLORS.ink } } } },
    sections: [{
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: PAGE.margin } },
      headers: { default: new Header({ children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.grayBd, space: 6 } },
        children: [
          run(headerLeft || "SLABSTACK  ·  CUSTOMER SUCCESS INTELLIGENCE",
            { size: 15, bold: true, color: COLORS.navy, caps: true, spacing: 10 }),
          new TextRun({ text: "\t" + (headerRight || ""), font: "Arial", size: 15, color: COLORS.grayTx }),
        ],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.grayBd, space: 6 } },
        children: [
          run(footerLeft || "Confidential — Internal Use Only", { size: 15, color: COLORS.grayTx }),
          new TextRun({ text: "\tPage ", font: "Arial", size: 15, color: COLORS.grayTx }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 15, color: COLORS.grayTx, bold: true }),
          new TextRun({ text: " of ", font: "Arial", size: 15, color: COLORS.grayTx }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 15, color: COLORS.grayTx, bold: true }),
        ],
      })] }) },
      children,
    }],
  });
}

/** Pack a Document to a .docx file on disk. Returns a Promise. */
function render(doc, outPath) {
  return Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(outPath, buf); return outPath; });
}

/** Render → log → Desktop copy → CSV sidecar. The single tail call every
 *  report should make so the publishing pipeline stays uniform.
 *  Catches render errors and exits 1 so callers don't need a .catch().
 *
 *  opts = {
 *    category: "Intercom" | "Onboarding" | "Renewals" | ...   // folder + prefix
 *    label:    "Daily" | "Weekly" | ...                       // suffix for Desktop copy
 *    csvSections?: [{ title?, headers?, rows }]               // omit to skip CSV
 *  } */
function publishReport(doc, outFile, opts) {
  const { copyToDesktop } = require("./copy-to-desktop");
  const { writeCsv } = require("./csv-export");
  return render(doc, outFile)
    .then(() => {
      console.log(`✓ ${outFile}`);
      if (opts && opts.category && opts.label) {
        copyToDesktop(outFile, opts.category, opts.label);
      }
      if (opts && opts.csvSections) {
        writeCsv(outFile.replace(/\.docx$/, ".csv"), opts.csvSections);
      }
    })
    .catch((err) => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
}

// ---------- internal cell builders ----------
function _navyB() { return { style: BorderStyle.SINGLE, size: 2, color: COLORS.navy }; }
function _plainCell(w, fill) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    borders: noBorders, children: [new Paragraph({ children: [] })],
  });
}
function _fullCell(children, fill, margins) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], borders: noBorders,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR }, margins, borders: noBorders, children,
    })] })],
  });
}

module.exports = {
  COLORS, PAGE, TREND, AlignmentType,
  run, para, gap, pageBreak, cell,
  titleBanner, metaStrip, coverBlock, sectionHead, subHead, caption,
  kpiStrip, kpiWidths, dataTable, callout, recBlock, codeBlock,
  chartImage, centeredImage,
  buildDocument, render, publishReport,
};
