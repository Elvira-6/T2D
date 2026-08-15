import { AgentState, AgentStage } from "./types";
import { decideNextAction } from "./controller";
import { updateStage, appendEvent } from "./state";
import { createEvent } from "./events";
import { buildToolTrace } from "./trace";
import { UIPlan } from "./schemas/plan.schema";
import {
  initTools,
  executeTool,
  DEFAULT_TOOL_POLICY,
  ToolContext,
  ToolResult,
  AgentToolName,
} from "./tools";

// ============================================================
// Phase 2 — Agent Runtime（状态机循环 + Tool Executor + 双轨记录）
//
//   Controller 决策 → 统一走 Tool Executor →
//     - history：记录生命周期（STATE_CHANGE / ERROR）
//     - traces ：记录每次工具执行的完整细节（tool / status / duration / in-out）
//
//   Planner 不再被 Runtime 特殊对待，与 Retrieval 同属 AgentTool。
// ============================================================

/** 工具 → 对应阶段（用于 State Trace 的阶段迁移展示） */
const TOOL_STAGE: Record<AgentToolName, AgentStage> = {
  planner: "PLANNING",
  retrieve_design_context: "RETRIEVING",
};

function buildToolContext(state: AgentState): ToolContext {
  return {
    agentId: state.id,
    prompt: state.prompt,
    plan: state.plan,
    ast: state.ast,
    contextData: state.contextData,
  };
}

function buildToolInput(state: AgentState, tool: AgentToolName): unknown {
  switch (tool) {
    case "planner":
      return state.prompt;
    case "retrieve_design_context":
      return undefined;
  }
}

/** 把 ToolResult 写回 AgentState（Runtime 才是 State 的唯一写入者） */
function applyToolResult(
  state: AgentState,
  tool: AgentToolName,
  result: ToolResult<unknown>
): AgentState {
  if (!result.success) {
    return {
      ...state,
      errors: [...state.errors, result.error ?? "Tool failed"],
    };
  }

  switch (tool) {
    case "planner":
      return { ...state, plan: result.data as UIPlan, errors: [] };
    case "retrieve_design_context":
      return {
        ...state,
        contextData: result.data as Record<string, unknown>,
      };
    default:
      return state;
  }
}

export async function runAgent(
  initialState: AgentState
): Promise<AgentState> {
  initTools();

  let state = { ...initialState };

  while (true) {
    state = { ...state, stepCount: state.stepCount + 1 };

    const decision = decideNextAction(state);

    if (decision.action === "DONE") {
      return updateStage(state, "COMPLETED");
    }

    if (decision.action === "FAIL") {
      state = updateStage(state, "FAILED");
      return appendEvent(
        state,
        createEvent("ERROR", { reason: decision.reason })
      );
    }

    // CALL_TOOL
    const tool = decision.tool;

    if (tool === "planner") {
      state = { ...state, plannerAttempts: state.plannerAttempts + 1 };
    }

    state = updateStage(state, TOOL_STAGE[tool]);

    const attempt = tool === "planner" ? state.plannerAttempts : undefined;
    const input = buildToolInput(state, tool);
    const startedAt = Date.now();

    const result = await executeTool(
      tool,
      input,
      buildToolContext(state),
      DEFAULT_TOOL_POLICY,
      state.toolCallCount
    );

    // 记录 Tool 执行 Trace（完整执行细节），与 history 分离、不重复。
    state = {
      ...state,
      toolCallCount: state.toolCallCount + 1,
      traces: [
        ...state.traces,
        buildToolTrace(tool, attempt, input, startedAt, result),
      ],
    };

    state = applyToolResult(state, tool, result);
  }
}
