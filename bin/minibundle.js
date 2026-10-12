#!/usr/bin/env node
// minibundle CLI:node bin/minibundle.js <entry.js> [-o bundle.js]
import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bundle } from "../src/bundle.js";
import { renderGraph } from "../src/graphviz.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    output: { type: "string", short: "o", default: "bundle.js" },
    graph: { type: "boolean", default: false },
  },
});

if (positionals.length !== 1) {
  console.error("用法: minibundle <entry.js> [-o bundle.js] [--graph]");
  process.exit(2);
}

try {
  if (values.graph) {
    console.log(renderGraph(resolve(positionals[0])));
    process.exit(0);
  }
  const code = bundle(resolve(positionals[0]));
  writeFileSync(values.output, code);
  console.log(`打包完成: ${values.output}(${code.length} 字节)`);
} catch (err) {
  console.error(`minibundle: ${err.message}`);
  process.exit(1);
}
