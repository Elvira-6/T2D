import { generateText, Output } from "ai";

import { getPlannerModel } from "../llm/model";
import { UIPlanSchema, UIPlan } from "../schemas/plan.schema";

/**
 * ============================================================
 * Planner Tool
 * ============================================================
 *
 * Input:
 *   User Prompt
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
 * Component Capability Boundary：让 Planner 输出指定的组件
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

export interface PlannerResult {
  plan: UIPlan;
  rawText: string;
}

export async function runPlanner(
  userPrompt: string
): Promise<PlannerResult> {
  if (!userPrompt.trim()) {
    throw new Error(
      "Planner requires a non-empty user prompt."
    );
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
     *
     * 注意：AI SDK v7 的 API 为 Output.object({ schema })，
     * （旧版 v4 为 output: { schema }）。
     */
    output: Output.object({ schema: UIPlanSchema }),

    temperature: 0.2,
  });

  const plan = result.output;

  /**
   * 二次 runtime validation。
   *
   * 即使 AI SDK 已经使用 schema，
   * Agent Boundary 仍然应该自己验证。
   */
  const validatedPlan = UIPlanSchema.parse(plan);

  return {
    plan: validatedPlan,
    rawText: result.text,
  };
}
