import type { OKLCH, ThemeWeights } from "./oklch";

export type ThemeId = "moon" | "warm" | "cyan" | "black";

/**
 * 主题种子：只定义两个端点（main + ink）+ 零误差权重矩阵。
 *
 * 6 原子色由 oklch.ts 的 zeroErrorColor() 从端点 + 权重精确还原：
 *   t=0 main · t=1 bg · t=2 sidebar · t=3 accent · t=4 smoke · t=5 ink
 *
 * 背景区（i=1,2,3）wH 强制为 0，锁死色相避免黄绿脏感。
 */
export type ThemeSeed = {
  id: ThemeId;
  label: string;
  main: OKLCH;
  ink: OKLCH;
  dark: boolean;
  weights?: ThemeWeights;
};

export const themeSeeds: ThemeSeed[] = [
  {
    id: "moon",
    label: "月白",
    main: { L: 1.0, C: 0.0, H: 89.88 },
    ink: { L: 0.2931, C: 0.0, H: 89.88 },
    dark: false,
    weights: {
      wL: [0.0, 0.031, 0.0515, 0.1017, 0.4441, 1.0],
      wC: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      wH: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
  },
  {
    id: "warm",
    label: "暖阳素纸",
    main: { L: 0.9803, C: 0.0142, H: 84.58 },
    ink: { L: 0.3476, C: 0.0316, H: 68.42 },
    dark: false,
    weights: {
      wL: [0.0, 0.0345, 0.0676, 0.1187, 0.5361, 1.0],
      wC: [0.0, 0.2184, 0.6954, 0.8908, 0.9023, 1.0],
      wH: [0.0, 0.0, 0.0, 0.0, 0.7401, 1.0],
    },
  },
  {
    id: "cyan",
    label: "青蓝莫兰迪",
    main: { L: 0.9761, C: 0.0042, H: 197.09 },
    ink: { L: 0.3775, C: 0.0197, H: 227.54 },
    dark: false,
    weights: {
      wL: [0.0, 0.0728, 0.1109, 0.1605, 0.5204, 1.0],
      wC: [0.0, 0.1419, 0.2839, 0.4968, 0.9484, 1.0],
      wH: [0.0, 0.0, 0.0, 0.0, 0.4305, 1.0],
    },
  },
  {
    id: "black",
    label: "玄武墨黑",
    main: { L: 0.261, C: 0.0024, H: 67.72 },
    ink: { L: 0.919, C: 0.0071, H: 88.65 },
    dark: true,
    weights: {
      wL: [0.0, -0.053, -0.0384, 0.1082, 0.5549, 1.0],
      wC: [0.0, -0.1064, 0.0, 1.3404, 2.0426, 1.0],
      wH: [0.0, 0.0, 0.0, 0.0, 1.3153, 1.0],
    },
  },
];

export const defaultThemeId: ThemeId = "moon";

/** 6 原子色层级索引（t 值） */
export const ATOM_KEYS = ["main", "bg", "sidebar", "accent", "smoke", "ink"] as const;
export type AtomKey = (typeof ATOM_KEYS)[number];