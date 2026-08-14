import { AgentTool } from "./types";

// ============================================================
// Phase 0 — Validator Tool（占位：Phase 4 将接入完整校验 Agent）
//   当前仅校验 AST 是否存在，产出 errors 供 Decision Policy 决策。
// ============================================================

export const validatorTool: AgentTool = {
  name: "validator",
  async execute(state) {
    return {
      ...state,
      stage: "VALIDATING",
      errors: state.ast ? [] : ["AST missing"],
    };
  },
};
