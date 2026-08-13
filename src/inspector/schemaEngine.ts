import { CoreASTNode } from "@/types/ast";
import { COMPONENT_REGISTRY } from "@/registry";
import { InspectorSchema, SchemaGroup } from "./schemaTypes";
import { isFieldVisible } from "./inspectorUtils";

// ============================================================
// Phase 3.1.2 — 动态 Schema 解析引擎
// 依据当前选中 AST Node 状态计算出合规的 InspectorSchema，
// 并执行 visibleWhen 评估过滤未满足条件的字段。
// ============================================================

export function getInspectorSchema(node: CoreASTNode | null): InspectorSchema | null {
  if (!node) return null;

  const registration = COMPONENT_REGISTRY[node.type];
  if (!registration || !registration.inspectorSchema) {
    return null;
  }

  const rawSchema = registration.inspectorSchema;

  // 评估 visibleWhen 规则，过滤未满足条件的字段
  const activeGroups: SchemaGroup[] = rawSchema.groups
    .map((group) => {
      const visibleFields = group.fields.filter((field) =>
        isFieldVisible(node, field.visibleWhen)
      );

      return {
        ...group,
        fields: visibleFields,
      };
    })
    .filter((group) => group.fields.length > 0);

  return {
    ...rawSchema,
    groups: activeGroups,
  };
}
