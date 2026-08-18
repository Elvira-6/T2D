import { z } from "zod";

// ============================================================
// Phase 3.0 — Decision Schema（LLM 结构化输出的 Zod 验证层）
//
//   注意：这里刻意不在模块加载时调用 listTools() 构造 tool 枚举，
//   因为 Tool Registry 的初始化顺序可能早于决策引擎。
//   所以 tool 字段先用宽松的 string，注册表校验放到 engine / parser。
// ============================================================

export const AgentDecisionSchema = z.object({
  action: z.enum(["CALL_TOOL", "DONE", "FAIL"]),

  tool: z.string().optional(),

  reason: z.string().min(1),
});

export type ParsedAgentDecision = z.infer<
  typeof AgentDecisionSchema
>;
