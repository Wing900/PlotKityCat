import { TOUR_VERSION } from "./tour";

export type OnboardingStatus =
  | "unseen"
  | "started"
  | "dismissed"
  | "completed"
  | "suppressed";

export type OnboardingSuppressionReason =
  | ""
  | "existing-user"
  | "template-missing";

export interface OnboardingState {
  version: string;
  status: OnboardingStatus;
  lastStep: number;
  suppressionReason: OnboardingSuppressionReason;
  updatedAt: string;
}

export interface OnboardingStateRepository {
  load: () => Promise<OnboardingState>;
  resolveAutoStart: (templateAvailable: boolean) => Promise<OnboardingState>;
  update: (
    status: Extract<OnboardingStatus, "started" | "dismissed" | "completed">,
    lastStep: number,
  ) => Promise<OnboardingState>;
}

type BridgeAppCompat = {
  GetOnboardingState?: () => Promise<Partial<OnboardingState>>;
  UpdateOnboardingState?: (
    version: string,
    status: string,
    lastStep: number,
  ) => Promise<Partial<OnboardingState>>;
  ResolveOnboardingState?: (
    version: string,
    templateAvailable: boolean,
  ) => Promise<Partial<OnboardingState>>;
};

export function createOnboardingStateRepository(): OnboardingStateRepository {
  return {
    async load() {
      const value = await callBridge(
        "GetOnboardingState",
        (app) => app.GetOnboardingState?.(),
      );
      return normalizeState(value);
    },
    async resolveAutoStart(templateAvailable) {
      const value = await callBridge(
        "ResolveOnboardingState",
        (app) =>
          app.ResolveOnboardingState?.(
            TOUR_VERSION,
            templateAvailable,
          ),
      );
      return normalizeState(value);
    },
    async update(status, lastStep) {
      const value = await callBridge(
        "UpdateOnboardingState",
        (app) =>
          app.UpdateOnboardingState?.(
            TOUR_VERSION,
            status,
            Math.max(0, Math.trunc(lastStep)),
          ),
      );
      return normalizeState(value);
    },
  };
}

function normalizeState(value?: Partial<OnboardingState>): OnboardingState {
  const lastStep =
    typeof value?.lastStep === "number" && Number.isFinite(value.lastStep)
      ? Math.max(0, Math.trunc(value.lastStep))
      : 0;
  const rawSuppressionReason = normalizeSuppressionReason(value?.suppressionReason);
  const normalizedStatus = normalizeStatus(value?.status);
  const status =
    normalizedStatus === "suppressed" && rawSuppressionReason === ""
      ? "unseen"
      : normalizedStatus;
  const suppressionReason =
    status === "suppressed" ? rawSuppressionReason : "";

  return {
    version: typeof value?.version === "string" ? value.version.trim() : "",
    status,
    lastStep,
    suppressionReason,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : "",
  };
}

function normalizeStatus(value: unknown): OnboardingStatus {
  switch (value) {
    case "started":
    case "dismissed":
    case "completed":
    case "suppressed":
      return value;
    default:
      return "unseen";
  }
}

function normalizeSuppressionReason(value: unknown): OnboardingSuppressionReason {
  switch (value) {
    case "existing-user":
    case "template-missing":
      return value;
    default:
      return "";
  }
}

function callBridge<T>(
  name: keyof BridgeAppCompat,
  call: (app: BridgeAppCompat) => Promise<T> | undefined,
) {
  const result = call(getBridgeApp());
  if (result) {
    return result;
  }
  throw new Error(`当前运行中的后端版本还不支持 ${String(name)}，请重启应用后再试`);
}

function getBridgeApp(): BridgeAppCompat {
  return ((window as typeof window & {
    go?: { bridge?: { App?: BridgeAppCompat } };
  }).go?.bridge?.App ?? {}) as BridgeAppCompat;
}
