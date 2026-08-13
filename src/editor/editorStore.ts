"use client";

import { useReducer, useCallback, useMemo, useEffect } from "react";
import { CoreASTNode } from "@/types/ast";
import { MutationCommand, MutationMeta } from "@/mutation/mutationTypes";
import { applyMutation } from "@/mutation/mutationEngine";
import { DOMRectPayload, NodeGeometry } from "@/bridge/bridgeProtocol";
import { findNodeById } from "@/lib/astUtils";

// ============================================================
// Phase 3.1.1 — Editor Store（Reducer 单数据源）
//   - Host 作为唯一 Source of Truth，Sandbox 仅作 Renderer。
//   - 「选择状态」与「几何缓存」分离；Overlay 坐标 = iframe 相对 + offset。
//   - Hover / Selection 直接携带 rect；Geometry 消息仅用于 resize/scroll/observer。
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

  // Hover
  hoverNodeId: string | null;

  // Geometry Cache：按 nodeId 缓存 iframe 内相对坐标
  geometryCache: Record<string, DOMRectPayload>;

  // iframe 相对 Host Canvas 的偏移值
  iframeOffset: { top: number; left: number };
}

type EditorAction =
  | { type: "APPLY_MUTATION"; command: MutationCommand }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET_AST"; ast: CoreASTNode }
  | { type: "SET_SELECTION"; nodeId: string | null; path?: string[]; rect?: DOMRectPayload }
  | { type: "SET_HOVER"; nodeId: string | null; rect?: DOMRectPayload }
  | { type: "UPDATE_GEOMETRY"; geometry: NodeGeometry }
  | { type: "SET_IFRAME_OFFSET"; offset: { top: number; left: number } };

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
        hoverNodeId: null,
        geometryCache: {},
      };
    }

    case "SET_SELECTION": {
      // 选中变更同时缓存其 rect（Hover/Selection payload 已携带 rect）
      const geometryCache =
        action.nodeId && action.rect
          ? { ...state.geometryCache, [action.nodeId]: action.rect }
          : state.geometryCache;
      return {
        ...state,
        selectedNodeId: action.nodeId,
        selectedNodePath: action.path ?? (action.nodeId ? [action.nodeId] : []),
        geometryCache,
      };
    }

    case "SET_HOVER": {
      const geometryCache =
        action.nodeId && action.rect
          ? { ...state.geometryCache, [action.nodeId]: action.rect }
          : state.geometryCache;
      return { ...state, hoverNodeId: action.nodeId, geometryCache };
    }

    case "UPDATE_GEOMETRY": {
      return {
        ...state,
        geometryCache: {
          ...state.geometryCache,
          [action.geometry.nodeId]: action.geometry.rect,
        },
      };
    }

    case "SET_IFRAME_OFFSET": {
      return { ...state, iframeOffset: action.offset };
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
    hoverNodeId: null,
    geometryCache: {},
    iframeOffset: { top: 0, left: 0 },
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

  // iframe 相对坐标 + offset → Host Overlay 绝对坐标
  const selectedOverlayRect = useMemo(() => {
    if (!state.selectedNodeId) return null;
    const raw = state.geometryCache[state.selectedNodeId];
    if (!raw) return null;
    return {
      top: raw.top + state.iframeOffset.top,
      left: raw.left + state.iframeOffset.left,
      width: raw.width,
      height: raw.height,
    };
  }, [state.selectedNodeId, state.geometryCache, state.iframeOffset]);

  const hoverOverlayRect = useMemo(() => {
    if (!state.hoverNodeId) return null;
    const raw = state.geometryCache[state.hoverNodeId];
    if (!raw) return null;
    return {
      top: raw.top + state.iframeOffset.top,
      left: raw.left + state.iframeOffset.left,
      width: raw.width,
      height: raw.height,
    };
  }, [state.hoverNodeId, state.geometryCache, state.iframeOffset]);

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
  const updateGeometry = useCallback(
    (geometry: NodeGeometry) => dispatch({ type: "UPDATE_GEOMETRY", geometry }),
    []
  );
  const setIframeOffset = useCallback(
    (offset: { top: number; left: number }) => dispatch({ type: "SET_IFRAME_OFFSET", offset }),
    []
  );
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  return {
    currentAST,
    selectedNode,
    selectedNodeId: state.selectedNodeId,
    selectedNodePath: state.selectedNodePath,
    selectedOverlayRect,
    hoverNodeId: state.hoverNodeId,
    hoverOverlayRect,
    commandHistory: state.commandHistory,
    canUndo: state.currentIndex > 0,
    canRedo: state.currentIndex < state.astHistory.length - 1,
    dispatchMutation,
    resetAST,
    setSelection,
    setHover,
    updateGeometry,
    setIframeOffset,
    undo,
    redo,
  };
}
