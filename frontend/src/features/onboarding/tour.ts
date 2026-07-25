// Onboarding Tour 内容配置：纯逻辑，不依赖 driver.js 运行时。
//
// 设计: 首次进入应用时, 前端 Tour 引导用户在独立「新手引导」工作区
// 完成一次「笔记 → AI 生成 → 出图」的真实闭环实操.

export const TOUR_VERSION = "v1";

export interface TourStep {
  /** CSS 选择器, 缺省表示整页步(无高亮目标) */
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
}

// buildTourSteps 首次引导步骤(数学老师向).
// 顺序硬约束: 欢迎 → 左(Sidebar, 像课本目录) → 中(Editor) → 右(Note) → 点「可视化」.
// 不介绍运行按钮/放映模式. 最后一步是唯一动作步: 直接提示用户点,
// (useOnboarding + tourInteractionLock 负责隐藏 Done 按钮并放开点击).
// 锚点 [data-tour='xxx'] 需在对应组件上挂 data-tour 属性.
export function buildTourSteps(): TourStep[] {
  return [
    {
      popover: {
        title: "欢迎来到 PlotKityCat",
        description: "跟着走一遍，你就能画出第一张图。",
      },
    },
    {
      element: "[data-tour='sidebar-panel']",
      popover: {
        title: "脚本列表",
        description: "左侧是你的脚本列表，像课本的目录，每一项是一页可视化。",
      },
    },
    {
      element: "[data-tour='editor-pane']",
      popover: {
        title: "代码区",
        description: "中间是代码区，Python 代码显示在这里。",
      },
    },
    {
      element: "[data-tour='note-panel']",
      popover: {
        title: "笔记区",
        description: "右侧是笔记区，用自然语言描述你想画的图。",
      },
    },
    {
      element: "[data-tour='ai-generate']",
      popover: {
        title: "可视化",
        description: "点这个按钮，AI 帮你画出来。",
        side: "top",
        align: "end",
      },
    },
  ];
}
