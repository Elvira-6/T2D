import { runAgent } from "./runtime";
import { createInitialState } from "./state";

// ============================================================
// Phase 0 — Agent Runtime 公共出口
//   对外暴露状态机、Tool 注册表、决策策略与状态/事件工厂。
// ============================================================

export { runAgent } from "./runtime";
export { decideNextAction } from "./decision/policy";
export { createInitialState, appendEvent } from "./state";
export { createEvent, createEventId } from "./events";
export {
  TOOLS,
  plannerTool,
  generatorTool,
  validatorTool,
  repairTool,
} from "./tools";
export type { AgentTool } from "./tools/types";

export type {
  AgentStage,
  AgentAction,
  ToolAction,
  UIPlan,
  AgentEventType,
  AgentEvent,
  AgentState,
} from "./types";

/**
 * Phase 0 Demo 入口：以一条 Prompt 跑通完整 Agent 状态机，
 * 输出最终状态与事件时间线。
 *
 * 刻意不作为模块顶层副作用执行（避免 Next.js SSR / build 阶段误触发），
 * 需要演示时显式调用即可。
 */
export async function runAgentDemo(prompt = "生成一个 SaaS Landing Page") {
  const result = await runAgent(createInitialState(prompt));
  // eslint-disable-next-line no-console
  console.log("[AgentDemo] 最终状态：", result);
  return result;
}
