import { driver } from "driver.js";
import { nextTick } from "vue";
import {
  createOnboardingStateRepository,
  type OnboardingStateRepository,
  type OnboardingStatus,
} from "./onboardingStateRepository";
import { buildTourSteps, TOUR_VERSION } from "./tour";
import { createTourInteractionLock } from "./tourInteractionLock";

const FIRST_TOUR_REVEAL_DELAY_MS = 320;

export interface OnboardingDeps {
  /**
   * 切到 Scripts/ 中随应用发布的「新手引导」工作区，并把 snapshot 应用到 UI。
   * 返回 false 表示工作区缺失或切换失败，教程将安全跳过。
   */
  enterOnboardingWorkspace: () => Promise<boolean>;
  isTemplateAvailable: () => boolean;
  prepareOnboardingLayout?: () => void;
  stateRepository?: OnboardingStateRepository;
}

export function useOnboarding(deps: OnboardingDeps) {
  const stateRepository =
    deps.stateRepository ?? createOnboardingStateRepository();
  let scheduledStartTimer = 0;
  let activeDriver: ReturnType<typeof driver> | null = null;
  let isDisposed = false;
  let isStarting = false;

  async function driveTour(startStep = 0): Promise<boolean> {
    if (isStarting) return false;
    isStarting = true;
    let shouldPersistOutcome = false;

    try {
      const entered = await deps.enterOnboardingWorkspace();
      if (!entered) {
        if (!deps.isTemplateAvailable()) {
          await stateRepository.resolveAutoStart(false);
        }
        isStarting = false;
        return false;
      }
      deps.prepareOnboardingLayout?.();
      await nextTick();

      const steps = buildTourSteps();
      const missingTarget = steps.find(
        (step) =>
          typeof step.element === "string" &&
          !document.querySelector(step.element),
      );
      if (missingTarget?.element) {
        isStarting = false;
        console.warn(
          `[onboarding] 找不到教程锚点 ${missingTarget.element}，已跳过本次启动`,
        );
        return false;
      }

      const safeStartStep = Math.min(
        Math.max(0, Math.trunc(startStep)),
        steps.length - 1,
      );
      await persistState("started", safeStartStep);
      const lock = createTourInteractionLock(steps.length - 1);
      let outcome: Extract<OnboardingStatus, "dismissed" | "completed"> =
        "dismissed";
      let activeStep = safeStartStep;
      let lastPersistedStep = safeStartStep;
      let vizBtn: HTMLElement | null = null;
      let endOnVizClick: (() => void) | null = null;

      const driverObj = driver({
        animate: true,
        duration: 520,
        smoothScroll: true,
        showProgress: true,
        allowClose: true,
        overlayColor: "var(--text)",
        overlayOpacity: 0.34,
        stagePadding: 10,
        stageRadius: 22,
        popoverOffset: 14,
        popoverClass: "plotkitycat-tour",
        progressText: "{{current}} / {{total}}",
        nextBtnText: "继续",
        prevBtnText: "返回",
        doneBtnText: "完成",
        steps,
        onDestroyed: () => {
          activeDriver = null;
          lock.release();
          if (vizBtn && endOnVizClick) {
            vizBtn.removeEventListener("click", endOnVizClick);
          }
          isStarting = false;
          if (!isDisposed && shouldPersistOutcome) {
            void persistState(outcome, activeStep);
          }
        },
        onPopoverRender: (popover, options) => {
          activeStep = options.state.activeIndex ?? activeStep;
          if (activeStep !== lastPersistedStep) {
            lastPersistedStep = activeStep;
            void persistState("started", activeStep);
          }
          lock.onPopoverRender(popover, options);
        },
      });
      activeDriver = driverObj;
      driverObj.drive(safeStartStep);
      shouldPersistOutcome = true;

      vizBtn = document.querySelector<HTMLElement>("[data-tour='ai-generate']");
      if (vizBtn) {
        endOnVizClick = () => {
          outcome = "completed";
          driverObj.destroy();
        };
        vizBtn.addEventListener("click", endOnVizClick);
      }

      return true;
    } catch (error) {
      activeDriver?.destroy();
      activeDriver = null;
      isStarting = false;
      console.warn("[onboarding] 启动教程失败，应用继续运行", error);
      return false;
    }
  }

  async function resolveAutoStartStep(): Promise<number | null> {
    try {
      const state = await stateRepository.resolveAutoStart(
        deps.isTemplateAvailable(),
      );
      if (state.status === "unseen") return 0;
      if (state.status === "started" && state.version === TOUR_VERSION) {
        return state.lastStep;
      }
      return null;
    } catch (error) {
      console.warn("[onboarding] 读取状态失败，已跳过自动教程", error);
      return null;
    }
  }

  async function persistState(
    status: Extract<OnboardingStatus, "started" | "dismissed" | "completed">,
    lastStep: number,
  ) {
    try {
      await stateRepository.update(status, lastStep);
    } catch (error) {
      console.warn("[onboarding] 保存状态失败", error);
    }
  }

  async function startTourIfFirstTime(): Promise<boolean> {
    const startStep = await resolveAutoStartStep();
    if (startStep === null || isDisposed) return false;
    return driveTour(startStep);
  }

  return {
    /**
     * 等主界面完成 Reveal，再读取持久化状态并决定是否启动。
     * 延迟期间不切工作区，不阻塞应用初始化。
     */
    scheduleFirstTourAfterReveal(): boolean {
      if (isDisposed || scheduledStartTimer || isStarting) return false;
      scheduledStartTimer = window.setTimeout(() => {
        scheduledStartTimer = 0;
        void startTourIfFirstTime();
      }, FIRST_TOUR_REVEAL_DELAY_MS);
      return true;
    },
    dispose(): void {
      isDisposed = true;
      window.clearTimeout(scheduledStartTimer);
      scheduledStartTimer = 0;
      activeDriver?.destroy();
      activeDriver = null;
    },
  };
}
