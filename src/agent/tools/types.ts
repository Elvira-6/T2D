import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 2 — Tool 抽象（统一契约：input + ToolContext → ToolResult）
//   Tool 不直接操作 AgentState；Runtime 才是 orchestration layer。
// ============================================================

export type ToolCategory =
  | "planning"
  | "retrieval"
  | "generation"
  | "validation"
  | "mutation"
  | "system";

/** 已注册 Tool 名称（Phase 3.2 新增 generator） */
export type AgentToolName =
  | "planner"
  | "retrieve_design_context"
  | "generator";

export interface ToolContext {
  agentId: string;
  prompt: string;

  plan?: unknown;
  ast?: CoreASTNode;

  contextData?: Record<string, unknown>;

  metadata?: Record<string, unknown>;
}

export interface ToolMetadata {
  tool: string;
  durationMs?: number;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: ToolMetadata;
}

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  category: ToolCategory;

  execute(
    input: TInput,
    context: ToolContext
  ): Promise<ToolResult<TOutput>>;
}

export interface ToolPolicy {
  allowedTools: string[];
  maxToolCalls: number;
}
