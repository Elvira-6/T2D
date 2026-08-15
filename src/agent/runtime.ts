import { AgentState } from "./types";
import { decideNextAction } from "./controller";
import { updateStage } from "./state";
import { createEvent } from "./events";
import { runPlanner } from "./tools/planner.tool";

// ============================================================
// Phase 1 — Agent Runtime（状态机循环 + Event Trace）
//   while 循环驱动：Controller 决策 → 执行器 → 记录事件 → 直到终态。
// ============================================================

async function executePlan(state: AgentState): Promise<AgentState> {
  let next = updateStage(state, "PLANNING");

  next = {
    ...next,
    plannerAttempts: next.plannerAttempts + 1,
  };

  next.history.push(
    createEvent("TOOL_CALL", {
      tool: "planner",
      attempt: next.plannerAttempts,
    })
  );

  try {
    const result = await runPlanner(state.prompt);

    next = {
      ...next,
      plan: result.plan,
      errors: [],
    };

    next.history.push(
      createEvent("TOOL_RESULT", {
        tool: "planner",
        success: true,
        attempt: next.plannerAttempts,
      })
    );

    return next;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown planner error";

    next.errors = [...next.errors, message];

    next.history.push(
      createEvent("ERROR", {
        tool: "planner",
        attempt: next.plannerAttempts,
        error: message,
      })
    );

    return next;
  }
}

export async function runAgent(
  initialState: AgentState
): Promise<AgentState> {
  let state = { ...initialState };

  while (true) {
    state = { ...state, stepCount: state.stepCount + 1 };

    const action = decideNextAction(state);

    switch (action) {
      case "PLAN":
        state = await executePlan(state);
        break;

      case "GENERATE":
        /**
         * Phase 1 边界：文档建议暂不让 Runtime 自动进入 Phase 2。
         * 这里以 COMPLETED 作为正常完成边界，便于独立演示
         * （区别于文档中的 throw "Generator not implemented yet."）。
         */
        return updateStage(state, "COMPLETED");

      case "VALIDATE":
        // Phase 3（Phase 1 不可达：ast 从未被设置，GENERATE 先触发）
        return updateStage(state, "FAILED");

      case "REPAIR":
        // Phase 4（Phase 1 不可达）
        return updateStage(state, "FAILED");

      case "DONE":
        return updateStage(state, "COMPLETED");

      case "FAIL":
        return updateStage(state, "FAILED");
    }
  }
}
