import { describe, it, expect, beforeEach } from "vitest";
import { createTourInteractionLock } from "./tourInteractionLock";
import type { PopoverDOM } from "driver.js";

// 锁逻辑: 前 N-1 步加 .driver-tour-locked + 显示 footer; 最后步清所有锁 + 隐藏 footer.
// 纯 DOM 逻辑, jsdom 可测; 不依赖 driver.js 运行时.

beforeEach(() => {
  document.body.innerHTML = "";
});

function makePopover(): PopoverDOM {
  const wrapper = document.createElement("div");
  const closeButton = document.createElement("button");
  const footer = document.createElement("div");
  return { wrapper, closeButton, footer } as unknown as PopoverDOM;
}

describe("tourInteractionLock", () => {
  it("非最后步: 给高亮元素加 .driver-tour-locked, footer 保持显示", () => {
    const lock = createTourInteractionLock(4);
    const el = document.createElement("aside");
    const popover = makePopover();

    lock.onPopoverRender(popover, { state: { activeIndex: 1, activeElement: el } });

    expect(el.classList.contains("driver-tour-locked")).toBe(true);
    expect(popover.footer.style.display).toBe("");
  });

  it("最后一步: 不加锁, footer 隐藏(引导用户直接点目标而非 Done)", () => {
    const lock = createTourInteractionLock(4);
    const el = document.createElement("button");
    const popover = makePopover();

    lock.onPopoverRender(popover, { state: { activeIndex: 4, activeElement: el } });

    expect(el.classList.contains("driver-tour-locked")).toBe(false);
    expect(popover.footer.style.display).toBe("none");
  });

  it("从锁步推进到最后步: 锁移除 + footer 隐藏", () => {
    const lock = createTourInteractionLock(4);
    const el = document.createElement("aside");
    document.body.appendChild(el);
    const popover = makePopover();

    lock.onPopoverRender(popover, { state: { activeIndex: 3, activeElement: el } });
    expect(el.classList.contains("driver-tour-locked")).toBe(true);

    lock.onPopoverRender(popover, { state: { activeIndex: 4, activeElement: el } });
    expect(el.classList.contains("driver-tour-locked")).toBe(false);
    expect(popover.footer.style.display).toBe("none");
  });

  // 回归: 第4步给 NotePanelShell aside 加锁, 第5步「可视化」按钮是其后代.
  // 若不清残留锁, 按钮被 `.driver-tour-locked *` 锁死点不动.
  it("最后步: 清掉前一步元素残留的锁, 不锁死当前步后代", () => {
    const lock = createTourInteractionLock(4);
    const parentAside = document.createElement("aside"); // 第4步高亮的 note-panel
    const vizBtn = document.createElement("button"); // 第5步高亮, 是 parentAside 后代
    parentAside.appendChild(vizBtn);
    document.body.appendChild(parentAside);
    const popover = makePopover();

    // 第4步: parentAside 加锁
    lock.onPopoverRender(popover, { state: { activeIndex: 3, activeElement: parentAside } });
    expect(parentAside.classList.contains("driver-tour-locked")).toBe(true);

    // 第5步: vizBtn 高亮, parentAside 残留锁应被清, vizBtn 自身不加锁
    lock.onPopoverRender(popover, { state: { activeIndex: 4, activeElement: vizBtn } });
    expect(parentAside.classList.contains("driver-tour-locked")).toBe(false);
    expect(vizBtn.classList.contains("driver-tour-locked")).toBe(false);
  });

  it("release: 清理页面上所有残留的 .driver-tour-locked", () => {
    const lock = createTourInteractionLock(4);
    const a = document.createElement("aside");
    const b = document.createElement("section");
    a.classList.add("driver-tour-locked");
    b.classList.add("driver-tour-locked");
    document.body.append(a, b);

    lock.release();

    expect(a.classList.contains("driver-tour-locked")).toBe(false);
    expect(b.classList.contains("driver-tour-locked")).toBe(false);
  });

  it("activeElement 缺失(欢迎步无高亮目标)时不报错", () => {
    const lock = createTourInteractionLock(4);
    const popover = makePopover();
    expect(() =>
      lock.onPopoverRender(popover, { state: { activeIndex: 0, activeElement: null } }),
    ).not.toThrow();
  });
});
