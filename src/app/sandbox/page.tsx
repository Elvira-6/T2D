"use client";

import React, { useEffect, useState, useRef } from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import { sendBridgeMessage, createBridgeListener } from "@/lib/bridge";

// ============================================================
// 递归渲染器：将 AST 节点树转为真实 DOM
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
// Phase 1.3: 点击捕获 + ResizeObserver + Scroll 实时坐标回传
// ============================================================
export default function SandboxPage() {
  const [ast, setAst] = useState<CoreASTNode | null>(null);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  // Refs 存储不触发重新渲染的状态
  const selectedNodeIdRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ── 工具：计算并发送当前选中节点的 DOM 坐标 ──
  const sendSelectedNodeRect = (nodeId: string) => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el || !window.parent) return;

    const rect = el.getBoundingClientRect();
    sendBridgeMessage(window.parent, "T2D2C_NODE_SELECTED", {
      nodeId,
      nodeType: el.getAttribute("data-node-type") ?? "",
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  // ── 握手 + 监听主窗口消息 ──
  useEffect(() => {
    sendBridgeMessage(window.parent, "T2D2C_SANDBOX_READY");

    const listener = createBridgeListener({
      T2D2C_SYNC_AST: (payload) => {
        setAst(payload.ast);
      },
      T2D2C_HIGHLIGHT_NODE: (payload) => {
        setHighlightNodeId(payload.nodeId);
      },
    });

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  // ── 点击 + ResizeObserver + Scroll 追踪 ──
  useEffect(() => {
    // 1. 全局点击捕获：向上冒泡寻找最邻近的 data-node-id
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const closestNodeEl = target?.closest(
        "[data-node-id]"
      ) as HTMLElement | null;

      if (closestNodeEl) {
        e.stopPropagation();
        const nodeId = closestNodeEl.getAttribute("data-node-id")!;
        selectedNodeIdRef.current = nodeId;

        // 重新挂载 ResizeObserver 监控选中元素尺寸变化
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        resizeObserverRef.current = new ResizeObserver(() => {
          if (selectedNodeIdRef.current) {
            sendSelectedNodeRect(selectedNodeIdRef.current);
          }
        });
        resizeObserverRef.current.observe(closestNodeEl);

        sendSelectedNodeRect(nodeId);
      } else {
        // 点击了空白区域，取消选中
        selectedNodeIdRef.current = null;
        if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        sendBridgeMessage(window.parent, "T2D2C_NODE_DESELECTED");
      }
    };

    // 2. 捕获 iframe 内的滚动事件，requestAnimationFrame 防抖实时更新高亮坐标
    let animFrameId: number | null = null;
    const handleScroll = () => {
      if (!selectedNodeIdRef.current) return;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        if (selectedNodeIdRef.current) {
          sendSelectedNodeRect(selectedNodeIdRef.current);
        }
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("scroll", handleScroll, true);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, []);

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
    <div className="min-h-screen bg-white">
      <ASTRenderer node={ast} />
    </div>
  );
}
