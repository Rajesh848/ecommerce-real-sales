import { create } from "zustand";

// Per-frame mutable state (never put in React state).
export const player = { x: 0, z: 9, yaw: 0, pitch: -0.05 };
export const input = { forward: 0, right: 0, turn: 0 };
export const SPEED = 3.2;
export const TURN_SPEED = 1.8;
export const LOOK_SENS = 0.005;

interface UiState {
  selectedId: string | null;
  hoveredId: string | null;
  nearCheckout: boolean;
  basketOpen: boolean;
  select: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setNearCheckout: (v: boolean) => void;
  setBasketOpen: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  selectedId: null,
  hoveredId: null,
  nearCheckout: false,
  basketOpen: false,
  select: (selectedId) => set({ selectedId }),
  setHovered: (hoveredId) => set({ hoveredId }),
  setNearCheckout: (nearCheckout) => set({ nearCheckout }),
  setBasketOpen: (basketOpen) => set({ basketOpen }),
}));

export function teleport(x: number, z: number, yaw: number) {
  player.x = x;
  player.z = z;
  player.yaw = yaw;
  player.pitch = -0.1;
}
