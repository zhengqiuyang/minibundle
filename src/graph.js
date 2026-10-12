// 依赖图:用 acorn 解析源码,提取 require("字面量") 调用,
// 从入口深度优先遍历构建模块图(依赖先于使用方,天然的拓扑序)。

import { readFileSync } from "node:fs";
import { isAbsolute, resolve as pathResolve } from "node:path";
import { parse } from "acorn";
import { resolveRequest } from "./resolve.js";

export class BundleError extends Error {
  constructor(message) {
    super(message);
    this.name = "BundleError";
  }
}

// 不遍历的 AST 属性(位置信息等)
const SKIP_KEYS = new Set(["type", "start", "end", "loc", "range", "sourceType"]);

export function extractRequires(code, file) {
  const requests = [];
  const visit = (node) => {
    if (!node || typeof node.type !== "string") {
      return;
    }
    if (node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === "require") {
      const [arg] = node.arguments;
      if (node.arguments.length === 1 &&
          arg.type === "Literal" && typeof arg.value === "string") {
        requests.push(arg.value);
      } else {
        throw new BundleError(
          `${file}: require 仅支持单个字符串字面量参数`);
      }
    }
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value.type === "string") {
        visit(value);
      }
    }
  };
  visit(parse(code, { ecmaVersion: "latest", sourceType: "commonjs" }));
  return requests;
}

export function buildGraph(entryFile) {
  const entry = isAbsolute(entryFile)
    ? entryFile
    : pathResolve(entryFile);
  const modules = [];
  const byFile = new Map();

  function addModule(file) {
    const existing = byFile.get(file);
    if (existing) {
      return existing;
    }
    const code = readFileSync(file, "utf8");
    const module = { id: modules.length, file, code, deps: {} };
    modules.push(module);
    byFile.set(file, module);
    if (file.endsWith(".js")) {  // JSON 模块是纯数据,不做 require 扫描
      for (const request of extractRequires(code, file)) {
        module.deps[request] = addModule(resolveRequest(file, request));
      }
    }
    return module;
  }

  addModule(entry);
  return { entryId: 0, modules };
}
