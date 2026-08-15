// ============================================================
// Phase 1 — Agent Runtime 公共出口
//   对外暴露状态机、Controller、状态/事件工厂与 Planner。
// ============================================================

export { runAgent } from "./runtime";
export { decideNextAction } from "./controller";
export { createInitialState, appendEvent, updateStage } from "./state";
export { createEvent, createEventId } from "./events";
export { runPlanner } from "./tools/planner.tool";
export { AGENT_TOOLS } from "./tools/registry";
export type { AgentToolName } from "./tools/registry";

export type {
  AgentStage,
  AgentAction,
  AgentEventType,
  AgentEvent,
  AgentState,
} from "./types";

export {
  UIPlanSchema,
  ComponentIntentSchema,
  SectionPlanSchema,
  DesignDirectionSchema,
} from "./schemas/plan.schema";
export type { UIPlan } from "./schemas/plan.schema";
