import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CATEGORIES, PRODUCTS, type Product } from "@/game/catalog";
import {
  CHECKOUT_ZONE, COUNTERS, FACES, FACINGS, LEVELS, ROW_DEPTH, ROW_X, ROW_Z0, ROW_Z1, SHELF_H, STORE,
  blocked, productSlot,
} from "@/game/layout";
import { LOOK_SENS, SPEED, TURN_SPEED, input, player, useUi } from "@/game/runtime";
import { floorTexture, packTexture, signTexture, textTexture } from "./textures";

const SIZE: Record<Product["shape"], [number, number, number]> = {
  box: [0.32, 0.36, 0.22],
  tall: [0.22, 0.42, 0.22],
  can: [0.24, 0.26, 0.24],
  bottle: [0.2, 0.44, 0.2],
  round: [0.26, 0.26, 0.26],
  bag: [0.36, 0.4, 0.16],
};

function geometryFor(shape: Product["shape"]) {
  const [w, h, d] = SIZE[shape];
  if (shape === "can") return new THREE.CylinderGeometry(w / 2, w / 2, h, 20);
  if (shape === "bottle") return new THREE.CylinderGeometry(w * 0.35, w / 2, h, 16);
  if (shape === "round") return new THREE.SphereGeometry(w / 2, 18, 14);
  return new THREE.BoxGeometry(w, h, d);
}

const productMeshes: THREE.Object3D[] = [];

function ProductStack({ p }: { p: Product }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(
    () => ({
      geo: geometryFor(p.shape),
      mat: new THREE.MeshStandardMaterial({ map: packTexture(p), roughness: p.shape === "bag" ? 0.45 : 0.6, metalness: p.shape === "can" ? 0.35 : 0 }),
    }),
    [p],
  );
  const selected = useUi((s) => s.selectedId === p.id);
  const hovered = useUi((s) => s.hoveredId === p.id);

  useEffect(() => {
    const m = ref.current!;
    const { face, zCenter, seg } = productSlot(p);
    const [, h] = SIZE[p.shape];
    const d = new THREE.Object3D();
    let i = 0;
    for (const ly of LEVELS)
      for (let f = 0; f < FACINGS; f++) {
        d.position.set(face.rowX + face.side * 0.33, ly + 0.04 + h / 2, zCenter + (f - (FACINGS - 1) / 2) * (seg / FACINGS));
        d.rotation.set(0, face.side * (Math.PI / 2), 0);
        d.updateMatrix();
        m.setMatrixAt(i++, d.matrix);
      }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.userData["productId"] = p.id;
    productMeshes.push(m);
    return () => void productMeshes.splice(productMeshes.indexOf(m), 1);
  }, [p]);

  useEffect(() => {
    mat.emissive.set(selected ? "#ffd166" : hovered ? "#ffffff" : "#000000");
    mat.emissiveIntensity = selected ? 0.55 : hovered ? 0.18 : 0;
  }, [selected, hovered, mat]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    useUi.getState().select(p.id);
  };

  return <instancedMesh ref={ref} args={[geo, mat, LEVELS.length * FACINGS]} castShadow onClick={onClick} />;
}

function ShelfRow({ x }: { x: number }) {
  const len = ROW_Z1 - ROW_Z0;
  const zc = (ROW_Z0 + ROW_Z1) / 2;
  return (
    <group position={[x, 0, zc]}>
      <mesh position={[0, SHELF_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, SHELF_H, len]} />
        <meshStandardMaterial color="#e9e4dc" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[ROW_DEPTH, 0.12, len]} />
        <meshStandardMaterial color="#5a5f66" roughness={0.6} />
      </mesh>
      {LEVELS.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]} receiveShadow castShadow>
            <boxGeometry args={[ROW_DEPTH, 0.04, len]} />
            <meshStandardMaterial color="#f4f1ec" metalness={0.2} roughness={0.4} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (ROW_DEPTH / 2 + 0.005), y - 0.02, 0]}>
              <boxGeometry args={[0.01, 0.07, len]} />
              <meshStandardMaterial color="#f2c14e" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, SHELF_H + 0.04, 0]}>
        <boxGeometry args={[ROW_DEPTH + 0.06, 0.08, len + 0.06]} />
        <meshStandardMaterial color="#2f6e4a" />
      </mesh>
    </group>
  );
}

