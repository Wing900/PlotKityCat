/**
 * OKLCH 色空间算法引擎
 *
 * 解耦的纯算法文件，不依赖任何 Vue/主题业务逻辑。
 * 提供：
 *   1. OKLCH ↔ sRGB(hex) 双向转换
 *   2. 连续分段样条 splineColor(t, main, ink) — 从两个端点生成中间色
 *   3. wash(ink, amount) — 墨色兑水稀释
 *   4. mix(a, b, amount) — 两色混合
 *
 * 设计参考：数学家拟合的「分段样条 + 色相双区锁定 + 彩度阻尼」公式。
 */

export type OKLCH = {
  L: number; // 明度 0~1
  C: number; // 彩度 0~0.4（通常 ≤ 0.04）
  H: number; // 色相 0~360
};

/* ════════════════════════════════════════════════
 * 1. OKLCH ↔ sRGB(hex) 转换
 * ════════════════════════════════════════════════ */

/** OKLCH → hex 字符串（#rrggbb） */
export function oklchToHex({ L, C, H }: OKLCH): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → LMS'(cubic)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // 立方前钳到 ≥0，避免负数 pow 产生 NaN
  const l = Math.max(0, l_) ** 3;
  const m = Math.max(0, m_) ** 3;
  const s = Math.max(0, s_) ** 3;

  // LMS → linear sRGB
  let rl = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // linear → sRGB gamma
  const gamma = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, gamma(v))) * 255).toString(16).padStart(2, "0");
  return `#${toHex(rl)}${toHex(gl)}${toHex(bl)}`;
}

/** hex → OKLCH */
export function hexToOklch(hex: string): OKLCH {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB → linear
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  // linear sRGB → LMS
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  // LMS → OKLab（立方根，保护 0）
  const cbrt = (x: number) => (x > 0 ? Math.cbrt(x) : 0);
  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bLab * bLab);
  let H = (Math.atan2(bLab, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

/* ════════════════════════════════════════════════
 * 2. 连续分段样条：从 main/ink 两端点生成中间色
 *
 * 输入 t ∈ [0, 5]，分别对应 6 个原子色层级：
 *   t=0 main, t=1 bg, t=2 sidebar, t=3 accent, t=4 smoke, t=5 ink
 *
 * 三段独立拟合：
 *   - 亮度 L：分段慢变/陡变
 *   - 色相 H：背景区锁定，内容区过渡
 *   - 彩度 C：阻尼释放
 * ════════════════════════════════════════════════ */

export function splineColor(t: number, main: OKLCH, ink: OKLCH): OKLCH {
  const tc = Math.max(0, Math.min(5, t));

  /* 亮度 L：0≤t≤3 背景慢变（二次），3<t≤5 内容陡变（线性） */
  let fL: number;
  if (tc <= 3) {
    fL = 0.04 * tc + 0.01 * tc * tc;
  } else {
    fL = 0.21 + 0.395 * (tc - 3);
  }
  const L = main.L - fL * (main.L - ink.L);

  /* 色相 H：0≤t≤3 锁定 main，3<t≤5 向 ink 线性过渡 */
  let H = main.H;
  if (tc > 3) {
    H = main.H + ((tc - 3) / 2) * (ink.H - main.H);
  }

  /* 彩度 C：阻尼释放 (t/5)^1.8 */
  const C = main.C + (tc / 5) ** 1.8 * (ink.C - main.C);

  return { L, C, H };
}

/* ════════════════════════════════════════════════
 * 3. wash — 墨色兑水稀释
 *
 * wash(ink, amount) = ink 在白色（或黑色）背景上以 amount% 不透明度叠加
 * 返回视觉 hex。amount 单位 %，如 wash(ink, 8) = 8% 浓度。
 * ════════════════════════════════════════════════ */

export function wash(ink: OKLCH, amount: number, overDark = false): string {
  const alpha = amount / 100;
  const L = overDark ? ink.L * alpha : 1 - (1 - ink.L) * alpha;
  const C = ink.C * alpha;
  const H = ink.H;
  return oklchToHex({ L, C, H });
}

export type ThemeWeights = {
  wL: number[];
  wC: number[];
  wH: number[];
};

/**
 * 通用默认权重（用于新主题，不填 weights 时使用）
 * — wL 用月白（背景区级差最小 → sidebar 近白）
 * — wC 用青蓝（彩度自然释放）
 * — wH 背景区锁 0（避免黄绿脏感）
 */
export const DEFAULT_WEIGHTS: ThemeWeights = {
  wL: [0.0, 0.031, 0.0515, 0.1017, 0.4441, 1.0],
  wC: [0.0, 0.1419, 0.2839, 0.4968, 0.9484, 1.0],
  wH: [0.0, 0.0, 0.0, 0.0, 0.4305, 1.0],
};

/* ════════════════════════════════════════════════
 * 5. 零误差离散阶梯模型（Zero-Error Discrete Model）
 *
 * 每个主题存自己的 3 组权重（wL/wC/wH 各 6 个），
 * 从 page(main)/ink 两端点精确还原 6 原子色。
 *
 *   L_i = L_pg - wL[i] · (L_pg - L_ink)
 *   C_i = C_pg + wC[i] · (C_ink - C_pg)
 *   H_i = H_pg + wH[i] · ΔH(ink, pg)   [最短角差]
 *
 * 背景区（i=1,2,3）wH 强制为 0，锁死色相避免“黄绿脏感”。
 * ════════════════════════════════════════════════ */

function hueDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function zeroErrorColor(i: number, page: OKLCH, ink: OKLCH, w: ThemeWeights): OKLCH {
  const idx = Math.max(0, Math.min(5, i));
  const dH = hueDelta(page.H, ink.H);
  const L = page.L - w.wL[idx] * (page.L - ink.L);
  const C = page.C + w.wC[idx] * (ink.C - page.C);
  const H = page.H + w.wH[idx] * dH;
  return { L, C, H };
}

/* ════════════════════════════════════════════════
 * 4. mix — 两色在 OKLCH 空间线性混合
 *
 * mix(a, b, amount) = a + (b - a) * amount，返回 hex
 * ════════════════════════════════════════════════ */

export function mixHex(a: OKLCH, b: OKLCH, amount: number): string {
  return oklchToHex({
    L: a.L + (b.L - a.L) * amount,
    C: a.C + (b.C - a.C) * amount,
    H: a.H + (b.H - a.H) * amount,
  });
}