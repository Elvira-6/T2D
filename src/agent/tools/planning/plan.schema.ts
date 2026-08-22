import { z } from "zod";

/**
 * ============================================================
 * Phase 1 — UI Planning Schema
 * ============================================================
 *
 * Planner 的唯一职责：
 *
 * User Prompt
 *     ↓
 * UIPlan
 *
 * 注意：
 * Planner 不生成 JSX
 * Planner 不生成 Tailwind className
 * Planner 不直接生成 AST
 *
 * 它只负责：
 * - 页面意图
 * - 页面结构
 * - section
 * - component
 * - design direction
 *
 * Phase 2 才负责 UIPlan → AST
 */

export const ComponentIntentSchema = z.object({
  type: z.enum([
    "Container",
    "Flex",
    "Grid",
    "Heading",
    "Text",
    "Button",
    "Image",
  ]),

  purpose: z
    .string()
    .min(1)
    .max(200),
});

export const SectionPlanSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(50),

  type: z.enum([
    "hero",
    "features",
    "content",
    "cta",
    "footer",
    "header",
    "gallery",
  ]),

  purpose: z
    .string()
    .min(1)
    .max(300),

  layout: z.enum([
    "container",
    "flex-row",
    "flex-column",
    "grid",
  ]),

  components: z
    .array(ComponentIntentSchema)
    .min(1)
    .max(20),
});

export const DesignDirectionSchema = z.object({
  theme: z.enum([
    "modern",
    "minimal",
    "professional",
    "playful",
    "luxury",
    "dark",
  ]),

  spacing: z.enum([
    "compact",
    "comfortable",
    "spacious",
  ]),

  radius: z.enum([
    "none",
    "sm",
    "md",
    "lg",
    "full",
  ]),

  primaryColor: z.enum([
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "neutral",
  ]),
});

export const UIPlanSchema = z.object({
  version: z.literal(1),

  intent: z
    .string()
    .min(1)
    .max(300),

  pageType: z.enum([
    "landing",
    "dashboard",
    "marketing",
    "portfolio",
    "blog",
    "documentation",
    "form",
    "unknown",
  ]),

  sections: z
    .array(SectionPlanSchema)
    .min(1)
    .max(12),

  design: DesignDirectionSchema,
});

export type UIPlan = z.infer<typeof UIPlanSchema>;
