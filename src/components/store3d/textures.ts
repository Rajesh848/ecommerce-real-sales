import * as THREE from "three";
import type { Category, Product } from "@/game/catalog";

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function floorTexture() {
  const t = canvasTex(512, 512, (g) => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? "#ece6da" : "#f6f2ea";
        g.fillRect(x * 128, y * 128, 128, 128);
      }
    g.strokeStyle = "#cfc6b5";
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(120,100,80,${Math.random() * 0.06})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(22, 18);
  return t;
}

export function packTexture(p: Product) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = p.color;
    g.fillRect(0, 0, 256, 256);
    const grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, "rgba(255,255,255,0.25)");
    grd.addColorStop(0.5, "rgba(255,255,255,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.2)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.fillRect(0, 150, 256, 70);
    g.font = "90px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(p.emoji, 128, 80);
    g.fillStyle = "#222";
    g.font = "bold 30px sans-serif";
    g.fillText(p.brand.slice(0, 14), 128, 185, 240);
  });
}

export function signTexture(c: Category) {
  return canvasTex(1024, 256, (g) => {
    g.fillStyle = c.color;
    g.fillRect(0, 0, 1024, 256);
    g.fillStyle = "rgba(255,255,255,0.15)";
    g.fillRect(0, 0, 1024, 18);
    g.font = "130px serif";
    g.textBaseline = "middle";
    g.fillText(c.emoji, 40, 132);
    g.fillStyle = "#fff";
    g.font = "bold 84px sans-serif";
    g.fillText(c.name, 210, 136, 780);
  });
}

export function textTexture(text: string, bg: string, fg: string, w = 1024, h = 256, size = 110) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = `bold ${size}px sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 6, w - 40);
  });
}
