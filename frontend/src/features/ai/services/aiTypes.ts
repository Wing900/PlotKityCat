export type AIServiceMode = "free" | "custom" | "subscription";
export type AIGenerationKind = "visualize";

export type AIProviderSettings = {
  mode: AIServiceMode;
  url: string;
  key: string;
  model: string;
};

export type AINoteSelectionItem =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "image";
      name: string;
      alt: string;
      dataUrl: string;
      relativePath: string;
    };

export type AINoteSelectionPayload = {
  items: AINoteSelectionItem[];
};

export type AINoteSceneActionRequest = {
  sceneName: string;
  selection: AINoteSelectionPayload;
};

export type AINoteActionRequest = {
  kind: AIGenerationKind;
} & AINoteSceneActionRequest;

export type ChangedLineRange = {
  startLine: number;
  endLine: number;
};

export type AIWorkflowKind = "visualize" | "optimize" | "repair";

export type AIWorkflowRequest = {
  kind: AIWorkflowKind;
  sceneName: string;
  currentCode: string;
  instruction: string;
  errorText: string;
  selection: AINoteSelectionPayload;
  maxAttempts: number;
  settings: AIProviderSettings;
};

export type AIWorkflowSession = {
  sessionId: string;
  state: string;
};

export type AIWorkflowState =
  | "idle"
  | "working"
  | "checking"
  | "succeeded"
  | "failed"
  | "interrupted";

export type AIWorkflowStateChangedEvent = {
  sessionId: string;
  state: AIWorkflowState;
  attempt: number;
};

export type AIWorkflowCodeAppliedEvent = {
  sessionId: string;
  sceneName: string;
  code: string;
  changedRanges: ChangedLineRange[];
  attempt: number;
};

export type AIWorkflowSucceededEvent = {
  sessionId: string;
  sceneName: string;
  attempt: number;
};

export type AIWorkflowInterruptedEvent = {
  sessionId: string;
  sceneName: string;
  attempt: number;
  message: string;
};

export type AIWorkflowFailedEvent = {
  sessionId: string;
  sceneName: string;
  kind: "run_error" | "interrupted" | "no_ready" | "ai_error" | "patch_error";
  errorText: string;
  repairable: boolean;
  attempt: number;
};

export type CodeAIVersion = {
  id: string;
  label: string;
  note: string;
  code: string;
  createdAt: number;
};

export type CreateCodeAIVersionRequest = {
  sceneName: string;
  note: string;
  code: string;
};

export type AISubscriptionStatus = {
  status: "active" | "inactive" | "unconfigured" | "error";
  activated: boolean;
  deviceId: string;
  expireAt: string;
  lastCheckedAt: string;
  message: string;
  model: string;
  baseUrl: string;
};

export type AppUpdateStatus = {
  currentVersion: string;
  latestVersion: string;
  notes: string;
  publishedAt: string;
  lastCheckedAt: string;
  message: string;
  updateAvailable: boolean;
  downloaded: boolean;
  readyToInstall: boolean;
  actionKind: "check" | "latest" | "download" | "install";
  actionLabel: string;
};
