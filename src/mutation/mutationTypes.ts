import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 3.0 — Mutation 核心类型
// ============================================================

export type MutationSource = "INSPECTOR" | "AI" | "DRAG_DROP" | "SYSTEM";

export interface MutationMeta {
  id: string;
  timestamp: number;
  source: MutationSource;
  label?: string; // 供 Undo/Redo 历史面板直接展示的描述文字
}

// 唯一权威的 MutationCommand 定义（统一带 meta，value 用 unknown）
export type MutationCommand =
  | {
      action: "SET_PROP";
      targetId: string;
      path: string[];
      value: unknown;
      meta?: MutationMeta;
    }
  | {
      action: "REMOVE_NODE";
      targetId: string;
      meta?: MutationMeta;
    }
  | {
      action: "INSERT_CHILD";
      parentId: string;
      index?: number;
      node: CoreASTNode;
      meta?: MutationMeta;
    };

export interface MutationResult {
  ast: CoreASTNode;
  changed: boolean;
  affectedNodes: string[];
  error?: string;
}
