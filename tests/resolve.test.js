// M1:模块解析器测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { resolveRequest, ResolveError } from "../src/resolve.js";
import { makeProject } from "./helpers.js";

test("精确路径直接命中", () => {
  const root = makeProject({ "a.js": "module.exports = 1;" });
  const resolved = resolveRequest(join(root, "main.js"), "./a.js");
  assert.equal(resolved, join(root, "a.js"));
});

test("省略扩展名补 .js", () => {
  const root = makeProject({ "util.js": "module.exports = 2;" });
  const resolved = resolveRequest(join(root, "main.js"), "./util");
  assert.equal(resolved, join(root, "util.js"));
});

test("JSON 文件补 .json", () => {
  const root = makeProject({ "config.json": '{"x":1}' });
  const resolved = resolveRequest(join(root, "main.js"), "./config");
  assert.equal(resolved, join(root, "config.json"));
});

test("目录解析到 index.js", () => {
  const root = makeProject({ "lib/index.js": "module.exports = 3;" });
  const resolved = resolveRequest(join(root, "main.js"), "./lib");
  assert.equal(resolved, join(root, "lib", "index.js"));
});

test("相对导入基于引入者所在目录", () => {
  const root = makeProject({
    "src/main.js": "x",
    "src/lib/a.js": "y",
    "shared.js": "z",
  });
  const resolved = resolveRequest(join(root, "src/main.js"), "./lib/a");
  assert.equal(resolved, join(root, "src/lib/a.js"));
  const up = resolveRequest(join(root, "src/lib/a.js"), "../../shared");
  assert.equal(up, join(root, "shared.js"));
});

test("无扩展名文件按精确路径命中", () => {
  const root = makeProject({ "plain": "module.exports = 4;" });
  const resolved = resolveRequest(join(root, "main.js"), "./plain");
  assert.equal(resolved, join(root, "plain"));
});

test("找不到模块时报错并带请求名", () => {
  const root = makeProject({ "a.js": "x" });
  assert.throws(
    () => resolveRequest(join(root, "a.js"), "./nope"),
    (err) => err instanceof ResolveError && err.message.includes("./nope"));
});

test("裸模块说明符(npm 依赖)明确不支持", () => {
  const root = makeProject({ "a.js": "x" });
  assert.throws(
    () => resolveRequest(join(root, "a.js"), "lodash"),
    (err) => err instanceof ResolveError && err.message.includes("npm 依赖"));
});
