import { generateText, Output } from "ai";

import { getModel } from "../../llm/model";
import { CoreASTNode, CoreASTNodeSchema } from "@/types/ast";
import { AgentTool, ToolResult } from "../types";
import { ValidationIssue } from "../../validation";
import { DesignContextData } from "../retrieval/designContext.tool";
import { checkRepairScope } from "./scope";

// ============================================================
// Phase 3.3-B — Repair Tool（LLM，最小化局部修复）
//
//   职责：invalid AST + validation issues → repaired AST。
//
//   与 Generator 的本质区别：
//     Generator = create（Plan + Context → 全新 AST）
//     Repair    = minimal mutation（只修被 issue 点名的节点）
//
//   关键约束（面试点）：
//     - Repair 不自己判断 AST 是否合法，也不决定下一步；
//       Validator 才是最终裁判，Decision Engine 决定是否/何时修复。
//     - Repair 不做 validateDesignConstraints —— 那会重复 Validator 且可能
//       掩盖问题。Repair 只做 CoreASTNodeSchema（结构合法）兜底，
//       业务合法性交回 Validator 重新判定。
//     - Repair 保留节点 id（不重新 normalize，避免破坏稳定 id）。
//     - Repair 的修复范围被 RepairScope 硬约束：diff(before, after) 的每一条
//       变更路径必须落在 Validator issues 的 path 内，越界直接失败。
// ============================================================

export interface RepairInput {
  ast: CoreASTNode;
  issues: ValidationIssue[];
}

const SYSTEM_PROMPT = `
你是 Text-to-Design-to-Code 系统的 AST 修复 Agent（Repair）。

你的职责是：根据 Validator 报告的 validation issues，对现有 AST 做「最小化修复」。

必须遵守：
1. 尽量保留现有 AST 结构（不要重新生成整个页面）。
2. 不改变用户原始意图。
3. 不增加新的 section。
4. 不臆造组件（只用 Design Context 声明的组件类型）。
5. 不臆造 Design Token（只用 Design Context 声明的 token）。
6. 只修改与 validation issues 相关的字段。
7. 保留节点 id。
8. 不生成 className。
9. 只输出修复后的完整 CoreASTNode。

你不负责判断 AST 是否合法，也不负责决定下一步；Validator 才是最终裁判。
`;

function buildRepairPrompt(
  input: RepairInput,
  designContext: DesignContextData
): string {
  const issueLines = input.issues
    .map((i) => `- [${i.code}] ${i.path}: ${i.message}`)
    .join("\n");

  const capabilities = designContext.components
    .map(
      (c) =>
        `- ${c.type}: props=[${c.capabilities.props.join(", ")}], design=[${c.capabilities.design.join(", ")}]`
    )
    .join("\n");
  const tokens = designContext.tokens;

  return `
当前 AST（需要修复）：

${JSON.stringify(input.ast, null, 2)}

Validator 报告的 issues：

${issueLines || "（无）"}

可用组件与能力（修复时只能使用这些字段）：

${capabilities}

可用 Design Token：

colors: ${tokens.colors.join(", ")}
spacing: ${tokens.spacing.join(", ")}
radius: ${tokens.radius.join(", ")}
variants: ${tokens.variants.join(", ")}
sizes: ${tokens.sizes.join(", ")}

请根据以上 issues 对 AST 做最小化修复，只输出修复后的完整 CoreASTNode。
`;
}

export const repairTool: AgentTool<RepairInput, CoreASTNode> = {
  name: "repair",

  description:
    "Repair an invalid CoreASTNode by minimally mutating only the nodes flagged by validation issues.",

  category: "mutation",

  async execute(input, context): Promise<ToolResult<CoreASTNode>> {
    if (!input?.ast) {
      return { success: false, error: "Repair requires AST." };
    }

    if (!input?.issues || input.issues.length === 0) {
      return { success: false, error: "Repair requires validation issues." };
    }

    const designContext = context.contextData as DesignContextData | undefined;
    if (!designContext) {
      return { success: false, error: "Repair requires design context." };
    }

    try {
      const result = await generateText({
        model: getModel(),
        system: SYSTEM_PROMPT,
        prompt: buildRepairPrompt(input, designContext),
        output: Output.object({ schema: CoreASTNodeSchema }),
        temperature: 0,
      });

      const ast = CoreASTNodeSchema.parse(result.output);

      const scopeResult = checkRepairScope(input.ast, ast, {
        paths: input.issues.map((i) => i.path),
      });
      if (!scopeResult.valid) {
        return {
          success: false,
          error: `Repair modified out-of-scope paths: ${scopeResult.outOfScope.join(", ")}`,
        };
      }

      return { success: true, data: ast };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Repair failed",
      };
    }
  },
};
