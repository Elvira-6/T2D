import type { AgentToolName } from "../tools/types";

// ============================================================
// Phase 3.0 — Agent Decision Engine 类型契约
// ============================================================

/**
 * 决策动作（Phase 3.0 只允许三个，避免提前污染）：
 *   CALL_TOOL — 需要调用某个 Tool
 *   DONE      — 目标已完成
 *   FAIL      — 无法安全继续
 *
 * 后续按需扩展（如 WAIT_HUMAN / REPAIR），不要现在加入。
 */
export type DecisionAction = "CALL_TOOL" | "DONE" | "FAIL";

/**
 * LLM Decision Engine 输出的结构化决策。
 *
 * 与 Rule Controller 的返回值统一为同一契约，这样 Runtime 只消费
 * AgentDecision，无需知道决策来自 LLM 还是规则回退。
 */
export interface AgentDecision {
  action: DecisionAction;

  tool?: AgentToolName;

  reason: string;
}

/**
 * Decision Trace（回答「Agent 为什么做这个决定」）。
 *
 * 与 Tool Trace（AgentTrace）正交：
 *   - AgentTrace       ：工具执行细节（duration / input / output）
 *   - AgentDecisionTrace：决策轨迹（action / tool / reason / step）
 */
export interface AgentDecisionTrace {
  id: string;

  timestamp: number;

  action: DecisionAction;

  tool?: AgentToolName;

  reason: string;

  /** 该决策发生在第几步循环 */
  step: number;
}
