import type {
  AIDesignCardGenerationRequest,
  AIDesignCardOptimizeRequest,
  AIDesignCardResult,
  DesignCard,
  DesignCardSession,
  DesignCardSessionRequest,
  DesignCardVersion,
} from "./designCardTypes";

type BridgeAppCompat = {
  DeleteDesignCard?: (sceneName: string, cardId: string) => Promise<void>;
  GenerateDesignCardFromSelection?: (
    request: AIDesignCardGenerationRequest,
  ) => Promise<AIDesignCardResult>;
  GetDesignCard?: (sceneName: string, cardId: string) => Promise<DesignCard>;
  ListDesignCards?: (sceneName: string) => Promise<DesignCard[]>;
  ListDesignCardVersions?: (
    sceneName: string,
    cardId: string,
  ) => Promise<DesignCardVersion[]>;
  OptimizeDesignCard?: (
    request: AIDesignCardOptimizeRequest,
  ) => Promise<AIDesignCardResult>;
  StartDesignCardSession?: (
    request: DesignCardSessionRequest,
  ) => Promise<DesignCardSession>;
  StopDesignCardSession?: (sessionId: string) => Promise<void>;
  UpdateDesignCardPlan?: (
    sceneName: string,
    cardId: string,
    plan: string,
  ) => Promise<DesignCard>;
};

export async function generateDesignCardFromSelection(
  request: AIDesignCardGenerationRequest,
): Promise<AIDesignCardResult> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.GenerateDesignCardFromSelection === "function") {
    return normalizeDesignCardResult(await bridgeApp.GenerateDesignCardFromSelection(request));
  }

  throw new Error("当前运行中的后端版本还不支持设计卡片生成，请重启应用后再试");
}

export async function optimizeDesignCard(
  request: AIDesignCardOptimizeRequest,
): Promise<AIDesignCardResult> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.OptimizeDesignCard === "function") {
    return normalizeDesignCardResult(await bridgeApp.OptimizeDesignCard(request));
  }

  throw new Error("当前运行中的后端版本还不支持设计卡片优化，请重启应用后再试");
}

export async function listDesignCards(sceneName: string): Promise<DesignCard[]> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.ListDesignCards === "function") {
    return (await bridgeApp.ListDesignCards(sceneName)).map(normalizeDesignCard);
  }

  return [];
}



export async function getDesignCard(sceneName: string, cardId: string): Promise<DesignCard> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.GetDesignCard === "function") {
    return normalizeDesignCard(await bridgeApp.GetDesignCard(sceneName, cardId));
  }

  throw new Error("当前运行中的后端版本还不支持读取设计卡片，请重启应用后再试");
}

export async function updateDesignCardPlan(
  sceneName: string,
  cardId: string,
  plan: string,
): Promise<DesignCard> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.UpdateDesignCardPlan === "function") {
    return normalizeDesignCard(await bridgeApp.UpdateDesignCardPlan(sceneName, cardId, plan));
  }

  throw new Error("当前运行中的后端版本还不支持保存设计卡片，请重启应用后再试");
}

export async function deleteDesignCard(sceneName: string, cardId: string): Promise<void> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.DeleteDesignCard === "function") {
    await bridgeApp.DeleteDesignCard(sceneName, cardId);
    return;
  }

  throw new Error("当前运行中的后端版本还不支持删除设计卡片，请重启应用后再试");
}

export async function listDesignCardVersions(
  sceneName: string,
  cardId: string,
): Promise<DesignCardVersion[]> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.ListDesignCardVersions === "function") {
    return (await bridgeApp.ListDesignCardVersions(sceneName, cardId)).map((version) => ({
      id: String(version.id ?? ""),
      label: String(version.label ?? ""),
      note: String(version.note ?? ""),
      plan: String(version.plan ?? ""),
      svg: String(version.svg ?? ""),
      createdAt: Number(version.createdAt ?? 0),
    }));
  }

  return [];
}

export async function startDesignCardSession(
  request: DesignCardSessionRequest,
): Promise<DesignCardSession> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.StartDesignCardSession === "function") {
    const session = await bridgeApp.StartDesignCardSession(request);
    return normalizeSession(session);
  }

  throw new Error("当前运行中的后端版本还不支持设计卡片会话, 请重启应用后再试");
}

export async function stopDesignCardSession(sessionId: string): Promise<void> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.StopDesignCardSession === "function") {
    await bridgeApp.StopDesignCardSession(sessionId);
    return;
  }

  throw new Error("当前运行中的后端版本还不支持停止设计卡片会话, 请重启应用后再试");
}

function normalizeSession(session: DesignCardSession): DesignCardSession {
  return {
    sessionId: String(session.sessionId ?? ""),
    sceneName: String(session.sceneName ?? ""),
    kind: String(session.kind ?? ""),
    state: String(session.state ?? "working"),
  };
}

function normalizeDesignCardResult(result: AIDesignCardResult): AIDesignCardResult {
  return {
    card: normalizeDesignCard(result.card),
    source: String(result.source ?? ""),
  };
}

function normalizeDesignCard(card: Partial<DesignCard> | null | undefined): DesignCard {
  return {
    id: String(card?.id ?? ""),
    createdAt: Number(card?.createdAt ?? 0),
    updatedAt: Number(card?.updatedAt ?? 0),
    title: String(card?.title ?? card?.id ?? ""),
    order: Number(card?.order ?? 0),
    plan: String(card?.plan ?? ""),
    svg: String(card?.svg ?? ""),
  };
}


function getBridgeApp(): BridgeAppCompat {
  return ((window as typeof window & {
    go?: { bridge?: { App?: BridgeAppCompat } };
  }).go?.bridge?.App ?? {}) as BridgeAppCompat;
}
