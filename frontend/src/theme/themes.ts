import { ATOM_KEYS, themeSeeds, type AtomKey, type ThemeId, type ThemeSeed } from "./palettes";
import { oklchToHex, zeroErrorColor, DEFAULT_WEIGHTS, type OKLCH } from "./oklch";

export type ThemeTokens = Record<string, string>;

/** 派生的 6 原子色（hex），由算法从 main/ink 端点生成 */
export type ThemeAtoms = Record<AtomKey, string>;

export type AppTheme = {
  id: ThemeId;
  label: string;
  dark: boolean;
  atoms: ThemeAtoms;
  tokens: ThemeTokens;
};

export const appThemes: AppTheme[] = themeSeeds.map(createTheme);

export function getTheme(themeId: ThemeId) {
  return appThemes.find((theme) => theme.id === themeId) ?? appThemes[0];
}

/* color-mix 字符串助手：保留透明叠加语义 */
function mix(base: string, tint: string, amount: number) {
  return "color-mix(in srgb, " + base + ", " + tint + " " + amount + "%)";
}

function wash(ink: string, amount: number) {
  return "color-mix(in srgb, " + ink + ", transparent " + (100 - amount) + "%)";
}

/** 从 main/ink 两端点 + 零误差权重，精确生成 6 原子色 hex */
function generateAtoms(seed: ThemeSeed): ThemeAtoms {
  const atoms = {} as ThemeAtoms;
  ATOM_KEYS.forEach((key, i) => {
    const ok: OKLCH = zeroErrorColor(i, seed.main, seed.ink, seed.weights ?? DEFAULT_WEIGHTS);
    atoms[key] = oklchToHex(ok);
  });
  return atoms;
}

function createTheme(seed: ThemeSeed): AppTheme {
  const atoms = generateAtoms(seed);
  const { main, bg, sidebar, accent, smoke, ink } = atoms;
  const { dark } = seed;

  /* 层次手法：无边框 · 深浅填充分区 + 弥散影托层 */
  const shadowInk = dark ? "rgba(0, 0, 0" : "rgba(52, 44, 30";
  const shadow1 = "0 1px 2px " + shadowInk + (dark ? ", 0.22)" : ", 0.05)");
  const shadow2 = "0 3px 12px " + shadowInk + (dark ? ", 0.28)" : ", 0.07)");
  const shadow3 = "0 8px 28px " + shadowInk + (dark ? ", 0.38)" : ", 0.1)");
  const shadow4 = "0 24px 64px " + shadowInk + (dark ? ", 0.52)" : ", 0.18)");

  const tokens: ThemeTokens = {
    "--app-bg": bg,
    "--sidebar-bg": sidebar,
    "--notebook-bg": main,
    "--workspace-bg": main,
    "--surface": main,
    "--surface-soft": dark ? mix(main, "white", 3) : mix(main, bg, 55),
    "--surface-raised": dark ? mix(main, "white", 6) : main,
    "--surface-hover": wash(ink, 6),
    "--toolbar-control": "transparent",
    "--glass-line": accent,

    "--text": ink,
    "--text-soft": mix(ink, smoke, 42),
    "--muted": smoke,
    "--subtle": mix(smoke, bg, 38),

    "--line": accent,
    "--line-strong": dark ? mix(accent, ink, 16) : mix(accent, ink, 14),

    "--accent": accent,
    "--accent-strong": ink,

    /* 主操作 · 浅墨水洗药丸（墨字，hover 加深一档） */
    "--run": wash(ink, dark ? 12 : 8),
    "--run-hover": wash(ink, dark ? 18 : 13),
    "--run-ink": ink,

    "--focus": wash(ink, 30),
    "--body-wash": bg,

    /* 深浅分层 · 无边框时代的骨架 */
    "--hover-fill": wash(ink, dark ? 9 : 6),
    "--active-fill": wash(ink, dark ? 13 : 10),
    "--fill-soft": wash(ink, dark ? 6 : 4.5),
    "--fill-strong": wash(ink, dark ? 9 : 7),

    "--file-icon-bg": "transparent",
    "--file-icon-text": smoke,

    "--dialog-bg": dark ? mix(main, "white", 2) : main,
    "--dialog-input-surface": dark ? mix(sidebar, "black", 16) : mix(main, bg, 55),
    "--dialog-input-bg": wash(ink, dark ? 6 : 4.5),
    "--dialog-input-focus": wash(ink, dark ? 9 : 7),
    "--dialog-shadow": dark ? "rgba(0, 0, 0, 0.44)" : "rgba(52, 44, 30, 0.16)",
    "--dialog-line": accent,
    "--scrim": dark ? "rgba(0, 0, 0, 0.5)" : "rgba(58, 52, 40, 0.28)",
    "--ring-focus": "0 0 0 3px " + wash(ink, dark ? 18 : 10),

    "--shadow-1": shadow1,
    "--shadow-2": shadow2,
    "--shadow-3": shadow3,
    "--shadow-4": shadow4,

    "--loading-track": accent,
    "--loading-accent": smoke,
    "--loading-glow": accent,

    "--syntax-keyword": dark ? "#cfa06b" : "#8a5c30",
    "--syntax-builtin": dark ? "#a3ba8b" : "#52684a",
    "--syntax-string": dark ? "#c2b475" : "#6f6a42",
    "--syntax-number": dark ? "#c79c85" : "#8a6a56",
    "--syntax-comment": mix(smoke, bg, 16),
    "--syntax-decorator": dark ? "#9db5b5" : "#647171",
    "--syntax-operator": mix(smoke, ink, 22),
  };

  return {
    id: seed.id,
    label: seed.label,
    dark: seed.dark,
    atoms,
    tokens,
  };
}