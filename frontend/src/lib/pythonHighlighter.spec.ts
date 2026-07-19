import { describe, it, expect } from "vitest";
import { tokenizePythonLine } from "./pythonHighlighter";

describe("tokenizePythonLine", () => {
  function kinds(line: string) {
    return tokenizePythonLine(line).map((t) => t.kind);
  }

  it("空行返回单个 plain", () => {
    const tokens = tokenizePythonLine("");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: "plain", text: "" });
  });

  it("关键字识别", () => {
    expect(kinds("def")).toEqual(["keyword"]);
    expect(kinds("if x:")).toEqual(["keyword", "plain", "operator"]); // " x" 合并为一个 plain
  });

  it("内置函数识别", () => {
    expect(kinds("print")).toEqual(["builtin"]);
    expect(kinds("len(x)")).toEqual(["builtin", "operator", "plain", "operator"]);
  });

  it("注释吞到行尾", () => {
    const tokens = tokenizePythonLine("x = 1 # comment");
    const comment = tokens[tokens.length - 1];
    expect(comment.kind).toBe("comment");
    expect(comment.text).toBe("# comment");
  });

  it("装饰器识别", () => {
    expect(kinds("@decorator")).toEqual(["decorator"]);
  });

  it("字符串识别 (单引号)", () => {
    expect(kinds("'hi'")).toEqual(["string"]);
  });

  it("字符串识别 (三引号, 单行内闭合)", () => {
    const tokens = tokenizePythonLine('"""text"""');
    expect(tokens[0].kind).toBe("string");
  });

  it("数字识别 (整数/十六进制/浮点)", () => {
    expect(kinds("42")).toEqual(["number"]);
    expect(kinds("0xff")).toEqual(["number"]);
    expect(kinds("3.14")).toEqual(["number"]);
  });

  it("运算符识别 (双字符优先)", () => {
    expect(kinds("==")).toEqual(["operator"]);
    expect(kinds("!=")).toEqual(["operator"]);
    expect(kinds("->")).toEqual(["operator"]);
  });

  it("相邻同类合并为一个 token", () => {
    const tokens = tokenizePythonLine("def  x");
    // 'def'(keyword) + '  x'(plain, 空格和 x 合并)
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ kind: "keyword", text: "def" });
    expect(tokens[1]).toEqual({ kind: "plain", text: "  x" });
  });

  it("复杂行混合多类", () => {
    const tokens = tokenizePythonLine("for i in range(10):");
    const set = new Set(tokens.map((t) => t.kind));
    expect(set.has("keyword")).toBe(true);
    expect(set.has("builtin")).toBe(true);
    expect(set.has("operator")).toBe(true);
  });
});