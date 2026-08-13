// ============================================================
// Phase 3.1.2 — Design Token 注册表（强类型元数据 + 类名解析）
// 集中统一管理 Design System 暴露给 Inspector 控件选择的 Token，
// 并提供 token → Tailwind 类名的解析，供 render / exportCode 复用。
// ============================================================

export interface TokenOption {
  label: string;
  value: string;
  colorHex?: string; // 供颜色选择器 / 下拉项小圆点预览
}

export const DESIGN_TOKENS = {
  colors: [
    { label: "Primary (Brand)", value: "primary", colorHex: "#3b82f6" },
    { label: "Secondary (Slate)", value: "secondary", colorHex: "#64748b" },
    { label: "Success (Green)", value: "success", colorHex: "#22c55e" },
    { label: "Warning (Yellow)", value: "warning", colorHex: "#eab308" },
    { label: "Danger (Red)", value: "danger", colorHex: "#ef4444" },
    { label: "Neutral Gray", value: "neutral", colorHex: "#9ca3af" },
    { label: "Ghost / Transparent", value: "ghost", colorHex: "transparent" },
  ] as TokenOption[],

  radius: [
    { label: "None (0px)", value: "none" },
    { label: "Small (4px)", value: "sm" },
    { label: "Medium (8px)", value: "md" },
    { label: "Large (12px)", value: "lg" },
    { label: "Full (Pill)", value: "full" },
  ] as TokenOption[],

  spacing: [
    { label: "None (0px)", value: "none" },
    { label: "Compact (8px)", value: "sm" },
    { label: "Default (16px)", value: "md" },
    { label: "Relaxed (24px)", value: "lg" },
    { label: "Spacious (32px)", value: "xl" },
  ] as TokenOption[],

  variants: [
    { label: "Solid", value: "solid" },
    { label: "Outline", value: "outline" },
    { label: "Ghost", value: "ghost" },
  ] as TokenOption[],

  sizes: [
    { label: "Small (sm)", value: "sm" },
    { label: "Medium (md)", value: "md" },
    { label: "Large (lg)", value: "lg" },
  ] as TokenOption[],
};

// ------------------------------------------------------------
// Token → Tailwind 类名解析
// 仅在 token 值「显式存在」时返回类名；未设置时返回空串，
// 以保留 LLM 产出的 className 作为兜底（Inspector 编辑才覆盖）。
// ------------------------------------------------------------

const COLOR_STEM: Record<string, string> = {
  primary: "blue-600",
  secondary: "slate-500",
  success: "green-500",
  warning: "yellow-500",
  danger: "red-500",
  neutral: "slate-400",
  ghost: "transparent",
};

const RADIUS_CLASS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const SPACING_NUM: Record<string, string> = {
  none: "0",
  sm: "2",
  md: "4",
  lg: "6",
  xl: "8",
};

const SIZE_CLASS: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function resolveColorClass(
  token: string | undefined,
  prefix: "bg" | "text" | "border" = "bg"
): string {
  if (!token) return "";
  const stem = COLOR_STEM[token];
  if (!stem) return "";
  return `${prefix}-${stem}`;
}

export function resolveRadiusClass(token: string | undefined): string {
  if (!token) return "";
  return RADIUS_CLASS[token] ?? "";
}

export function resolveSpacingClass(
  token: string | undefined,
  prefix: "p" | "m" | "px" | "py" | "pt" | "pb" | "mt" | "mb" = "p"
): string {
  if (!token) return "";
  const n = SPACING_NUM[token];
  if (n === undefined) return "";
  return `${prefix}-${n}`;
}

export function resolveSizeClass(token: string | undefined): string {
  if (!token) return "";
  return SIZE_CLASS[token] ?? "";
}