function AisleSigns() {
  const signs = useMemo(() => CATEGORIES.map((c) => ({ c, tex: signTexture(c) })), []);
  return (
    <>
      {FACES.map((f, i) => {
        const tex = signs[i]!.tex;
        return (
          <group key={f.categoryId}>
            {/* end-cap sign facing the entrance */}
            <mesh position={[f.rowX + f.side * 1.55, 3.3, ROW_Z1 + 0.3]}>
              <planeGeometry args={[2.6, 0.65]} />
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
            {/* sign along the aisle, facing the shoppers */}
            <mesh position={[f.rowX + f.side * 0.7, 2.75, (ROW_Z0 + ROW_Z1) / 2]} rotation={[0, f.side * (Math.PI / 2), 0]}>
              <planeGeometry args={[3.6, 0.9]} />
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {FACES.map((f) => (
        <mesh key={"wire" + f.categoryId} position={[f.rowX + f.side * 1.55, 3.85, ROW_Z1 + 0.3]}>
          <boxGeometry args={[0.02, 0.45, 0.02]} />
          <meshStandardMaterial color="#666" />
        </mesh>
      ))}
    </>
  );
}

function Checkout() {
  const screen = useMemo(() => textTexture("BILLING  ₹", "#0f2a1d", "#7ef0a8", 512, 320, 90), []);
  const sign = useMemo(() => textTexture("🧾  BILLING COUNTERS", "#e4572e", "#ffffff"), []);
  return (
    <group>
      <mesh position={[13, 3.3, 3.8]}>
        <planeGeometry args={[6, 1.2]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {COUNTERS.map((c) => (
        <group key={c.x} position={[c.x, 0, c.z]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[c.w, 1, c.d]} />
            <meshStandardMaterial color="#2f6e4a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.01, 0]} receiveShadow>
            <boxGeometry args={[c.w + 0.05, 0.03, c.d + 0.05]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.3} />
          </mesh>
          <mesh position={[-0.4, 1.04, 0]}>
            <boxGeometry args={[1.6, 0.02, 0.6]} />
            <meshStandardMaterial color="#222" roughness={0.9} />
          </mesh>
          <group position={[1, 1.35, -0.2]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.4]} />
              <meshStandardMaterial color="#444" />
            </mesh>
            <mesh rotation={[-0.2, Math.PI, 0]}>
              <boxGeometry args={[0.5, 0.32, 0.04]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0, 0, -0.025]} rotation={[0.2, 0, 0]}>
              <planeGeometry args={[0.44, 0.27]} />
              <meshBasicMaterial map={screen} toneMapped={false} />
            </mesh>
          </group>
          {/* light pole */}
          <mesh position={[-c.w / 2, 1.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.8]} />
            <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[-c.w / 2, 2.85, 0]}>
            <boxGeometry args={[0.35, 0.25, 0.08]} />
            <meshStandardMaterial color="#e4572e" emissive="#e4572e" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Carts() {
  // Stack of baskets and parked trolleys near the entrance.
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-6, 0.15 + i * 0.12, 9]} castShadow>
          <boxGeometry args={[0.55, 0.28, 0.38]} />
          <meshStandardMaterial color="#e4572e" roughness={0.5} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-10 - i * 0.35, 0, 9]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[0.6, 0.45, 0.9]} />
            <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.35} wireframe />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.8]} />
            <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Building() {
  const floor = useMemo(() => floorTexture(), []);
  const welcome = useMemo(() => textTexture("FRESHMART · Welcome!", "#2f6e4a", "#ffffff"), []);
  const w = STORE.maxX - STORE.minX;
  const d = STORE.maxZ - STORE.minZ;
  const cx = (STORE.maxX + STORE.minX) / 2;
  const cz = (STORE.maxZ + STORE.minZ) / 2;
  const lights: [number, number][] = [];
  for (let x = -18; x <= 18; x += 4) for (let z = -20; z <= 8; z += 4) lights.push([x, z]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floor} roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, STORE.height, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f3f1ec" />
      </mesh>
      {lights.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, STORE.height - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.35]} />
          <meshBasicMaterial color="#fffbe8" toneMapped={false} />
        </mesh>
      ))}
      {/* walls */}
      <mesh position={[cx, STORE.height / 2, STORE.minZ]}>
        <planeGeometry args={[w, STORE.height]} />
        <meshStandardMaterial color="#cfe3d3" />
      </mesh>
      <mesh position={[STORE.minX, STORE.height / 2, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, STORE.height]} />
        <meshStandardMaterial color="#f2e3c9" />
      </mesh>
      <mesh position={[STORE.maxX, STORE.height / 2, cz]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, STORE.height]} />
        <meshStandardMaterial color="#f2e3c9" />
      </mesh>
      <mesh position={[cx, STORE.height / 2, STORE.maxZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, STORE.height]} />
        <meshStandardMaterial color="#d8e9f2" />
      </mesh>
      <mesh position={[0, 3.2, STORE.minZ + 0.02]}>
        <planeGeometry args={[10, 1.4]} />
        <meshBasicMaterial map={welcome} toneMapped={false} />
      </mesh>
      {/* green skirting strip */}
      <mesh position={[cx, 0.15, STORE.minZ + 0.01]}>
        <planeGeometry args={[w, 0.3]} />
        <meshStandardMaterial color="#2f6e4a" />
      </mesh>
    </group>
  );
}

