"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { CoreASTNode } from "@/types/ast";
import { mockHeroAST } from "@/mocks/mockAst";
import { SandboxToHostMessage } from "@/lib/bridge";
import { Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";

// ============================================================
// 主工作台页面（三栏布局）
//   - 左栏：AI Chat 对话框（Phase 2 接入 LLM）
//   - 中栏：iframe 沙盒画布（AST 实时预览）
//   - 右栏：Inspector 属性面板（Phase 1.3 接入）
// ============================================================
export default function WorkbenchPage() {
  const [currentAST, setCurrentAST] = useState<CoreASTNode>(mockHeroAST);
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── 向 iframe 发送最新的 AST ──
  const sendASTToSandbox = useCallback(
    (astData: CoreASTNode) => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(
        { type: "T2D2C_SYNC_AST", payload: { ast: astData } },
        "*"
      );
    },
    []
  );

  // ── 监听来自沙盒的消息 ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent<SandboxToHostMessage>) => {
      const msg = event.data;

      // 握手信号
      if (msg?.type === "T2D2C_SANDBOX_READY") {
        setIsSandboxReady(true);
        sendASTToSandbox(currentAST);
      }

      // 节点点击事件（Phase 1.3 预留）
      if (msg?.type === "T2D2C_NODE_CLICKED" && msg.payload) {
        setSelectedNodeId(msg.payload.nodeId);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentAST, sendASTToSandbox]);

  // ── AST 变化时自动同步到沙盒 ──
  useEffect(() => {
    if (isSandboxReady) {
      sendASTToSandbox(currentAST);
    }
  }, [currentAST, isSandboxReady, sendASTToSandbox]);

  // ── 视口容器尺寸控制 ──
  const viewportStyles: Record<string, string> = {
    desktop: "w-full h-full",
    tablet:
      "w-[768px] h-[90%] rounded-xl shadow-2xl border border-slate-800",
    mobile:
      "w-[375px] h-[812px] rounded-3xl shadow-2xl border-4 border-slate-800",
  };

  // ── 视口切换按钮配置 ──
  const viewportButtons = [
    { mode: "desktop" as const, Icon: Monitor, label: "Desktop View" },
    { mode: "tablet" as const, Icon: Tablet, label: "Tablet View" },
    { mode: "mobile" as const, Icon: Smartphone, label: "Mobile View" },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ═══ 顶部 Navigation ═══ */}
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            T2D2C Workspace
          </span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            Phase 1.2
          </span>
        </div>

        {/* 视口尺寸切换器 */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 space-x-1">
          {viewportButtons.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewportMode(mode)}
              className={`p-1.5 rounded transition ${
                viewportMode === mode
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => sendASTToSandbox(currentAST)}
            className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            手动刷新沙盒
          </button>
        </div>
      </header>

      {/* ═══ 主体三栏布局 ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：AI Chat 对话框 */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              AI Prompt Agent
            </h3>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
              💬 输入需求（将于 Phase 2 接入 LangGraph 流式生成...）
            </div>
          </div>
          <div className="p-2 border border-slate-800 rounded bg-slate-950 text-[11px] text-slate-500">
            沙盒状态:{" "}
            {isSandboxReady ? (
              <span className="text-emerald-400">Ready</span>
            ) : (
              <span className="text-amber-400">Connecting...</span>
            )}
          </div>
        </aside>

        {/* 中栏：iframe 画布沙盒 */}
        <main className="flex-1 bg-slate-950 flex items-center justify-center p-6 relative overflow-auto">
          <div
            className={`transition-all duration-300 ease-in-out ${viewportStyles[viewportMode]}`}
          >
            <iframe
              ref={iframeRef}
              src="/sandbox"
              className="w-full h-full border-0 bg-white"
              title="AST Live Sandbox"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </main>

        {/* 右栏：Inspector 属性面板 */}
        <aside className="w-72 border-l border-slate-800 bg-slate-900/30 p-4 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Inspector
          </h3>
          {selectedNodeId ? (
            <div className="text-xs text-slate-300 space-y-2">
              <div className="p-2 bg-slate-800 rounded border border-slate-700">
                <span className="text-slate-500">选中节点:</span>{" "}
                <code className="text-blue-400">{selectedNodeId}</code>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">
              请点击画布中的 DOM 节点（将于 Phase 1.3 接入双向选中与高亮）...
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
