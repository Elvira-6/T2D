import { CoreASTNode } from "@/types/ast";
import { VisibilityCondition } from "./schemaTypes";

// ============================================================
// Phase 3.1.2 — 工具函数：路径取值与 visibleWhen 校验
// ============================================================

/**
 * 递归按 path 获取 AST Node 中的值
 */
export function getDeepValue(obj: any, path: string[]): any {
  if (!obj || path.length === 0) return undefined;
  let current = obj;
  for (const key of path) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * 依据 node 当前状态评估 visibleWhen 是否成立
 */
export function isFieldVisible(node: CoreASTNode, condition?: VisibilityCondition): boolean {
  if (!condition) return true;

  // 优先检索 node.props，其次检索 node.design
  const targetValue =
    getDeepValue(node, ["props", condition.field]) ??
    getDeepValue(node, ["design", condition.field]);

  return targetValue === condition.equals;
}
