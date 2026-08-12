import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 1.2 — 主窗口 ↔ iframe 沙盒 强类型通信协议
// ============================================================

// ── Payload 类型 ──
export interface SyncASTPayload {
  ast: CoreASTNode;
}

export interface DOMRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface NodeSelectPayload {
  nodeId: string;
  nodeType: string;
  rect: DOMRect;
}

// ── 统一消息协议映射 ──
export type BridgeMessageMap = {
  // Host → Sandbox
  T2D2C_SYNC_AST: SyncASTPayload;
  T2D2C_HIGHLIGHT_NODE: { nodeId: string | null };

  // Sandbox → Host
  T2D2C_SANDBOX_READY: undefined;
  T2D2C_NODE_SELECTED: NodeSelectPayload;
  T2D2C_NODE_DESELECTED: undefined;
};

export type BridgeMessageType = keyof BridgeMessageMap;

// ============================================================
// 强类型发送 & 监听
// ============================================================

/**
 * 强类型发送函数：给指定 targetWindow 发送 Bridge 消息。
 * 如果 type 与 payload 类型不匹配，TS 编译直接报错。
 *
 * @example
 *   sendBridgeMessage(iframe.contentWindow, "T2D2C_SYNC_AST", { ast });
 *   sendBridgeMessage(window.parent, "T2D2C_SANDBOX_READY"); // no payload
 */
export function sendBridgeMessage<T extends BridgeMessageType>(
  targetWindow: Window | null,
  type: T,
  ...args: BridgeMessageMap[T] extends undefined
    ? []
    : [payload: BridgeMessageMap[T]]
): void {
  if (!targetWindow) {
    console.warn(`[Bridge] targetWindow 不可用，消息 ${type} 已丢弃`);
    return;
  }
  const payload = args[0];
  targetWindow.postMessage({ type, payload }, "*");
}

/**
 * 强类型监听工厂：根据 message type 自动收窄 payload 类型。
 *
 * @example
 *   const listener = createBridgeListener({
 *     T2D2C_SYNC_AST: (payload) => setAst(payload.ast),   // payload: SyncASTPayload
 *     T2D2C_SANDBOX_READY: () => setIsReady(true),        // payload: undefined
 *   });
 *   window.addEventListener("message", listener);
 */
export function createBridgeListener(handlers: {
  [K in BridgeMessageType]?: (payload: BridgeMessageMap[K]) => void;
}) {
  return (event: MessageEvent) => {
    const data = event.data as { type?: BridgeMessageType; payload?: unknown };
    if (!data || !data.type) return;

    const handler = handlers[data.type];
    if (handler) {
      handler(data.payload as never);
    }
  };
}
