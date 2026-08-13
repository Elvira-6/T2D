"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import {
  sendBridgeMessage,
  createBridgeListener,
  DOMRectPayload,
  NodeGeometry,
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
// Phase 3.1.1: RAF 节流 Hover + Click 选中（Path + rect）+ 几何刷新 + ResizeObserver
//   - Sandbox 仅作 Renderer，Selection 真相由 Host 独占持有。
//   - geometryTargetRef 仅是「几何追踪目标」提示，用于滚动/缩放/尺寸变化时重测坐标。
// ============================================================
export default function SandboxPage() {
  const [ast, setAst] = useState<CoreASTNode | null>(null);

  const geometryTargetRef = useRef<string | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const lastHoverNodeIdRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 抓取节点的 DOM 祖先树 Path（根 → 叶），供 Host Breadcrumb 导航
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

  // 几何刷新（resize/scroll/ResizeObserver）专用：只重测坐标，不触达 Selection
  const emitGeometry = useCallback((nodeId: string) => {
    const rect = getRect(nodeId);
    if (!rect) return;
    const geometry: NodeGeometry = { nodeId, rect, coordinate: "iframe" };
    sendBridgeMessage(window.parent, "T2D2C_NODE_GEOMETRY_CHANGED", geometry);
  }, [getRect]);

  // 观察选中节点自身尺寸变化（如 Inspector 修改 text），实时刷新几何
  const observeNode = useCallback((el: HTMLElement) => {
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    const ro = new ResizeObserver(() => {
      if (geometryTargetRef.current) emitGeometry(geometryTargetRef.current);
    });
    ro.observe(el);
    resizeObserverRef.current = ro;
  }, [emitGeometry]);

  // 清空几何追踪目标 + 断开 ResizeObserver
  const clearGeometryTarget = useCallback(() => {
    geometryTargetRef.current = null;
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
  }, []);

  // 1. 通信初始化 + Message 监听（版本 + Origin 校验内置于 createBridgeListener）
  useEffect(() => {
    const listener = createBridgeListener({
      T2D2C_SYNC_AST: (payload) => {
        setAst(payload.ast);
        clearGeometryTarget();
        lastHoverNodeIdRef.current = null;
      },
    });

    window.addEventListener("message", listener);
    sendBridgeMessage(window.parent, "T2D2C_SANDBOX_READY");

    return () => window.removeEventListener("message", listener);
  }, [clearGeometryTarget]);

  // 2. resize / scroll（capture 捕获内层滚动容器）→ 重测当前选中节点几何
  useEffect(() => {
    const handleGeometryRefresh = () => {
      if (geometryTargetRef.current) emitGeometry(geometryTargetRef.current);
    };

    window.addEventListener("resize", handleGeometryRefresh);
    window.addEventListener("scroll", handleGeometryRefresh, true);
    return () => {
      window.removeEventListener("resize", handleGeometryRefresh);
      window.removeEventListener("scroll", handleGeometryRefresh, true);
    };
  }, [emitGeometry]);

  // 3. RAF 节流 Hover（60fps 上限，节点切换去重；rect 随 payload 一并携带）
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

  // 4. Click 选择代理（Path + rect 一并携带，并观察该节点尺寸变化）
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null;

    if (target) {
      e.stopPropagation();
      const nodeId = target.getAttribute("data-node-id")!;
      const path = getNodePath(target);
      const rect = getRect(nodeId);

      geometryTargetRef.current = nodeId;
      observeNode(target);
      if (rect) sendBridgeMessage(window.parent, "T2D2C_NODE_SELECTED", { nodeId, path, rect });
    } else {
      clearGeometryTarget();
      sendBridgeMessage(window.parent, "T2D2C_NODE_DESELECTED");
    }
  };

  // 卸载时清理 ResizeObserver
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
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
    <div
      className="min-h-screen bg-white select-none"
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
    >
      <ASTRenderer node={ast} />
    </div>
  );
}
