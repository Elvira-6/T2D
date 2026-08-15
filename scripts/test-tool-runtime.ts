/**
 * Phase 2 DoD — Tool Executor + Runtime Trace 记录验证
 *
 * 运行方式：npx tsx scripts/test-tool-runtime.ts
 *
 * 证明 5 类执行结果都能被正确返回，并被 Runtime 的 trace 正确记录：
 *   1. 允许（allowed）    — 白名单内 → success
 *   2. 拒绝（rejected）   — 白名单外 → Policy Guardrail
 *   3. Tool 不存在        — Unknown tool
 *   4. Tool 抛异常        — 捕获 error
 *   5. 超出调用预算       — Exceeded maximum tool calls
 *
 * 全部用 mock Tool（不发起真实 LLM 调用，离线可跑）。
 */

import {
  clearToolRegistry,
  registerTool,
  executeTool,
} from "../src/agent/tools";
import type {
  AgentTool,
  ToolContext,
  ToolPolicy,
} from "../src/agent/tools/types";
import { buildToolTrace } from "../src/agent/trace";
import { createInitialState } from "../src/agent/state";
import { runAgent } from "../src/agent/runtime";
import type { UIPlan } from "../src/agent/schemas/plan.schema";

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

// ── 固定夹具 ────────────────────────────────────────────────
const MOCK_PLAN: UIPlan = {
  version: 1,
  intent: "测试用 Landing Page",
  pageType: "landing",
  sections: [
    {
      id: "hero",
      type: "hero",
      purpose: "首屏展示",
      layout: "flex-column",
      components: [{ type: "Heading", purpose: "主标题" }],
    },
  ],
  design: {
    theme: "modern",
    spacing: "comfortable",
    radius: "md",
    primaryColor: "primary",
  },
};

/** 成功 planner（不调 LLM，直接返回固定 plan） */
const mockPlanner: AgentTool<string, UIPlan> = {
  name: "planner",
  description: "mock planner",
  category: "planning",
  async execute() {
    return { success: true, data: MOCK_PLAN };
  },
};

/** 总是抛异常的 tool（用于「抛异常」场景） */
const throwingTool: AgentTool = {
  name: "throwing",
  description: "always throws",
  category: "system",
  async execute() {
    throw new Error("boom: tool exploded");
  },
};

/** 成功 retrieve（返回固定 contextData） */
const mockRetrieve: AgentTool = {
  name: "retrieve_design_context",
  description: "mock retrieve",
  category: "retrieval",
  async execute() {
    return { success: true, data: { components: [], tokens: {} } };
  },
};

