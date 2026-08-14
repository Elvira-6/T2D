import { AgentTool } from "./types";

// ============================================================
// Phase 0 — Repair Tool（占位：Phase 4 将接入真实自愈策略）
//   当前仅清空 errors，用于演示 Self Repair Loop 的转移路径。
// ============================================================

export const repairTool: AgentTool = {
  name: "repair",
  async execute(state) {
    return {
      ...state,
      stage: "REPAIRING",
      errors: [],
    };
  },
};
