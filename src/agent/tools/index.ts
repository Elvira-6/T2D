import { plannerTool } from "./planner.tool";
import { generatorTool } from "./generator.tool";
import { validatorTool } from "./validator.tool";
import { repairTool } from "./repair.tool";
import { AgentTool } from "./types";
import { ToolAction } from "../types";

// ============================================================
// Phase 0 — Tool Registry（Action → Tool 单一注册点）
//   Runtime 依据 Decision Policy 产出的 action 在此查表调用。
// ============================================================

export const TOOLS: Record<ToolAction, AgentTool> = {
  PLAN: plannerTool,
  GENERATE: generatorTool,
  VALIDATE: validatorTool,
  REPAIR: repairTool,
};

export { plannerTool, generatorTool, validatorTool, repairTool };
export type { AgentTool } from "./types";
