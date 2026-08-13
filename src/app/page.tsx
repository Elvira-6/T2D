"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { CoreASTNode } from "@/types/ast";
import { mockHeroAST } from "@/mocks/mockAst";
import { sendBridgeMessage, createBridgeListener } from "@/bridge/bridgeProtocol";
import { CanvasOverlay } from "@/editor/CanvasOverlay";
import { useEditorStore } from "@/editor/editorStore";
import { useStreamAST } from "@/hooks/useStreamAST";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Box,
  Tag,
  Sparkles,
  Loader2,
  Undo2,
  Redo2,
} from "lucide-react";

// ============================================================
// 主工作台页面（三栏布局）
//   - 左栏：AI Prompt 交互对话框（Phase 2.1 接入 SSE 流式生成）
//   - 中栏：iframe 沙盒画布 + 跨 iframe 高亮 Overlay（Phase 3.1.1）
//   - 右栏：Inspector 属性面板（实时展示选中节点信息 + 面包屑路径）
// ============================================================
export default function WorkbenchPage() {
  const {
    currentAST,
    selectedNode,
    selectedNodeId,
    selectedNodePath,
    selectedOverlayRect,
    hoverNodeId,
    hoverOverlayRect,
    commandHistory,
    canUndo,
    canRedo,
    resetAST,
    setSelection,
    setHover,
    updateGeometry,
    setIframeOffset,
    undo,
    redo,
  } = useEditorStore(mockHeroAST);

  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [viewportMode, setViewportMode] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [isResizingViewport, setIsResizingViewport] = useState(false);

  // Prompt 输入框状态 + 流式生成 Hook
  const [promptInput, setPromptInput] = useState("");
  const { isGenerating, startStream } = useStreamAST();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── 向 iframe 发送最新的 AST（Envelope + Origin）──
  const syncASTToSandbox = useCallback((astData: CoreASTNode) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    sendBridgeMessage(target, "T2D2C_SYNC_AST", { ast: astData });
  }, []);

  // ── 触发流式生成 ──
  const handleGenerate = useCallback(() => {
    if (!promptInput.trim() || isGenerating) return;
    setSelection(null);
    startStream(promptInput, (updatedAST) => {
      resetAST(updatedAST);
    });
  }, [promptInput, isGenerating, startStream, setSelection, resetAST]);

  // ── 视口切换（支持动画暂隐防御，避免过渡期坐标漂移）──
  const handleViewportChange = (mode: "desktop" | "tablet" | "mobile") => {
    if (mode === viewportMode) return;
    setIsResizingViewport(true);
    setViewportMode(mode);

    setTimeout(() => {
      setIsResizingViewport(false);
      syncASTToSandbox(currentAST);
    }, 320);
  };

  // ── 计算 iframe 相对 Host 视口的偏移（供坐标变换）──
  const updateIframeOffset = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setIframeOffset({ top: rect.top, left: rect.left });
  }, [setIframeOffset]);

  useEffect(() => {
    updateIframeOffset();
    window.addEventListener("resize", updateIframeOffset);
    window.addEventListener("scroll", updateIframeOffset, true);
    return () => {
      window.removeEventListener("resize", updateIframeOffset);
      window.removeEventListener("scroll", updateIframeOffset, true);
    };
  }, [updateIframeOffset]);

  // iframe 尺寸变化（视口切换）时重测偏移
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateIframeOffset());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateIframeOffset]);

  // ── 监听来自沙盒的消息（版本 + Origin 校验内置于 createBridgeListener）──
  useEffect(() => {
    const listener = createBridgeListener({
      T2D2C_SANDBOX_READY: () => {
        setIsSandboxReady(true);
      },
      T2D2C_NODE_SELECTED: (payload) => {
        setSelection(payload.nodeId, payload.path, payload.rect);
      },
      T2D2C_NODE_DESELECTED: () => {
        setSelection(null);
      },
      T2D2C_NODE_HOVER: (payload) => {
        setHover(payload.nodeId, payload.rect);
      },
      T2D2C_NODE_GEOMETRY_CHANGED: (geometry) => {
        updateGeometry(geometry);
      },
    });

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [setSelection, setHover, updateGeometry]);

  // ── AST 变化时自动同步到沙盒（流式逐块触发 / 握手后首推）──
  useEffect(() => {
    if (isSandboxReady) {
      syncASTToSandbox(currentAST);
      updateIframeOffset();
    }
  }, [currentAST, isSandboxReady, syncASTToSandbox, updateIframeOffset]);

  // ── 视口容器尺寸控制 ──
  const viewportStyles: Record<string, string> = {
    desktop: "w-full h-full",
    tablet: "w-[768px] h-[90%] rounded-xl shadow-2xl border border-slate-800",
    mobile:
      "w-[375px] h-[812px] rounded-3xl shadow-2xl border-4 border-slate-800",
  };

  const viewportButtons = [
    { mode: "desktop" as const, Icon: Monitor, label: "Desktop View" },
    { mode: "tablet" as const, Icon: Tablet, label: "Tablet View" },
    { mode: "mobile" as const, Icon: Smartphone, label: "Mobile View" },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ═══ 跨 iframe 高亮选择框 Overlay ═══ */}
      <CanvasOverlay
        selectedOverlayRect={isResizingViewport ? null : selectedOverlayRect}
        selectedNodeId={selectedNodeId}
        selectedNodePath={selectedNodePath}
        hoverOverlayRect={hoverOverlayRect}
        hoverNodeId={hoverNodeId}
      />

      {/* ═══ 顶部 Header ═══ */}
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            T2D2C Workspace
          </span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            Phase 3.1.1
          </span>
        </div>

        {/* 视口尺寸切换器 */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 space-x-1">
          {viewportButtons.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => handleViewportChange(mode)}
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
          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-md transition"
            title="撤销"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" />
            撤销
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-md transition"
            title="重做"
          >
            <Redo2 className="w-3.5 h-3.5 mr-1" />
            重做
          </button>

          <button
            onClick={() => syncASTToSandbox(currentAST)}
            className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            手动刷新沙盒
          </button>
        </div>
      </header>

      {/* ═══ 主体三栏布局 ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：AI Prompt 交互对话框 */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between flex-shrink-0 z-10">
          <div className="space-y-4 flex-1 flex flex-col">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              AI Prompt Agent
            </h3>

            <div className="flex-1 flex flex-col justify-end space-y-3">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="描述你想要的界面（例如：生成一个暗黑风格的 Landing Page 首屏）..."
                className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !promptInput.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>流式生成 AST 中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>开始生成界面</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 p-2 border border-slate-800 rounded bg-slate-950 text-[11px] text-slate-500 flex justify-between">
            <span>沙盒状态:</span>
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
        <aside className="w-72 border-l border-slate-800 bg-slate-900/30 p-4 flex-shrink-0 z-10 overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Inspector
          </h3>

          {selectedNodeId && selectedNode ? (
            <div className="space-y-4">
              {/* 节点 ID + Type */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center text-xs text-blue-400 font-mono">
                  <Box className="w-3.5 h-3.5 mr-1.5" />
                  <span>Node</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 pl-5 break-all">
                  {selectedNodeId}
                </div>
                <div className="text-[11px] text-slate-500 pl-5">
                  type:{" "}
                  <span className="text-indigo-400">{selectedNode.type}</span>
                </div>
              </div>

              {/* 面包屑层级路径 */}
              {selectedNodePath.length > 0 && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center text-xs text-indigo-400 font-mono">
                    <Tag className="w-3.5 h-3.5 mr-1.5" />
                    <span>Path</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-5">
                    {selectedNodePath.slice(-4).map((id, index) => (
                      <React.Fragment key={id}>
                        {index > 0 && (
                          <span className="text-slate-600 text-[11px] leading-5">/</span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                            id === selectedNodeId
                              ? "bg-blue-600/20 text-blue-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {id}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Host 坐标数据 */}
              {selectedOverlayRect && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center text-xs text-indigo-400 font-mono">
                    <Tag className="w-3.5 h-3.5 mr-1.5" />
                    <span>Host Rect</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pl-5">
                    <div>
                      <span className="text-slate-600">W:</span>{" "}
                      {Math.round(selectedOverlayRect.width)}px
                    </div>
                    <div>
                      <span className="text-slate-600">H:</span>{" "}
                      {Math.round(selectedOverlayRect.height)}px
                    </div>
                    <div>
                      <span className="text-slate-600">X:</span>{" "}
                      {Math.round(selectedOverlayRect.left)}px
                    </div>
                    <div>
                      <span className="text-slate-600">Y:</span>{" "}
                      {Math.round(selectedOverlayRect.top)}px
                    </div>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-500 leading-relaxed p-2 bg-slate-950/50 rounded border border-slate-800">
                💡 悬停显示虚线框，点击选中并显示面包屑路径。滚动/缩放时高亮框自动跟踪。
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic leading-relaxed">
              点击画布中的 DOM 节点查看坐标联动...
            </div>
          )}

          {/* History 状态 */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>History</span>
            <span className="font-mono">{commandHistory.length} edits</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
