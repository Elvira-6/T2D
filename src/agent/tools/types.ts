import { AgentState } from "../types";

// ============================================================
// Phase 0 — Tool 抽象（统一契约：state in → state out）
// ============================================================

export interface AgentTool {
  name: string;
  /** 纯函数式执行：接收状态快照，返回新状态快照 */
  execute(state: AgentState): Promise<AgentState>;
}
