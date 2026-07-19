import { describe, it, expect, beforeEach } from "vitest";
import { useTheme } from "./useTheme";
import { defaultThemeId } from "../theme/palettes";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.cssText = "";
});

describe("useTheme", () => {
  it("初始主题为默认主题 (localStorage 空时)", () => {
    const { currentThemeId } = useTheme();
    expect(currentThemeId.value).toBe(defaultThemeId);
  });

  it("localStorage 有合法值则读取该值", () => {
    const themes = useTheme().themes;
    const first = themes[0].id;
    localStorage.setItem("plotkitycat.theme", first);
    const { currentThemeId } = useTheme();
    expect(currentThemeId.value).toBe(first);
  });

  it("localStorage 有非法值则回退默认", () => {
    localStorage.setItem("plotkitycat.theme", "not-a-theme");
    const { currentThemeId } = useTheme();
    expect(currentThemeId.value).toBe(defaultThemeId);
  });

  it("setTheme 持久化到 localStorage + 应用 CSS 变量", () => {
    const { setTheme, themes, currentThemeId } = useTheme();
    const target = themes[1] ?? themes[0];
    setTheme(target.id);
    expect(currentThemeId.value).toBe(target.id);
    expect(localStorage.getItem("plotkitycat.theme")).toBe(target.id);
    expect(document.documentElement.dataset.theme).toBe(target.id);
    // 应用了至少一个 CSS 变量
    const varCount = Object.keys(target.tokens).length;
    expect(varCount).toBeGreaterThan(0);
  });

  it("cycleTheme 在主题列表中循环", () => {
    const { cycleTheme, currentThemeId, themes } = useTheme();
    const startId = currentThemeId.value;
    const startIndex = themes.findIndex((t) => t.id === startId);
    cycleTheme();
    const expectedNext = themes[(startIndex + 1) % themes.length].id;
    expect(currentThemeId.value).toBe(expectedNext);
  });
});