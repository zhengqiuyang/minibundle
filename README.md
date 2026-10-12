# minibundle — 从零实现的迷你 JS 模块打包器

[![CI](https://github.com/zhengqiuyang/minibundle/actions/workflows/ci.yml/badge.svg)](https://github.com/zhengqiuyang/minibundle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](./LICENSE)

CommonJS 的最小可用打包器:Node 风格模块解析 → acorn 提取
`require("字面量")` → 依赖图 → 单文件 bundle。模块代码零改写,
每个模块包进 `function(module, exports, require)` 包装,配一个内建
`__require` 运行时(缓存 + 惰性求值,天然支持循环依赖的部分导出语义)。

## 用法

```bash
npm install
node bin/minibundle.js entry.js -o bundle.js   # 打包
node bundle.js                                  # 运行产物
npm test                                        # node --test
```

## 里程碑

- [x] **M1 模块解析与依赖图**:Node 风格解析(精确路径 → 补 `.js` →
  补 `.json` → 目录 `index.js`;相对导入基于引入者目录);acorn AST 提取
  `require` 字面量调用(字符串/注释里的 `require` 不会误报,嵌套作用域可提取,
  非字面量参数明确报错);深度优先建图,依赖先于使用方,菱形依赖去重(14 个单测)。
- [ ] M2 打包器:模块包装 + `__require` 运行时 + CLI + 与 `node entry.js` 的输出对拍
- [ ] M3 循环依赖语义测试 + `--graph` 依赖图输出(mermaid)

## 范围

- 只打包相对/绝对路径模块;`node_modules` 依赖明确报错不支持。
- CommonJS(`require` / `module.exports`);ESM 打包不做。
