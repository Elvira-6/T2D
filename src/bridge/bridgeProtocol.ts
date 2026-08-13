import { CoreASTNode } from "@/types/ast";
import { MutationCommand } from "@/mutation/mutationTypes";

// ============================================================
// Phase 3.0 — Bridge 协议（Envelope + Version + Origin）
// ============================================================

export const BRIDGE_VERSION = "1.0";

// Origin 配置：生产环境通过环境变量指定 iframe 沙盒 origin；
// 开发环境同源（localhost:3000 与 /sandbox）时为 ""，走同源/默认放行。
export const SANDBOX_ORIGIN = process.env.NEXT_PUBLIC_SANDBOX_ORIGIN ?? "";

export interface DOMRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface NodeSelectPayload {
  nodeId: string;
  nodeType: string; // 保留 Phase 1.3 Inspector 所需的类型字段
  rect: DOMRect;
}

// 方向约定：
//   Host  → Sandbox：T2D2C_SYNC_AST、T2D2C_HIGHLIGHT_NODE
//   Sandbox → Host：T2D2C_SANDBOX_READY、T2D2C_NODE_SELECTED、
//                   T2D2C_NODE_DESELECTED、T2D2C_APPLY_MUTATION
export type BridgeMessageType =
  | "T2D2C_SANDBOX_READY" // Sandbox → Host：沙盒就绪握手
  | "T2D2C_NODE_SELECTED" // Sandbox → Host：选中节点（含 nodeType 与坐标）
  | "T2D2C_NODE_DESELECTED" // Sandbox → Host：取消选中
  | "T2D2C_SYNC_AST" // Host → Sandbox：全量 AST 同步（生成/撤销/重置）
  | "T2D2C_APPLY_MUTATION" // Sandbox → Host：iframe 内操作上报为 Mutation Command
  | "T2D2C_HIGHLIGHT_NODE"; // Host → Sandbox：请求高亮某个节点

export interface BridgePayloadMap {
  T2D2C_SANDBOX_READY: undefined;
  T2D2C_NODE_SELECTED: NodeSelectPayload;
  T2D2C_NODE_DESELECTED: undefined;
  T2D2C_SYNC_AST: { ast: CoreASTNode };
  T2D2C_APPLY_MUTATION: { command: MutationCommand };
  T2D2C_HIGHLIGHT_NODE: { nodeId: string | null };
}

export interface BridgeEnvelope<T extends BridgeMessageType = BridgeMessageType> {
  version: typeof BRIDGE_VERSION;
  type: T;
  payload: BridgePayloadMap[T];
}

export function createBridgeMessage<T extends BridgeMessageType>(
  type: T,
  payload: BridgePayloadMap[T]
): BridgeEnvelope<T> {
  return { version: BRIDGE_VERSION, type, payload };
}

export function sendBridgeMessage<T extends BridgeMessageType>(
  target: Window,
  type: T,
  payload: BridgePayloadMap[T]
): void {
  const envelope = createBridgeMessage(type, payload);
  target.postMessage(envelope, SANDBOX_ORIGIN || "*");
}
