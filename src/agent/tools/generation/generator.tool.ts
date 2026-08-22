import { generateText, Output } from "ai";

import { getModel } from "../../llm/model";
import { CoreASTNode, CoreASTNodeSchema } from "@/types/ast";
import { UIPlan } from "../planning/plan.schema";
import { AgentTool, ToolResult } from "../types";
import { DesignContextData } from "../retrieval/designContext.tool";
import { normalizeAST, GeneratorASTNodeSchema, validateDesignConstraints } from "../../ast";

// ============================================================
// Phase 3.2 — Generator Tool
//
//   Plan + Design Context → CoreASTNode（不是 Prompt → AST）。
//   Generator 只负责「在约束下生成 AST 结构」：
//     - 严格遵循 UIPlan 的 sections 与 layout（不重新规划页面结构）
//     - 只使用 Design Context 里的组件类型（不臆造）
//     - 只使用 Design Context 里的 Design Token（禁止 Raw className 逃逸）
//     - id 只作为「语义键」提供（可选，无需保证唯一）
//     - 只做组件能力硬约束校验（来自 Component Registry，违规即失败，不做修复）
//
//   流水线（id 由系统保证，不信任 LLM）：
//     LLM 生成 AST → Zod（GeneratorASTNodeSchema，id 可选）
//       → normalizeAST（确定性 ID 修正）→ CoreASTNodeSchema（结构合法）
//       → validateDesignConstraints（设计/组件能力硬约束，来自 Component Registry）
//         → ToolResult
//
//   Tool 不直接改 AgentState，只返回 ToolResult<CoreASTNode>，
//   由 Runtime 的 applyTrace 写回 state.ast。
// ============================================================

export interface GeneratorInput {
  plan: UIPlan;
  designContext: DesignContextData;
}

const SYSTEM_PROMPT = `
你是 Text-to-Design-to-Code 系统的 AST 生成 Agent（Generator）。

你的职责是：把一份 UIPlan 与设计上下文（Design Context）转换为一棵 CoreASTNode 树。

你必须：
1. 严格遵循 UIPlan 声明的 sections 与 layout，不重新规划页面结构。
2. 只输出结构化 AST（CoreASTNode）。
3. 只使用设计上下文中存在的组件类型。
4. 只使用设计上下文中存在的 Design Token。
5. 每个节点可带一个语义 id（如 hero、heading，可省略）；系统的 Normalizer
   会基于它生成稳定且唯一的 id，你无需保证唯一、也无需手动编号。
6. 不臆造组件。
7. 不生成任意 HTML。
8. 不生成可执行 JavaScript。
9. 不修改用户意图。
10. 不返回任何解释说明。

你只负责「Plan + Design Context → AST」，不负责校验或修复 AST。
`;

function buildGeneratorPrompt(input: GeneratorInput): string {
  const componentCapabilities = input.designContext.components
    .map(
      (c) =>
        `- ${c.type}: props=[${c.capabilities.props.join(", ")}], design=[${c.capabilities.design.join(", ")}]`
    )
    .join("\n");
  const tokens = input.designContext.tokens;

  return `
UI Plan：

${JSON.stringify(input.plan, null, 2)}

可用组件与各自能力（只能使用这些组件类型，且每个组件的 props / design 只能取它声明支持的字段）：

${componentCapabilities}

可用 Design Token：

colors: ${tokens.colors.join(", ")}
spacing: ${tokens.spacing.join(", ")}
radius: ${tokens.radius.join(", ")}
variants: ${tokens.variants.join(", ")}
sizes: ${tokens.sizes.join(", ")}

请基于上面的 UIPlan 与 Design Context 生成一棵 CoreASTNode 树。

规则：
- 严格遵循 UIPlan 中声明的 sections 与 layout，不得无理由增加或删除 section。
- UIPlan 声明的 layout 是结构依据，按固定映射生成布局节点：
    container → Container，flex-row / flex-column → Flex，grid → Grid。
  这是「把 Plan 的 layout 翻译成组件类型」，不是重新规划页面结构。
- 根节点用一个 Container 包裹全部 sections（单一树根的固定结构，不算新增 section）。
- 每个 section 内部只放它在 components 里声明的组件，不得臆造未声明的组件。
- 每个节点的 props / design 只能使用上面「组件能力」里声明的字段，
  不要为组件生成它不支持的字段。
- UIPlan 与 Design Context 必须同时满足。
  如果二者存在冲突，不得擅自改变 UIPlan 的语义或组件意图。
  应返回明确的生成失败结果，由 Agent Decision Engine 决定下一步行动
- 只能使用上面列出的组件类型，不要臆造组件。
- 视觉属性写入 design 字段（如 { background: "primary", radius: "md" }），
  只使用上面列出的 Design Token，不要生成 Raw className（如 bg-[#123456]）。
- 每个节点可带语义 id（如 hero、heading，可省略）；不要手动加序号去保证唯一，
  系统 Normalizer 会基于语义 id + 层级自动生成稳定唯一 id。
- 文本内容写入 props.text，图片 URL 写入 props.src。
  如果组件能力声明支持 href（如 Button），链接写入 props.href；
  不要为不支持 href 的组件生成 href。
- 只输出结构化 AST，不要输出任何解释说明。
`;
}

export const generatorTool: AgentTool<GeneratorInput, CoreASTNode> = {
  name: "generator",

  description:
    "把 UIPlan + Design Context 转换为 CoreASTNode UI 树（受组件词汇表与 Design Token 约束）。",

  category: "generation",

  async execute(input): Promise<ToolResult<CoreASTNode>> {
    if (!input || !input.plan) {
      return { success: false, error: "Generator requires a UIPlan." };
    }

    if (!input.designContext) {
      return { success: false, error: "Generator requires design context." };
    }

    try {
      const result = await generateText({
        model: getModel(),

        system: SYSTEM_PROMPT,

        prompt: buildGeneratorPrompt(input),

        /**
         * 结构化输出用「原始契约」（id 可选），LLM 只需给结构 + 语义键。
         * 唯一 id 由 normalizeAST 确定性生成，不信任 LLM。
         */
        output: Output.object({ schema: GeneratorASTNodeSchema }),

        temperature: 0,
      });

      // LLM 输出 → Zod（已校验结构）→ Normalize（确定性 ID 修正）→ CoreASTNode。
      const normalized = normalizeAST(result.output);
      const ast = CoreASTNodeSchema.parse(normalized);

      // 设计/组件能力硬约束（来自 Component Registry / Inspector Schema）：
      // 结构合法 ≠ 组件能力合法。违规即失败，不静默放行。
      const issues = validateDesignConstraints(ast);
      if (issues.length > 0) {
        const detail = issues.map((i) => `${i.path}: ${i.message}`).join("; ");
        return {
          success: false,
          error: `组件能力校验失败：${detail}`,
        };
      }

      return { success: true, data: ast };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Generator failed",
      };
    }
  },
};
