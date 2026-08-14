import { AgentState, AgentEvent } from "./types";

// ============================================================
// Phase 0 — 状态工厂与不可变更新助手
// ============================================================

/** 创建初始 Agent 状态（仅 IDLE + 空数据，可局部覆盖） */
export function createInitialState(
  prompt: string,
  overrides: Partial<AgentState> = {}
): AgentState {
  return {
    id: `agent_${Date.now().toString(36)}`,
    prompt,
    stage: "IDLE",
    errors: [],
    history: [],
    stepCount: 0,
    maxSteps: 10,
    ...overrides,
  };
}

/** 追加一条事件（返回新状态，不就地修改，保持不可变） */
export function appendEvent(state: AgentState, event: AgentEvent): AgentState {
  return { ...state, history: [...state.history, event] };
}
