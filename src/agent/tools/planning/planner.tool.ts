import { generateText, Output } from "ai";

import { getPlannerModel } from "../../llm/model";
import { UIPlanSchema, UIPlan } from "../../schemas/plan.schema";
import { AgentTool, ToolResult } from "../types";

/**
 * ============================================================
 * Planner Tool
 * ============================================================
 *
 * Input:
 *   User Prompt (string)
 *
 * Output:
 *   UIPlan
 *
 * Planner NEVER:
 * - generate JSX
 * - generate Tailwind className
 * - generate arbitrary React code
 * - directly modify AST
 *
 * Component Capability Boundary：让 Planner 只输出 Registry 允许的组件。
 */

const SYSTEM_PROMPT = `
You are the Planning Agent of a Text-to-Design-to-Code system.

Your responsibility is ONLY to create a UI plan.

You must NOT:
- generate JSX
- generate React code
- generate Tailwind className
- invent component types
- modify an AST
- return markdown
- return explanations outside the structured JSON object

You can only use these UI components:

- Container
- Flex
- Grid
- Heading
- Text
- Button
- Image

Your plan must describe:

1. user intent
2. page type
3. page sections
4. section layout
5. components required by each section
6. overall design direction

Keep the plan implementation-oriented but framework-independent.

The downstream Generator will convert the plan into the application's CoreAST.
`;

function buildPlannerPrompt(userPrompt: string): string {
  return `
User request:

${userPrompt}

Create a UIPlan for this request.

Important:
- Prefer simple, composable layouts.
- Reuse the available component vocabulary.
- Do not invent components.
- Do not output code.
`;
}

export const plannerTool: AgentTool<string, UIPlan> = {
  name: "planner",

  description:
    "把用户 Prompt 转换为结构化 UIPlan（页面意图 + 结构 + 设计方向）。",

  category: "planning",

  async execute(userPrompt): Promise<ToolResult<UIPlan>> {
    if (!userPrompt.trim()) {
      return {
        success: false,
        error: "Planner requires a non-empty user prompt.",
      };
    }

    const result = await generateText({
      model: getPlannerModel(),

      system: SYSTEM_PROMPT,

      prompt: buildPlannerPrompt(userPrompt),

      /**
       * Structured output。
       *
       * AI SDK 负责让模型生成结构化对象，
       * Zod 负责最终 runtime validation。
       */
      output: Output.object({ schema: UIPlanSchema }),

      temperature: 0.2,
    });

    /**
     * 二次 runtime validation（Agent Boundary 自己验证一次）。
     * parse 抛错会被 executor 捕获并转换为 { success: false, error }。
     */
    const plan = UIPlanSchema.parse(result.output);

    return {
      success: true,
      data: plan,
    };
  },
};
