import { runPlanner } from "./planner.tool";

// ============================================================
// Tool Registry（Action → Tool 单一注册点）
//   Phase 1 只有 planner；后续追加 generator / validator / repairer / retriever。
// ============================================================

export const AGENT_TOOLS = {
  planner: runPlanner,
};

export type AgentToolName = keyof typeof AGENT_TOOLS;
