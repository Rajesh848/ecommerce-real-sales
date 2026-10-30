import type { Order } from "./basket";
import { toLines } from "./basket";
import { computeTotals } from "./pricing";

const rs = (n: number) => "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function downloadReceiptPdf(order: Order) {
  const { jsPDF } = await import("jspdf");
  const t = computeTotals(toLines(order.items), order.coupon);
  const doc = new jsPDF({ unit: "mm", format: [80, 120 + t.lines.length * 6] });
  let y = 10;
  const c = (s: string, size = 9, bold = false) => { doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size); doc.text(s, 40, y, { align: "center" }); y += size * 0.5; };
  const lr = (l: string, r: string, bold = false) => { doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(8); doc.text(l, 5, y); doc.text(r, 75, y, { align: "right" }); y += 4.5; };
  const hr = () => { doc.setLineDashPattern([1, 1], 0); doc.line(5, y - 2, 75, y - 2); y += 2; };
  c("FRESHMART", 14, true); y += 1;
  c("Virtual Supermarket"); y += 2;
  c("*** TEST PAYMENT - NOT A REAL TRANSACTION ***", 7, true); y += 2;
  lr("Order", order.id); lr("Txn", order.txnId); lr("Date", new Date(order.createdAt).toLocaleString("en-IN")); lr("Method", order.method); lr("Status", "PAID (TEST MODE)");
  hr();
  for (const l of t.lines) {
    lr(l.product.name.slice(0, 24), rs(l.lineTotal));
    doc.setFontSize(7); doc.text(`  ${l.qty} x ${rs(l.unit)}  GST ${Math.round(l.product.gstRate * 100)}%`, 5, y - 1); y += 3;
  }
  hr();
  lr("MRP total", rs(t.mrpTotal)); lr("Product discounts", "-" + rs(t.itemSavings)); lr("Subtotal", rs(t.subtotal));
  if (t.couponDiscount) lr(`Coupon ${t.coupon?.code}`, "-" + rs(t.couponDiscount));
  lr("GST", rs(t.gst)); hr(); lr("GRAND TOTAL", rs(t.grandTotal), true); y += 4;
  c("Thank you for shopping with us!", 8);
  doc.save(`FreshMart-${order.id}.pdf`);
}
