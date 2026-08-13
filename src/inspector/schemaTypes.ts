import { TokenOption } from "@/tokens/tokenRegistry";

// ============================================================
// Phase 3.1.2 — Inspector Schema 强类型契约
// ============================================================

export type ControlType =
  | "text-input"
  | "token-select"
  | "segmented-control"
  | "number-input"
  | "boolean-switch";

// 显式区分 Mutation 操作类型
export type MutationOperation = "SET_PROP" | "SET_DESIGN_TOKEN";

// 条件显示控制规范
export interface VisibilityCondition {
  /** 关联依赖字段的 key（相对 props 或 design） */
  field: string;
  /** 期望的匹配值 */
  equals: unknown;
}

export interface SchemaField {
  id: string; // 唯一 ID，可作为 visibleWhen 的依赖键
  label: string;
  path: string[]; // AST 内部路径，例如 ["props", "text"] 或 ["design", "background"]
  controlType: ControlType;
  mutation: {
    operation: MutationOperation;
  };
  options?: TokenOption[]; // 当 controlType 为 token-select 或 segmented-control 时使用
  defaultValue?: unknown;
  description?: string;
  visibleWhen?: VisibilityCondition; // 联动显示规则
}

export interface SchemaGroup {
  id: "content" | "layout" | "style" | "advanced";
  title: string;
  fields: SchemaField[];
}

export interface InspectorSchema {
  componentType: string;
  groups: SchemaGroup[];
}
