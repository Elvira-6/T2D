import { getTool } from "./registry";
import { canExecuteTool } from "./policy";
import { buildToolTrace } from "../trace";
import type { AgentTrace } from "../types";
import {
  ToolContext,
  ToolPolicy,
  ToolResult,
} from "./types";

// ============================================================
// Phase 2 — Tool Executor
//
// 唯一 Tool 执行入口：
//
//   Policy → Registry → Tool.execute() → ToolResult → buildToolTrace() → AgentTrace
//
// Runtime 只消费最终的 AgentTrace，不自己构建 Trace。
// ============================================================

export async function executeTool(
  name: string,
  input: unknown,
  context: ToolContext,
  policy: ToolPolicy,
  currentCallCount: number,
  attempt?: number
): Promise<AgentTrace> {
  const startedAt = Date.now();

  // 把 ToolResult 归一化为 AgentTrace（Trace 的唯一出口，纯函数）。
  const toTrace = (result: ToolResult): AgentTrace =>
    buildToolTrace(name, attempt, input, startedAt, result);

  // ----------------------------------------------------------
  // 1. Policy Guardrail（预算 → 白名单）
  // ----------------------------------------------------------

  const policyResult = canExecuteTool(name, policy, currentCallCount);

  if (!policyResult.allowed) {
    return toTrace({
      success: false,
      error: `Policy Guardrail: ${policyResult.reason}`,
      metadata: {
        tool: name,
        durationMs: Date.now() - startedAt,
      },
    });
  }

  // ----------------------------------------------------------
  // 2. Registry Lookup
  // ----------------------------------------------------------

  const tool = getTool(name);

  if (!tool) {
    return toTrace({
      success: false,
      error: `Unknown tool: ${name}`,
      metadata: {
        tool: name,
        durationMs: Date.now() - startedAt,
      },
    });
  }

  // ----------------------------------------------------------
  // 3. Tool Execution
  // ----------------------------------------------------------

  try {
    const result = await tool.execute(input, context);

    return toTrace({
      ...result,
      metadata: {
        ...result.metadata,
        tool: name,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    return toTrace({
      success: false,
      error:
        error instanceof Error ? error.message : "Tool execution failed",
      metadata: {
        tool: name,
        durationMs: Date.now() - startedAt,
      },
    });
  }
}
