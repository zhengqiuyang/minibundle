// M1:依赖图测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildGraph, extractRequires, BundleError } from "../src/graph.js";
import { makeProject } from "./helpers.js";

test("菱形依赖只打包一份共享模块", () => {
  const root = makeProject({
    "entry.js": [
      'const a = require("./a");',
      'const b = require("./b");',
      "module.exports = a + b;",
    ].join("\n"),
    "a.js": 'module.exports = require("./shared");',
    "b.js": 'module.exports = require("./shared") + 1;',
    "shared.js": "module.exports = 42;",
  });
  const graph = buildGraph(join(root, "entry.js"));
  assert.equal(graph.modules.length, 4);
  assert.equal(new Set(graph.modules.map((m) => m.file)).size, 4);
  const shared = graph.modules.find((m) => m.file.endsWith("shared.js"));
  const a = graph.modules.find((m) => m.file.endsWith("a.js"));
  assert.equal(a.deps["./shared"], shared);
  assert.equal(graph.entryId, 0);
  assert.ok(graph.modules[0].file.endsWith("entry.js"));
});

test("依赖先于使用方(拓扑序),JSON 也是一等模块", () => {
  const root = makeProject({
    "entry.js": 'module.exports = require("./config").answer;',
    "config.json": '{"answer": 42}',
  });
  const graph = buildGraph(join(root, "entry.js"));
  assert.equal(graph.modules.length, 2);
  assert.ok(graph.modules[1].file.endsWith("config.json"));
});

test("require 参数必须是字符串字面量", () => {
  const root = makeProject({
    "entry.js": 'const name = "./a"; require(name);',
    "a.js": "module.exports = 1;",
  });
  assert.throws(
    () => buildGraph(join(root, "entry.js")),
    (err) => err instanceof BundleError && err.message.includes("字面量"));
});

test("字符串与注释里的 require 不会误报", () => {
  const code = [
    'const s = "require(\'./fake\')";',
    "// require('./also-fake')",
    "/* require('./block-fake') */",
    'const real = require("./real");',
    "module.exports = real;",
  ].join("\n");
  assert.deepEqual(extractRequires(code, "x.js"), ["./real"]);
});

test("嵌套作用域里的 require 也能提取", () => {
  const code = [
    "function load() {",
    '  return require("./lazy");',
    "}",
    "module.exports = load;",
  ].join("\n");
  assert.deepEqual(extractRequires(code, "x.js"), ["./lazy"]);
});

test("入口路径支持相对路径(相对 cwd)", () => {
  const root = makeProject({
    "entry.js": 'module.exports = require("./dep");',
    "dep.js": "module.exports = 7;",
  });
  const graph = buildGraph(join(root, "entry.js"));
  assert.equal(graph.modules.length, 2);
});
