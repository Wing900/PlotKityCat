// Tour 最后步行为策略: 前 N-1 步锁交互 + 最后步放开 + 最后步隐藏 popover 导航(Done).
//
// 解耦: 该模块只管「Tour 期间 popover/元素的交互边界」, useOnboarding 只编排(注入回调).
// - 前 N-1 步: 给高亮元素加 .driver-tour-locked 锁交互, 防止用户误点侧边栏(新建/切工作区)跑偏.
// - 最后一步: 移除锁(放开「可视化」按钮可点) + 隐藏 popover footer(Done/上一步/进度),
//   引导用户直接点目标元素, 而不是点 popover 的 Done.
// CSS 见 ./tour.css (.driver-tour-locked + !important 压过 driver.js 默认 auto).
import type { PopoverDOM, State } from "driver.js";

const LOCK_CLASS = "driver-tour-locked";

export interface TourInteractionLock {
  onPopoverRender: (popover: PopoverDOM, opts: { state: State }) => void;
  release: () => void;
}

// createTourInteractionLock 生成与 lastIndex 绑定的交互锁.
// lastIndex = steps.length - 1; activeIndex === lastIndex 即最后一步.
export function createTourInteractionLock(lastIndex: number): TourInteractionLock {
  return {
    onPopoverRender: (popover, { state }) => {
      const isFirst = state.activeIndex === 0;
      const isLast = state.activeIndex === lastIndex;
      popover.wrapper.dataset.tourFirst = String(isFirst);
      popover.wrapper.dataset.tourLast = String(isLast);
      popover.closeButton.setAttribute("aria-label", "关闭教程");
      // 1. 先清掉所有残留锁(前一步元素上的), 防止其锁住当前步元素的后代路径.
      //    场景: 第4步给 NotePanelShell aside 加锁, 第5步「可视化」按钮是其后代,
      //    若不清残留, 按钮被 `.driver-tour-locked *` 锁死点不动.
      document
        .querySelectorAll<HTMLElement>(`.${LOCK_CLASS}`)
        .forEach((e) => e.classList.remove(LOCK_CLASS));
      // 2. 非最后步: 给当前高亮元素加锁; 最后步: 不加(放开「可视化」按钮).
      const el = (state.activeElement ?? state.__activeElement) as HTMLElement | null | undefined;
      if (el && !isLast) {
        el.classList.add(LOCK_CLASS);
      }
      // 3. popover 导航 footer: 最后步隐藏(Done/上一步/进度), 引导用户直接点目标;
      //    非最后步恢复显示(driver.js 默认 flex). 关闭按钮在 title 区不受影响.
      if (popover?.footer) {
        popover.footer.style.display = isLast ? "none" : "";
      }
    },
    release: () => {
      // Tour 销毁时清理所有残留锁(走完/关闭/Esc 都会触发), 恢复页面正常交互.
      document
        .querySelectorAll<HTMLElement>(`.${LOCK_CLASS}`)
        .forEach((el) => el.classList.remove(LOCK_CLASS));
    },
  };
}
