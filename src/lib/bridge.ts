import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 1.2 — 主窗口 ↔ iframe 沙盒 通信协议
// ============================================================

// ── 主窗口 → iframe ──
export interface SyncASTMessage {
  type: "T2D2C_SYNC_AST";
  payload: {
    ast: CoreASTNode;
  };
}

export interface HighlightNodeMessage {
  type: "T2D2C_HIGHLIGHT_NODE";
  payload: {
    nodeId: string | null; // null = 取消高亮
  };
}

export interface SetViewportMessage {
  type: "T2D2C_SET_VIEWPORT";
  payload: {
    width: number; // 视口宽度（px），用于模拟响应式断点
  };
}

// ── iframe → 主窗口 ──
export interface SandboxReadyMessage {
  type: "T2D2C_SANDBOX_READY";
}

export interface NodeClickedMessage {
  type: "T2D2C_NODE_CLICKED";
  payload: {
    nodeId: string;
    nodeType: string;
    rect: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
  };
}

// ── 联合类型 ──
export type HostToSandboxMessage =
  | SyncASTMessage
  | HighlightNodeMessage
  | SetViewportMessage;

export type SandboxToHostMessage = SandboxReadyMessage | NodeClickedMessage;

// ============================================================
// 工具函数
// ============================================================

/**
 * 向 iframe 沙盒发送消息
 */
export function postToSandbox(
  iframe: HTMLIFrameElement,
  message: HostToSandboxMessage
): void {
  if (!iframe.contentWindow) {
    console.warn("[Bridge] iframe contentWindow 不可用");
    return;
  }
  iframe.contentWindow.postMessage(message, "*");
}

/**
 * 向主窗口发送消息（在 iframe 内部调用）
 */
export function postToHost(message: SandboxToHostMessage): void {
  window.parent.postMessage(message, "*");
}
