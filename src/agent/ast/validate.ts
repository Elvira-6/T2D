import { CoreASTNode } from "@/types/ast";
import { getComponentCapability } from "@/inspector/capabilities";

// ============================================================
// Design Constraint Validation（设计/组件能力硬约束）
//
//   职责：验证 Generator 输出是否违反「系统硬约束」。它不是 Phase 3.3
//   的 AST Validator Tool（那个负责 structural / accessibility / layout /
//   semantic / design consistency 等更广的规则），这里只守住一条边界：
//
//     Generator 生成的 AST 不得越过 Component Registry 声明的能力。
//
//   CoreASTNodeSchema 只保证 AST「结构合法」（type 是 7 个组件之一、
//   props/design 是字典），不保证「组件能力合法」。这里把校验升级为
//   「组件自己声明能力」，来源是 COMPONENT_REGISTRY 的 inspectorSchema：
//
//     COMPONENT_REGISTRY["Button"]
//       → supported design fields（background / borderColor / radius / …）
//       → supported tokens（每个字段的 options，来自 DESIGN_TOKENS / 枚举）
//       → supported props（text / variant / size / href / …）
//
//   因此「radius 是合法 token」不再等于「Button 支持 radius」：
//   只有当 Button 的 inspectorSchema 声明了 radius 字段，才允许写入。
//
//   检查项（逐节点递归）：
//     1. 组件类型是否在 Component Registry 中
//     2. design 字段是否为该组件声明（+ token 取值是否在 options 内）
//     3. props 字段是否为该组件声明（+ 枚举取值是否在 options 内）
//     4. className 一律禁止（视觉必须走 design token）
// ============================================================

export interface DesignConstraintIssue {
  /** 节点路径，如 hero.design.background（语义 id，便于定位） */
  path: string;
  message: string;
}

function validateNode(node: CoreASTNode, issues: DesignConstraintIssue[]): void {
  const capability = getComponentCapability(node.type);

  // 1. 组件类型是否在 Registry 中
  if (!capability) {
    issues.push({
      path: node.id,
      message: `组件类型 "${node.type}" 不在 Component Registry 中`,
    });
    for (const child of node.children ?? []) validateNode(child, issues);
    return;
  }

  // 2. design 字段：组件能力 + token 取值
  for (const [key, value] of Object.entries(node.design ?? {})) {
    if (!capability.design.has(key)) {
      issues.push({
        path: `${node.id}.design.${key}`,
        message: `组件 "${node.type}" 不支持 design 字段 "${key}"`,
      });
      continue;
    }
    const allowed = capability.design.get(key);
    if (allowed && typeof value === "string" && !allowed.includes(value)) {
      issues.push({
        path: `${node.id}.design.${key}`,
        message: `Design Token "${value}" 不在 "${key}" 的合法取值中（${allowed.join(" / ")}）`,
      });
    }
  }

  // 3. props 字段：className 禁止 + 组件能力 + 枚举取值
  for (const [key, value] of Object.entries(node.props ?? {})) {
    if (key === "className") {
      issues.push({
        path: `${node.id}.props.className`,
        message: "Generator AST 禁止 className；视觉属性必须通过 design token 表达",
      });
      continue;
    }
    if (!capability.props.has(key)) {
      issues.push({
        path: `${node.id}.props.${key}`,
        message: `组件 "${node.type}" 不支持 props 字段 "${key}"`,
      });
      continue;
    }
    const allowed = capability.props.get(key);
    if (allowed && typeof value === "string" && !allowed.includes(value)) {
      issues.push({
        path: `${node.id}.props.${key}`,
        message: `属性 "${key}" 的值 "${value}" 不在合法取值中（${allowed.join(" / ")}）`,
      });
    }
  }

  // 4. 递归子节点
  for (const child of node.children ?? []) validateNode(child, issues);
}

export function validateDesignConstraints(ast: CoreASTNode): DesignConstraintIssue[] {
  const issues: DesignConstraintIssue[] = [];
  validateNode(ast, issues);
  return issues;
}
