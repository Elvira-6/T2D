import { AgentState } from "../types";
import { listTools } from "../tools";

// ============================================================
// Phase 3.0 — Decision Context（状态投影）
//
//   不把整个 AgentState JSON 无脑丢给 LLM，而是投影成模型可理解的
//   决策上下文：目标 + 阶段 + 已产出的 plan/contextData + 错误 +
//   步数/工具计数 + 可用工具清单。
// ============================================================

export interface DecisionContext {
  goal: string;

  stage: AgentState["stage"];

  plan?: unknown;

  contextData?: unknown;

  /** 是否已生成 AST（投影布尔值，避免把整棵 AST 塞给 LLM） */
  hasAst: boolean;

  errors: string[];

  stepCount: number;

  toolCallCount: number;

  availableTools: Array<{
    name: string;
    description: string;
    category: string;
  }>;
}

export function buildDecisionContext(
  state: AgentState
): DecisionContext {
  return {
    goal: state.prompt,

    stage: state.stage,

    plan: state.plan,

    contextData: state.contextData,

    hasAst: Boolean(state.ast),

    errors: state.errors,

    stepCount: state.stepCount,

    toolCallCount: state.toolCallCount,

    availableTools: listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
    })),
  };
}
