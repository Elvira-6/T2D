import { AgentTool } from "./types";
import { UIPlan } from "../types";

// ============================================================
// Phase 0 — Planner Tool（占位：Phase 1 将接入真实 LLM Planner）
//   当前返回硬编码 UIPlan，仅用于跑通状态机与验证架构。
// ============================================================

const STUB_PLAN: UIPlan = {
  pageType: "Landing Page",
  sections: [
    { id: "hero", component: "Hero", purpose: "marketing" },
    { id: "feature", component: "Grid", purpose: "show features" },
  ],
  designSystem: {
    style: "modern SaaS",
    colors: ["primary", "neutral"],
  },
  constraints: {
    responsive: true,
    accessibility: true,
  },
};

export const plannerTool: AgentTool = {
  name: "planner",
  async execute(state) {
    return {
      ...state,
      stage: "PLANNING",
      plan: STUB_PLAN,
    };
  },
};
