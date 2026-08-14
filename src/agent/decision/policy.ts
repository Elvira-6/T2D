import { AgentState, AgentAction } from "../types";

// ============================================================
// Phase 0 — Decision Policy（纯函数状态机转移规则）
//   依据当前状态快照决定下一步动作，运行时不持有可变状态。
// ============================================================

/**
 * 决策顺序：
 *   1. 达到步数上限 → FAIL
 *   2. 无规划 → PLAN
 *   3. 无 AST → GENERATE
 *   4. 存在错误 → REPAIR
 *   5. 尚未校验 → VALIDATE
 *   6. 否则 → DONE
 */
export function decideNextAction(state: AgentState): AgentAction {
  if (state.stepCount >= state.maxSteps) return "FAIL";
  if (!state.plan) return "PLAN";
  if (!state.ast) return "GENERATE";
  if (state.errors.length) return "REPAIR";
  if (state.stage !== "VALIDATING") return "VALIDATE";
  return "DONE";
}
