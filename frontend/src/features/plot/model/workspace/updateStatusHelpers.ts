import type { AppUpdateStatus } from "../../../ai/services/aiTypes";
import type { UpdateStatusLike } from "../../../updates/services/updateBridgeCompat";

export function normalizeUpdateStatus(
  status: UpdateStatusLike,
  options?: { hasCheckedThisSession?: boolean },
): AppUpdateStatus {
  const readyToInstall = !!status.readyToInstall;
  const updateAvailable = !!status.updateAvailable;
  const hasChecked = !!options?.hasCheckedThisSession;
  const latestVersion = typeof status.latestVersion === "string" ? status.latestVersion : "";
  const actionKind = readyToInstall
    ? "install"
    : updateAvailable
      ? "download"
      : hasChecked
        ? "latest"
        : "check";

  return {
    currentVersion: typeof status.currentVersion === "string" ? status.currentVersion : "0.0.3.1",
    latestVersion,
    notes: typeof status.notes === "string" ? status.notes : "",
    publishedAt: typeof status.publishedAt === "string" ? status.publishedAt : "",
    lastCheckedAt: typeof status.lastCheckedAt === "string" ? status.lastCheckedAt : "",
    message: typeof status.message === "string" ? status.message : "当前已经是最新版本",
    updateAvailable,
    downloaded: !!status.downloaded,
    readyToInstall,
    actionKind,
    actionLabel: getUpdateActionLabel(actionKind, latestVersion),
  };
}

export function getUpdateActionLabel(
  actionKind: AppUpdateStatus["actionKind"],
  latestVersion: string,
): string {
  switch (actionKind) {
    case "install":
      return "立即安装";
    case "download":
      return latestVersion ? `下载 v${latestVersion}` : "下载更新";
    case "latest":
      return "已是最新版";
    case "check":
    default:
      return "检查更新";
  }
}