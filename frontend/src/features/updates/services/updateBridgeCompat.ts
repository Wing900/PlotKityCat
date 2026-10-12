export type UpdateStatusLike = {
  currentVersion?: string;
  latestVersion?: string;
  notes?: string;
  publishedAt?: string;
  lastCheckedAt?: string;
  message?: string;
  updateAvailable?: boolean;
  downloaded?: boolean;
  readyToInstall?: boolean;
};

type BridgeAppCompat = {
  GetUpdateStatus?: () => Promise<UpdateStatusLike>;
  CheckForUpdates?: (force: boolean) => Promise<UpdateStatusLike>;
  DownloadUpdate?: () => Promise<UpdateStatusLike>;
  InstallUpdateAndRestart?: () => Promise<void>;
  ReportUpgradeReady?: () => Promise<void>;
};

export async function reportUpgradeReady(): Promise<void> {
  await getBridgeApp().ReportUpgradeReady?.();
}

export async function getUpdateStatus(): Promise<UpdateStatusLike> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.GetUpdateStatus === "function") {
    return bridgeApp.GetUpdateStatus();
  }

  return {};
}

export async function checkForUpdates(force: boolean): Promise<UpdateStatusLike> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.CheckForUpdates === "function") {
    return bridgeApp.CheckForUpdates(force);
  }

  throw new Error("当前运行中的后端版本还不支持检查更新，请重启应用后再试");
}

export async function downloadUpdate(): Promise<UpdateStatusLike> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.DownloadUpdate === "function") {
    return bridgeApp.DownloadUpdate();
  }

  throw new Error("当前运行中的后端版本还不支持下载更新，请重启应用后再试");
}

export async function installUpdateAndRestart(): Promise<void> {
  const bridgeApp = getBridgeApp();
  if (typeof bridgeApp.InstallUpdateAndRestart === "function") {
    return bridgeApp.InstallUpdateAndRestart();
  }

  throw new Error("当前运行中的后端版本还不支持安装更新，请重启应用后再试");
}

function getBridgeApp(): BridgeAppCompat {
  return ((window as typeof window & {
    go?: { bridge?: { App?: BridgeAppCompat } };
  }).go?.bridge?.App ?? {}) as BridgeAppCompat;
}
