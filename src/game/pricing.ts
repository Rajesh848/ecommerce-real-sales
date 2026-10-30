import type { Product } from "./catalog";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Selling price (pre-GST) after the product's own discount. */
export const sellingPrice = (p: Pick<Product, "mrp" | "discountPct">) =>
  round2(p.mrp * (1 - p.discountPct / 100));

export interface Coupon {
  code: string;
  label: string;
  pct: number;
  maxOff: number;
  minSubtotal: number;
}

export const COUPONS: Coupon[] = [
  { code: "FRESH10", label: "10% off (max ₹100) on ₹500+", pct: 10, maxOff: 100, minSubtotal: 500 },
  { code: "WELCOME50", label: "50% off (max ₹150) on ₹999+", pct: 50, maxOff: 150, minSubtotal: 999 },
];

export interface Line {
  product: Product;
  qty: number;
}

export interface Totals {
  lines: { product: Product; qty: number; unit: number; lineTotal: number; savings: number; gst: number }[];
  mrpTotal: number;
  itemSavings: number;
  subtotal: number;
  couponDiscount: number;
  coupon?: Coupon;
  couponError?: string;
  gst: number;
  grandTotal: number;
  itemCount: number;
}

/**
 * Prices are pre-tax. Coupon discount comes off the subtotal, and GST is
 * charged on each line's share of the discounted amount at its own rate.
 */
export function computeTotals(items: Line[], couponCode?: string): Totals {
  const base = items
    .filter((l) => l.qty > 0)
    .map(({ product, qty }) => {
      const unit = sellingPrice(product);
      return { product, qty, unit, lineTotal: round2(unit * qty), savings: round2((product.mrp - unit) * qty) };
    });
  const subtotal = round2(base.reduce((s, l) => s + l.lineTotal, 0));
  const mrpTotal = round2(base.reduce((s, l) => s + l.product.mrp * l.qty, 0));

  let coupon: Coupon | undefined;
  let couponError: string | undefined;
  let couponDiscount = 0;
  if (couponCode) {
    const c = COUPONS.find((x) => x.code === couponCode.trim().toUpperCase());
    if (!c) couponError = "Invalid coupon code";
    else if (subtotal < c.minSubtotal) couponError = `Add ₹${round2(c.minSubtotal - subtotal)} more to use ${c.code}`;
    else {
      coupon = c;
      couponDiscount = round2(Math.min((subtotal * c.pct) / 100, c.maxOff));
    }
  }
  const factor = subtotal > 0 ? (subtotal - couponDiscount) / subtotal : 0;
  const lines = base.map((l) => ({ ...l, gst: round2(l.lineTotal * factor * l.product.gstRate) }));
  const gst = round2(lines.reduce((s, l) => s + l.gst, 0));
  return {
    lines,
    mrpTotal,
    itemSavings: round2(mrpTotal - subtotal),
    subtotal,
    couponDiscount,
    coupon,
    couponError,
    gst,
    grandTotal: round2(subtotal - couponDiscount + gst),
    itemCount: base.reduce((s, l) => s + l.qty, 0),
  };
}

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
