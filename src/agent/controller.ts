import { AgentState } from "./types";
import type { AgentDecision } from "./decision/types";

// ============================================================
// Phase 3.0 — Rule-based Controller（保留作为 fallback / 安全网）
//
//   确定性决策：无 plan → planner；有 plan 无 context → retrieve；
//   否则 DONE。主路径已切换到 LLM Decision Engine（decision/engine.ts），
//   本文件不删除，供：
//     1) LLM 决策失败时的回退；
//     2) 离线测试注入（无真实 LLM 调用的确定性决策）。
//
//   返回值统一为 AgentDecision，与 LLM 引擎同一契约。
// ============================================================

export function decideNextActionByRule(
  state: AgentState
): AgentDecision {
  /**
   * Global safety boundary 1：步数上限
   */
  if (state.stepCount >= state.maxSteps) {
    return { action: "FAIL", reason: "max steps exceeded" };
  }

  /**
   * 1. 还没有 Plan → 调用 planner（带重试上限）
   */
  if (!state.plan) {
    if (state.plannerAttempts < state.maxPlannerAttempts) {
      return {
        action: "CALL_TOOL",
        tool: "planner",
        reason: "缺少页面规划，调用 planner 生成 UIPlan",
      };
    }

    return { action: "FAIL", reason: "planner exceeded max attempts" };
  }

  /**
   * 2. 有 Plan 但还没有设计上下文 → 检索 Design System
   */
  if (!state.contextData) {
    return {
      action: "CALL_TOOL",
      tool: "retrieve_design_context",
      reason: "已有规划，获取 Design System 上下文",
    };
  }

  /**
   * 3. 有 Plan + Design Context 但还没有 AST → 调用 Generator
   */
  if (!state.ast) {
    return {
      action: "CALL_TOOL",
      tool: "generator",
      reason: "规划与设计上下文均已就绪，生成 CoreASTNode",
    };
  }

  /**
   * 4. AST 已生成但还没有校验结果 → 调用 Validator
   */
  if (!state.validation) {
    return {
      action: "CALL_TOOL",
      tool: "validator",
      reason: "AST 已生成，调用 validator 校验结构/组件能力/设计 token",
    };
  }

  /**
   * 5. Validator 通过 → 完成
   */
  if (state.validation.valid) {
    return { action: "DONE", reason: "AST 校验通过" };
  }

  /**
   * 6. Validator 未通过（Phase 3.3-A 尚未接入 Repair）→ 失败
   */
  return { action: "FAIL", reason: "AST 校验失败（Phase 3.3-A 无 Repair）" };
}
