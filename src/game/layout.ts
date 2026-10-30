// Store floor plan (metres). Plain data shared by 3D scene, collisions and minimap.
import { CATEGORIES, PRODUCTS, type Product } from "./catalog";

export const STORE = { minX: -22, maxX: 22, minZ: -24, maxZ: 12, height: 4.2 };
export const ROW_X = [-16, -8, 0, 8, 16];
export const ROW_Z0 = -20;
export const ROW_Z1 = -4;
export const ROW_DEPTH = 1.2;
export const SHELF_H = 2.2;
export const LEVELS = [0.12, 0.62, 1.12, 1.62];
export const FACINGS = 4;

export interface Face {
  categoryId: string;
  rowX: number;
  side: -1 | 1; // -1 faces west (−x), +1 faces east (+x)
}

// 9 categories on the 10 shelf faces; the outer east face of the last row stays plain.
export const FACES: Face[] = CATEGORIES.map((c, i) => ({
  categoryId: c.id,
  rowX: ROW_X[Math.floor(i / 2)],
  side: i % 2 === 0 ? -1 : 1,
}));

export const faceOf = (categoryId: string) => FACES.find((f) => f.categoryId === categoryId)!;

/** Slot of a product: its z-segment on its face. */
export function productSlot(p: Product) {
  const face = faceOf(p.categoryId);
  const idx = PRODUCTS.filter((x) => x.categoryId === p.categoryId).indexOf(p);
  const seg = (ROW_Z1 - ROW_Z0) / 6;
  const zCenter = ROW_Z0 + seg * (idx + 0.5);
  return { face, zCenter, seg };
}

/** Where to stand in the aisle to look at a product / category. */
export function standPoint(categoryId: string, zCenter = (ROW_Z0 + ROW_Z1) / 2) {
  const f = faceOf(categoryId);
  const x = f.rowX + f.side * 2.3;
  const yaw = f.side === 1 ? Math.PI / 2 : -Math.PI / 2; // look back toward the shelf
  return { x, z: zCenter, yaw };
}

export const COUNTERS = [
  { x: 10, z: 6, w: 3, d: 1 },
  { x: 16, z: 6, w: 3, d: 1 },
];
export const CHECKOUT_ZONE = { minX: 6, maxX: 21, minZ: 2.5, maxZ: 11 };

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }
export const OBSTACLES: Box[] = [
  ...ROW_X.map((x) => ({ minX: x - ROW_DEPTH / 2, maxX: x + ROW_DEPTH / 2, minZ: ROW_Z0, maxZ: ROW_Z1 })),
  ...COUNTERS.map((c) => ({ minX: c.x - c.w / 2, maxX: c.x + c.w / 2, minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2 })),
];

const R = 0.35;
export function blocked(x: number, z: number) {
  if (x < STORE.minX + R || x > STORE.maxX - R || z < STORE.minZ + R || z > STORE.maxZ - R) return true;
  return OBSTACLES.some((b) => x > b.minX - R && x < b.maxX + R && z > b.minZ - R && z < b.maxZ + R);
}
