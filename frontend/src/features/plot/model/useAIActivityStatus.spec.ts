import { describe, it, expect } from "vitest";
import { useAIActivityStatus } from "./useAIActivityStatus";

describe("useAIActivityStatus", () => {
  it("初始 isAIGenerating=false", () => {
    expect(useAIActivityStatus().isAIGenerating.value).toBe(false);
  });

  it("start / startWorking / startChecking 都置 true", () => {
    const a = useAIActivityStatus();
    a.start();
    expect(a.isAIGenerating.value).toBe(true);
    a.stop();
    a.startWorking();
    expect(a.isAIGenerating.value).toBe(true);
    a.stop();
    a.startChecking();
    expect(a.isAIGenerating.value).toBe(true);
  });

  it("stop 置 false", () => {
    const a = useAIActivityStatus();
    a.start();
    a.stop();
    expect(a.isAIGenerating.value).toBe(false);
  });
});