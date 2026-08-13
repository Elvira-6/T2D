"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { CoreASTNode } from "@/types/ast";
import { MutationCommand, MutationMeta } from "@/mutation/mutationTypes";
import { applyMutation } from "@/mutation/mutationEngine";
import { DOMRect } from "@/bridge/bridgeProtocol";
import { findNodeById } from "@/lib/astUtils";

// ============================================================
// Phase 3.0 — Editor Store 与 Safe Selection
// 解决「Undo 后 selectedNodeId 在最新 AST 中已被删除导致的漂移崩溃」。
// 副作用统一放进 useEffect，useMemo 仅做纯计算。
// ============================================================

export interface HistoryEntry {
  command: MutationCommand;
  timestamp: number;
  label: string;
}

export function useEditorStore(initialAST: CoreASTNode) {
  // 核心 1：AST 快照栈与 Command 记录
  const [astHistory, setAstHistory] = useState<CoreASTNode[]>([initialAST]);
  const [commandHistory, setCommandHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // 核心 2：Selection 状态收归统一 Store 管理
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);

  const currentAST = astHistory[currentIndex];

  // 纯计算：仅返回节点是否存在，不做任何副作用
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return findNodeById(currentAST, selectedNodeId) ?? null;
  }, [currentAST, selectedNodeId]);

  // 副作用统一放 effect：若选中节点已被删除，自动清空指针，防止漂移
  useEffect(() => {
    if (selectedNodeId && !findNodeById(currentAST, selectedNodeId)) {
      setSelectedNodeId(null);
      setSelectedRect(null);
    }
  }, [currentAST, selectedNodeId]);

  const dispatchMutation = useCallback(
    (command: MutationCommand) => {
      const result = applyMutation(currentAST, command);

      if (!result.changed) {
        console.warn(`[Mutation Blocked/Failed]: ${result.error}`);
        return result;
      }

      const meta: MutationMeta =
        command.meta ??
        {
          id: `mut_${Date.now()}`,
          timestamp: Date.now(),
          source: "INSPECTOR",
          label: `${command.action} on ${
            command.action === "INSERT_CHILD" ? command.parentId : command.targetId
          }`,
        };

      setAstHistory((prev) => [...prev.slice(0, currentIndex + 1), result.ast]);
      setCommandHistory((prev) => [
        ...prev.slice(0, currentIndex),
        { command, timestamp: meta.timestamp, label: meta.label || command.action },
      ]);
      setCurrentIndex((prev) => prev + 1);
      return result;
    },
    [currentAST, currentIndex]
  );

  // 全量替换（AI 重新生成 / 流式生成每 chunk），清空历史栈与选中状态
  const resetAST = useCallback((newAST: CoreASTNode) => {
    setAstHistory([newAST]);
    setCommandHistory([]);
    setCurrentIndex(0);
    setSelectedNodeId(null);
    setSelectedRect(null);
  }, []);

  const undo = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < astHistory.length - 1) setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, astHistory.length]);

  return {
    currentAST,
    selectedNode,
    selectedNodeId,
    selectedRect,
    setSelectedNodeId,
    setSelectedRect,
    dispatchMutation,
    resetAST,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < astHistory.length - 1,
    commandHistory,
  };
}
