"use client";

import { useReducer, useCallback, useMemo, useEffect } from "react";
import { CoreASTNode } from "@/types/ast";
import { MutationCommand, MutationMeta } from "@/mutation/mutationTypes";
import { applyMutation } from "@/mutation/mutationEngine";
import { DOMRectPayload } from "@/bridge/bridgeProtocol";
import { findNodeById } from "@/lib/astUtils";

// ============================================================
// Phase 3.1.1 — Editor Store（Reducer 单数据源）
//   - Host 作为唯一 Source of Truth，Sandbox 仅作 Renderer。
//   - 仅保存「当前选中/悬停」的 rect，不做全量 geometryCache。
//   - Overlay 坐标 = iframe 相对 rect + iframeOffset（offset 在 page 侧本地计算）。
// ============================================================

export interface HistoryEntry {
  command: MutationCommand;
  timestamp: number;
  label: string;
}

export interface EditorState {
  // AST 快照栈 + Command 记录（Undo/Redo）
  astHistory: CoreASTNode[];
  commandHistory: HistoryEntry[];
  currentIndex: number;

  // Selection（唯一数据源在 Host）
  selectedNodeId: string | null;
  selectedNodePath: string[]; // 面包屑层级路径（根 → 叶）
  selectedRect: DOMRectPayload | null; // iframe 相对坐标

  // Hover
  hoverNodeId: string | null;
  hoverRect: DOMRectPayload | null; // iframe 相对坐标
}

type EditorAction =
  | { type: "APPLY_MUTATION"; command: MutationCommand }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET_AST"; ast: CoreASTNode }
  | { type: "SET_SELECTION"; nodeId: string | null; path?: string[]; rect?: DOMRectPayload }
  | { type: "SET_HOVER"; nodeId: string | null; rect?: DOMRectPayload };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "APPLY_MUTATION": {
      const result = applyMutation(state.astHistory[state.currentIndex], action.command);
      if (!result.changed) {
        console.warn(`[Mutation Blocked/Failed]: ${result.error}`);
        return state;
      }
      const meta = action.command.meta;
      return {
        ...state,
        astHistory: [...state.astHistory.slice(0, state.currentIndex + 1), result.ast],
        commandHistory: [
          ...state.commandHistory.slice(0, state.currentIndex),
          {
            command: action.command,
            timestamp: meta?.timestamp ?? 0,
            label: meta?.label || action.command.action,
          },
        ],
        currentIndex: state.currentIndex + 1,
      };
    }

    case "UNDO": {
      if (state.currentIndex <= 0) return state;
      return { ...state, currentIndex: state.currentIndex - 1 };
    }

    case "REDO": {
      if (state.currentIndex >= state.astHistory.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };
    }

    case "RESET_AST": {
      return {
        ...state,
        astHistory: [action.ast],
        commandHistory: [],
        currentIndex: 0,
        selectedNodeId: null,
        selectedNodePath: [],
        selectedRect: null,
        hoverNodeId: null,
        hoverRect: null,
      };
    }

    case "SET_SELECTION": {
      return {
        ...state,
        selectedNodeId: action.nodeId,
        selectedNodePath: action.path ?? (action.nodeId ? [action.nodeId] : []),
        selectedRect: action.nodeId ? (action.rect ?? null) : null,
      };
    }

    case "SET_HOVER": {
      return {
        ...state,
        hoverNodeId: action.nodeId,
        hoverRect: action.nodeId ? (action.rect ?? null) : null,
      };
    }

    default:
      return state;
  }
}

export function useEditorStore(initialAST: CoreASTNode) {
  const [state, dispatch] = useReducer(editorReducer, {
    astHistory: [initialAST],
    commandHistory: [],
    currentIndex: 0,
    selectedNodeId: null,
    selectedNodePath: [],
    selectedRect: null,
    hoverNodeId: null,
    hoverRect: null,
  });

  const currentAST = state.astHistory[state.currentIndex];

  // 纯计算：仅返回节点是否存在，不做任何副作用
  const selectedNode = useMemo(() => {
    if (!state.selectedNodeId) return null;
    return findNodeById(currentAST, state.selectedNodeId) ?? null;
  }, [currentAST, state.selectedNodeId]);

  // 副作用：选中节点被删除后自动清空指针，防止漂移
  useEffect(() => {
    if (state.selectedNodeId && !findNodeById(currentAST, state.selectedNodeId)) {
      dispatch({ type: "SET_SELECTION", nodeId: null });
    }
  }, [currentAST, state.selectedNodeId]);

  const dispatchMutation = useCallback((command: MutationCommand) => {
    // 默认 meta 在派发前注入，保持 reducer 纯函数
    const meta: MutationMeta = command.meta ?? {
      id: `mut_${Date.now()}`,
      timestamp: Date.now(),
      source: "INSPECTOR",
      label: `${command.action} on ${
        command.action === "INSERT_CHILD" ? command.parentId : command.targetId
      }`,
    };
    const withMeta = { ...command, meta } as MutationCommand;
    dispatch({ type: "APPLY_MUTATION", command: withMeta });
  }, []);

  const resetAST = useCallback((ast: CoreASTNode) => dispatch({ type: "RESET_AST", ast }), []);
  const setSelection = useCallback(
    (nodeId: string | null, path?: string[], rect?: DOMRectPayload) =>
      dispatch({ type: "SET_SELECTION", nodeId, path, rect }),
    []
  );
  const setHover = useCallback(
    (nodeId: string | null, rect?: DOMRectPayload) =>
      dispatch({ type: "SET_HOVER", nodeId, rect }),
    []
  );
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  return {
    currentAST,
    selectedNode,
    selectedNodeId: state.selectedNodeId,
    selectedNodePath: state.selectedNodePath,
    selectedRect: state.selectedRect,
    hoverNodeId: state.hoverNodeId,
    hoverRect: state.hoverRect,
    commandHistory: state.commandHistory,
    canUndo: state.currentIndex > 0,
    canRedo: state.currentIndex < state.astHistory.length - 1,
    dispatchMutation,
    resetAST,
    setSelection,
    setHover,
    undo,
    redo,
  };
}
