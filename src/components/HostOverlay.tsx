"use client";

import React from "react";
import { DOMRect } from "@/lib/bridge";

// ============================================================
// HostOverlay — 跨 iframe 物理坐标对齐高亮选择框
// ============================================================
//
// 核心公式（在主框架 window 坐标系下计算）：
//
//   Overlay_top  = Iframe_top  + Border_top  + (DOM_top  × canvasScale)
//   Overlay_left = Iframe_left + Border_left + (DOM_left × canvasScale)
//   Overlay_w    = DOM_w × canvasScale
//   Overlay_h    = DOM_h × canvasScale
//
// 注意：iframe 内部 DOM 的 getBoundingClientRect() 已经自动包含
// iframe 内 scroll 偏移，因此不需要额外加 scrollTop。

interface HostOverlayProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  selectedRect: DOMRect | null;
  selectedNodeId: string | null;
  canvasScale?: number;
}

export const HostOverlay: React.FC<HostOverlayProps> = ({
  iframeRef,
  selectedRect,
  selectedNodeId,
  canvasScale = 1,
}) => {
  if (!selectedRect || !iframeRef.current || !selectedNodeId) return null;

  const iframeEl = iframeRef.current;
  const iframeRect = iframeEl.getBoundingClientRect();

  // 获取 iframe 自身的 Border 厚度进行修剪
  const computedStyle = window.getComputedStyle(iframeEl);
  const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;

  // 物理坐标转换推导
  const calculatedTop =
    iframeRect.top + borderTop + selectedRect.top * canvasScale;
  const calculatedLeft =
    iframeRect.left + borderLeft + selectedRect.left * canvasScale;
  const calculatedWidth = selectedRect.width * canvasScale;
  const calculatedHeight = selectedRect.height * canvasScale;

  return (
    <div
      className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-500/10 transition-all duration-75 ease-out rounded-sm"
      style={{
        top: `${calculatedTop}px`,
        left: `${calculatedLeft}px`,
        width: `${calculatedWidth}px`,
        height: `${calculatedHeight}px`,
      }}
    >
      {/* 顶部 Node Tag 与尺寸批注 */}
      <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-1.5 pointer-events-auto">
        <span className="font-semibold">{selectedNodeId}</span>
        <span className="text-blue-200">
          {Math.round(selectedRect.width)}×{Math.round(selectedRect.height)}
        </span>
      </div>

      {/* 四角 Drag Handles 装饰 */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-600" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-600" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-600" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-600" />
    </div>
  );
};
