import { getTool } from "./registry";
import { canExecuteTool } from "./policy";
import {
  ToolContext,
  ToolPolicy,
  ToolResult,
} from "./types";

// ============================================================
// Phase 2 — Tool Executor（唯一工具执行入口）
//   Policy 校验 → Registry 查表 → execute → 计时。
//   所有 Tool（Planner / Retriever / Generator / ...）都必须经过这里。
// ============================================================

export async function executeTool<
  TInput = unknown,
  TOutput = unknown
>(
  name: string,
  input: TInput,
  context: ToolContext,
  policy: ToolPolicy,
  currentCallCount: number
): Promise<ToolResult<TOutput>> {
  const policyResult = canExecuteTool(
    name,
    policy,
    currentCallCount
  );

  if (!policyResult.allowed) {
    return {
      success: false,
      error: `Policy Guardrail: ${policyResult.reason}`,
      metadata: {
        tool: name,
      },
    };
  }

  const tool = getTool(name);

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
      metadata: {
        tool: name,
      },
    };
  }

  const start = Date.now();

  try {
    const result = await tool.execute(input, context);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        tool: name,
        durationMs: Date.now() - start,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Tool execution failed",

      metadata: {
        tool: name,
        durationMs: Date.now() - start,
      },
    };
  }
}
