import { zodToJsonSchema } from "zod-to-json-schema";
import { CoreASTNodeSchema } from "@/types/ast";

/**
 * 将最新的 Zod AST 结构自动转化为 JSON Schema 字符串，
 * 用于动态注入 LLM 的 System Prompt。
 *
 * 效果：当你更新了组件的 Zod 定义，
 * System Prompt 自动同步最新规范，杜绝"代码改了，Prompt 忘记改"。
 */
export function getSystemPromptASTSchema(): string {
  const jsonSchema = zodToJsonSchema(CoreASTNodeSchema, "CoreASTNode");
  return JSON.stringify(jsonSchema, null, 2);
}

/**
 * 生成一段可直接放入 System Prompt 的 Markdown 格式规范
 */
export function generateSystemPromptSection(): string {
  const schema = getSystemPromptASTSchema();

  return `
## 输出规范

你必须严格按照以下 JSON Schema 输出 AST 节点树。
每个节点必须包含 \`id\`、\`type\`、\`props\` 字段。
\`props\` 中的 \`className\` 只能使用标准 Tailwind CSS 类名。

\`\`\`json
${schema}
\`\`\`

### 关键约束：
- \`id\` 必须全局唯一，格式如 "section_name_index"
- \`type\` 只能是：Container | Flex | Grid | Heading | Text | Button | Image
- \`className\` 只能使用标准 Tailwind v3 类名（如 bg-blue-600, p-4, rounded-lg）
- 不得使用不存在或自创的类名（如 bg-dark-blue, shadow-strong）
`.trim();
}
