/**
 * Phase 1.1 DoD (Definition of Done) 验证脚本
 *
 * 运行方式：npx tsx scripts/test-schema.ts
 *
 * 验证项：
 *  1. mockHeroAST 能否通过 Zod 校验
 *  2. .passthrough() 能否正确放行未知扩展字段
 *  3. System Prompt JSON Schema 自动派生是否正常
 */

import { CoreASTNodeSchema } from "../src/types/ast";
import { mockHeroAST } from "../src/mocks/mockAst";
import { getSystemPromptASTSchema } from "../src/lib/schema-exporter";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔬 Phase 1.1 DoD — Schema 校验与验证");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// ── 验证 1: mockHeroAST 通过 Zod 校验 ──
console.log("📋 验证 1: mockHeroAST Schema 合法性");
const parseResult = CoreASTNodeSchema.safeParse(mockHeroAST);
check(
  "mockHeroAST 成功通过 Zod 校验",
  parseResult.success,
  parseResult.success ? undefined : parseResult.error.message
);

// 额外：抽检节点字段
if (parseResult.success) {
  const data = parseResult.data;
  check("根节点 id 为 root_container", data.id === "root_container");
  check("根节点 type 为 Container", data.type === "Container");
  check("包含 1 个直接子节点", data.children?.length === 1);
  check(
    "子节点包含按钮组",
    (() => {
      const flex = data.children![0];
      return flex.children?.some((c: any) => c.id === "hero_btn_group") ?? false;
    })()
  );
}

// ── 验证 2: .passthrough() 扩展字段放行 ──
console.log("\n📋 验证 2: .passthrough() 扩展字段放行");
const mockWithExtraProp = {
  ...mockHeroAST,
  unknownAIPromptField: "AI 生成的外置魔改属性",
};
const extraParseResult = CoreASTNodeSchema.safeParse(mockWithExtraProp);
check(
  ".passthrough() 成功放行扩展字段",
  extraParseResult.success &&
    (extraParseResult.data as any).unknownAIPromptField ===
      "AI 生成的外置魔改属性",
  !extraParseResult.success ? "未知字段被拒绝" : "字段值不匹配"
);

// ── 验证 3: Children 中有 passthrough 字段 ──
console.log("\n📋 验证 3: 子节点扩展字段放行");
const mockChildWithExtra = {
  id: "test_parent",
  type: "Container",
  schemaVersion: 1,
  props: { className: "p-4" },
  children: [
    {
      id: "test_child",
      type: "Button",
      props: { className: "btn", text: "Hi" },
      extraChildField: "should survive passthrough",
    },
  ],
};
const childResult = CoreASTNodeSchema.safeParse(mockChildWithExtra);
check(
  "子节点扩展字段通过 .passthrough() 放行",
  childResult.success &&
    (childResult.data.children![0] as any).extraChildField ===
      "should survive passthrough"
);

// ── 验证 4: System Prompt Schema 派生 ──
console.log("\n📋 验证 4: System Prompt JSON Schema 派生");
const schemaOutput = getSystemPromptASTSchema();
check("Schema 输出非空", schemaOutput.length > 0);
check("Schema 输出包含 CoreASTNode 定义", schemaOutput.includes("CoreASTNode"));
check("Schema 输出包含 type 字段", schemaOutput.includes('"type"'));
check("Schema 输出包含 props.className", schemaOutput.includes("className"));
console.log(`\n  📄 输出前 200 字符预览:\n  ${schemaOutput.slice(0, 200)}...`);

// ── 摘要 ──
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`🎯 结果: ${passed} 通过, ${failed} 失败 (共 ${passed + failed} 项)`);
if (failed === 0) {
  console.log("✅ Phase 1.1 数据层框架搭建完成！可以进入 Phase 1.2。");
} else {
  console.error("❌ 存在未通过的验证项，请修复后重试。");
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

process.exit(failed > 0 ? 1 : 0);
