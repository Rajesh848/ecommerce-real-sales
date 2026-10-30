import { supabase } from "@/integrations/supabase/client";

export interface DbOrderItem {
  product_id: string; name: string; qty: number; unit_price: number; mrp: number; gst_rate: number; line_total: number; gst: number;
}
export interface DbOrder {
  id: string; user_id: string; status: string; payment_method: string; txn_id: string; coupon: string | null;
  subtotal: number; coupon_discount: number; gst: number; total: number; address: unknown; created_at: string;
  order_items: DbOrderItem[];
}

export async function fetchOrder(id: string) {
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  return data as DbOrder | null;
}

export async function fetchMyOrders(userId: string) {
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as DbOrder[];
}

export interface Address {
  id: string; label: string; full_name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; is_default: boolean;
}
export async function fetchAddresses() {
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return (data ?? []) as Address[];
}
export const formatAddress = (a: Pick<Address, "line1" | "line2" | "city" | "state" | "pincode">) =>
  [a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(", ");
