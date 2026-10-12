// 依赖图可视化:输出 mermaid 流程图文本
import { dirname, relative } from "node:path";
import { buildGraph } from "./graph.js";

export function renderGraph(entryFile) {
  const graph = buildGraph(entryFile);
  const rootDir = dirname(graph.modules[0].file);
  const label = (file) => relative(rootDir, file).split("\\").join("/");
  const lines = ["graph TD"];
  for (const m of graph.modules) {
    lines.push(`  m${m.id}["${label(m.file)}"]`);
  }
  for (const m of graph.modules) {
    for (const dep of Object.values(m.deps)) {
      lines.push(`  m${m.id} --> m${dep.id}`);
    }
  }
  return lines.join("\n");
}
