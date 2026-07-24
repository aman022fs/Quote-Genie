export interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  days?: number;
  rate: number;
  tax_rate?: number; // percent
  discount?: number; // percent
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  taxAmount: number;
  total: number;
}

export function lineTotal(item: LineItem): number {
  const days = item.days && item.days > 0 ? item.days : 1;
  const gross = (item.quantity || 0) * days * (item.rate || 0);
  const discount = ((item.discount || 0) / 100) * gross;
  return round(gross - discount);
}

export function calculateTotals(
  items: LineItem[],
  quotationDiscount = 0,
  quotationTaxRate = 0,
): Totals {
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discountAmount = round((quotationDiscount / 100) * subtotal);
  const taxable = round(subtotal - discountAmount);

  // Item-level taxes
  const itemTax = items.reduce((s, it) => {
    const lt = lineTotal(it);
    return s + ((it.tax_rate || 0) / 100) * lt;
  }, 0);
  const quotationTax = round((quotationTaxRate / 100) * taxable);
  const taxAmount = round(itemTax + quotationTax);
  const total = round(taxable + taxAmount);

  return { subtotal: round(subtotal), discountAmount, taxable, taxAmount, total };
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
