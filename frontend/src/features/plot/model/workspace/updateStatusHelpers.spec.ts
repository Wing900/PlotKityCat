import { describe, it, expect } from "vitest";
import { normalizeUpdateStatus, getUpdateActionLabel } from "./updateStatusHelpers";

describe("getUpdateActionLabel", () => {
  it("install -> 立即安装", () => {
    expect(getUpdateActionLabel("install", "1.0")).toBe("立即安装");
  });
  it("download 带 latestVersion -> 下载 v版本", () => {
    expect(getUpdateActionLabel("download", "1.2.3")).toBe("下载 v1.2.3");
  });
  it("download 无版本 -> 下载更新", () => {
    expect(getUpdateActionLabel("download", "")).toBe("下载更新");
  });
  it("latest -> 已是最新版", () => {
    expect(getUpdateActionLabel("latest", "")).toBe("已是最新版");
  });
  it("check / 未知 -> 检查更新", () => {
    expect(getUpdateActionLabel("check", "")).toBe("检查更新");
    expect(getUpdateActionLabel("unknown" as never, "")).toBe("检查更新");
  });
});

describe("normalizeUpdateStatus", () => {
  it("readyToInstall -> actionKind=install", () => {
    const got = normalizeUpdateStatus({ readyToInstall: true, updateAvailable: true, currentVersion: "1.0", latestVersion: "2.0" });
    expect(got.actionKind).toBe("install");
    expect(got.actionLabel).toBe("立即安装");
    expect(got.readyToInstall).toBe(true);
  });

  it("updateAvailable 无 readyToInstall -> download", () => {
    const got = normalizeUpdateStatus({ updateAvailable: true, latestVersion: "1.2" });
    expect(got.actionKind).toBe("download");
    expect(got.actionLabel).toBe("下载 v1.2");
  });

  it("无更新 + 已检查 -> latest", () => {
    const got = normalizeUpdateStatus({ updateAvailable: false }, { hasCheckedThisSession: true });
    expect(got.actionKind).toBe("latest");
    expect(got.actionLabel).toBe("已是最新版");
  });

  it("无更新 + 未检查 -> check", () => {
    const got = normalizeUpdateStatus({ updateAvailable: false });
    expect(got.actionKind).toBe("check");
    expect(got.actionLabel).toBe("检查更新");
  });

  it("缺失字段用默认值", () => {
    const got = normalizeUpdateStatus({});
    expect(got.currentVersion).toBe("0.0.3.1");
    expect(got.latestVersion).toBe("");
    expect(got.message).toBe("当前已经是最新版本");
    expect(got.updateAvailable).toBe(false);
    expect(got.downloaded).toBe(false);
  });

  it("保留 notes/publishedAt/lastCheckedAt", () => {
    const got = normalizeUpdateStatus({
      notes: "fixes",
      publishedAt: "2026-01-01",
      lastCheckedAt: "2026-07-19",
    });
    expect(got.notes).toBe("fixes");
    expect(got.publishedAt).toBe("2026-01-01");
    expect(got.lastCheckedAt).toBe("2026-07-19");
  });
});