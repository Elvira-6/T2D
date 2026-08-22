import { UIPlan } from "../tools/planning/plan.schema";
import { AgentEvent, AgentTrace } from "../types";
import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 3.1 — Agent Run API Contract
//
//   前端只看到 AgentRunRequest / AgentRunResponse，不直接接触
//   AgentState / ToolResult 等 Runtime 内部类型。这里是 Runtime 与
//   HTTP/UI 层的稳定边界。
// ============================================================

export interface AgentRunRequest {
  prompt: string;
}

/** Run Summary（Agent Observability 的基础，未来可直接扩展成监控） */
export interface AgentRunSummary {
  totalSteps: number;

  totalToolCalls: number;

  successfulToolCalls: number;

  failedToolCalls: number;

  durationMs: number;
}

export interface AgentRunResponse {
  success: boolean;

  runId: string;

  status: "completed" | "failed";

  plan?: UIPlan;

  contextData?: Record<string, unknown>;

  ast?: CoreASTNode;

  traces: AgentTrace[];

  history: AgentEvent[];

  errors: string[];

  stepCount: number;

  toolCallCount: number;

  durationMs: number;

  summary: AgentRunSummary;

  error?: string;
}
