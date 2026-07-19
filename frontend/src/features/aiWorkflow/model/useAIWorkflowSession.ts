import { ref, type ComputedRef, type Ref } from "vue";
import {
  startAIWorkflow,
  stopAIWorkflow,
} from "../services/aiWorkflowBridgeCompat";
import type {
  AIWorkflowCodeAppliedEvent,
  AIWorkflowFailedEvent,
  AIWorkflowInterruptedEvent,
  AIWorkflowRequest,
  AIWorkflowSession,
  AIWorkflowState,
  AIWorkflowStateChangedEvent,
  AIWorkflowSucceededEvent,
} from "../../ai/services/aiTypes";
import { useSessionMirror } from "../../../lib/sessionMirror";

type AIActivityStatus = {
  isAIGenerating: Ref<boolean>;
  startChecking: () => void;
  startWorking: () => void;
  stop: () => void;
};

type StartWorkflowOptions = {
  onCodeApplied?: (event: AIWorkflowCodeAppliedEvent) => void;
  onFailed?: (event: AIWorkflowFailedEvent) => void;
  onInterrupted?: (event: AIWorkflowInterruptedEvent) => void;
  onStateChanged?: (event: AIWorkflowStateChangedEvent) => void;
  onSucceeded?: (event: AIWorkflowSucceededEvent) => void;
};

type WorkflowTerminalResult =
  | { ok: true; event: AIWorkflowSucceededEvent }
  | { ok: false; type: "failed"; event: AIWorkflowFailedEvent }
  | { ok: false; type: "interrupted"; event: AIWorkflowInterruptedEvent };

export function useAIWorkflowSession(aiActivity: AIActivityStatus) {
  const activeState = ref<AIWorkflowState>("idle");

  const mirror = useSessionMirror({
    startBridge: (req) => startAIWorkflow(req as AIWorkflowRequest),
    stopBridge: stopAIWorkflow,
    busyMessage: "已有 AI 工作流正在运行，请先等待完成或手动停止",
    onBeforeStart: () => aiActivity.startWorking(),
    onStartError: () => aiActivity.stop(),
    onSettle: () => {
      activeState.value = "idle";
      aiActivity.stop();
    },
    onSessionBound: (session) => {
      activeState.value = normalizeState((session as AIWorkflowSession).state);
    },
    fallbackInterruptedResult: (sessionId) => ({
      ok: false,
      type: "interrupted" as const,
      event: {
        attempt: 0,
        message: "AI 工作流已被关闭",
        sceneName: "",
        sessionId,
      } satisfies AIWorkflowInterruptedEvent,
    }),
    routes: [
      {
        eventName: "ai:workflow_state_changed",
        handle: (event, { options, safeCall }) => {
          const e = event as AIWorkflowStateChangedEvent;
          activeState.value = normalizeState(e.state);
          if (e.state === "checking") {
            aiActivity.startChecking();
          } else if (e.state === "working") {
            aiActivity.startWorking();
          }
          safeCall(() => options.onStateChanged?.(e));
          return undefined;
        },
      },
      {
        eventName: "ai:workflow_code_applied",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onCodeApplied?.(event as AIWorkflowCodeAppliedEvent));
          return undefined;
        },
      },
      {
        eventName: "ai:workflow_succeeded",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onSucceeded?.(event as AIWorkflowSucceededEvent));
          return { ok: true, event: event as AIWorkflowSucceededEvent };
        },
      },
      {
        eventName: "ai:workflow_failed",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onFailed?.(event as AIWorkflowFailedEvent));
          return {
            ok: false,
            type: "failed" as const,
            event: event as AIWorkflowFailedEvent,
          };
        },
      },
      {
        eventName: "ai:workflow_interrupted",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onInterrupted?.(event as AIWorkflowInterruptedEvent));
          return {
            ok: false,
            type: "interrupted" as const,
            event: event as AIWorkflowInterruptedEvent,
          };
        },
      },
    ],
  });

  async function startWorkflow(
    request: AIWorkflowRequest,
    options: StartWorkflowOptions = {},
  ): Promise<WorkflowTerminalResult> {
    return mirror.startSession(request, options as never) as Promise<WorkflowTerminalResult>;
  }

  async function stopActiveWorkflow() {
    await mirror.stopActiveSession();
  }

  return {
    activeState,
    isSessionActive: mirror.isSessionActive,
    startWorkflow,
    stopActiveWorkflow,
  };
}

function normalizeState(value: string): AIWorkflowState {
  if (
    value === "idle" ||
    value === "working" ||
    value === "checking" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "interrupted"
  ) {
    return value;
  }

  throw new Error(`unknown AI workflow state: ${value}`);
}