let ctx: AudioContext | null = null;
let muted = false;
export const setMuted = (m: boolean) => (muted = m);
export const isMuted = () => muted;

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.15) {
  if (muted || typeof window === "undefined") return;
  ctx ??= new AudioContext();
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  add: () => { tone(880, 0, 0.12, "triangle"); tone(1320, 0.07, 0.15, "triangle"); },
  remove: () => tone(330, 0, 0.15, "triangle"),
  scan: () => tone(1800, 0, 0.09, "square", 0.06),
  pay: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, "triangle")); },
  error: () => tone(160, 0, 0.2, "sawtooth", 0.08),
};
