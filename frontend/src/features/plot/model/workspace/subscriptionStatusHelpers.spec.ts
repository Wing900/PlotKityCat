import { describe, it, expect } from "vitest";
import { normalizeSubscriptionStatus } from "./subscriptionStatusHelpers";

describe("normalizeSubscriptionStatus", () => {
  it("合法 status 透传", () => {
    expect(normalizeSubscriptionStatus({ status: "active" }).status).toBe("active");
    expect(normalizeSubscriptionStatus({ status: "inactive" }).status).toBe("inactive");
    expect(normalizeSubscriptionStatus({ status: "unconfigured" }).status).toBe("unconfigured");
    expect(normalizeSubscriptionStatus({ status: "error" }).status).toBe("error");
  });

  it("非法/缺失 status 回退 error", () => {
    expect(normalizeSubscriptionStatus({ status: "weird" }).status).toBe("error");
    expect(normalizeSubscriptionStatus({}).status).toBe("error");
  });

  it("activated 强制布尔", () => {
    expect(normalizeSubscriptionStatus({ activated: true }).activated).toBe(true);
    expect(normalizeSubscriptionStatus({ activated: 0 as never }).activated).toBe(false);
    expect(normalizeSubscriptionStatus({}).activated).toBe(false);
  });

  it("缺失字符串字段用空串", () => {
    const got = normalizeSubscriptionStatus({});
    expect(got.deviceId).toBe("");
    expect(got.expireAt).toBe("");
    expect(got.lastCheckedAt).toBe("");
    expect(got.message).toBe("");
    expect(got.model).toBe("");
    expect(got.baseUrl).toBe("");
  });

  it("保留提供的字段", () => {
    const got = normalizeSubscriptionStatus({
      deviceId: "dev-1",
      expireAt: "2026-12-31",
      message: "ok",
      model: "gpt-x",
      baseUrl: "https://api",
    });
    expect(got.deviceId).toBe("dev-1");
    expect(got.expireAt).toBe("2026-12-31");
    expect(got.message).toBe("ok");
    expect(got.model).toBe("gpt-x");
    expect(got.baseUrl).toBe("https://api");
  });
});