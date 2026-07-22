import { describe, expect, it } from "vitest";
import {
  getDesignCardSvgAspectRatio,
  getDesignCardSvgSize,
} from "../../src/features/designCard/services/designCardSvgGeometry";

describe("designCardSvgGeometry", () => {
  it("优先读取 viewBox 尺寸", () => {
    expect(getDesignCardSvgSize('<svg viewBox="0 0 640 480" width="10" height="10">'))
      .toEqual({ width: 640, height: 480 });
    expect(getDesignCardSvgAspectRatio('<svg viewBox="0,0,16,9"></svg>')).toBe("16 / 9");
  });

  it("回退读取数字 width 与 height", () => {
    expect(getDesignCardSvgSize('<svg width="320px" height="180px">')).toEqual({ width: 320, height: 180 });
  });

  it("拒绝缺少尺寸、百分比与无效 viewBox", () => {
    expect(getDesignCardSvgSize("<div />")).toBeNull();
    expect(getDesignCardSvgSize('<svg width="100%" height="50%">')).toBeNull();
    expect(getDesignCardSvgSize('<svg viewBox="0 0 0 200" width="0" height="-1">')).toBeNull();
    expect(getDesignCardSvgAspectRatio("<svg />")).toBeUndefined();
  });
});
