import { z } from "zod";

// ============================================================
// 1. 组件类型枚举
// ============================================================
export const ComponentTypeSchema = z.enum([
  "Container",
  "Flex",
  "Grid",
  "Heading",
  "Text",
  "Button",
  "Image",
]);

export type ComponentType = z.infer<typeof ComponentTypeSchema>;

// ============================================================
// 2. 核心 Core AST 节点类型（手动定义，避免 z.lazy + z.infer 循环推导）
// ============================================================
export interface CoreASTNode {
  id: string;
  type: ComponentType;
  schemaVersion?: number;
  props: {
    className?: string;
    text?: string;
    src?: string;
    href?: string;
    [key: string]: any;
  };
  /**
   * Design Token（Phase 3.1.2）：视觉属性收敛至 Design System Token，
   * 例如 { background: "primary", radius: "md", padding: "lg" }。
   * Inspector 通过 SET_DESIGN_TOKEN 修改，拒绝自由注入 Raw className。
   */
  design?: {
    background?: string;
    borderColor?: string;
    color?: string;
    radius?: string;
    padding?: string;
    margin?: string;
    [key: string]: any;
  };
  children?: CoreASTNode[];
}

// Zod Schema — 以上方 TypeScript 类型为目标进行校验
export const CoreASTNodeSchema: z.ZodType<CoreASTNode> = z.lazy(() =>
  z
    .object({
      id: z.string().describe("节点唯一ID，用于选择与局部高亮"),
      type: ComponentTypeSchema.describe("组件类型"),
      schemaVersion: z
        .number()
        .optional()
        .default(1)
        .describe("AST 协议版本号"),

      // UI 属性字典。
      // Core Schema 允许扩展字段；具体组件是否支持某字段，
      // 由 Component Registry / validateDesignConstraints 决定。
      props: z
        .object({
          className: z.string().optional().describe("Tailwind CSS 类名"),
          text: z.string().optional().describe("文本内容"),
          src: z.string().optional().describe("图片 URL（仅 Image 组件有效）"),
          href: z.string().optional().describe("链接地址"),
        })
        .passthrough(), // 关键：放行未知字段

      // Design Token 字典。
      // Core Schema 负责结构类型；具体字段和 token 合法性
      // 由 Design System / Component Registry 校验。
      design: z
        .object({
          background: z.string().optional().describe("背景色 Design Token"),
          borderColor: z.string().optional().describe("边框色 Design Token"),
          color: z.string().optional().describe("文字色 Design Token"),
          radius: z.string().optional().describe("圆角 Design Token"),
          padding: z.string().optional().describe("内边距 Design Token"),
          margin: z.string().optional().describe("外边距 Design Token"),
        })
        .passthrough()
        .optional()
        .describe("Design System Token（Phase 3.1.2）"),

      children: z
        .array(z.lazy(() => CoreASTNodeSchema))
        .optional()
        .describe("子节点列表"),
    })
    .passthrough(),
);

// ============================================================
// 3. 辅助：创建节点的工厂函数
// ============================================================
export function createNode(
  id: string,
  type: ComponentType,
  props: Record<string, any> = {},
  children?: CoreASTNode[],
): CoreASTNode {
  return { id, type, schemaVersion: 1, props, children };
}

// ============================================================
// 4. AST 版本迁移器类型
// ============================================================
export type ASTMigrator = (oldAst: any) => CoreASTNode;

export const AST_CURRENT_VERSION = 1;
