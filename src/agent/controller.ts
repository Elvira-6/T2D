import { AgentState } from "./types";
import { DEFAULT_TOOL_POLICY } from "./tools/policy";
import { AgentToolName } from "./tools/types";

// ============================================================
// Phase 2 — Controller（决策 / Tool Routing）
//   纯函数：根据 State 决定下一步是「调用哪个 Tool」还是「终态」。
//   Phase 5 时这里的规则会替换为 LLM 自主决策。
// ============================================================

export type AgentDecision =
  | { action: "CALL_TOOL"; tool: AgentToolName }
  | { action: "DONE" }
  | { action: "FAIL"; reason: string };

export function decideNextAction(state: AgentState): AgentDecision {
  /**
   * Global safety boundary 1：步数上限
   */
  if (state.stepCount >= state.maxSteps) {
    return { action: "FAIL", reason: "max steps exceeded" };
  }

  /**
   * Global safety boundary 2：工具调用次数上限（与 Policy 对齐，避免死循环）
   */
  if (state.toolCallCount >= DEFAULT_TOOL_POLICY.maxToolCalls) {
    return {
      action: "FAIL",
      reason: `max tool calls exceeded (${DEFAULT_TOOL_POLICY.maxToolCalls})`,
    };
  }

  /**
   * 1. 还没有 Plan → 调用 planner（带重试上限）
   */
  if (!state.plan) {
    if (state.plannerAttempts < state.maxPlannerAttempts) {
      return { action: "CALL_TOOL", tool: "planner" };
    }

    return { action: "FAIL", reason: "planner exceeded max attempts" };
  }

  /**
   * 2. 有 Plan 但还没有设计上下文 → 检索 Design System
   */
  if (!state.contextData) {
    return { action: "CALL_TOOL", tool: "retrieve_design_context" };
  }

  /**
   * Phase 2 边界：尚无 Generator（Phase 3 加入）。
   */
  return { action: "DONE" };
}
