import { AgentState, AgentAction } from "./types";

// ============================================================
// Phase 1 — Controller（纯函数决策 + Planner Retry Policy）
// ============================================================

export function decideNextAction(state: AgentState): AgentAction {
  /**
   * Global safety boundary
   */
  if (state.stepCount >= state.maxSteps) {
    return "FAIL";
  }

  /**
   * Planning（带重试上限，避免 planner 失败后无限 PLAN）
   */
  if (!state.plan) {
    if (state.plannerAttempts < state.maxPlannerAttempts) {
      return "PLAN";
    }

    return "FAIL";
  }

  /**
   * Phase 2: UIPlan -> AST
   */
  if (!state.ast) {
    return "GENERATE";
  }

  /**
   * Validation
   */
  if (state.errors.length > 0) {
    return "REPAIR";
  }

  if (state.stage !== "VALIDATING" && state.stage !== "COMPLETED") {
    return "VALIDATE";
  }

  return "DONE";
}
