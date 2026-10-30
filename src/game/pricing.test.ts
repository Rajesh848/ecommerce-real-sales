import { describe, expect, it } from "vitest";
import type { Product } from "./catalog";
import { computeTotals, sellingPrice } from "./pricing";

const p = (id: string, mrp: number, discountPct: number, gst: number): Product => ({
  id, name: id, brand: "", categoryId: "x", mrp, discountPct, gstRate: gst, stock: 99,
  description: "", shape: "box", color: "#fff", emoji: "",
});

describe("pricing", () => {
  it("matches the brief example: rice ₹100 x2 + milk ₹60 = ₹260 subtotal", () => {
    const t = computeTotals([{ product: p("rice", 100, 0, 0.05), qty: 2 }, { product: p("milk", 60, 0, 0), qty: 1 }]);
    expect(t.subtotal).toBe(260);
    expect(t.gst).toBe(10); // 5% of 200
    expect(t.grandTotal).toBe(270);
  });
  it("applies product discount to selling price", () => {
    expect(sellingPrice({ mrp: 200, discountPct: 10 })).toBe(180);
  });
  it("FRESH10 is capped at ₹100 and GST applies on discounted amount", () => {
    const t = computeTotals([{ product: p("a", 2000, 0, 0.18), qty: 1 }], "fresh10");
    expect(t.couponDiscount).toBe(100);
    expect(t.gst).toBe(342); // 18% of 1900
    expect(t.grandTotal).toBe(2242);
  });
  it("rejects coupon below minimum", () => {
    const t = computeTotals([{ product: p("a", 100, 0, 0), qty: 1 }], "FRESH10");
    expect(t.couponDiscount).toBe(0);
    expect(t.couponError).toBeTruthy();
  });
});
