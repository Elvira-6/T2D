import { createInitialState } from "../state";
import { runAgent, DecideFn } from "../runtime";
import { AgentRunRequest, AgentRunResponse } from "./types";

// ============================================================
// Phase 3.1 — Agent Run Service
//
//   Next.js API Route 不直接操作 Runtime，只通过本 Service：
//     Request → createInitialState → runAgent → State → Response 映射。
//
//   决定注入 decide（默认 LLM 引擎）：离线测试可换成 rule-based 控制器。
// ============================================================

export async function runAgentService(
  request: AgentRunRequest,
  decide?: DecideFn
): Promise<AgentRunResponse> {
  const startedAt = Date.now();

  const initialState = createInitialState(request.prompt);

  const finalState = await runAgent(initialState, decide);

  const durationMs = Date.now() - startedAt;

  const successfulToolCalls = finalState.traces.filter(
    (t) => t.status === "success"
  ).length;
  const failedToolCalls = finalState.traces.filter(
    (t) => t.status === "failed"
  ).length;

  return {
    success: finalState.stage === "COMPLETED",

    runId: finalState.id,

    status: finalState.stage === "COMPLETED" ? "completed" : "failed",

    plan: finalState.plan,

    contextData: finalState.contextData,

    traces: finalState.traces,

    history: finalState.history,

    errors: finalState.errors,

    stepCount: finalState.stepCount,

    toolCallCount: finalState.toolCallCount,

    durationMs,

    summary: {
      totalSteps: finalState.stepCount,
      totalToolCalls: finalState.toolCallCount,
      successfulToolCalls,
      failedToolCalls,
      durationMs,
    },

    error:
      finalState.stage === "FAILED"
        ? finalState.errors[finalState.errors.length - 1]
        : undefined,
  };
}
