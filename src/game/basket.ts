import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productById } from "./catalog";
import type { Line } from "./pricing";

export interface Order {
  id: string;
  txnId: string;
  createdAt: string;
  method: string;
  status: "TEST_PAID";
  coupon?: string | undefined;
  items: { productId: string; qty: number }[];
}

interface BasketState {
  items: Record<string, number>;
  coupon: string;
  recent: string[];
  orders: Order[];
  add: (id: string, qty?: number) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setCoupon: (c: string) => void;
  viewed: (id: string) => void;
  placeTestOrder: (method: string) => Order;
}

export const useBasket = create<BasketState>()(
  persist(
    (set, get) => ({
      items: {},
      coupon: "",
      recent: [],
      orders: [],
      add: (id, qty = 1) => {
        const p = productById(id);
        const cur = get().items[id] ?? 0;
        if (!p || cur + qty > p.stock) return false;
        set({ items: { ...get().items, [id]: cur + qty } });
        return true;
      },
      setQty: (id, qty) => {
        const p = productById(id);
        if (!p) return;
        const q = Math.max(0, Math.min(p.stock, qty));
        const items = { ...get().items };
        if (q === 0) delete items[id];
        else items[id] = q;
        set({ items });
      },
      remove: (id) => {
        const items = { ...get().items };
        delete items[id];
        set({ items });
      },
      clear: () => set({ items: {}, coupon: "" }),
      setCoupon: (coupon) => set({ coupon }),
      viewed: (id) => set({ recent: [id, ...get().recent.filter((x) => x !== id)].slice(0, 8) }),
      placeTestOrder: (method) => {
        const rand = () => Math.random().toString(36).slice(2, 8).toUpperCase();
        const order: Order = {
          id: `FM-${Date.now().toString(36).toUpperCase()}-${rand()}`,
          txnId: `TEST-${rand()}${rand()}`,
          createdAt: new Date().toISOString(),
          method,
          status: "TEST_PAID",
          coupon: get().coupon || undefined,
          items: Object.entries(get().items).map(([productId, qty]) => ({ productId, qty })),
        };
        set({ orders: [order, ...get().orders], items: {}, coupon: "" });
        return order;
      },
    }),
    { name: "freshmart-basket" },
  ),
);

export const toLines = (items: { productId: string; qty: number }[] | Record<string, number>): Line[] => {
  const arr = Array.isArray(items) ? items : Object.entries(items).map(([productId, qty]) => ({ productId, qty }));
  return arr.flatMap(({ productId, qty }) => {
    const product = productById(productId);
    return product ? [{ product, qty }] : [];
  });
};
