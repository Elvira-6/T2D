import { COMPONENT_REGISTRY } from "@/registry";
import { DESIGN_TOKENS } from "@/tokens/tokenRegistry";

import { AgentTool, ToolResult } from "../types";

// ============================================================
// Phase 2 — retrieve_design_context Tool
//   真正读取现有 DESIGN_TOKENS + COMPONENT_REGISTRY（非硬编码拷贝）。
//   让 Agent 与现有 UI Engine（Registry / Token）真正接通。
// ============================================================

export interface DesignContextData {
  components: Array<{
    type: string;
    label: string;
    hasInspector: boolean;
  }>;

  tokens: {
    colors: string[];
    spacing: string[];
    radius: string[];
    variants: string[];
    sizes: string[];
  };
}

export const retrieveDesignContextTool: AgentTool<
  void,
  DesignContextData
> = {
  name: "retrieve_design_context",

  description:
    "Retrieve available UI components and design tokens from the project's Design System.",

  category: "retrieval",

  async execute(): Promise<ToolResult<DesignContextData>> {
    const components = Object.values(COMPONENT_REGISTRY).map((spec) => ({
      type: spec.type,
      label: spec.label,
      hasInspector: Boolean(spec.inspectorSchema),
    }));

    return {
      success: true,

      data: {
        components,

        tokens: {
          colors: DESIGN_TOKENS.colors.map((token) => token.value),
          spacing: DESIGN_TOKENS.spacing.map((token) => token.value),
          radius: DESIGN_TOKENS.radius.map((token) => token.value),
          variants: DESIGN_TOKENS.variants.map((token) => token.value),
          sizes: DESIGN_TOKENS.sizes.map((token) => token.value),
        },
      },
    };
  },
};
