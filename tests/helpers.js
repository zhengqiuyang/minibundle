// 测试辅助:在临时目录里铺一个真实的小项目
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export function makeProject(files) {
  const root = mkdtempSync(join(tmpdir(), "minibundle-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(root, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
