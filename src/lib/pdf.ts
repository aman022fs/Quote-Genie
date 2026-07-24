import { jsPDF } from "jspdf";
import { formatCurrency, type LineItem, type Totals } from "./calc";

export interface PdfData {
  business: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    tax_info?: string | null;
  };
  client: {
    name: string;
    company?: string | null;
    email?: string | null;
    address?: string | null;
  };
  quotation: {
    number: string;
    title?: string | null;
    issue_date: string;
    expiry_date?: string | null;
    currency: string;
    notes?: string | null;
  };
  items: LineItem[];
  totals: Totals;
  terms?: string;
}

export function generateQuotationPdf(data: PdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header band
  doc.setFillColor(6, 78, 59); // emerald
  doc.rect(0, 0, pageWidth, 8, "F");

  y += 8;
  // Business name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(data.business.name, margin, y);

  // QUOTATION label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("QUOTATION", pageWidth - margin, y - 4, { align: "right" });
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(data.quotation.number, pageWidth - margin, y + 14, { align: "right" });

  y += 32;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const bizLines = [
    data.business.address,
    [data.business.email, data.business.phone].filter(Boolean).join(" · "),
    data.business.website,
    data.business.tax_info,
  ].filter(Boolean) as string[];
  bizLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 12;
  });

  y += 12;
  // Bill to + dates
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text("BILL TO", margin, y);
  doc.text("ISSUED", pageWidth - margin - 160, y);
  doc.text("EXPIRES", pageWidth - margin, y, { align: "right" });

  y += 14;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(data.client.company || data.client.name, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.quotation.issue_date, pageWidth - margin - 160, y);
  doc.text(data.quotation.expiry_date || "—", pageWidth - margin, y, { align: "right" });

  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  if (data.client.company && data.client.name !== data.client.company) {
    doc.text(`Attn: ${data.client.name}`, margin, y);
    y += 12;
  }
  if (data.client.email) {
    doc.text(data.client.email, margin, y);
    y += 12;
  }
  if (data.client.address) {
    doc.splitTextToSize(data.client.address, 240).forEach((l: string) => {
      doc.text(l, margin, y);
      y += 12;
    });
  }

  y += 12;
  if (data.quotation.title) {
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(data.quotation.title, margin, y);
    y += 20;
  }

  // Items table
  const col = {
    desc: margin,
    qty: margin + contentWidth * 0.55,
    rate: margin + contentWidth * 0.72,
    amount: margin + contentWidth,
  };

  doc.setFillColor(245, 245, 244);
  doc.rect(margin, y, contentWidth, 22, "F");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", col.desc + 8, y + 14);
  doc.text("QTY", col.qty, y + 14);
  doc.text("RATE", col.rate, y + 14);
  doc.text("AMOUNT", col.amount, y + 14, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  for (const item of data.items) {
    if (y > 720) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(10);
    doc.text(item.name, col.desc + 8, y + 14);
    const qty = `${item.quantity}${item.days && item.days > 1 ? ` × ${item.days} day(s)` : ""}`;
    doc.text(qty, col.qty, y + 14);
    doc.text(formatCurrency(item.rate, data.quotation.currency), col.rate, y + 14);
    const total = item.quantity * (item.days || 1) * item.rate * (1 - (item.discount || 0) / 100);
    doc.text(formatCurrency(total, data.quotation.currency), col.amount, y + 14, {
      align: "right",
    });
    y += 18;
    if (item.description) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(item.description, contentWidth * 0.5);
      lines.forEach((l: string) => {
        doc.text(l, col.desc + 8, y + 10);
        y += 11;
      });
      doc.setTextColor(30, 30, 30);
      y += 4;
    }
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y, pageWidth - margin, y);
  }

  y += 20;
  // Totals
  const totalsX = pageWidth - margin - 220;
  const totalsW = 220;
  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.setTextColor(bold ? 20 : 90, bold ? 20 : 90, bold ? 20 : 90);
    doc.text(label, totalsX, y);
    doc.text(val, totalsX + totalsW, y, { align: "right" });
    y += bold ? 20 : 16;
  };
  row("Subtotal", formatCurrency(data.totals.subtotal, data.quotation.currency));
  if (data.totals.discountAmount > 0)
    row("Discount", `− ${formatCurrency(data.totals.discountAmount, data.quotation.currency)}`);
  row("Tax", formatCurrency(data.totals.taxAmount, data.quotation.currency));
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, y - 6, totalsX + totalsW, y - 6);
  y += 4;
  row("Total", formatCurrency(data.totals.total, data.quotation.currency), true);

  if (data.quotation.notes) {
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("NOTES", margin, y);
    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.splitTextToSize(data.quotation.notes, contentWidth).forEach((l: string) => {
      doc.text(l, margin, y);
      y += 12;
    });
  }

  // Footer
  const foot = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, foot, pageWidth - margin, foot);
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Generated by ${data.business.name} · Quotient`, margin, foot + 14);

  return doc;
}
