import { computed, onUnmounted, ref } from "vue";
import { EventsOn } from "../../../../wailsjs/runtime/runtime";
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

type StartSessionOptions = {
  onSucceeded?: (event: DesignCardSucceededEvent) => void;
  onFailed?: (event: DesignCardFailedEvent) => void;
  onInterrupted?: (event: DesignCardInterruptedEvent) => void;
};

type SessionTerminalResult =
  | { ok: true; event: DesignCardSucceededEvent }
  | { ok: false; type: "failed"; event: DesignCardFailedEvent }
  | { ok: false; type: "interrupted"; event: DesignCardInterruptedEvent };

export function useDesignCardSession() {
  const activeSessionId = ref("");
  const cleanupEvents = bindSessionEvents();

  let pendingResolver: ((result: SessionTerminalResult) => void) | null = null;
  let activeOptions: StartSessionOptions | null = null;

  const isSessionActive = computed(() => activeSessionId.value !== "");

  async function startSession(
    request: DesignCardSessionRequest,
    options: StartSessionOptions = {},
  ): Promise<SessionTerminalResult> {
    if (activeSessionId.value) {
      throw new Error("已有设计卡片会话正在运行, 请先等待完成或中断");
    }

    activeOptions = options;
    try {
      const session = await startDesignCardSession(request);
      activeSessionId.value = session.sessionId;
      return await new Promise<SessionTerminalResult>((resolve) => {
        pendingResolver = resolve;
      });
    } catch (error) {
      activeOptions = null;
      throw error;
    }
  }

  async function stopActiveSession() {
    if (!activeSessionId.value) {
      return;
    }
    await stopDesignCardSession(activeSessionId.value);
  }

  function bindSessionEvents() {
    return [
      EventsOn("designcard:started", (...payload) =>
        handleStarted(payload[0] as DesignCardStartedEvent | undefined),
      ),
      EventsOn("designcard:succeeded", (...payload) =>
        handleSucceeded(payload[0] as DesignCardSucceededEvent | undefined),
      ),
      EventsOn("designcard:failed", (...payload) =>
        handleFailed(payload[0] as DesignCardFailedEvent | undefined),
      ),
      EventsOn("designcard:interrupted", (...payload) =>
        handleInterrupted(payload[0] as DesignCardInterruptedEvent | undefined),
      ),
    ];
  }

  function handleStarted(event?: DesignCardStartedEvent) {
    if (!event || event.sessionId !== activeSessionId.value) {
      return;
    }
  }

  function handleSucceeded(event?: DesignCardSucceededEvent) {
    if (!event || event.sessionId !== activeSessionId.value) {
      return;
    }
    try {
      activeOptions?.onSucceeded?.(event);
    } finally {
      settle({ ok: true, event });
    }
  }

  function handleFailed(event?: DesignCardFailedEvent) {
    if (!event || event.sessionId !== activeSessionId.value) {
      return;
    }
    try {
      activeOptions?.onFailed?.(event);
    } finally {
      settle({ ok: false, type: "failed", event });
    }
  }

  function handleInterrupted(event?: DesignCardInterruptedEvent) {
    if (!event || event.sessionId !== activeSessionId.value) {
      return;
    }
    try {
      activeOptions?.onInterrupted?.(event);
    } finally {
      settle({ ok: false, type: "interrupted", event });
    }
  }

  function settle(result: SessionTerminalResult) {
    const resolve = pendingResolver;
    pendingResolver = null;
    activeOptions = null;
    activeSessionId.value = "";
    resolve?.(result);
  }

  onUnmounted(() => {
    cleanupEvents.forEach((cleanup) => cleanup());
    cleanupEvents.length = 0;
    if (activeSessionId.value) {
      void stopDesignCardSession(activeSessionId.value).catch(() => undefined);
    }
    if (pendingResolver) {
      pendingResolver({
        ok: false,
        type: "interrupted",
        event: {
          sessionId: activeSessionId.value,
          sceneName: "",
          message: "设计卡片会话已被关闭",
        },
      });
      pendingResolver = null;
    }
  });

  return {
    activeSessionId,
    isSessionActive,
    startSession,
    stopActiveSession,
  };
}