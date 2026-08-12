"use client";

import React, { useEffect, useState } from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import { sendBridgeMessage, createBridgeListener } from "@/lib/bridge";

// ============================================================
// 递归渲染器：将 AST 节点树转为真实 DOM
// ============================================================
const ASTRenderer: React.FC<{
  node: CoreASTNode;
  highlightNodeId: string | null;
  onNodeClick: (nodeId: string, nodeType: string, rect: DOMRect) => void;
}> = ({ node, highlightNodeId, onNodeClick }) => {
  const spec = COMPONENT_REGISTRY[node.type as ComponentType];

  if (!spec) {
    console.warn(
      `[Sandbox] 未找到组件类型 [${node.type}] 的 Spec 映射，节点 id="${node.id}" 已跳过渲染。`
    );
    return null;
  }

  // 递归渲染子节点
  const childrenElements = node.children?.map((child: CoreASTNode) => (
    <ASTRenderer
      key={child.id}
      node={child}
      highlightNodeId={highlightNodeId}
      onNodeClick={onNodeClick}
    />
  ));

  // 用 Registry 中注册的 render 函数渲染，注入 onClick
  return spec.render({
    node,
    combinedClassName: node.props?.className,
    children: childrenElements,
    onClick: (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      onNodeClick(node.id, node.type, rect);
    },
  });
};

// ============================================================
// 沙盒预览页面（在 iframe 内部运行）
// ============================================================
export default function SandboxPage() {
  const [ast, setAst] = useState<CoreASTNode | null>(null);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  useEffect(() => {
    // 1. 握手：通知主窗口沙盒已就绪
    sendBridgeMessage(window.parent, "T2D2C_SANDBOX_READY");

    // 2. 监听主窗口下发的消息
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

  // 节点点击 → 通知主窗口
  const handleNodeClick = (
    nodeId: string,
    nodeType: string,
    rect: DOMRect
  ) => {
    sendBridgeMessage(window.parent, "T2D2C_NODE_SELECTED", {
      nodeId,
      nodeType,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  // 等待态：尚未收到 AST
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

  // 渲染态：递归渲染整棵 AST
  return (
    <div className="min-h-screen bg-white">
      <ASTRenderer
        node={ast}
        highlightNodeId={highlightNodeId}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
