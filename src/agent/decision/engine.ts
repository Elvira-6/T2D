import { generateText, Output } from "ai";

import { AgentState } from "../types";
import { getModel } from "../llm/model";
import { getTool, listTools } from "../tools";
import { AgentToolName } from "../tools/types";

import { AgentDecision } from "./types";
import {
  AgentDecisionSchema,
  ParsedAgentDecision,
} from "./schema";
import { buildDecisionContext } from "./context";
import { buildDecisionPrompt } from "./prompt";

// ============================================================
// Phase 3.0 — LLM Decision Engine
//
//   输入 AgentState → 投影 DecisionContext → DeepSeek 结构化输出
//   → Zod 校验 → Registry 校验 → 收窄 tool 为 AgentToolName。
//
//   复用 Phase 1 已封装的 DeepSeek client（llm/model.ts），
//   不在这里新建一套 AI client。
// ============================================================

export async function decideNextAction(
  state: AgentState
): Promise<AgentDecision> {
  const context = buildDecisionContext(state);
  const prompt = buildDecisionPrompt(context);

  const result = await generateText({
    model: getModel(),
    prompt,
    output: Output.object({ schema: AgentDecisionSchema }),
    temperature: 0,
  });

  console.log("result",result)

  // 二次 runtime 校验（与 planner.tool 同一模式）：
  // 即使 SDK 已结构化输出，仍用 Zod.parse 兜底。
  const parsed = AgentDecisionSchema.parse(result.output);

  // Registry Guard：CALL_TOOL 必须指向已注册的 Tool。
  validateDecisionTool(
    parsed,
    listTools().map((t) => t.name)
  );

  return {
    action: parsed.action,
    tool:
      parsed.action === "CALL_TOOL"
        ? assertAgentToolName(parsed.tool)
        : undefined,
    reason: parsed.reason,
  };
}

/**
 * Registry Guard：校验决策选中的 Tool 是否可用。
 * 仅对 CALL_TOOL 生效；DONE / FAIL 无需 tool。
 */
export function validateDecisionTool(
  decision: ParsedAgentDecision,
  availableTools: string[]
): void {
  if (decision.action !== "CALL_TOOL") return;

  if (!decision.tool) {
    throw new Error("CALL_TOOL decision requires a tool");
  }

  if (!availableTools.includes(decision.tool)) {
    throw new Error(`Decision selected unavailable tool: ${decision.tool}`);
  }
}

/**
 * 把 string | undefined 收窄为 AgentToolName（带 Registry 兜底）。
 *
 * 引擎内部用它把 LLM 返回的 tool 收窄；
 * Runtime 也用它做「最后一层」防御性收窄（不信任上游）。
 */
export function assertAgentToolName(
  name: string | undefined
): AgentToolName {
  if (!name) {
    throw new Error("CALL_TOOL decision requires a tool name");
  }

  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Unknown agent tool: ${name}`);
  }

  return name as AgentToolName;
}
