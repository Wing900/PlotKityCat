import { describe, it, expect } from "vitest";
import { buildTourSteps } from "./tour";

describe("onboarding tour 纯逻辑", () => {
  it("buildTourSteps 返回 5 步: 首步整页 → 左/中/右 + 可视化(均有 data-tour 锚点)", () => {
    const steps = buildTourSteps();
    expect(steps.length).toBe(5);

    // 首步欢迎: 无 element
    expect(steps[0].element).toBeUndefined();
    expect(steps[0].popover.title).toBeTruthy();

    // 后 4 步均为高亮步, 必须挂 data-tour CSS 选择器
    for (const step of steps.slice(1)) {
      expect(step.element).toMatch(/^\[data-tour='[^']+'\]$/);
    }

    // 顺序硬约束: 左 → 中 → 右 → 可视化
    expect(steps[1].element).toBe("[data-tour='sidebar-panel']");
    expect(steps[2].element).toBe("[data-tour='editor-pane']");
    expect(steps[3].element).toBe("[data-tour='note-panel']");
    expect(steps[4].element).toBe("[data-tour='ai-generate']");
  });
});
