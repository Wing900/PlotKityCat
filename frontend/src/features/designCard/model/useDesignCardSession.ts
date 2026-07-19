import { computed, type ComputedRef, type Ref } from "vue";
import {
  startDesignCardSession,
  stopDesignCardSession,
} from "../services/designCardBridgeCompat";
import type {
  DesignCardFailedEvent,
  DesignCardInterruptedEvent,
  DesignCardSessionRequest,
  DesignCardStartedEvent,
  DesignCardSucceededEvent,
} from "../services/designCardTypes";
import { useSessionMirror } from "../../../lib/sessionMirror";

type StartSessionOptions = {
  onStarted?: (event: DesignCardStartedEvent) => void;
  onSucceeded?: (event: DesignCardSucceededEvent) => void;
  onFailed?: (event: DesignCardFailedEvent) => void;
  onInterrupted?: (event: DesignCardInterruptedEvent) => void;
};

type SessionTerminalResult =
  | { ok: true; event: DesignCardSucceededEvent }
  | { ok: false; type: "failed"; event: DesignCardFailedEvent }
  | { ok: false; type: "interrupted"; event: DesignCardInterruptedEvent };

export function useDesignCardSession() {
  const mirror = useSessionMirror({
    startBridge: (req) => startDesignCardSession(req as DesignCardSessionRequest),
    stopBridge: stopDesignCardSession,
    busyMessage: "已有设计卡片会话正在运行, 请先等待完成或中断",
    fallbackInterruptedResult: (sessionId) => ({
      ok: false,
      type: "interrupted" as const,
      event: {
        sessionId,
        sceneName: "",
        message: "设计卡片会话已被关闭",
      } satisfies DesignCardInterruptedEvent,
    }),
    routes: [
      {
        eventName: "designcard:started",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onStarted?.(event as DesignCardStartedEvent));
          return undefined;
        },
      },
      {
        eventName: "designcard:succeeded",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onSucceeded?.(event as DesignCardSucceededEvent));
          return { ok: true, event: event as DesignCardSucceededEvent };
        },
      },
      {
        eventName: "designcard:failed",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onFailed?.(event as DesignCardFailedEvent));
          return {
            ok: false,
            type: "failed" as const,
            event: event as DesignCardFailedEvent,
          };
        },
      },
      {
        eventName: "designcard:interrupted",
        handle: (event, { options, safeCall }) => {
          safeCall(() => options.onInterrupted?.(event as DesignCardInterruptedEvent));
          return {
            ok: false,
            type: "interrupted" as const,
            event: event as DesignCardInterruptedEvent,
          };
        },
      },
    ],
  });

  async function startSession(
    request: DesignCardSessionRequest,
    options: StartSessionOptions = {},
  ): Promise<SessionTerminalResult> {
    return mirror.startSession(request, options as never) as Promise<SessionTerminalResult>;
  }

  return {
    activeSessionId: mirror.activeSessionId,
    isSessionActive: mirror.isSessionActive,
    startSession,
    stopActiveSession: mirror.stopActiveSession,
  };
}