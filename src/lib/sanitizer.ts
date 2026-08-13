import { clsx, ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================
// Phase 2.2 — 样式清洗与防御管道 (Class Sanitizer & Merge Pipeline)
// ============================================================

/**
 * 常见 LLM 幻觉类名黑名单 / 匹配规则
 * （注意：此处只匹配「独立成 token」的非法类名）
 */
const INVALID_CLASS_PATTERNS = [
  /^undefined$/i,
  /^null$/i,
  /^none$/i,
  /^\[undefined\]$/i,
  /^\[null\]$/i,
  /^\[object$/i, // "[object Object]" 被空格拆分后的左半
  /^object\]$/i, // 右半
  /^\[object\s+object\]$/i, // 无空格或未拆分变体
];

/**
 * 检测 token 中是否「嵌入」了 LLM 占位符值。
 * 关键点：像 `bg-undefined`、`text-undefined`、`p-null` 这类幻觉，
 * 不会命中上面的精确黑名单，却会被 tailwind-merge 误判为合法
 * 颜色/间距类并覆盖掉真实类名（如 bg-slate-900），必须在此拦截。
 *
 * 说明：标准 Tailwind 类名中不存在 `undefined` / `null` 子串，
 * 因此按子串匹配是安全的；`none`（pointer-events-none 等）合法，
 * 故不在此做子串过滤。
 */
const EMBEDDED_PLACEHOLDER_PATTERN = /(undefined|null)/i;

/**
 * 校验单个类名 Token 是否合法
 */
function isValidClassToken(token: string): boolean {
  if (!token || token.length > 100) return false; // 过滤过长垃圾数据
  if (INVALID_CLASS_PATTERNS.some((pattern) => pattern.test(token))) {
    return false;
  }
  if (EMBEDDED_PLACEHOLDER_PATTERN.test(token)) return false;
  return true;
}

/**
 * 样式清洗核心管道
 * 1. 利用 clsx 处理复杂的对象/数组/条件入参
 * 2. 折叠 "[object Object]" 变体，避免被空格拆分成两个非法 token
 * 3. 剥离换行符、多余空格以及黑名单/占位符中的非法幻觉类名
 * 4. 利用 tailwind-merge 解决 Tailwind 属性冲突（如后者的 p-8 覆盖前面的 p-4）
 */
export function sanitizeClassName(...inputs: ClassValue[]): string {
  try {
    // 1. 转为基础字符串
    let rawClassString = clsx(inputs);
    if (!rawClassString) return "";

    // 2. 预先折叠 "[object Object]" 变体（含不同大小写/空白）
    rawClassString = rawClassString.replace(/\[object\s+object\]/gi, " ");

    // 3. 按空白切分为 Token，剔除非法/幻觉类名
    const cleanTokens = rawClassString.split(/\s+/).filter(isValidClassToken);

    // 4. 利用 twMerge 解决 Tailwind 类名冲突并去重
    return twMerge(cleanTokens.join(" "));
  } catch (error) {
    console.warn("Class sanitizer runtime warning:", error);
    return "";
  }
}
