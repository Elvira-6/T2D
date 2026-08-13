import { CoreASTNode } from "@/types/ast";
import { MutationCommand } from "@/mutation/mutationTypes";

// ============================================================
// Phase 3.1.1 — Bridge 协议（Envelope + Version + Origin）
// 将「选择状态变更（State）」与「几何体重绘（Geometry）」职责彻底解耦。
// ============================================================

export const BRIDGE_VERSION = "1.0";

// Origin 配置：生产环境通过环境变量指定 iframe 沙盒 origin；
// 开发环境同源（localhost:3000 与 /sandbox）时回退到当前 window origin。
export const ALLOWED_SANDBOX_ORIGIN =
  process.env.NEXT_PUBLIC_SANDBOX_ORIGIN ||
  (typeof window !== "undefined" ? window.location.origin : "*");

// iframe 内部相对视口坐标（重命名避免与全局 DOMRect 命名冲突）
export interface DOMRectPayload {
  top: number;
  left: number;
  width: number;
  height: number;
}

// 几何体上报：仅用于 resize / scroll / ResizeObserver 触发的坐标刷新，
// 与 Hover / Selection 状态彻底解耦。
export interface NodeGeometry {
  nodeId: string;
  rect: DOMRectPayload;
  coordinate: "iframe";
}

// 选中节点：直接携带 rect + DOM 祖先路径（根 → 叶），支撑 Breadcrumb 层级导航
export interface NodeSelectPayload {
  nodeId: string;
  path?: string[];
  rect: DOMRectPayload;
}

// 悬停节点：nodeId 为 null 表示移出所有节点；命中时直接携带 rect
export interface NodeHoverPayload {
  nodeId: string | null;
  rect?: DOMRectPayload;
}

// 方向约定：
//   Host  → Sandbox：T2D2C_SYNC_AST
//   Sandbox → Host：T2D2C_SANDBOX_READY、T2D2C_NODE_SELECTED、
//                   T2D2C_NODE_HOVER、T2D2C_NODE_DESELECTED、
//                   T2D2C_NODE_GEOMETRY_CHANGED、T2D2C_APPLY_MUTATION
export type BridgeMessageType =
  | "T2D2C_SANDBOX_READY" // Sandbox → Host：沙盒就绪握手
  | "T2D2C_NODE_SELECTED" // Sandbox → Host：选中节点（含 path 面包屑）
  | "T2D2C_NODE_HOVER" // Sandbox → Host：悬停节点
  | "T2D2C_NODE_DESELECTED" // Sandbox → Host：取消选中
  | "T2D2C_NODE_GEOMETRY_CHANGED" // Sandbox → Host：几何更新（独立职责）
  | "T2D2C_SYNC_AST" // Host → Sandbox：全量 AST 同步（生成/撤销/重置）
  | "T2D2C_APPLY_MUTATION"; // Sandbox → Host：iframe 内操作上报为 Mutation Command

export interface BridgePayloadMap {
  T2D2C_SANDBOX_READY: undefined;
  T2D2C_NODE_SELECTED: NodeSelectPayload;
  T2D2C_NODE_HOVER: NodeHoverPayload;
  T2D2C_NODE_DESELECTED: undefined;
  T2D2C_NODE_GEOMETRY_CHANGED: NodeGeometry;
  T2D2C_SYNC_AST: { ast: CoreASTNode };
  T2D2C_APPLY_MUTATION: { command: MutationCommand };
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

/**
 * 强类型发送函数：给指定 targetWindow 发送 Bridge 消息。
 * undefined-payload 类型可省略 payload 参数。
 */
export function sendBridgeMessage<T extends BridgeMessageType>(
  target: Window,
  type: T,
  ...args: BridgePayloadMap[T] extends undefined
    ? []
    : [payload: BridgePayloadMap[T]]
): void {
  const payload = args[0] as BridgePayloadMap[T];
  const envelope = createBridgeMessage(type, payload);
  target.postMessage(envelope, ALLOWED_SANDBOX_ORIGIN || "*");
}

/**
 * 强类型监听工厂：内置版本 + Origin 双重校验，
 * 根据 message type 自动收窄 payload 类型。
 */
export type BridgeHandlers = {
  [K in BridgeMessageType]?: (payload: BridgePayloadMap[K]) => void;
};

export function createBridgeListener(
  handlers: BridgeHandlers,
  allowedOrigin: string = ALLOWED_SANDBOX_ORIGIN
): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    if (allowedOrigin !== "*" && event.origin !== allowedOrigin) return;
    const envelope = event.data as BridgeEnvelope;
    if (!envelope || envelope.version !== BRIDGE_VERSION) return;

    const handler = handlers[envelope.type];
    if (handler) {
      handler(envelope.payload as never);
    }
  };
}
