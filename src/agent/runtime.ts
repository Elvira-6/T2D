import { 
  AgentState,
  AgentStage,
  AgentTrace 
} from "./types";

import { decideNextAction } from "./controller";

import { 
  updateStage, 
  appendEvent, 
  appendTrace 
} from "./state";

import { createEvent } from "./events";

import { UIPlan } from "./schemas/plan.schema";

import {
  initTools,
  executeTool,
  DEFAULT_TOOL_POLICY,
  ToolContext,
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

/**
 * 把 AgentTrace 的执行结果写回 AgentState（Runtime 才是 State 的唯一写入者）。
 *
 * Phase 2 暂用 switch(trace.tool) 分发；Phase 3+ 会把「Tool → State 变更」下沉为
 * Tool 自己声明的 applyResult / State Reducer，让 Runtime 不再认识具体 Tool。
 */
function applyTrace(state: AgentState, trace: AgentTrace): AgentState {
  if (trace.status === "failed") {
    return {
      ...state,
      errors: [...state.errors, trace.error ?? "Tool execution failed"],
    };
  }

  switch (trace.tool) {
    case "planner":
      return { ...state, plan: trace.output as UIPlan, errors: [] };
    case "retrieve_design_context":
      return {
        ...state,
        contextData: trace.output as Record<string, unknown>,
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


    const attempt = tool === "planner" ? state.plannerAttempts : undefined;
    const input = buildToolInput(state, tool);
    state = updateStage(state, TOOL_STAGE[tool]);

    // Tool Call → TOOL_CALL event（history 最小化：仅 tool，不含 duration / input / output）。
    state = appendEvent(state, createEvent("TOOL_CALL", { tool }));

    // Executor 内部已把 ToolResult 归一化为 AgentTrace；Runtime 只消费最终 Trace。
    const trace = await executeTool(
      tool,
      input,
      buildToolContext(state),
      DEFAULT_TOOL_POLICY,
      state.toolCallCount,
      attempt
    );

    // Tool Result → TOOL_RESULT event（history 最小化：tool + success，不含 duration）。
    state = appendEvent(
      state,
      createEvent("TOOL_RESULT", {
        tool,
        success: trace.status === "success",
      })
    );

    // 记录 Tool 执行 Trace（完整执行细节），与 history 分离、不重复。
    state = appendTrace(
      { ...state, toolCallCount: state.toolCallCount + 1 },
      trace
    );

    // 根据 Trace 更新 State（plan / contextData / errors）。
    state = applyTrace(state, trace);
  }
}
