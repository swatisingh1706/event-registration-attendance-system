import ExcelJS from "exceljs";
import { csvResponse, toCsv } from "@/lib/csv";

export type ExportFormat = "csv" | "xlsx";

export function exportFormat(value: string | null): ExportFormat {
  return value === "xlsx" ? "xlsx" : "csv";
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** One table, delivered as .csv or a formatted .xlsx workbook (bold frozen header, filters, sized columns). */
export async function tabularResponse(format: ExportFormat, baseName: string, sheetName: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") return csvResponse(`${baseName}-${stamp}.csv`, toCsv(headers, rows));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Event platform";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r.map((v) => (v === undefined ? null : v)));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5D45" } };
  header.alignment = { vertical: "middle" };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  ws.columns.forEach((col, i) => {
    let max = headers[i].length;
    for (const r of rows) max = Math.max(max, String(r[i] ?? "").length);
    col.width = Math.min(48, Math.max(10, max + 2));
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${baseName}-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
