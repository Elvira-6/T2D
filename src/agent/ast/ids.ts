// ============================================================
// 稳定唯一 id 工具
//
//   LLM 提供的「语义键」不可信（可能漂移、重复、缺失、大小写/命名随意）。
//   这里把语义键规范化为系统保证的确定性 id，供 Inspector / Mutation /
//   Selection / Undo/Redo 稳定引用。
//
//   原则：
//     - 确定性：同一输入 → 同一 id（无随机、无 LLM 计数器）。
//     - 语义化：优先保留 LLM 语义键；缺失时回退到组件类型。
//     - 唯一性：兄弟节点冲突时按出现顺序追加确定性序号。
// ============================================================

/**
 * 归一化语义键：
 *   "heroHeading" → "hero_heading"
 *   "Hero Title!" → "hero_title"
 *   "" / undefined → ""（由调用方决定回退值）
 */
export function sanitizeKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2") // camelCase → snake_case
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // 非字母数字 → _
    .replace(/^_+|_+$/g, ""); // 去首尾下划线
}

/**
 * 兄弟节点内去重：base 冲突时按出现顺序追加 _1 / _2 / ...
 *
 *   parentId="features", base="feature"（出现 3 次）→
 *     features_feature / features_feature_1 / features_feature_2
 */
export function uniqueSibling(
  parentId: string,
  base: string,
  used: Set<string>
): string {
  const first = `${parentId}_${base}`;
  let candidate = first;
  let n = 0;
  while (used.has(candidate)) {
    n++;
    candidate = `${first}_${n}`;
  }
  used.add(candidate);
  return candidate;
}
