import { TOUR_VERSION } from "./tour";

export type OnboardingStatus =
  | "unseen"
  | "started"
  | "dismissed"
  | "completed";

export interface OnboardingState {
  version: string;
  status: OnboardingStatus;
  lastStep: number;
  updatedAt: string;
}

export interface OnboardingStateRepository {
  load: () => Promise<OnboardingState>;
  update: (
    status: Exclude<OnboardingStatus, "unseen">,
    lastStep: number,
  ) => Promise<OnboardingState>;
  hasLegacyCompletion: () => boolean;
  saveLegacyCompletion: () => void;
}

const LEGACY_DONE_KEY = "plotkitycat.onboarding.tour.done";

type BridgeAppCompat = {
  GetOnboardingState?: () => Promise<Partial<OnboardingState>>;
  UpdateOnboardingState?: (
    version: string,
    status: string,
    lastStep: number,
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
    hasLegacyCompletion() {
      try {
        return localStorage.getItem(LEGACY_DONE_KEY) === TOUR_VERSION;
      } catch {
        return false;
      }
    },
    saveLegacyCompletion() {
      try {
        localStorage.setItem(LEGACY_DONE_KEY, TOUR_VERSION);
      } catch {
        // app-state.json 是主存储；WebView 禁用 Storage 时无需中断教程。
      }
    },
  };
}

function normalizeState(value?: Partial<OnboardingState>): OnboardingState {
  const lastStep =
    typeof value?.lastStep === "number" && Number.isFinite(value.lastStep)
      ? Math.max(0, Math.trunc(value.lastStep))
      : 0;

  return {
    version: typeof value?.version === "string" ? value.version.trim() : "",
    status: normalizeStatus(value?.status),
    lastStep,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : "",
  };
}

function normalizeStatus(value: unknown): OnboardingStatus {
  switch (value) {
    case "started":
    case "dismissed":
    case "completed":
      return value;
    default:
      return "unseen";
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
