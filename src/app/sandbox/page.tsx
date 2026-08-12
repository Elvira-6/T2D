"use client";

import React, { useEffect, useState } from "react";
import { CoreASTNode } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import { HostToSandboxMessage } from "@/lib/bridge";

// ============================================================
// 递归渲染器：将 AST 节点树转为真实 DOM
// ============================================================
const ASTRenderer: React.FC<{ node: CoreASTNode }> = ({ node }) => {
  const spec = COMPONENT_REGISTRY[node.type];

  if (!spec) {
    console.warn(
      `[Sandbox] 未找到组件类型 [${node.type}] 的 Spec 映射，节点 id="${node.id}" 已跳过渲染。`
    );
    return null;
  }

  // 递归渲染子节点
  const childrenElements = node.children?.map((child) => (
    <ASTRenderer key={child.id} node={child} />
  ));

  // 用 Registry 中注册的 render 函数渲染
  return spec.render({
    node,
    combinedClassName: node.props?.className,
    children: childrenElements,
  });
};

// ============================================================
// 沙盒预览页面（在 iframe 内部运行）
// ============================================================
export default function SandboxPage() {
  const [ast, setAst] = useState<CoreASTNode | null>(null);

  useEffect(() => {
    // 1. 握手：通知主窗口沙盒已就绪
    window.parent.postMessage({ type: "T2D2C_SANDBOX_READY" }, "*");

    // 2. 监听主窗口下发的 AST 同步数据
    const handleMessage = (event: MessageEvent<HostToSandboxMessage>) => {
      const { type, payload } = event.data || {};
      if (type === "T2D2C_SYNC_AST" && payload?.ast) {
        setAst(payload.ast);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
      <ASTRenderer node={ast} />
    </div>
  );
}
