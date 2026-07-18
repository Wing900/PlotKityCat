import type { AINoteSelectionPayload, AIProviderSettings } from "../../ai/services/aiTypes";

export type DesignCard = {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  order: number;
  plan: string;
  svg: string;
};

export type DesignCardVersion = {
  id: string;
  label: string;
  note: string;
  plan: string;
  svg: string;
  createdAt: number;
};

export type AIDesignCardGenerationRequest = {
  sceneName: string;
  settings: AIProviderSettings;
  selection: AINoteSelectionPayload;
};

export type AIDesignCardOptimizeRequest = {
  sceneName: string;
  cardId: string;
  instruction: string;
  settings: AIProviderSettings;
};

export type AIDesignCardResult = {
  card: DesignCard;
  source: string;
};

export type DesignCardSessionKind = "generate" | "optimize";

export type DesignCardSessionRequest = {
  kind: DesignCardSessionKind;
  sceneName: string;
  cardId: string;
  instruction: string;
  settings: AIProviderSettings;
  selection: AINoteSelectionPayload;
};

export type DesignCardSession = {
  sessionId: string;
  sceneName: string;
  kind: string;
  state: string;
};

export type DesignCardStartedEvent = {
  sessionId: string;
  sceneName: string;
  kind: string;
};

export type DesignCardSucceededEvent = {
  sessionId: string;
  sceneName: string;
  card: DesignCard;
  source: string;
};

export type DesignCardFailedEvent = {
  sessionId: string;
  sceneName: string;
  errorText: string;
};

export type DesignCardInterruptedEvent = {
  sessionId: string;
  sceneName: string;
  message: string;
};

