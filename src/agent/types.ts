import { CoreASTNode } from "@/types/ast";
import { UIPlan } from "./schemas/plan.schema";

// ============================================================
// Phase 1 — Agent Runtime 类型契约
//   强类型状态机 + Event Trace + Planner 结构化输出。
// ============================================================

/** Agent 状态机阶段 */
export type AgentStage =
  | "IDLE"
  | "PLANNING"
  | "GENERATING"
  | "VALIDATING"
  | "REPAIRING"
  | "WAITING_HUMAN"
  | "COMPLETED"
  | "FAILED";

/** Agent 决策动作（由 Controller 产出，映射到执行器） */
export type AgentAction =
  | "PLAN"
  | "GENERATE"
  | "VALIDATE"
  | "REPAIR"
  | "DONE"
  | "FAIL";

/** Agent 事件类型（Event Trace 溯源） */
export type AgentEventType =
  | "STATE_CHANGE"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "ERROR"
  | "REPAIR";

/** Agent 事件记录（payload 为自由载荷，内容由事件类型约定） */
export interface AgentEvent {
  id: string;
  timestamp: number;
  type: AgentEventType;
  payload: Record<string, unknown>;
}

/** Agent 运行时的不可变状态快照 */
export interface AgentState {
  id: string;

  prompt: string;

  stage: AgentStage;

  plan?: UIPlan;

  ast?: CoreASTNode;

  errors: string[];

  history: AgentEvent[];

  stepCount: number;

  maxSteps: number;

  plannerAttempts: number;

  maxPlannerAttempts: number;
}
