import { generateText, Output } from "ai";

import { getModel } from "../../llm/model";
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
你是 Text-to-Design-to-Code 系统的规划 Agent（Planning Agent）。

你的职责仅仅是生成一份 UI 规划（UIPlan）。

你不得：
- 生成 JSX
- 生成 React 代码
- 生成 Tailwind className
- 臆造组件类型
- 修改 AST
- 返回 Markdown
- 在结构化 JSON 对象之外返回任何解释说明

你只能使用以下 UI 组件：

- Container
- Flex
- Grid
- Heading
- Text
- Button
- Image

你的规划必须描述：

1. 用户意图
2. 页面类型
3. 页面的各个 section
4. 每个 section 的布局
5. 每个 section 所需的组件
6. 整体设计方向

规划应面向实现，但保持框架无关。

下游的 Generator 会将这份规划转换为应用的 CoreAST。
`;

function buildPlannerPrompt(userPrompt: string): string {
  return `
用户请求：

${userPrompt}

请为这个请求创建一份 UIPlan。

重要：
- 优先选择简单、可组合的布局。
- 复用可用的组件词汇表。
- 不要臆造组件。
- 不要输出代码。
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
      model: getModel(),

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
