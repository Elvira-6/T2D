import { registerTool } from "./registry";

import { plannerTool } from "./planning/planner.tool";

import { retrieveDesignContextTool } from "./retrieval/designContext.tool";

import { generatorTool } from "./generation/generator.tool";

// ============================================================
// Phase 2 — Tool 层公共出口
//   initTools() 幂等初始化（Next.js dev / HMR 下重复调用安全）。
// ============================================================

let initialized = false;

export function initTools() {
  if (initialized) {
    return;
  }

  registerTool(plannerTool);
  registerTool(retrieveDesignContextTool);
  registerTool(generatorTool);

  initialized = true;
}

export * from "./types";
export * from "./registry";
export * from "./executor";
export * from "./policy";
