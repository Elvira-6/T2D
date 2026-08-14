import { AgentEvent, AgentEventType } from "./types";

// ============================================================
// Phase 0 — 事件工厂（Event Trace 能力）
//   统一规范事件结构，运行时通过 createEvent 记录 TOOL_CALL / TOOL_RESULT 等。
// ============================================================

let seq = 0;

/** 生成单调递增的事件 ID（叠加时间戳，避免同 tick 碰撞） */
export function createEventId(): string {
  seq += 1;
  return `evt_${seq}_${Date.now().toString(36)}`;
}

export interface EventInput {
  source: AgentEvent["source"];
  action?: AgentEvent["action"];
  input?: unknown;
  output?: unknown;
  duration?: number;
}

/** 创建一条规范化事件（自动补全 id / timestamp / type） */
export function createEvent(type: AgentEventType, input: EventInput): AgentEvent {
  return {
    id: createEventId(),
    timestamp: Date.now(),
    type,
    source: input.source,
    action: input.action,
    input: input.input,
    output: input.output,
    duration: input.duration,
  };
}
