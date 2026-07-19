import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("Error 实例返回 message", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("字符串原样返回", () => {
    expect(getErrorMessage("plain string")).toBe("plain string");
  });

  it("对象转字符串", () => {
    expect(getErrorMessage({ a: 1 })).toBe("[object Object]");
  });

  it("数字转字符串", () => {
    expect(getErrorMessage(42)).toBe("42");
  });

  it("null 返回 'null'", () => {
    expect(getErrorMessage(null)).toBe("null");
  });
});