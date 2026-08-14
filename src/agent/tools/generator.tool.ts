import { AgentTool } from "./types";
import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 0 — Generator Tool（占位：Phase 3 将接入真实 AST Generator）
//   当前返回最小合法 CoreASTNode，仅用于跑通状态机与验证架构。
// ============================================================

const STUB_AST: CoreASTNode = {
  id: "root",
  type: "Container",
  schemaVersion: 1,
  props: {},
  children: [],
};

export const generatorTool: AgentTool = {
  name: "generator",
  async execute(state) {
    return {
      ...state,
      stage: "GENERATING",
      ast: STUB_AST,
    };
  },
};
