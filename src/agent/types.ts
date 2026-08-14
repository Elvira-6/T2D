import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 0 — Agent Runtime 类型契约
//   Agent State Machine + Tool Calling + Event Trace 的强类型定义。
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

/** Agent 决策动作（由 Decision Policy 产出，映射到 Tool） */
export type AgentAction =
  | "PLAN"
  | "GENERATE"
  | "VALIDATE"
  | "REPAIR"
  | "DONE"
  | "FAIL";

/** 可执行 Tool 的动作（DONE / FAIL 为终态，无对应 Tool） */
export type ToolAction = "PLAN" | "GENERATE" | "VALIDATE" | "REPAIR";

/** UI 规划：Planner Tool 的输出结构 */
export interface UIPlan {
  pageType: string;
  sections: {
    id: string;
    component: string;
    purpose: string;
  }[];
  designSystem: {
    style: string;
    colors: string[];
  };
  constraints: {
    responsive: boolean;
    accessibility: boolean;
  };
}

/** Agent 事件类型（Event Trace 溯源） */
export type AgentEventType =
  | "STATE_CHANGE"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "ERROR"
  | "REPAIR";

/** Agent 事件记录 */
export interface AgentEvent {
  id: string;
  timestamp: number;
  type: AgentEventType;
  source: "agent" | "tool" | "human";
  action?: AgentAction;
  input?: unknown;
  output?: unknown;
  duration?: number;
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
}
