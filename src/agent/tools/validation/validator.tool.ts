import { CoreASTNode } from "@/types/ast";
import { AgentTool, ToolResult } from "../types";
import { validateAST, ValidationResult } from "../../validation";

// ============================================================
// Phase 3.3-A — Validator Tool（无 LLM）
//
//   职责：AST → ValidationResult。只判断「哪里错了」，不负责修复。
//
//   关键点（面试点）：Validator 自己绝不调用 LLM，是确定性纯校验；
//   由 validateAST 复用 design constraint 层，保证与 Generator 的硬约束
//   同源（都来自 Component Registry）。
//
//   valid = 无 error（warning 不阻断）。
// ============================================================

export interface ValidatorInput {
  ast: CoreASTNode;
}

export const validatorTool: AgentTool<ValidatorInput, ValidationResult> = {
  name: "validator",

  description:
    "Validate generated CoreASTNode against structural and design-system constraints.",

  category: "validation",

  async execute(input): Promise<ToolResult<ValidationResult>> {
    if (!input?.ast) {
      return { success: false, error: "Validator requires AST." };
    }

    const issues = validateAST(input.ast);

    const errors = issues.filter(
      (issue) => issue.severity === "error"
    );
    const warnings = issues.filter(
      (issue) => issue.severity === "warning"
    );

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        issues,
        summary: {
          errorCount: errors.length,
          warningCount: warnings.length,
        },
      },
    };
  },
};
