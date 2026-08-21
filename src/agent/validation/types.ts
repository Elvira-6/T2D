// ============================================================
// Phase 3.3 — AST Validation 类型契约
//
//   Validator Tool 的输入输出契约（AST → ValidationResult）。
//   Validator 只负责发现问题，不负责修复；修复是 Repair Tool 的职责。
// ============================================================

export type ValidationSeverity = "error" | "warning";

/**
 * 问题分类（Phase 3.3-A 只用 component / design，其余留给后续规则扩展）：
 *   structural     — 树结构 / 单根 / 循环引用
 *   component      — 组件能力（type 存在、props 字段支持）
 *   design         — design token / 字段合法、className 逃逸
 *   layout         — 布局一致性（与 UIPlan 对照）
 *   semantic       — 语义一致性
 *   accessibility  — 可访问性（后续）
 */
export type ValidationCategory =
  | "structural"
  | "component"
  | "design"
  | "layout"
  | "semantic"
  | "accessibility";

export interface ValidationIssue {
  /** 机器可读错误码（供 Decision Engine / Repair 定位与分类） */
  code: string;

  severity: ValidationSeverity;

  /** 节点路径，如 hero_button.props.href */
  path: string;

  message: string;

  category: ValidationCategory;
}

export interface ValidationSummary {
  errorCount: number;

  warningCount: number;
}

export interface ValidationResult {
  valid: boolean;

  issues: ValidationIssue[];

  summary: ValidationSummary;
}
