// ============================================================
// Phase 2 — Agent Runtime 公共出口
//   对外暴露状态机、Controller、状态/事件/Trace 工厂、Tool 层。
// ============================================================

export { runAgent } from "./runtime";

export {
  decideNextAction,
  validateDecisionTool,
  assertAgentToolName,
  buildDecisionContext,
  buildDecisionPrompt,
  AgentDecisionSchema,
} from "./decision";

export { decideNextActionByRule } from "./controller";

export type {
  DecisionAction,
  AgentDecision,
  AgentDecisionTrace,
  ParsedAgentDecision,
  DecisionContext,
} from "./decision";

export {
  createInitialState,
  appendEvent,
  appendTrace,
  appendDecisionTrace,
  updateStage,
} from "./state";

export { createEvent, createEventId } from "./events";

export {
  createTrace,
  createTraceId,
  buildToolTrace,
  createDecisionTrace,
  createDecisionTraceId,
} from "./trace";
export { plannerTool } from "./tools/planning/planner.tool";
export { retrieveDesignContextTool } from "./tools/retrieval/designContext.tool";

export {
  initTools,
  registerTool,
  getTool,
  listTools,
  hasTool,
  clearToolRegistry,
  executeTool,
  DEFAULT_TOOL_POLICY,
  canExecuteTool,
} from "./tools";

export type {
  AgentStage,
  AgentAction,
  AgentEventType,
  AgentEvent,
  AgentTrace,
  ToolStatus,
  AgentState,
} from "./types";

export {
  UIPlanSchema,
  ComponentIntentSchema,
  SectionPlanSchema,
  DesignDirectionSchema,
} from "./schemas/plan.schema";
export type { UIPlan } from "./schemas/plan.schema";

export type {
  ToolCategory,
  AgentToolName,
  ToolContext,
  ToolMetadata,
  ToolResult,
  AgentTool,
  ToolPolicy,
} from "./tools/types";
