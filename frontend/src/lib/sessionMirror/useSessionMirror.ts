import { computed, onUnmounted, ref, type ComputedRef, type Ref } from "vue";
import { EventsOn } from "../../../wailsjs/runtime/runtime";

/**
 * 会话镜像骨架: 复用 AIWorkflow / DesignCard 两套"启动-等待终态-兜底清理"流程。
 *
 * 使用方在自己的 composable 里包一层强类型薄壳, 把差异点(事件名/桥接/终态构造/hook)
 * 通过 config 注入, 骨架负责 activeSessionId / pendingResolver / 事件路由 / settle /
 * onUnmounted 兜底。
 */

type AnySessionEvent = { sessionId: string };
type AnyEventHandler = (event: AnySessionEvent) => void;
type AnyOptions = Record<string, AnyEventHandler | undefined>;

export interface SessionMirrorRoute {
  eventName: string;
  /**
   * 处理事件。返回 undefined 表示非终态(如 started/state_changed/code_applied);
   * 返回非 undefined 表示终态, 骨架自动 settle(返回值)。
   * 回调请走 ctx.safeCall, 抛错不会阻断 settle。
   */
  handle: (
    event: AnySessionEvent,
    ctx: {
      options: AnyOptions;
      safeCall: (fn: () => void) => void;
    },
  ) => unknown | undefined;
}

export interface SessionMirrorConfig {
  startBridge: (request: unknown) => Promise<{ sessionId: string }>;
  stopBridge: (sessionId: string) => Promise<void>;
  busyMessage: string;
  routes: SessionMirrorRoute[];
  /** onUnmounted 时若仍有 pending, 构造 interrupted 终态 */
  fallbackInterruptedResult: (sessionId: string) => unknown;
  /** 可选 hook */
  onBeforeStart?: () => void;
  onSessionBound?: (session: { sessionId: string }) => void;
  onSettle?: () => void;
  onStartError?: () => void;
  /** 回调安全包装, 默认 try-catch + console.error */
  safeCall?: (fn: () => void) => void;
}

export interface SessionMirror {
  activeSessionId: Ref<string>;
  isSessionActive: ComputedRef<boolean>;
  startSession: (request: unknown, options: AnyOptions) => Promise<unknown>;
  stopActiveSession: () => Promise<void>;
}

export function useSessionMirror(config: SessionMirrorConfig): SessionMirror {
  const activeSessionId = ref("");
  const cleanupEvents = bindEvents();

  let pendingResolver: ((result: unknown) => void) | null = null;
  let activeOptions: AnyOptions = {};

  const isSessionActive: ComputedRef<boolean> = computed(
    () => activeSessionId.value !== "",
  );

  function safeCall(fn: () => void) {
    const impl = config.safeCall ?? defaultSafeCall;
    impl(fn);
  }

  function defaultSafeCall(fn: () => void) {
    try {
      fn();
    } catch (error) {
      console.error(error);
    }
  }

  async function startSession(
    request: unknown,
    options: AnyOptions = {},
  ): Promise<unknown> {
    if (activeSessionId.value) {
      throw new Error(config.busyMessage);
    }
    config.onBeforeStart?.();
    activeOptions = options;
    try {
      const session = await config.startBridge(request);
      activeSessionId.value = session.sessionId;
      config.onSessionBound?.(session);
      return await new Promise<unknown>((resolve) => {
        pendingResolver = resolve;
      });
    } catch (error) {
      config.onStartError?.();
      activeOptions = {};
      throw error;
    }
  }

  async function stopActiveSession() {
    if (!activeSessionId.value) {
      return;
    }
    await config.stopBridge(activeSessionId.value);
  }

  function bindEvents(): Array<() => void> {
    return config.routes.map((route) =>
      EventsOn(route.eventName, (...payload) => {
        const event = payload[0] as AnySessionEvent | undefined;
        if (!event || event.sessionId !== activeSessionId.value) {
          return;
        }
        const result = route.handle(event, { options: activeOptions, safeCall });
        if (result !== undefined) {
          settle(result);
        }
      }),
    );
  }

  function settle(result: unknown) {
    const resolve = pendingResolver;
    pendingResolver = null;
    activeOptions = {};
    activeSessionId.value = "";
    config.onSettle?.();
    resolve?.(result);
  }

  onUnmounted(() => {
    cleanupEvents.forEach((cleanup) => cleanup());
    cleanupEvents.length = 0;
    if (activeSessionId.value) {
      void config.stopBridge(activeSessionId.value).catch(() => undefined);
    }
    if (pendingResolver) {
      pendingResolver(config.fallbackInterruptedResult(activeSessionId.value));
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