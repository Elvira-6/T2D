import { CoreASTNode } from "@/types/ast";
import { UIPlan } from "./schemas/plan.schema";
import type { AgentDecisionTrace } from "./decision/types";
import type { ValidationResult } from "./validation/types";

// ============================================================
// Phase 2 — Agent Runtime 类型契约
// ============================================================

/** Agent 状态机阶段 */
export type AgentStage =
  | "IDLE"
  | "PLANNING"
  | "RETRIEVING"
  | "GENERATING"
  | "VALIDATING"
  | "REPAIRING"
  | "WAITING_HUMAN"
  | "COMPLETED"
  | "FAILED";

/**
 * Agent 决策动作（Phase 2 统一走 Tool Executor）：
 *   CALL_TOOL — 由 Controller 指定具体工具名，Runtime 交给 Executor 执行
 *   DONE      — 正常完成
 *   FAIL      — 终态失败
 */
export type AgentAction = "CALL_TOOL" | "DONE" | "FAIL";

/**
 * Agent 事件类型（Event Trace 溯源）。
 *
 * 注意（Phase 2）：工具执行细节不塞进 history，避免 history 变成「大杂烩」。
 * 但 history 仍保留「最小化」的 TOOL_CALL / TOOL_RESULT 事件（仅 tool + success，
 * 不含 duration / input / output）—— 完整执行细节由 `traces`（AgentTrace）承载。
 */
export type AgentEventType =
  | "STATE_CHANGE"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "ERROR"
  | "REPAIR";

/** Agent 生命周期事件记录（回答「Agent 发生了什么」） */
export interface AgentEvent {
  id: string;
  timestamp: number;
  type: AgentEventType;
  payload: Record<string, unknown>;
}

/** 单次 Tool 执行的状态 */
export type ToolStatus = "success" | "failed";

/**
 * Tool 执行 Trace（回答「每个 Tool 是怎么执行的」）。
 *
 * 与 history 正交：
 *   - history：Agent State / 生命周期（STATE_CHANGE、ERROR）
 *   - traces：Runtime / Tool 执行（planner 1248ms、retrieval 3ms ...）
 *
 * 不要把 durationMs / input / output 也塞进 history —— 那会重复记录。
 */
export interface AgentTrace {
  id: string;

  tool: string;

  status: ToolStatus;

  startedAt: number;

  durationMs: number;

  attempt?: number;

  input?: unknown;

  output?: unknown;
  
  error?: string;
}

/** Agent 运行时的不可变状态快照 */
export interface AgentState {
  id: string;

  prompt: string;

  stage: AgentStage;

  plan?: UIPlan;

  ast?: CoreASTNode;

  /** Validator Tool 的结果（AST 校验状态，Phase 3.3） */
  validation?: ValidationResult;

  /** Repair 已尝试次数（Phase 3.3-B 使用，3.3-A 先占位为 0） */
  repairAttempts: number;

  /** 工具检索回来的设计上下文（retrieve_design_context 的结果） */
  contextData?: Record<string, unknown>;

  errors: string[];

  /** Agent 生命周期事件（STATE_CHANGE / ERROR） */
  history: AgentEvent[];

  /** Tool / Retrieval 执行记录（每次工具执行的完整细节） */
  traces: AgentTrace[];

  /** Agent 决策记录（每次 decideNextAction 的 action / tool / reason，Phase 3.0） */
  decisionTraces: AgentDecisionTrace[];

  /** Agent Runtime 循环执行的步数（每轮 while 循环 +1，含终态步） */
  stepCount: number;

  maxSteps: number;

  plannerAttempts: number;

  maxPlannerAttempts: number;

  /** 实际调用的 Tool 次数（仅 CALL_TOOL 分支 +1；与 stepCount 正交，勿合并） */
  toolCallCount: number;
}
