import { z } from "zod";

/**
 * ============================================================
 * Phase 1 — UI Planning Schema（Step12：三层结构）
 * ============================================================
 *
 * Planner 的唯一职责：把 User Prompt 翻译成「结构蓝图 + 组合意图」，
 * 而不是具体组件或 Tailwind。三层：
 *
 *   UIPlan
 *   ├── page          —— 页面语义（type + purpose）
 *   ├── designIntent  —— 设计意图（非 Tailwind / 非具体 token）
 *   └── sections[]    —— 每个 section 的语义角色 + 组合模式
 *        ├── role      —— 语义角色（hero / features / cta / footer …）
 *        ├── pattern   —— 组合模式（hero-split / feature-grid …）
 *        ├── content   —— 内容结构意图（有哪些槽位）
 *
 * 边界（必须守住）：
 * - Planner 不生成 JSX / React 代码 / Tailwind className / AST。
 * - Planner 不决定「具体组件」；pattern 由 Composition Registry 校验与实现。
 * - Generator 才是「component realization」，Renderer 才是「DOM/CSS」。
 */

export const DesignIntentSchema = z.object({
  visualStyle: z.enum([
    "minimal",
    "modern",
    "corporate",
    "playful",
    "luxury",
  ]),

  density: z.enum(["compact", "comfortable", "spacious"]),

  emphasis: z.enum(["content", "visual", "conversion"]),

  responsive: z.literal("mobile-first"),
});

export const SectionContentSchema = z.object({
  eyebrow: z.boolean().optional(),
  heading: z.boolean().optional(),
  description: z.boolean().optional(),

  actions: z
    .array(z.enum(["primary", "secondary"]))
    .optional(),

  visual: z.enum(["image", "none"]).optional(),

  itemCount: z.number().int().min(1).max(12).optional(),

  brand: z.boolean().optional(),
  navigation: z.boolean().optional(),
  copyright: z.boolean().optional(),
});

export const SectionRoleSchema = z.enum([
  "hero",
  "features",
  "cta",
  "footer",
  "content",
  "stats",
  "testimonial",
  "pricing",
]);

export const SectionPatternSchema = z.enum([
  "hero-centered",
  "hero-split",

  "feature-grid",
  "feature-list",

  "stats-row",

  "testimonial-grid",

  "pricing-table",

  "cta-banner",

  "footer-simple",
]);

export const UIPlanSectionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(50),

  role: SectionRoleSchema,

  pattern: SectionPatternSchema,

  content: SectionContentSchema,
});

export const UIPlanSchema = z.object({
  page: z.object({
    type: z.enum([
      "landing",
      "marketing",
      "dashboard",
      "documentation",
    ]),

    purpose: z
      .string()
      .min(1)
      .max(300),
  }),

  designIntent: DesignIntentSchema,

  sections: z
    .array(UIPlanSectionSchema)
    .min(1)
    .max(20),
});

export type DesignIntent = z.infer<typeof DesignIntentSchema>;
export type SectionContent = z.infer<typeof SectionContentSchema>;
export type SectionRole = z.infer<typeof SectionRoleSchema>;
export type UIPlanSection = z.infer<typeof UIPlanSectionSchema>;
export type UIPlan = z.infer<typeof UIPlanSchema>;
