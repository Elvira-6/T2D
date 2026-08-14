import { AgentState } from "./types";
import { decideNextAction } from "./decision/policy";
import { TOOLS } from "./tools";
import { createEvent } from "./events";
import { appendEvent } from "./state";

// ============================================================
// Phase 0 — Agent Runtime（状态机循环 + 事件溯源）
//   while 循环驱动：决策 → 查表 → 执行 Tool → 记录事件 → 直到终态。
// ============================================================

export async function runAgent(initial: AgentState): Promise<AgentState> {
  // 起始事件：记录进入运行循环（首次决策前，stage 仍为 initial.stage）
  let state = appendEvent(
    initial,
    createEvent("STATE_CHANGE", {
      source: "agent",
      input: { stage: initial.stage },
    })
  );

  while (true) {
    state = { ...state, stepCount: state.stepCount + 1 };
    const action = decideNextAction(state);

    // 终态 1：正常完成
    if (action === "DONE") {
      state = { ...state, stage: "COMPLETED" };
      return appendEvent(
        state,
        createEvent("STATE_CHANGE", {
          source: "agent",
          action,
          output: { stage: "COMPLETED" },
        })
      );
    }

    // 终态 2：步数耗尽
    if (action === "FAIL") {
      state = { ...state, stage: "FAILED" };
      return appendEvent(
        state,
        createEvent("ERROR", {
          source: "agent",
          action,
          output: { reason: "max steps exceeded" },
        })
      );
    }

    // 执行 Tool：记录 TOOL_CALL → execute → 记录 TOOL_RESULT（含耗时）
    const tool = TOOLS[action];

    state = appendEvent(
      state,
      createEvent("TOOL_CALL", {
        source: "tool",
        action,
        input: { stage: state.stage, stepCount: state.stepCount },
      })
    );

    const startedAt = Date.now();
    const next = await tool.execute(state);
    const duration = Date.now() - startedAt;

    state = appendEvent(
      next,
      createEvent("TOOL_RESULT", {
        source: "tool",
        action,
        output: { stage: next.stage },
        duration,
      })
    );
  }
}
