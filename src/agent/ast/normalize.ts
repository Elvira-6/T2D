import { CoreASTNode } from "@/types/ast";
import { GeneratorASTNode } from "./schema";
import { sanitizeKey, uniqueSibling } from "./ids";

// ============================================================
// AST Normalizer —— 确定性 ID 修正 + 结构归一化
//
//   Generator 只负责结构；id 由这里统一生成，而不是信任 LLM：
//
//     LLM 生成 AST → Zod（GeneratorASTNodeSchema）→ normalizeAST
//       → CoreASTNode（id 必填、稳定唯一、语义化）
//
//   规则：
//     - 根节点：语义键（缺省 "root"）。
//     - 子节点：`父路径_语义键`，语义键缺失时回退到组件类型（小写）。
//     - 兄弟冲突：追加 _1 / _2 / ...（确定性，按数组顺序）。
//     - 补齐 schemaVersion=1 与空 props，丢弃 schema 外字段。
//
//   产物一定满足 CoreASTNodeSchema（id 必填），可安全交给下游。
// ============================================================

/** 节点语义基名：优先语义键，其次组件类型，最后 "node"。 */
function baseKey(node: GeneratorASTNode): string {
  return sanitizeKey(node.id) || sanitizeKey(node.type) || "node";
}

function build(node: GeneratorASTNode, id: string): CoreASTNode {
  const children = node.children ?? [];
  const used = new Set<string>();
  const normalizedChildren = children.map((child) =>
    build(child, uniqueSibling(id, baseKey(child), used))
  );

  const result: CoreASTNode = {
    id,
    type: node.type,
    schemaVersion: node.schemaVersion ?? 1,
    props: (node.props ?? {}) as CoreASTNode["props"],
  };

  if (node.design !== undefined) {
    result.design = node.design as CoreASTNode["design"];
  }
  if (normalizedChildren.length > 0) {
    result.children = normalizedChildren;
  }

  return result;
}

export function normalizeAST(raw: GeneratorASTNode): CoreASTNode {
  const rootId = sanitizeKey(raw.id) || "root";
  return build(raw, rootId);
}
