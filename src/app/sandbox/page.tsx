"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import {
  sendBridgeMessage,
  createBridgeListener,
  DOMRectPayload,
} from "@/bridge/bridgeProtocol";

// ============================================================
// 递归渲染器：将 AST 节点树转为真实 DOM（携带 data-node-id 命中标记）
// ============================================================
const ASTRenderer: React.FC<{ node: CoreASTNode }> = ({ node }) => {
  const spec = COMPONENT_REGISTRY[node.type as ComponentType];

  if (!spec) {
    console.warn(
      `[Sandbox] 未找到组件类型 [${node.type}]，节点 id="${node.id}" 已跳过渲染。`
    );
    return null;
  }

  const childrenElements = node.children?.map((child) => (
    <ASTRenderer key={child.id} node={child} />
  ));

  return spec.render({
    node,
    combinedClassName: node.props?.className,
    children: childrenElements,
  });
};

// ============================================================
// 沙盒预览页面（在 iframe 内部运行）
// Phase 3.1.1（收敛版）: RAF 节流 Hover + Click 选中（Path + rect）
//   - Sandbox 仅作 Renderer，Selection 真相由 Host 独占持有。
//   - 几何同步仅保留 window scroll + resize 重测；无 ResizeObserver / scroll 容器发现。
// ============================================================
export default function SandboxPage() {
  const [ast, setAst] = useState<CoreASTNode | null>(null);

  const hoverRafRef = useRef<number | null>(null);
  const lastHoverNodeIdRef = useRef<string | null>(null);
  // 仅记忆「最近选中节点 id」用于 window.resize / AST 变更后重测坐标
  const selectedNodeIdRef = useRef<string | null>(null);

  // 抓取节点的 DOM 祖先树 Path（根 → 叶），供 Host Inspector 层级展示
  const getNodePath = useCallback((element: HTMLElement): string[] => {
    const path: string[] = [];
    let curr: HTMLElement | null = element;
    while (curr && curr !== document.body) {
      const nodeId = curr.getAttribute("data-node-id");
      if (nodeId) path.unshift(nodeId);
      curr = curr.parentElement;
    }
    return path;
  }, []);

  // 读取指定节点的 DOMRect（iframe 相对坐标）
  const getRect = useCallback((nodeId: string): DOMRectPayload | null => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, []);

  // 重发选中节点（用于 AST 变更 / 几何同步后刷新坐标）
  const reemitSelected = useCallback(() => {
    const nodeId = selectedNodeIdRef.current;
    if (!nodeId) return;
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) {
      selectedNodeIdRef.current = null;
      return;
    }
    const rect = getRect(nodeId);
    const path = getNodePath(el);
    if (rect) sendBridgeMessage(window.parent, "T2D2C_NODE_SELECTED", { nodeId, path, rect });
  }, [getRect, getNodePath]);

  // 重发悬停节点 rect（避免滚动后 hover 框漂移）
  const reemitHover = useCallback(() => {
    const nodeId = lastHoverNodeIdRef.current;
    if (!nodeId) return;
    const rect = getRect(nodeId);
    if (rect) sendBridgeMessage(window.parent, "T2D2C_NODE_HOVER", { nodeId, rect });
  }, [getRect]);

  // 几何同步：选中 + 悬停节点坐标一并重发（scroll / resize 共用）
  const syncGeometry = useCallback(() => {
    reemitSelected();
    reemitHover();
  }, [reemitSelected, reemitHover]);

  // 1. 通信初始化 + Message 监听（版本 + Origin 校验内置于 createBridgeListener）
  useEffect(() => {
    const listener = createBridgeListener({
      T2D2C_SYNC_AST: (payload) => {
        setAst(payload.ast);
        lastHoverNodeIdRef.current = null;
      },
    });

    window.addEventListener("message", listener);
    sendBridgeMessage(window.parent, "T2D2C_SANDBOX_READY");

    return () => window.removeEventListener("message", listener);
  }, []);

  // 2. AST 变更后重测选中节点坐标（替代 ResizeObserver）
  useEffect(() => {
    if (ast) reemitSelected();
  }, [ast, reemitSelected]);

  // 3. 几何同步：iframe 内部 scroll / window.resize → 重测选中与悬停坐标
  //    收敛版策略：仅监听 window scroll + resize，不做内部 scroll container discovery。
  //    注：当前沙盒由 body 滚动（min-h-screen），故监听 window scroll；
  //    若日后把画布包进 overflow-auto 容器，需把 scroll 监听改挂到该容器上。
  useEffect(() => {
    window.addEventListener("scroll", syncGeometry, { passive: true });
    window.addEventListener("resize", syncGeometry);
    return () => {
      window.removeEventListener("scroll", syncGeometry);
      window.removeEventListener("resize", syncGeometry);
    };
  }, [syncGeometry]);

  // 4. RAF 节流 Hover（60fps 上限，节点切换去重；rect 随 payload 一并携带）
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (hoverRafRef.current !== null) return;

    hoverRafRef.current = requestAnimationFrame(() => {
      const el = target.closest?.("[data-node-id]") as HTMLElement | null;
      const nodeId = el ? el.getAttribute("data-node-id")! : null;

      if (nodeId !== lastHoverNodeIdRef.current) {
        lastHoverNodeIdRef.current = nodeId;
        if (nodeId) {
          const rect = getRect(nodeId);
          if (rect) sendBridgeMessage(window.parent, "T2D2C_NODE_HOVER", { nodeId, rect });
        } else {
          sendBridgeMessage(window.parent, "T2D2C_NODE_HOVER", { nodeId: null });
        }
      }
      hoverRafRef.current = null;
    });
  };

  // 5. Click 选择代理（Path + rect 一并携带）
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null;

    if (target) {
      e.stopPropagation();
      const nodeId = target.getAttribute("data-node-id")!;
      selectedNodeIdRef.current = nodeId;
      const path = getNodePath(target);
      const rect = getRect(nodeId);
      if (rect) sendBridgeMessage(window.parent, "T2D2C_NODE_SELECTED", { nodeId, path, rect });
    } else {
      selectedNodeIdRef.current = null;
      sendBridgeMessage(window.parent, "T2D2C_NODE_DESELECTED");
    }
  };

  // ── 等待态 ──
  if (!ast) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center text-sm font-mono">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p>等待主窗口推送 AST 数据...</p>
        </div>
      </div>
    );
  }

  // ── 渲染态 ──
  return (
    <div
      className="min-h-screen bg-white select-none"
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
    >
      <ASTRenderer node={ast} />
    </div>
  );
}
