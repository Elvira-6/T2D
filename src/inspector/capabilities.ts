import { COMPONENT_REGISTRY } from "@/registry";
import { ComponentType } from "@/types/ast";

// ============================================================
// Component Capability —— 从 COMPONENT_REGISTRY 的 inspectorSchema
// 推导「组件自己声明的能力」（单一来源：Component Registry）。
//
//   这是 Generator / Validator / Design Context 共用的能力投影，
//   避免在多处重复维护「哪些字段被支持」的清单：
//
//     COMPONENT_REGISTRY["Button"].inspectorSchema
//       → design 字段（background / borderColor / radius / …）
//       → props 字段（text / variant / size / href / …）
//       → 每个字段的合法取值（options，来自 DESIGN_TOKENS / 枚举）
// ============================================================

export interface ComponentCapability {
  /** design 字段名 → 允许的取值（undefined = 自由文本，无枚举约束） */
  design: Map<string, string[] | undefined>;
  /** props 字段名 → 允许的取值（undefined = 自由文本，无枚举约束） */
  props: Map<string, string[] | undefined>;
}

/**
 * 返回组件能力；组件不在 Registry 时返回 null。
 */
export function getComponentCapability(type: ComponentType): ComponentCapability | null {
  const spec = COMPONENT_REGISTRY[type];
  if (!spec) return null;

  const design = new Map<string, string[] | undefined>();
  const props = new Map<string, string[] | undefined>();

  for (const group of spec.inspectorSchema?.groups ?? []) {
    for (const field of group.fields) {
      const [scope, key] = field.path;
      const values = field.options?.map((o) => o.value);
      if (scope === "design" && key) design.set(key, values);
      else if (scope === "props" && key) props.set(key, values);
    }
  }

  return { design, props };
}

/** 组件能力 → 可序列化的字段清单（供 Design Context / Prompt 使用） */
export function componentCapabilityKeys(type: ComponentType): {
  props: string[];
  design: string[];
} {
  const capability = getComponentCapability(type);
  return {
    props: [...(capability?.props.keys() ?? [])],
    design: [...(capability?.design.keys() ?? [])],
  };
}
