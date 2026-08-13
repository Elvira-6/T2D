"use client";

import React from "react";
import { DOMRectPayload } from "@/bridge/bridgeProtocol";

// ============================================================
// Phase 3.1.1 — CanvasOverlay：Host 端绝对定位高亮图层
//   - 覆盖在 <iframe> 上方（fixed inset-0），pointer-events-none。
//   - selectedOverlayRect / hoverOverlayRect 已由 Store 完成 iframe→Host 坐标变换。
// ============================================================

interface CanvasOverlayProps {
  selectedOverlayRect: DOMRectPayload | null;
  selectedNodeId: string | null;
  selectedNodePath: string[];
  hoverOverlayRect: DOMRectPayload | null;
  hoverNodeId: string | null;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  selectedOverlayRect,
  selectedNodeId,
  selectedNodePath,
  hoverOverlayRect,
  hoverNodeId,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 1. Hover Overlay 悬停高亮框 */}
      {hoverOverlayRect && hoverNodeId && hoverNodeId !== selectedNodeId && (
        <div
          className="absolute border border-dashed border-blue-400 bg-blue-500/10 rounded-sm"
          style={{
            width: `${hoverOverlayRect.width}px`,
            height: `${hoverOverlayRect.height}px`,
            transform: `translate3d(${hoverOverlayRect.left}px, ${hoverOverlayRect.top}px, 0)`,
          }}
        >
          <span className="absolute -top-5 left-0 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded font-mono shadow-sm">
            {hoverNodeId}
          </span>
        </div>
      )}

      {/* 2. Selection Overlay 选中高亮框 + Breadcrumb */}
      {selectedOverlayRect && selectedNodeId && (
        <div
          className="absolute border-2 border-blue-600 bg-blue-500/5 rounded-sm"
          style={{
            width: `${selectedOverlayRect.width}px`,
            height: `${selectedOverlayRect.height}px`,
            transform: `translate3d(${selectedOverlayRect.left}px, ${selectedOverlayRect.top}px, 0)`,
          }}
        >
          {/* Breadcrumb Label（截取末 3 段，避免超长） */}
          <div className="absolute -top-6 left-0 flex items-center bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-t font-mono shadow-sm space-x-1 whitespace-nowrap">
            {selectedNodePath.slice(-3).map((id, index) => (
              <React.Fragment key={id}>
                {index > 0 && <span className="opacity-50">/</span>}
                <span className={id === selectedNodeId ? "text-yellow-300" : "opacity-80"}>
                  {id}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* 四角 Resize Handle 示意 */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-600 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-600 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-600 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-600 rounded-full" />
        </div>
      )}
    </div>
  );
};
