import { initTools, executeTool, DEFAULT_TOOL_POLICY } from "./tools";
import type { ToolContext } from "./tools/types";

// 独立脚本（tsx）不会像 Next.js 那样自动加载 .env.local，这里手动补上，
// 否则 planner 拿不到 DEEPSEEK_API_KEY。
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local 不存在时忽略；此时 planner 会正常走失败链路（P1-05）。
}

// ============================================================
// Phase 2 — Tool 层独立演示
//   运行方式：npx tsx src/agent/phase2-demo.ts
//
//   演示三项：
//     1. planner                → 真实 DeepSeek 结构化输出 UIPlan
//     2. retrieve_design_context → 读取 COMPONENT_REGISTRY + DESIGN_TOKENS
//     3. delete_project          → Policy Guardrail 拒绝
//
//   完整 Runtime（Controller → Executor → State/Event Trace）可经
//   POST /api/agent/plan 由 AgentRuntimePanel 触发。
// ============================================================

async function runDemo() {
  initTools();

  const context: ToolContext = {
    agentId: "agent_demo_001",
    prompt: "生成一个现代 SaaS Landing Page",
  };

  let toolCallCount = 0;

  console.log("\n🤖 Agent Phase 2 Demo\n");

  // =====================================================
  // 1. Planner Tool
  // =====================================================
  console.log("━━━ Tool Call: planner ━━━");

  const planResult = await executeTool(
    "planner",
    context.prompt,
    context,
    DEFAULT_TOOL_POLICY,
    toolCallCount++
  );

  console.log(JSON.stringify(planResult, null, 2));

  // =====================================================
  // 2. Retrieval Tool
  // =====================================================
  console.log("\n━━━ Tool Call: retrieve_design_context ━━━");

  const retrievalResult = await executeTool(
    "retrieve_design_context",
    undefined,
    { ...context, plan: planResult.data },
    DEFAULT_TOOL_POLICY,
    toolCallCount++
  );

  console.log(JSON.stringify(retrievalResult, null, 2));

  // =====================================================
  // 3. Policy Guardrail Test
  // =====================================================
  console.log("\n━━━ Policy Guardrail Test ━━━");

  const forbiddenResult = await executeTool(
    "delete_project",
    {},
    context,
    DEFAULT_TOOL_POLICY,
    toolCallCount++
  );

  console.log(JSON.stringify(forbiddenResult, null, 2));

  console.log("\n✅ Phase 2 Demo done.\n");
}

runDemo();