const ctx: ToolContext = { agentId: "test_agent", prompt: "测试" };

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔬 Phase 2 DoD — Tool Executor & Trace 记录");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Part 1: executeTool 的 5 类返回分支 ──
  console.log("📋 Part 1: Tool Executor 返回正确性");
  clearToolRegistry();
  registerTool(mockPlanner);
  registerTool(throwingTool);

  const allowPlanner: ToolPolicy = { allowedTools: ["planner"], maxToolCalls: 10 };

  // 1. 允许（allowed）
  const rAllowed = await executeTool<string, UIPlan>(
    "planner",
    "测试",
    ctx,
    allowPlanner,
    0
  );
  check(
    "允许 → success=true + data",
    rAllowed.success === true && rAllowed.data === MOCK_PLAN
  );
  check(
    "允许 → metadata 记录 tool + durationMs",
    rAllowed.metadata?.tool === "planner" &&
      typeof rAllowed.metadata?.durationMs === "number"
  );

  // 2. 拒绝（rejected）——throwing 已注册但不在白名单
  const rRejected = await executeTool(
    "throwing",
    undefined,
    ctx,
    allowPlanner,
    0
  );
  check(
    "拒绝 → Policy Guardrail not allowed",
    rRejected.success === false &&
      rRejected.error === "Policy Guardrail: Tool 'throwing' is not allowed."
  );

  // 3. Tool 不存在（unknown）——白名单放行但未注册
  const allowUnknown: ToolPolicy = {
    allowedTools: ["no_such_tool"],
    maxToolCalls: 10,
  };
  const rUnknown = await executeTool(
    "no_such_tool",
    {},
    ctx,
    allowUnknown,
    0
  );
  check(
    "不存在 → Unknown tool",
    rUnknown.success === false &&
      rUnknown.error === "Unknown tool: no_such_tool"
  );

  // 4. Tool 抛异常（throws）——白名单放行，execute 抛异常被捕获
  const allowThrowing: ToolPolicy = {
    allowedTools: ["throwing"],
    maxToolCalls: 10,
  };
  const rThrown = await executeTool(
    "throwing",
    undefined,
    ctx,
    allowThrowing,
    0
  );
  check(
    "抛异常 → 被捕获为 error",
    rThrown.success === false && rThrown.error === "boom: tool exploded"
  );

  // 5. 超出调用预算（budget）——白名单放行，但 callCount >= maxToolCalls
  const tight: ToolPolicy = { allowedTools: ["planner"], maxToolCalls: 2 };
  const rBudget = await executeTool("planner", "测试", ctx, tight, 2);
  check(
    "超预算 → Exceeded maximum tool calls",
    rBudget.success === false &&
      rBudget.error === "Policy Guardrail: Exceeded maximum tool calls: 2"
  );

  // ── Part 2: buildToolTrace 把这 5 类结果映射为 Trace ──
  console.log("\n📋 Part 2: Runtime 的 Trace 记录（5 类结果 → trace）");
  const t0 = Date.now();

  const trAllowed = buildToolTrace("planner", 1, "测试", t0, rAllowed);
  check(
    "trace(允许) → success + output + 无 error",
    trAllowed.status === "success" &&
      trAllowed.output === MOCK_PLAN &&
      trAllowed.error === undefined
  );

  const trRejected = buildToolTrace("throwing", undefined, undefined, t0, rRejected);
  check(
    "trace(拒绝) → failed + Policy Guardrail",
    trRejected.status === "failed" &&
      trRejected.error === "Policy Guardrail: Tool 'throwing' is not allowed."
  );

  const trUnknown = buildToolTrace("no_such_tool", undefined, undefined, t0, rUnknown);
  check(
    "trace(不存在) → failed + Unknown tool",
    trUnknown.status === "failed" &&
      trUnknown.error === "Unknown tool: no_such_tool"
  );

  const trThrown = buildToolTrace("throwing", undefined, undefined, t0, rThrown);
  check(
    "trace(抛异常) → failed + 异常消息",
    trThrown.status === "failed" && trThrown.error === "boom: tool exploded"
  );

  const trBudget = buildToolTrace("planner", 2, "测试", t0, rBudget);
  check(
    "trace(超预算) → failed + Exceeded",
    trBudget.status === "failed" &&
      trBudget.error === "Policy Guardrail: Exceeded maximum tool calls: 2"
  );

  // ── Part 3: runAgent 端到端（trace 真正写入 AgentState）──
  console.log("\n📋 Part 3: runAgent 端到端记录");

  // 成功路径：mock planner + mock retrieve
  clearToolRegistry();
  registerTool(mockPlanner);
  registerTool(mockRetrieve);
  const okState = await runAgent(createInitialState("测试"));

  check("runtime 成功 → COMPLETED", okState.stage === "COMPLETED");
  check(
    "runtime 成功 → 2 条 success trace",
    okState.traces.length === 2 &&
      okState.traces.every((t) => t.status === "success")
  );
  check(
    "runtime 成功 → trace 顺序 planner → retrieve",
    okState.traces[0]?.tool === "planner" &&
      okState.traces[1]?.tool === "retrieve_design_context"
  );
  check(
    "runtime 成功 → planner 带 attempt=1，retrieve 无 attempt",
    okState.traces[0]?.attempt === 1 && okState.traces[1]?.attempt === undefined
  );

  // 失败路径：planner 抛异常 → 重试 → FAILED
  clearToolRegistry();
  registerTool({ ...throwingTool, name: "planner" });
  const badState = await runAgent(createInitialState("测试"));

  check("runtime 失败 → FAILED", badState.stage === "FAILED");
  check(
    "runtime 失败 → 2 条 failed trace（重试一次）",
    badState.traces.length === 2 &&
      badState.traces.every((t) => t.tool === "planner" && t.status === "failed")
  );
  check(
    "runtime 失败 → trace 含异常消息",
    badState.traces.every((t) => t.error === "boom: tool exploded")
  );
  check(
    "runtime 失败 → errors 累计 2 条",
    badState.errors.length === 2
  );
  check(
    "runtime 失败 → history 含 ERROR 事件",
    badState.history.some((e) => e.type === "ERROR")
  );

  // ── 摘要 ──
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `🎯 结果: ${passed} 通过, ${failed} 失败 (共 ${passed + failed} 项)`
  );
  if (failed === 0) {
    console.log("✅ 5 类执行结果全部被 Runtime 正确记录！");
  } else {
    console.error("❌ 存在未通过的验证项，请修复后重试。");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
