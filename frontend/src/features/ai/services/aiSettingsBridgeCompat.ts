import type { AIProviderSettings } from "./aiTypes";

type BridgeAppCompat = {
  GetAISettings?: () => Promise<AIProviderSettings>;
  SaveAISettings?: (settings: AIProviderSettings) => Promise<AIProviderSettings>;
};

export async function getAISettings(): Promise<AIProviderSettings> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.GetAISettings === "function") {
    return normalizeAISettings(await bridgeApp.GetAISettings());
  }

  return createDefaultAISettings();
}

export async function saveAISettings(settings: AIProviderSettings): Promise<AIProviderSettings> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.SaveAISettings === "function") {
    return normalizeAISettings(await bridgeApp.SaveAISettings(settings));
  }

  throw new Error("当前运行中的后端版本还不支持保存 AI 设置，请重启应用后再试");
}

export function createDefaultAISettings(): AIProviderSettings {
  return {
    mode: "free",
    url: "",
    key: "",
    model: "",
  };
}

function normalizeAISettings(value: Partial<AIProviderSettings> | null | undefined): AIProviderSettings {
  return {
    mode:
      value?.mode === "free" || value?.mode === "subscription"
        ? value.mode
        : "custom",
    url: typeof value?.url === "string" ? value.url : "",
    key: typeof value?.key === "string" ? value.key : "",
    model: typeof value?.model === "string" ? value.model : "",
  };
}

function getBridgeApp(): BridgeAppCompat {
  return ((window as typeof window & {
    go?: { bridge?: { App?: BridgeAppCompat } };
  }).go?.bridge?.App ?? {}) as BridgeAppCompat;
}
