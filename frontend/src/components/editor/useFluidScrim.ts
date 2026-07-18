import { onBeforeUnmount } from "vue";

type Rgba = [number, number, number, number];
type ThemeId = "moon" | "warm" | "cyan" | "black";

const PALETTES: Record<ThemeId, Array<{ pos: number; rgba: Rgba }>> = {
  moon: [
    { pos: 0, rgba: [245, 250, 240, 0.58] },
    { pos: 0.5, rgba: [200, 230, 205, 0.42] },
    { pos: 0.82, rgba: [170, 210, 180, 0.18] },
    { pos: 1, rgba: [170, 210, 180, 0] },
  ],
  warm: [
    { pos: 0, rgba: [252, 246, 232, 0.75] },
    { pos: 0.5, rgba: [225, 185, 120, 0.6] },
    { pos: 0.82, rgba: [200, 150, 95, 0.28] },
    { pos: 1, rgba: [200, 150, 95, 0] },
  ],
  cyan: [
    { pos: 0, rgba: [240, 248, 252, 0.75] },
    { pos: 0.5, rgba: [170, 205, 225, 0.6] },
    { pos: 0.82, rgba: [140, 180, 210, 0.28] },
    { pos: 1, rgba: [140, 180, 210, 0] },
  ],
  black: [
    { pos: 0, rgba: [240, 240, 238, 0.55] },
    { pos: 0.5, rgba: [200, 200, 198, 0.38] },
    { pos: 0.82, rgba: [170, 170, 168, 0.16] },
    { pos: 1, rgba: [170, 170, 168, 0] },
  ],
};

const RENDER_SCALE = 0.5;
const ANCHOR_MIN = 0.25;
const ANCHOR_MAX = 0.75;
const ORBIT_X = 0.14;
const ORBIT_Y = 0.11;
const FREQ_X = 0.73;
const FREQ_Y = 0.51;
const PHASE = 1.2;
const NOISE_AMP = 0.02;
const SPRING_K = 0.03;
const TIME_SCALE = 0.4;
const RADIUS_RATIO = 0.24;
const BREATH_AMP = 0.1;
const BREATH_FREQ = 0.45;

function currentTheme(): ThemeId {
  const id = document.documentElement.dataset.theme;
  if (id === "moon" || id === "warm" || id === "cyan" || id === "black") {
    return id;
  }
  return "moon";
}

function clampAnchor(v: number) {
  return Math.max(ANCHOR_MIN, Math.min(ANCHOR_MAX, v));
}

export function useFluidScrim() {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let width = 0;
  let height = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let running = false;
  let targetX = 0.5;
  let targetY = 0.5;
  let planetX = 0.5;
  let planetY = 0.5;
  let startTime = 0;
  let theme: ThemeId = currentTheme();
  let themeObserver: MutationObserver | null = null;

  function attach(el: HTMLCanvasElement) {
    canvas = el;
    ctx = el.getContext("2d");
    if (!ctx) {
      return;
    }
    theme = currentTheme();
    resize();
    planetX = 0.5;
    planetY = 0.5;
    startTime = performance.now();
    startThemeObserver();
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function detach() {
    running = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    themeObserver?.disconnect();
    themeObserver = null;
    ctx?.clearRect(0, 0, width, height);
    canvas = null;
    ctx = null;
  }

  function startThemeObserver() {
    themeObserver = new MutationObserver(() => {
      theme = currentTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  function resize() {
    if (!canvas || !ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width || 1;
    cssHeight = rect.height || 1;
    width = canvas.width = Math.max(1, Math.floor(cssWidth * RENDER_SCALE));
    height = canvas.height = Math.max(1, Math.floor(cssHeight * RENDER_SCALE));
  }

  function setAnchor(offsetX: number, offsetY: number) {
    targetX = clampAnchor(0.5 + offsetX / cssWidth);
    targetY = clampAnchor(0.5 + offsetY / cssHeight);
  }

  function draw(radiusScale: number) {
    if (!ctx) {
      return;
    }
    const x = planetX * width;
    const y = planetY * height;
    const r = width * RADIUS_RATIO * radiusScale;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const stops = PALETTES[theme];
    for (const stop of stops) {
      const [cr, cg, cb, ca] = stop.rgba;
      grad.addColorStop(stop.pos, `rgba(${cr},${cg},${cb},${ca})`);
    }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!ctx || !running) {
      return;
    }
    const t = (performance.now() - startTime) * 0.001 * TIME_SCALE;
    const offX = Math.sin(t * FREQ_X + PHASE) * ORBIT_X;
    const offY = Math.cos(t * FREQ_Y) * ORBIT_Y;
    const noiseX = Math.sin(t * 2.1) * NOISE_AMP;
    const noiseY = Math.cos(t * 1.7) * NOISE_AMP;
    const destX = targetX + offX + noiseX;
    const destY = targetY + offY + noiseY;
    planetX += (destX - planetX) * SPRING_K;
    planetY += (destY - planetY) * SPRING_K;
    const breath = 1 + Math.sin(t * BREATH_FREQ) * BREATH_AMP;
    draw(breath);
    raf = requestAnimationFrame(loop);
  }

  onBeforeUnmount(detach);

  return { attach, detach, resize, setAnchor };
}