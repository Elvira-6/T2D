import { MutationCommand } from "./mutationTypes";

// ============================================================
// Phase 3.0 — Mutation Policy（Path Policy + Value Policy）
// ============================================================

// 允许外部（如 Inspector）改动的安全属性路径白名单规则
const ALLOWED_PROP_PATH_PREFIXES = [
  "props.text",
  "props.src",
  "props.href",
  "props.alt",
  "props.variant",
  "props.size",
  "props.className",
  "props.style",
];

// 绝对禁止修改的系统级别敏感属性
const FORBIDDEN_PATHS = ["id", "type", "children", "props.internalId"];

// Value Policy：拦截危险协议注入（如 javascript: / data:text/html）
const FORBIDDEN_VALUE_PATTERNS = [/^\s*javascript:/i, /^\s*data:text\/html/i];

export function validateMutation(
  command: MutationCommand
): { valid: boolean; reason?: string } {
  switch (command.action) {
    case "SET_PROP": {
      const fullPath = command.path.join(".");

      // 1. Path Policy — 黑名单
      if (
        FORBIDDEN_PATHS.some(
          (forbidden) => fullPath === forbidden || fullPath.startsWith(`${forbidden}.`)
        )
      ) {
        return { valid: false, reason: `Policy Violation: Path '${fullPath}' is system restricted.` };
      }

      // 2. Path Policy — INSPECTOR 白名单
      if (command.meta?.source === "INSPECTOR") {
        const isAllowed = ALLOWED_PROP_PATH_PREFIXES.some(
          (prefix) => fullPath === prefix || fullPath.startsWith(`${prefix}.`)
        );
        if (!isAllowed) {
          return { valid: false, reason: `Policy Violation: Field '${fullPath}' is not exposed for visual editing.` };
        }
      }

      // 3. Value Policy — 危险协议注入
      if (typeof command.value === "string") {
        const value = command.value;
        if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
          return { valid: false, reason: "Policy Violation: value contains a forbidden scheme." };
        }
      }

      return { valid: true };
    }

    case "INSERT_CHILD": {
      // 结构校验：插入的节点必须具备 id 与 type
      if (!command.node || !command.node.id || !command.node.type) {
        return { valid: false, reason: "Policy Violation: inserted node must have id and type." };
      }
      return { valid: true };
    }

    case "REMOVE_NODE":
      // 根节点无父级，REMOVE_NODE 仅按 children 过滤，天然无法删除根，无需额外策略
      return { valid: true };

    default:
      return { valid: true };
  }
}
