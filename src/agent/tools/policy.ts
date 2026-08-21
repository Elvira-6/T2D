import { ToolPolicy } from "./types";

// ============================================================
// Phase 2 — Tool Policy（安全边界：白名单 + 调用次数上限）
//   未来 LLM 自主决策时，Runtime 必须先过这里再执行。
// ============================================================

export const DEFAULT_TOOL_POLICY: ToolPolicy = {
  allowedTools: [
    "planner",
    "retrieve_design_context",
    "generator",
  ],

  maxToolCalls: 10,
};

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export function canExecuteTool(
  toolName: string,
  policy: ToolPolicy,
  currentCallCount: number
): PolicyDecision {
  if (currentCallCount >= policy.maxToolCalls) {
    return {
      allowed: false,
      reason: `Exceeded maximum tool calls: ${policy.maxToolCalls}`,
    };
  }

  if (!policy.allowedTools.includes(toolName)) {
    return {
      allowed: false,
      reason: `Tool '${toolName}' is not allowed.`,
    };
  }

  return {
    allowed: true,
  };
}
