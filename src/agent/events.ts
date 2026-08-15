import { AgentEvent, AgentEventType } from "./types";

// ============================================================
// Phase 1 — 事件工厂（Event Trace 能力）
//   统一事件结构：type + payload。运行时用 createEvent 记录溯源。
// ============================================================

let seq = 0;

/** 生成单调递增的事件 ID（叠加时间戳，避免同 tick 碰撞） */
export function createEventId(): string {
  seq += 1;
  return `evt_${seq}_${Date.now().toString(36)}`;
}

/** 创建一条规范化事件（自动补全 id / timestamp / type） */
export function createEvent(
  type: AgentEventType,
  payload: Record<string, unknown>
): AgentEvent {
  return {
    id: createEventId(),
    timestamp: Date.now(),
    type,
    payload,
  };
}
