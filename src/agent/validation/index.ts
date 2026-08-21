import { CoreASTNode } from "@/types/ast";
import { validateDesignConstraints } from "../ast";
import type { ValidationIssue } from "./types";

// ============================================================
// Phase 3.3 — AST Validator（第一版复用 design constraint 层）
//
//   职责：CoreASTNode → ValidationIssue[]。只发现问题，不负责修复。
//
//   第一版复用 validateDesignConstraints（组件能力 / design token 硬约束，
//   来自 Component Registry），把 DesignConstraintIssue 投影为带 code /
//   category / severity 的 ValidationIssue。后续再在此扩展 structural /
//   accessibility / layout / semantic 等更广的规则。
//
//   注意：这里不包含「判断 valid 与否」，也不包含修复。valid 判定由
//   Validator Tool 汇总 issue 后产出 ValidationResult，修复由 Repair Tool
//   负责，下一步由 Decision Engine 决定。
// ============================================================

export function validateAST(ast: CoreASTNode): ValidationIssue[] {
  return validateDesignConstraints(ast).map((issue) => ({
    code: issue.code,
    severity: "error",
    path: issue.path,
    message: issue.message,
    category: issue.category,
  }));
}

export * from "./types";
