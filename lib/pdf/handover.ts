import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PpeRequest } from "@/lib/types";

function formatDateMY(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function filenameDatePart(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Jana PDF borang serahan PPE (§6.5). `request` mesti berstatus 'issued'.
 * `resolvedIcNumber` — No. IC/Passport terkini (fallback dari jadual employees
 * jika request.ic_number kosong, kerana borang awam pekerja tidak mendedahkan IC).
 * `otherIssuedSameYear` — semua permohonan lain berstatus 'issued' bagi pekerja
 * yang sama pada tahun yang sama (processed_at), TIDAK termasuk `request` ini,
 * diisih tarikh menaik.
 */
export function generateHandoverPdf({
  companyName,
  request,
  resolvedIcNumber,
  otherIssuedSameYear,
}: {
  companyName: string;
  request: PpeRequest;
  resolvedIcNumber: string | null;
  otherIssuedSameYear: PpeRequest[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // 1. Nama syarikat + tajuk
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(12);
  doc.text("BORANG SERAHAN PERALATAN PERLINDUNGAN DIRI (PPE)", pageWidth / 2, y, {
    align: "center",
  });
  y += 8;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // 2. Butiran pekerja
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const processedYear = request.processed_at
    ? new Date(request.processed_at).getFullYear()
    : new Date().getFullYear();

  const details: [string, string][] = [
    ["Nama Pekerja", request.employee_name],
    ["No. Rujukan", request.ref_no ?? "-"],
    ["No. Staf", request.staff_id],
    ["No. IC/Passport", request.ic_number || resolvedIcNumber || "-"],
    ["Comp Code", request.comp_code || "-"],
    ["Branch", request.branch || "-"],
    ["Jawatan (Kumpulan)", request.position || "-"],
    ["Tarikh Diproses", formatDateMY(request.processed_at)],
    ["Diproses Oleh", request.processed_by || "-"],
  ];

  const colGap = 6;
  const labelW = 42;
  const halfWidth = (pageWidth - margin * 2 - colGap) / 2;
  const rowsPerCol = Math.ceil(details.length / 2);

  details.forEach(([label, value], idx) => {
    const col = idx < rowsPerCol ? 0 : 1;
    const row = idx < rowsPerCol ? idx : idx - rowsPerCol;
    const x = margin + col * (halfWidth + colGap);
    const rowY = y + row * 6;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), x + labelW, rowY, {
      maxWidth: halfWidth - labelW,
    });
  });

  y += rowsPerCol * 6 + 6;

  // 3. Jadual item — Item, Saiz, Kuantiti sahaja
  autoTable(doc, {
    startY: y,
    head: [["Item", "Saiz", "Kuantiti"]],
    body: request.items.map((item) => [
      item.name,
      item.size ?? "-",
      String(item.qtyIssued),
    ]),
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    styles: { cellPadding: 2.5 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // 4. Catatan HR
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Catatan HR:", margin, y);
  doc.setFont("helvetica", "normal");
  const remarkText = request.remark?.trim() || "-";
  const remarkLines = doc.splitTextToSize(remarkText, pageWidth - margin * 2 - 28);
  doc.text(remarkLines, margin + 28, y);
  y += Math.max(remarkLines.length * 5, 6) + 6;

  // 5. Rekod Pengambilan PPE Tahun [tahun]
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Rekod Pengambilan PPE Tahun ${processedYear}`, margin, y);
  y += 5;

  if (otherIssuedSameYear.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    const msg = `Tiada rekod lain pekerja ini pada tahun ${processedYear} — permohonan ini ialah pengambilan tahunan.`;
    const msgLines = doc.splitTextToSize(msg, pageWidth - margin * 2);
    doc.text(msgLines, margin, y + 4);
    y += msgLines.length * 5 + 8;
  } else {
    const rows = otherIssuedSameYear.map((r) => [
      formatDateMY(r.processed_at),
      r.ref_no ?? "-",
      r.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} x${i.qtyIssued}`).join(", "),
    ]);
    autoTable(doc, {
      startY: y + 2,
      head: [["Tarikh", "No. Rujukan", "Item"]],
      body: rows,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [100, 116, 139], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      styles: { cellPadding: 2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Ayat pengesahan + tandatangan
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const confirmText =
    "Dengan ini saya mengesahkan bahawa saya telah menerima peralatan perlindungan diri (PPE) seperti yang dinyatakan di atas dalam keadaan baik.";
  const confirmLines = doc.splitTextToSize(confirmText, pageWidth - margin * 2);
  doc.text(confirmLines, margin, y);
  y += confirmLines.length * 5 + 14;

  const sigColWidth = (pageWidth - margin * 2 - 20) / 2;
  const sigLeftX = margin;
  const sigRightX = margin + sigColWidth + 20;

  doc.line(sigLeftX, y, sigLeftX + sigColWidth, y);
  doc.line(sigRightX, y, sigRightX + sigColWidth, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Tandatangan Pekerja", sigLeftX, y);
  doc.text("Tandatangan HR", sigRightX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nama: ${request.employee_name}`, sigLeftX, y);
  doc.text("Nama: ______________________", sigRightX, y);
  y += 6;
  doc.text(`Tarikh: ${formatDateMY(request.processed_at)}`, sigLeftX, y);
  doc.text(`Tarikh: ${formatDateMY(request.processed_at)}`, sigRightX, y);

  const filename = `Serahan-PPE-${request.staff_id}-${filenameDatePart(request.processed_at)}.pdf`;
  doc.save(filename);
}
