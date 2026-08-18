import { AgentTrace } from "./types";
import { ToolResult } from "./tools/types";
import type { AgentDecision, AgentDecisionTrace } from "./decision/types";

// ============================================================
// Phase 2 — Trace 工厂（Tool 执行记录）
//   与 events.ts 的 createEvent 平行：history 记录生命周期，trace 记录执行细节。
// ============================================================

let seq = 0;

/** 生成单调递增的 Trace ID（叠加时间戳，避免同 tick 碰撞） */
export function createTraceId(): string {
  seq += 1;
  return `trace_${seq}_${Date.now().toString(36)}`;
}

/** 创建一条规范化 Trace（自动补全 id） */
export function createTrace(trace: Omit<AgentTrace, "id">): AgentTrace {
  return { id: createTraceId(), ...trace };
}

/**
 * 从 ToolResult 构建一条 Trace（Runtime 每次工具执行后调用）。
 *
 * 这是「Runtime 如何记录一次工具执行」的唯一出口，拆成纯函数以便测试：
 *   - success → status "success" + output
 *   - failed  → status "failed"  + error（拒绝 / 不存在 / 抛异常 / 超预算）
 */
export function buildToolTrace(
  tool: string,
  attempt: number | undefined,
  input: unknown,
  startedAt: number,
  result: ToolResult<unknown>
): AgentTrace {
  return createTrace({
    tool,
    status: result.success ? "success" : "failed",
    startedAt,
    durationMs: result.metadata?.durationMs ?? 0,
    attempt,
    input,
    output: result.success ? result.data : undefined,
    error: result.error,
  });
}

let decisionSeq = 0;

/** 生成 Decision Trace ID（前缀 decision_，与 Tool Trace 区分） */
export function createDecisionTraceId(): string {
  decisionSeq += 1;
  return `decision_${decisionSeq}_${Date.now().toString(36)}`;
}

/**
 * 从一条 AgentDecision 构建 Decision Trace（记录「Agent 为什么做这个决定」）。
 */
export function createDecisionTrace(
  decision: AgentDecision,
  step: number
): AgentDecisionTrace {
  return {
    id: createDecisionTraceId(),
    timestamp: Date.now(),
    action: decision.action,
    tool: decision.tool,
    reason: decision.reason,
    step,
  };
}
