import { AgentState, AgentStage, AgentEvent } from "./types";
import { createEvent } from "./events";

// ============================================================
// Phase 2 — 状态工厂与不可变更新助手
// ============================================================

/** 创建初始 Agent 状态（IDLE + 空数据；maxPlannerAttempts 固定为 2） */
export function createInitialState(
  prompt: string,
  maxSteps = 12
): AgentState {
  return {
    id: `agent_${Date.now().toString(36)}`,
    prompt,
    stage: "IDLE",
    errors: [],
    history: [],
    traces: [],
    stepCount: 0,
    maxSteps,
    plannerAttempts: 0,
    maxPlannerAttempts: 2,
    toolCallCount: 0,
  };
}

/** 追加一条生命周期事件（返回新状态，不就地修改，保持不可变） */
export function appendEvent(state: AgentState, event: AgentEvent): AgentState {
  return { ...state, history: [...state.history, event] };
}

/** 阶段迁移：记录 STATE_CHANGE 事件并返回新状态 */
export function updateStage(
  state: AgentState,
  nextStage: AgentStage
): AgentState {
  const event = createEvent("STATE_CHANGE", {
    from: state.stage,
    to: nextStage,
  });

  return {
    ...state,
    stage: nextStage,
    history: [...state.history, event],
  };
}