function PlayerRig() {
  const { camera, gl } = useThree();
  const frame = useRef(0);
  const ray = useMemo(() => new THREE.Raycaster(undefined, undefined, 0.1, 3.2), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);

  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      const k = (...c: string[]) => c.some((x) => keys.has(x));
      input.forward = (k("KeyW", "ArrowUp") ? 1 : 0) - (k("KeyS", "ArrowDown") ? 1 : 0);
      input.right = (k("KeyD") ? 1 : 0) - (k("KeyA") ? 1 : 0);
      input.turn = (k("ArrowRight") ? 1 : 0) - (k("ArrowLeft") ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "KeyE") {
        const h = useUi.getState().hoveredId;
        if (h) useUi.getState().select(h);
      }
      if (e.code === "Escape") useUi.getState().select(null);
      keys.add(e.code);
      sync();
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.code); sync(); };
    const blur = () => { keys.clear(); sync(); };

    const el = gl.domElement;
    let dragging = false;
    let lx = 0, ly = 0;
    const pd = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; };
    const pm = (e: PointerEvent) => {
      if (!dragging) return;
      player.yaw -= (e.clientX - lx) * LOOK_SENS;
      player.pitch = THREE.MathUtils.clamp(player.pitch - (e.clientY - ly) * LOOK_SENS, -1.1, 1.1);
      lx = e.clientX; ly = e.clientY;
    };
    const pu = () => (dragging = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", pu);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    player.yaw -= input.turn * TURN_SPEED * dt;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    let mx = fx * input.forward + rx * input.right;
    let mz = fz * input.forward + rz * input.right;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = (mx / len) * SPEED * dt;
      mz = (mz / len) * SPEED * dt;
      if (!blocked(player.x + mx, player.z)) player.x += mx;
      if (!blocked(player.x, player.z + mz)) player.z += mz;
    }
    const bob = len > 0 ? Math.sin(performance.now() / 140) * 0.025 : 0;
    camera.position.set(player.x, 1.6 + bob, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");

    const ui = useUi.getState();
    const near = player.x > CHECKOUT_ZONE.minX && player.x < CHECKOUT_ZONE.maxX && player.z > CHECKOUT_ZONE.minZ && player.z < CHECKOUT_ZONE.maxZ;
    if (near !== ui.nearCheckout) ui.setNearCheckout(near);

    if (++frame.current % 8 === 0) {
      ray.setFromCamera(center, camera);
      const hit = ray.intersectObjects(productMeshes, false)[0];
      const id = (hit?.object.userData["productId"] as string) ?? null;
      if (id !== ui.hoveredId) ui.setHovered(id);
    }
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => { if (++n.current === 3) onReady(); });
  return null;
}

export default function Supermarket({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 70, near: 0.05, far: 80, position: [0, 1.6, 9] }}
      gl={{ antialias: true }}
      style={{ touchAction: "none" }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    >
      <color attach="background" args={["#efe9df"]} />
      <fog attach="fog" args={["#efe9df", 25, 60]} />
      <hemisphereLight args={["#fffaf0", "#b9a88f", 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 14, 10]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      {[-12, 0, 12].map((x) => <pointLight key={x} position={[x, 3.8, -12]} intensity={12} distance={16} color="#fff4dc" />)}
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={1} color="#ffe8c4" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Building />
      {ROW_X.map((x) => <ShelfRow key={x} x={x} />)}
      {PRODUCTS.map((p) => <ProductStack key={p.id} p={p} />)}
      <AisleSigns />
      <Checkout />
      <Carts />
      <PlayerRig />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
