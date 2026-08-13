import { CoreASTNode } from "@/types/ast";
import { MutationCommand, MutationResult } from "./mutationTypes";
import { validateMutation } from "./mutationPolicy";

// ============================================================
// Phase 3.0 — Mutation Engine
// 纯函数映射 oldAST + command => MutationResult
// ============================================================

/**
 * 深入 path 修改对象的纯函数辅助工具
 */
function setDeepValue(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  const current = obj && typeof obj === "object" ? obj[head] : {};

  return {
    ...obj,
    [head]: tail.length === 0 ? value : setDeepValue(current, tail, value),
  };
}

/**
 * 安全提取命令的"目标节点 id"（INSERT 用 parentId，其余用 targetId）
 */
function commandTargetId(command: MutationCommand): string {
  return command.action === "INSERT_CHILD" ? command.parentId : command.targetId;
}

export function applyMutation(
  root: CoreASTNode,
  command: MutationCommand
): MutationResult {
  // 1. 策略校验
  const validation = validateMutation(command);
  if (!validation.valid) {
    return { ast: root, changed: false, affectedNodes: [], error: validation.reason };
  }

  let isNodeFound = false;

  function traverseAndMutate(node: CoreASTNode): CoreASTNode {
    switch (command.action) {
      case "SET_PROP":
      case "SET_DESIGN_TOKEN": {
        if (node.id === command.targetId) {
          isNodeFound = true;
          return setDeepValue(node, command.path, command.value);
        }
        if (!node.children || node.children.length === 0) return node;
        return { ...node, children: node.children.map(traverseAndMutate) };
      }

      case "REMOVE_NODE": {
        if (!node.children) return node;
        const hasTarget = node.children.some((child) => child.id === command.targetId);
        if (hasTarget) isNodeFound = true;
        return {
          ...node,
          children: node.children
            .filter((child) => child.id !== command.targetId)
            .map(traverseAndMutate),
        };
      }

      case "INSERT_CHILD": {
        if (node.id === command.parentId) {
          isNodeFound = true;
          const children = [...(node.children || [])];
          const index = command.index ?? children.length;
          children.splice(index, 0, command.node);
          return { ...node, children };
        }
        if (!node.children || node.children.length === 0) return node;
        return { ...node, children: node.children.map(traverseAndMutate) };
      }

      default:
        return node;
    }
  }

  const newAST = traverseAndMutate(root);

  return {
    ast: newAST,
    changed: isNodeFound,
    affectedNodes: isNodeFound ? [commandTargetId(command)] : [],
    error: isNodeFound ? undefined : `Target node '${commandTargetId(command)}' not found in AST.`,
  };
}
