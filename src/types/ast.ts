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
// 2. 核心 Core AST 节点 Schema（递归定义）
// ============================================================
export const CoreASTNodeSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      id: z.string().describe("节点唯一ID，用于选择与局部高亮"),
      type: ComponentTypeSchema.describe("组件类型"),
      schemaVersion: z.number().optional().default(1).describe("AST 协议版本号"),

      // 变长字典：收拢所有 UI 属性、Tailwind 类名与文本内容
      props: z
        .object({
          className: z.string().optional().describe("Tailwind CSS 类名"),
          text: z.string().optional().describe("文本内容"),
          src: z.string().optional().describe("图片 URL（仅 Image 组件有效）"),
          href: z.string().optional().describe("链接地址"),
        })
        .passthrough(), // 关键：放行未知字段

      children: z
        .array(z.lazy(() => CoreASTNodeSchema))
        .optional()
        .describe("子节点列表"),
    })
    .passthrough()
);

export type CoreASTNode = z.infer<typeof CoreASTNodeSchema>;

// ============================================================
// 3. 辅助：创建节点的工厂函数
// ============================================================
export function createNode(
  id: string,
  type: ComponentType,
  props: Record<string, any> = {},
  children?: CoreASTNode[]
): CoreASTNode {
  return { id, type, schemaVersion: 1, props, children };
}

// ============================================================
// 4. AST 版本迁移器类型
// ============================================================
export type ASTMigrator = (oldAst: any) => CoreASTNode;

export const AST_CURRENT_VERSION = 1;
