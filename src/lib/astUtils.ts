import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 3.0 — AST 工具函数
// ============================================================

/**
 * 深度优先递归查找指定 id 的节点。
 * @returns 找到的节点，或 null（不存在）
 */
export function findNodeById(
  root: CoreASTNode,
  id: string
): CoreASTNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;

  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}
