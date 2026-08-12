# T2D2C App — Phase 1 框架骨架

T2D2C（Text-to-Design-to-Code）项目的基础框架。

## 项目结构

```
src/
├── app/
│   ├── globals.css            ← Tailwind 全局样式
│   ├── layout.tsx             ← 根布局
│   ├── page.tsx               ← 主工作台（三栏布局 + iframe 沙盒）
│   └── sandbox/
│       └── page.tsx           ← iframe 内沙盒页面（AST 递归渲染器）
├── types/
│   └── ast.ts                 ← Core AST Schema (Zod 递归定义)
├── registry/
│   └── index.tsx              ← Component Registry（7 个组件，单点注册）
├── mocks/
│   └── mockAst.ts             ← 测试 Mock AST 数据
├── lib/
│   ├── bridge.ts              ← 主窗口 ↔ iframe postMessage 通信协议
│   └── schema-exporter.ts     ← Zod → JSON Schema 自动派生
scripts/
└── test-schema.ts             ← Phase 1.1 DoD 验证脚本
```

## 已完成的 Phase

### Phase 1.1 — Core AST Schema & Component Registry

- Zod 递归 Schema + `.passthrough()` 容错
- Component Registry 单点注册模式
- Mock AST 数据
- Zod → System Prompt 自动派生

### Phase 1.2 — 主窗口 & 沙盒渲染引擎

- `bridge.ts` — 双向 postMessage 通信协议（类型安全）
- `src/app/sandbox/page.tsx` — iframe 内 AST 递归渲染器
- `src/app/page.tsx` — 三栏布局工作台（Chat / Sandbox / Inspector）
- Desktop / Tablet / Mobile 视口切换
- 沙盒 Ready 握手 → 自动推送 AST

## 运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`，中间区域应看到 mockHeroAST 渲染的 Landing Page Hero 界面。

## 验证

```bash
# Phase 1.1 数据层验证
npm run test:schema

# Phase 1.2 可视化验证
npm run dev
# → 打开浏览器 → 确认 iframe 中渲染出 UI
# → 沙盒状态显示 "Ready"
# → 切换 Desktop / Tablet / Mobile 按钮，沙盒尺寸可响应
```
