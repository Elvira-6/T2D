import { AgentTool } from "./types";

// ============================================================
// Phase 2 — Tool Registry（Map 存储 + 幂等注册）
//   重复注册时直接忽略（Next.js dev / HMR 下避免重复初始化），
//   而非 throw。
// ============================================================

const TOOL_REGISTRY = new Map<string, AgentTool<any, any>>();

export function registerTool(tool: AgentTool<any, any>) {
  if (TOOL_REGISTRY.has(tool.name)) {
    return;
  }

  TOOL_REGISTRY.set(tool.name, tool);
}

export function getTool(name: string): AgentTool<any, any> | undefined {
  return TOOL_REGISTRY.get(name);
}

export function listTools(): AgentTool<any, any>[] {
  return Array.from(TOOL_REGISTRY.values());
}

export function hasTool(name: string): boolean {
  return TOOL_REGISTRY.has(name);
}

export function clearToolRegistry() {
  TOOL_REGISTRY.clear();
}
