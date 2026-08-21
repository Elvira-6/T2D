import { AgentState, AgentStage, AgentTrace } from "./types";

import { decideNextAction } from "./decision/engine";
import { assertAgentToolName } from "./decision/engine";
import type { AgentDecision } from "./decision/types";

import {
  updateStage,
  appendEvent,
  appendTrace,
  appendDecisionTrace,
} from "./state";

import { createEvent } from "./events";
import { createDecisionTrace } from "./trace";

import { UIPlan } from "./schemas/plan.schema";
import { CoreASTNode } from "@/types/ast";
import type { ValidationResult } from "./validation/types";

import {
  initTools,
  executeTool,
  DEFAULT_TOOL_POLICY,
  ToolContext,
  AgentToolName,
} from "./tools";

// ============================================================
// Phase 3.0 — Agent Runtime（状态机循环 + LLM Decision Engine + 三轨记录）
//
//   Decision Engine 决策（LLM）→ 统一走 Tool Executor →
//     - history        ：生命周期（STATE_CHANGE / ERROR）+ 最小化 TOOL_CALL/TOOL_RESULT
//     - traces         ：每次工具执行的完整细节（tool / status / duration / in-out）
//     - decisionTraces ：每次决策的 action / tool / reason（回答「为什么做这个决定」）
//
//   decide 可注入：默认用 LLM 引擎，测试或回退时可换成 rule-based 控制器。
// ============================================================

/** 工具 → 对应阶段（用于 State Trace 的阶段迁移展示） */
const TOOL_STAGE: Record<AgentToolName, AgentStage> = {
  planner: "PLANNING",
  retrieve_design_context: "RETRIEVING",
  generator: "GENERATING",
  validator: "VALIDATING",
};

export type DecideFn = (
  state: AgentState
) => AgentDecision | Promise<AgentDecision>;

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
    case "generator":
      if (!state.plan) {
        throw new Error("Generator requires plan");
      }

      if (!state.contextData) {
        throw new Error("Generator requires design context");
      }

      return {
        plan: state.plan,
        designContext: state.contextData,
      };
    case "validator":
      if (!state.ast) {
        throw new Error("Validator requires AST");
      }

      return { ast: state.ast };
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
    case "generator":
      return { ...state, ast: trace.output as CoreASTNode,errors: [], };
    case "validator":
      return { ...state, validation: trace.output as ValidationResult };
    default:
      return state;
  }
}

export async function runAgent(
  initialState: AgentState,
  decide: DecideFn = decideNextAction
): Promise<AgentState> {
  initTools();

  let state = { ...initialState };

  while (true) {
    state = { ...state, stepCount: state.stepCount + 1 };

    // 防死循环：步数上限（Runtime 的硬边界，不依赖 LLM 决策）。
    if (state.stepCount >= state.maxSteps) {
      state = updateStage(state, "FAILED");
      return appendEvent(
        state,
        createEvent("ERROR", { reason: "max steps exceeded" })
      );
    }

    const decision = await decide(state);
    

    // 记录 Decision Trace（回答「Agent 为什么做这个决定」）。
    state = appendDecisionTrace(
      state,
      createDecisionTrace(decision, state.stepCount)
    );

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

    // CALL_TOOL —— 最后一层防御性收窄（不信任上游决策）。
    const tool = assertAgentToolName(decision.tool);

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
