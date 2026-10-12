// 模块解析:Node 风格解析算法的子集。
// 支持:相对路径(./ ../)、绝对路径;精确路径 → 补 .js → 补 .json → 目录 index.js。
// 不支持:裸模块说明符(npm 依赖)——打包第三方依赖不在本项目的目标内。

import { isAbsolute } from "node:path";
import { dirname, join, resolve as pathResolve } from "node:path";
import { statSync } from "node:fs";

export class ResolveError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResolveError";
  }
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function resolveRequest(fromFile, request) {
  if (!request.startsWith(".") && !isAbsolute(request)) {
    throw new ResolveError(
      `minibundle: 暂不支持打包 npm 依赖 ${JSON.stringify(request)}(仅支持相对/绝对路径)`);
  }
  const base = isAbsolute(request)
    ? request
    : pathResolve(dirname(fromFile), request);
  const candidates = [base, `${base}.js`, `${base}.json`];
  if (isDirectory(base)) {
    candidates.push(join(base, "index.js"));
  }
  for (const candidate of candidates) {
    if (isFile(candidate)) {
      return candidate;
    }
  }
  throw new ResolveError(
    `找不到模块 ${JSON.stringify(request)}(从 ${fromFile} 引入)`);
}
