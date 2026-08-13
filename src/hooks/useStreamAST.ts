"use client";

import { useState, useCallback } from "react";
import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 2.1 — 前端流式解析 Hook
// ============================================================
// 处理 ReadableStream 增量读取，解析 SSE 的 `data:` 规范文本，
// 并把每个 CHUNK 的最新 AST 通过 onASTChunk 回调实时反馈给主界面。

export function useStreamAST() {
  const [isGenerating, setIsGenerating] = useState(false);

  const startStream = useCallback(
    async (prompt: string, onASTChunk: (ast: CoreASTNode) => void) => {
      setIsGenerating(true);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.body) throw new Error("ReadableStream not supported.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // 留存未接收完整的末尾片段

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                if (data.type === "CHUNK" && data.ast) {
                  onASTChunk(data.ast);
                } else if (data.type === "DONE") {
                  setIsGenerating(false);
                }
              } catch (err) {
                console.warn("SSE JSON Parse error:", err);
              }
            }
          }
        }
      } catch (error) {
        console.error("Stream generation failed:", error);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { isGenerating, startStream };
}
