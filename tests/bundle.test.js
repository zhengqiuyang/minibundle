// M2/M3:打包、对拍、循环依赖、CLI、--graph
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "../src/bundle.js";
import { renderGraph } from "../src/graphviz.js";
import { makeProject } from "./helpers.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const BIN = join(HERE, "..", "bin", "minibundle.js");

function runNode(args, cwd) {
  return execFileSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function bundleAndRun(project) {
  const root = makeProject(project);
  const direct = runNode(["entry.js"], root);
  writeFileSync(join(root, "out.bundle.js"), bundle(join(root, "entry.js")));
  const bundled = runNode(["out.bundle.js"], root);
  return { direct, bundled, root };
}

test("对拍:bundle 与直接运行输出一致(JSON、目录、递归)", () => {
  const { direct, bundled } = bundleAndRun({
    "entry.js": [
      'const fib = require("./math/fib");',
      'const conf = require("./config.json");',
      'const greet = require("./greet");',
      'console.log("fib(10) =", fib(10));',
      "console.log(greet(conf.name));",
    ].join("\n"),
    "math/fib.js":
      "module.exports = function fib(n) { return n < 2 ? n : fib(n-1) + fib(n-2); };",
    "config.json": '{"name": "minibundle"}',
    "greet/index.js": 'module.exports = (name) => "hello, " + name + "!";',
  });
  assert.equal(bundled, direct);
  assert.ok(direct.includes("fib(10) = 55"));
  assert.ok(direct.includes("hello, minibundle!"));
});

test("exports.x 追加导出与深层链", () => {
  const { direct, bundled } = bundleAndRun({
    "entry.js": 'console.log(require("./a").sum());',
    "a.js": [
      'const b = require("./b");',
      "exports.sum = () => 1 + b;",
    ].join("\n"),
    "b.js": 'const c = require("./c"); module.exports = 2 + c;',
    "c.js": 'module.exports = 3;',
  });
  assert.equal(bundled, direct);
  assert.ok(direct.trimEnd().endsWith("6"));
});

test("惰性 require:未调用的模块不执行", () => {
  const { direct, bundled } = bundleAndRun({
    "entry.js": [
      "const load = () => require('./lazy');",
      "console.log('before');",
      "console.log('after', load());",
    ].join("\n"),
    "lazy.js": 'console.log("lazy executed"); module.exports = 1;',
  });
  assert.equal(bundled, direct);
  assert.ok(direct.indexOf("before") < direct.indexOf("lazy executed"));
});

test("循环依赖:与 node 行为逐字对拍(部分导出语义)", () => {
  const { direct, bundled } = bundleAndRun({
    "entry.js": [
      'const a = require("./a");',
      'console.log("a.loaded =", a.loaded);',
      'console.log("a.valueFromB =", a.valueFromB);',
    ].join("\n"),
    "a.js": [
      "exports.loaded = 'a-start';",
      'const b = require("./b");',
      "exports.loaded = 'a-done';",
      "exports.valueFromB = b.bValue;",
    ].join("\n"),
    "b.js": [
      'const a = require("./a");',  // a 还没执行完,拿到部分导出
      "exports.bValue = 'b sees ' + a.loaded;",
    ].join("\n"),
  });
  assert.equal(bundled, direct);
  assert.ok(direct.includes("a.loaded = a-done"));
  assert.ok(direct.includes("b sees a-start"));
});

test("模块抛错:bundle 执行同报错退出", () => {
  const root = makeProject({
    "entry.js": 'require("./boom");',
    "boom.js": 'throw new Error("boom-message");',
  });
  writeFileSync(join(root, "out.bundle.js"), bundle(join(root, "entry.js")));
  let directErr = "";
  let bundleErr = "";
  try {
    runNode(["entry.js"], root);
  } catch (e) {
    directErr = e.stderr;
  }
  try {
    runNode(["out.bundle.js"], root);
  } catch (e) {
    bundleErr = e.stderr;
  }
  assert.ok(directErr.includes("boom-message"));
  assert.ok(bundleErr.includes("boom-message"));
});

test("CLI:打包到指定文件并可运行", () => {
  const root = makeProject({
    "entry.js": 'console.log(require("./v"));',
    "v.js": "module.exports = 100;",
  });
  const out = runNode([BIN, "entry.js", "-o", "cli-out.js"], root);
  assert.match(out, /打包完成/);
  const result = runNode(["cli-out.js"], root);
  assert.equal(result.trimEnd(), "100");
});

test("--graph:输出 mermaid 节点与边", () => {
  const root = makeProject({
    "entry.js": 'require("./a"); require("./b");',
    "a.js": 'require("./shared");',
    "b.js": 'require("./shared");',
    "shared.js": "module.exports = 1;",
  });
  const text = runNode([BIN, "entry.js", "--graph"], root);
  assert.match(text, /graph TD/);
  assert.match(text, /m\d\["entry\.js"\]/);
  assert.match(text, /m\d --> m\d/);
  // shared 被两个模块依赖:先找到它的节点编号,再数指向它的边
  const shared = text.match(/m(\d)\["shared\.js"\]/);
  assert.ok(shared, text);
  const edges = text.match(new RegExp(`--> m${shared[1]}(?=\\s|$)`, "g")) || [];
  assert.equal(edges.length, 2);
});

test("renderGraph API 与 CLI 输出一致", () => {
  const root = makeProject({
    "entry.js": 'require("./a");',
    "a.js": "module.exports = 1;",
  });
  const viaApi = renderGraph(join(root, "entry.js"));
  assert.match(viaApi, /entry\.js/);
  assert.match(viaApi, /a\.js/);
});
