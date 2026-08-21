import { z } from "zod";
import { ComponentType, ComponentTypeSchema } from "@/types/ast";

// ============================================================
// Generator 的「原始输出」契约（LLM 输出层）
//
//   与 CoreASTNode 的关键差异：id 是可选「语义键」，不是唯一 id。
//   LLM 只负责提供结构 + 语义键（hero / heading / feature…），
//   系统（Normalizer）负责把语义键规范化为稳定唯一 id：
//
//     LLM 生成 AST → Zod（本 Schema）→ normalizeAST → CoreASTNode
//
//   因此这里允许 id 缺失、允许兄弟节点语义键重复 —— 这些都由
//   normalizeAST 确定性修正，而不是让 LLM 保证。
// ============================================================

export interface GeneratorASTNode {
  /** 语义标识（可选）。由 Normalizer 规范化为唯一 id，无需 LLM 保证唯一。 */
  id?: string;
  type: ComponentType;
  schemaVersion?: number;
  props?: Record<string, unknown>;
  design?: Record<string, unknown>;
  children?: GeneratorASTNode[];
}

export const GeneratorASTNodeSchema: z.ZodType<GeneratorASTNode> = z.lazy(() =>
  z
    .object({
      id: z
        .string()
        .optional()
        .describe("语义标识（可选，如 hero / heading）。系统会规范化为唯一 id。"),

      type: ComponentTypeSchema.describe("组件类型"),

      schemaVersion: z.literal(1).optional().describe("AST 协议版本号"),

      props: z
        .object({
          text: z.string().optional().describe("文本内容"),
          src: z.string().optional().describe("图片 URL（仅 Image 组件有效）"),
          href: z.string().optional().describe("链接地址"),
        })
        .optional()
        .describe("UI 属性字典"),

      design: z
        .object({
          background: z.string().optional().describe("背景色 Design Token"),
          borderColor: z.string().optional().describe("边框色 Design Token"),
          color: z.string().optional().describe("文字色 Design Token"),
          radius: z.string().optional().describe("圆角 Design Token"),
          padding: z.string().optional().describe("内边距 Design Token"),
          margin: z.string().optional().describe("外边距 Design Token"),
        })
        .optional()
        .describe("Design System Token"),

      children: z
        .array(z.lazy(() => GeneratorASTNodeSchema))
        .optional()
        .describe("子节点列表"),
    })
);
