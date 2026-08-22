import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 3.3-B — RepairScope（Repair 的最小化修复硬约束）
//
//   问题：Repair 是 LLM，即便 prompt 里写了「只修改与 validation issues
//   相关的字段」，它仍可能顺手改掉别处的字段。这会让「最小化修复」变成
//   一句空话，甚至引入新的越界修改。
//
//   解法：Repair 产出 repaired AST 后，用 Before AST 与 After AST 做结构化
//   diff，得到变更路径集合；再逐条检查是否落在 Validator issues 的 path 内。
//   任何越界变更 → Repair 直接失败（不做部分回滚，交回 Decision Engine 重试）。
//
//   路径约定与 Validator（validate.ts）一致：节点用其自身 id（全局唯一），
//   字段用 `<id>.props.<key>` / `<id>.design.<key>`，类型变更 `<id>.type`，
//   节点新增/删除 `<id>`。
// ============================================================

/** Repair 允许修改的路径范围（= Validator issues 的 path 并集） */
export interface RepairScope {
  paths: string[];
}

export interface RepairScopeResult {
  /** 是否所有变更都落在 scope 内 */
  valid: boolean;
  /** Before AST → After AST 的全部变更路径 */
  changedPaths: string[];
  /** 越界（不在 scope 内）的变更路径 */
  outOfScope: string[];
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function diffRecord(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  prefix: string,
  changed: string[]
): void {
  const b = before ?? {};
  const a = after ?? {};
  const keys = new Set<string>([...Object.keys(b), ...Object.keys(a)]);
  for (const key of keys) {
    const hasB = Object.prototype.hasOwnProperty.call(b, key);
    const hasA = Object.prototype.hasOwnProperty.call(a, key);
    if (hasB !== hasA) {
      changed.push(`${prefix}.${key}`);
    } else if (!sameValue(b[key], a[key])) {
      changed.push(`${prefix}.${key}`);
    }
  }
}

function diffNode(
  before: CoreASTNode,
  after: CoreASTNode,
  prefix: string,
  changed: string[]
): void {
  if (before.type !== after.type) {
    changed.push(`${prefix}.type`);
  }

  diffRecord(before.props, after.props, `${prefix}.props`, changed);
  diffRecord(before.design, after.design, `${prefix}.design`, changed);

  const beforeChildren = before.children ?? [];
  const afterChildren = after.children ?? [];
  const beforeById = new Map<string, CoreASTNode>(
    beforeChildren.map((c): [string, CoreASTNode] => [c.id, c])
  );
  const afterById = new Map<string, CoreASTNode>(
    afterChildren.map((c): [string, CoreASTNode] => [c.id, c])
  );

  for (const [id, beforeChild] of beforeById) {
    const afterChild = afterById.get(id);
    if (!afterChild) {
      changed.push(id);
      continue;
    }
    diffNode(beforeChild, afterChild, id, changed);
  }
  for (const id of afterById.keys()) {
    if (!beforeById.has(id)) {
      changed.push(id);
    }
  }
}

/** Before AST → After AST 的变更路径集合（结构 diff） */
export function diffASTPaths(before: CoreASTNode, after: CoreASTNode): string[] {
  const changed: string[] = [];
  if (before.id !== after.id) {
    changed.push(`${before.id}.id`);
  }
  diffNode(before, after, before.id, changed);
  return changed;
}

function isPathInScope(path: string, scope: RepairScope): boolean {
  return scope.paths.some((p) => path === p || path.startsWith(`${p}.`));
}

/** 校验 Repair 的 diff 是否只落在允许范围内（越界即 invalid） */
export function checkRepairScope(
  before: CoreASTNode,
  after: CoreASTNode,
  scope: RepairScope
): RepairScopeResult {
  const changedPaths = diffASTPaths(before, after);
  const outOfScope = changedPaths.filter((p) => !isPathInScope(p, scope));
  return { valid: outOfScope.length === 0, changedPaths, outOfScope };
}
