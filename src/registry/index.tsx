import React from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { sanitizeClassName } from "@/lib/sanitizer";
import {
  DESIGN_TOKENS,
  TokenOption,
  resolveColorClass,
  resolveRadiusClass,
  resolveSpacingClass,
  resolveSizeClass,
} from "@/tokens/tokenRegistry";
import { InspectorSchema, SchemaGroup } from "@/inspector/schemaTypes";

// ============================================================
// Component Registry — 单点注册模式 (Single Source of Truth)
// ============================================================
// Phase 3.1.2：组件视图（render）、代码导出（exportCode）、
// 默认属性（defaultProps）与属性面板结构（inspectorSchema）
// 全量统一收拢在本注册表中，新增组件仅需扩充此处，Engine 无需改动（OCP）。

/**
 * 组件规范接口：将沙盒渲染、代码导出模板、默认属性与 Inspector Schema
 * 集中在一个配置对象中。
 */
export interface ComponentSpec {
  type: ComponentType;
  label: string;
  defaultProps: Record<string, any>;

  /** 沙盒渲染函数 */
  render: (opts: {
    node: CoreASTNode;
    children?: React.ReactNode;
    combinedClassName?: string;
  }) => React.ReactElement;

  /** 代码导出函数 — 将节点转为干净的 JSX 字符串 */
  exportCode: (node: CoreASTNode, childrenCode?: string) => string;

  /** Inspector 属性面板结构（Phase 3.1.2），无则不可编辑 */
  inspectorSchema?: InspectorSchema;
}

// ============================================================
// Phase 3.1.2 — Inspector Schema 定义
// ============================================================

// 共享的标准 Layout 属性组
const COMMON_LAYOUT_GROUP: SchemaGroup = {
  id: "layout",
  title: "Layout & Spacing",
  fields: [
    {
      id: "padding",
      label: "Padding",
      path: ["design", "padding"],
      controlType: "token-select",
      mutation: { operation: "SET_DESIGN_TOKEN" },
      options: DESIGN_TOKENS.spacing,
      defaultValue: "md",
    },
    {
      id: "margin",
      label: "Margin",
      path: ["design", "margin"],
      controlType: "token-select",
      mutation: { operation: "SET_DESIGN_TOKEN" },
      options: DESIGN_TOKENS.spacing,
      defaultValue: "none",
    },
  ],
};

// 共享的「盒模型视觉」Token 组（背景色 + 圆角）
const COMMON_BOX_STYLE_FIELDS = [
  {
    id: "background",
    label: "Background Color",
    path: ["design", "background"],
    controlType: "token-select" as const,
    mutation: { operation: "SET_DESIGN_TOKEN" as const },
    options: DESIGN_TOKENS.colors,
    defaultValue: "ghost",
  },
  {
    id: "radius",
    label: "Border Radius",
    path: ["design", "radius"],
    controlType: "token-select" as const,
    mutation: { operation: "SET_DESIGN_TOKEN" as const },
    options: DESIGN_TOKENS.radius,
    defaultValue: "md",
  },
];

// ------------------------------------------------------------
// Layout 语义选项（非 Design Token，作为 SET_PROP 的枚举选项）
// ------------------------------------------------------------
const DIRECTION_OPTIONS: TokenOption[] = [
  { label: "Row", value: "row" },
  { label: "Column", value: "col" },
];
const ALIGN_OPTIONS: TokenOption[] = [
  { label: "Start", value: "start" },
  { label: "Center", value: "center" },
  { label: "End", value: "end" },
  { label: "Stretch", value: "stretch" },
];
const JUSTIFY_OPTIONS: TokenOption[] = [
  { label: "Start", value: "start" },
  { label: "Center", value: "center" },
  { label: "End", value: "end" },
  { label: "Between", value: "between" },
];
const GAP_OPTIONS: TokenOption[] = [
  { label: "None", value: "none" },
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];
const COLUMNS_OPTIONS: TokenOption[] = [
  { label: "1 Column", value: "1" },
  { label: "2 Columns", value: "2" },
  { label: "3 Columns", value: "3" },
  { label: "4 Columns", value: "4" },
];
const LEVEL_OPTIONS: TokenOption[] = [
  { label: "H1", value: "h1" },
  { label: "H2", value: "h2" },
  { label: "H3", value: "h3" },
];
const FIT_OPTIONS: TokenOption[] = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
  { label: "Fill", value: "fill" },
];

// Button Schema
const ButtonSchema: InspectorSchema = {
  componentType: "Button",
  groups: [
    {
      id: "content",
      title: "Content & Variant",
      fields: [
        {
          id: "text",
          label: "Button Text",
          path: ["props", "text"],
          controlType: "text-input",
          mutation: { operation: "SET_PROP" },
          defaultValue: "Click me",
        },
        {
          id: "variant",
          label: "Variant",
          path: ["props", "variant"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: DESIGN_TOKENS.variants,
          defaultValue: "solid",
        },
        {
          id: "size",
          label: "Size",
          path: ["props", "size"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: DESIGN_TOKENS.sizes,
          defaultValue: "md",
        },
      ],
    },
    {
      id: "style",
      title: "Design Tokens",
      fields: [
        {
          id: "background",
          label: "Background Color",
          path: ["design", "background"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.colors,
          defaultValue: "primary",
        },
        // 只有在 variant === 'outline' 时展示边框颜色配置
        {
          id: "borderColor",
          label: "Border Color",
          path: ["design", "borderColor"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.colors,
          defaultValue: "neutral",
          visibleWhen: {
            field: "variant",
            equals: "outline",
          },
        },
        {
          id: "radius",
          label: "Border Radius",
          path: ["design", "radius"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.radius,
          defaultValue: "md",
        },
      ],
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Heading Schema（独立于 Text：多一个 level 语义层级）
const HeadingSchema: InspectorSchema = {
  componentType: "Heading",
  groups: [
    {
      id: "content",
      title: "Heading Content",
      fields: [
        {
          id: "text",
          label: "Heading Text",
          path: ["props", "text"],
          controlType: "text-input",
          mutation: { operation: "SET_PROP" },
          defaultValue: "Heading",
        },
        {
          id: "level",
          label: "Level",
          path: ["props", "level"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: LEVEL_OPTIONS,
          defaultValue: "h2",
        },
      ],
    },
    {
      id: "style",
      title: "Heading Design Tokens",
      fields: [
        {
          id: "color",
          label: "Text Color",
          path: ["design", "color"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.colors,
          defaultValue: "neutral",
        },
      ],
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Text Schema
const TextSchema: InspectorSchema = {
  componentType: "Text",
  groups: [
    {
      id: "content",
      title: "Typography Props",
      fields: [
        {
          id: "text",
          label: "Text Content",
          path: ["props", "text"],
          controlType: "text-input",
          mutation: { operation: "SET_PROP" },
          defaultValue: "Sample Text",
        },
      ],
    },
    {
      id: "style",
      title: "Text Design Tokens",
      fields: [
        {
          id: "color",
          label: "Text Color",
          path: ["design", "color"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.colors,
          defaultValue: "neutral",
        },
      ],
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Container Schema
const ContainerSchema: InspectorSchema = {
  componentType: "Container",
  groups: [
    {
      id: "style",
      title: "Design Tokens",
      fields: COMMON_BOX_STYLE_FIELDS,
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Flex Schema
const FlexSchema: InspectorSchema = {
  componentType: "Flex",
  groups: [
    {
      id: "content",
      title: "Flex Layout",
      fields: [
        {
          id: "direction",
          label: "Direction",
          path: ["props", "direction"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: DIRECTION_OPTIONS,
          defaultValue: "row",
        },
        {
          id: "justify",
          label: "Justify",
          path: ["props", "justify"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: JUSTIFY_OPTIONS,
          defaultValue: "start",
        },
        {
          id: "align",
          label: "Align",
          path: ["props", "align"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: ALIGN_OPTIONS,
          defaultValue: "start",
        },
        {
          id: "gap",
          label: "Gap",
          path: ["props", "gap"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: GAP_OPTIONS,
          defaultValue: "md",
        },
      ],
    },
    {
      id: "style",
      title: "Design Tokens",
      fields: COMMON_BOX_STYLE_FIELDS,
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Grid Schema
const GridSchema: InspectorSchema = {
  componentType: "Grid",
  groups: [
    {
      id: "content",
      title: "Grid Layout",
      fields: [
        {
          id: "columns",
          label: "Columns",
          path: ["props", "columns"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: COLUMNS_OPTIONS,
          defaultValue: "3",
        },
        {
          id: "gap",
          label: "Gap",
          path: ["props", "gap"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: GAP_OPTIONS,
          defaultValue: "md",
        },
      ],
    },
    {
      id: "style",
      title: "Design Tokens",
      fields: COMMON_BOX_STYLE_FIELDS,
    },
    COMMON_LAYOUT_GROUP,
  ],
};

// Image Schema
const ImageSchema: InspectorSchema = {
  componentType: "Image",
  groups: [
    {
      id: "content",
      title: "Image Props",
      fields: [
        {
          id: "src",
          label: "Image URL",
          path: ["props", "src"],
          controlType: "text-input",
          mutation: { operation: "SET_PROP" },
          defaultValue: "",
        },
        {
          id: "alt",
          label: "Alt Text",
          path: ["props", "alt"],
          controlType: "text-input",
          mutation: { operation: "SET_PROP" },
          defaultValue: "image",
        },
        {
          id: "fit",
          label: "Object Fit",
          path: ["props", "fit"],
          controlType: "segmented-control",
          mutation: { operation: "SET_PROP" },
          options: FIT_OPTIONS,
          defaultValue: "cover",
        },
      ],
    },
    {
      id: "style",
      title: "Design Tokens",
      fields: [
        {
          id: "radius",
          label: "Border Radius",
          path: ["design", "radius"],
          controlType: "token-select",
          mutation: { operation: "SET_DESIGN_TOKEN" },
          options: DESIGN_TOKENS.radius,
          defaultValue: "md",
        },
      ],
    },
  ],
};

// ============================================================
// Design Token → className 组合助手（render 与 exportCode 共用）
// 仅在 token 值显式存在时产出类名；否则返回空串，保留 className 兜底。
// ============================================================

function resolveDirection(value?: string): string {
  if (value === "col") return "flex-col";
  if (value === "row") return "flex-row";
  return "";
}

function resolveAlign(value?: string): string {
  const map: Record<string, string> = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };
  return value ? map[value] ?? "" : "";
}

function resolveJustify(value?: string): string {
  const map: Record<string, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };
  return value ? map[value] ?? "" : "";
}

function resolveGap(value?: string): string {
  const map: Record<string, string> = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };
  return value ? map[value] ?? "" : "";
}

function resolveColumns(value?: string): string {
  if (!value) return "";
  return `grid-cols-${value}`;
}

function resolveFit(value?: string): string {
  if (!value) return "";
  return `object-${value}`;
}

function buildBoxTokenClasses(node: CoreASTNode): string[] {
  const design = node.design ?? {};
  return [
    resolveColorClass(design.background, "bg"),
    resolveRadiusClass(design.radius),
    resolveSpacingClass(design.padding, "p"),
    resolveSpacingClass(design.margin, "m"),
  ];
}

function buildButtonTokenClasses(node: CoreASTNode): string[] {
  const design = node.design ?? {};
  const variant = node.props?.variant;
  const bgToken = design.background ?? "primary"; // variant 语义隐含背景色
  const classes: string[] = [];

  if (node.props?.size) classes.push(resolveSizeClass(node.props.size));

  if (variant === "outline") {
    classes.push("border", "bg-transparent");
    classes.push(resolveColorClass(design.borderColor ?? "neutral", "border"));
    classes.push(resolveColorClass(bgToken, "text"));
  } else if (variant === "ghost") {
    classes.push("bg-transparent", resolveColorClass(bgToken, "text"));
  } else if (variant === "solid") {
    classes.push("text-white", resolveColorClass(bgToken, "bg"));
  }

  classes.push(resolveRadiusClass(design.radius));
  classes.push(resolveSpacingClass(design.padding, "p"));
  classes.push(resolveSpacingClass(design.margin, "m"));

  return classes;
}

function buildTypographyTokenClasses(node: CoreASTNode): string[] {
  const design = node.design ?? {};
  return [
    resolveColorClass(design.color, "text"),
    resolveSpacingClass(design.padding, "p"),
    resolveSpacingClass(design.margin, "m"),
  ];
}

// ============================================================
export const COMPONENT_REGISTRY: Record<ComponentType, ComponentSpec> = {

  Container: {
    type: "Container",
    label: "容器区块",
    defaultProps: {
      className: "w-full p-4 bg-background",
    },
    inspectorSchema: ContainerSchema,
    render: ({ node, combinedClassName, children }) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        combinedClassName,
        ...buildBoxTokenClasses(node)
      );
      return (
        <div
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {children}
        </div>
      );
    },
    exportCode: (node, childrenCode) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        ...buildBoxTokenClasses(node)
      );
      return `<div className="${safeClass}">\n${childrenCode ?? ""}\n</div>`;
    },
  },

  // ----------------------------------------------------------
  Flex: {
    type: "Flex",
    label: "Flex 布局",
    defaultProps: {
      className: "flex items-center gap-4",
    },
    inspectorSchema: FlexSchema,
    render: ({ node, combinedClassName, children }) => {
      const p = node.props ?? {};
      const safeClass = sanitizeClassName(
        "flex",
        node.props?.className,
        combinedClassName,
        resolveDirection(p.direction),
        resolveJustify(p.justify),
        resolveAlign(p.align),
        resolveGap(p.gap),
        ...buildBoxTokenClasses(node)
      );
      return (
        <div
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {children}
        </div>
      );
    },
    exportCode: (node, childrenCode) => {
      const p = node.props ?? {};
      const safeClass = sanitizeClassName(
        "flex",
        node.props?.className,
        resolveDirection(p.direction),
        resolveJustify(p.justify),
        resolveAlign(p.align),
        resolveGap(p.gap),
        ...buildBoxTokenClasses(node)
      );
      return `<div className="${safeClass}">\n${childrenCode ?? ""}\n</div>`;
    },
  },

  // ----------------------------------------------------------
  Grid: {
    type: "Grid",
    label: "Grid 网格",
    defaultProps: {
      className: "grid grid-cols-3 gap-4",
    },
    inspectorSchema: GridSchema,
    render: ({ node, combinedClassName, children }) => {
      const p = node.props ?? {};
      const safeClass = sanitizeClassName(
        "grid",
        node.props?.className,
        combinedClassName,
        resolveColumns(p.columns),
        resolveGap(p.gap),
        ...buildBoxTokenClasses(node)
      );
      return (
        <div
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {children}
        </div>
      );
    },
    exportCode: (node, childrenCode) => {
      const p = node.props ?? {};
      const safeClass = sanitizeClassName(
        "grid",
        node.props?.className,
        resolveColumns(p.columns),
        resolveGap(p.gap),
        ...buildBoxTokenClasses(node)
      );
      return `<div className="${safeClass}">\n${childrenCode ?? ""}\n</div>`;
    },
  },

  // ----------------------------------------------------------
  Heading: {
    type: "Heading",
    label: "标题",
    defaultProps: {
      className: "text-2xl font-bold text-slate-900",
      text: "标题文本",
    },
    inspectorSchema: HeadingSchema,
    render: ({ node, combinedClassName }) => {
      const level = (node.props?.level ?? "h2") as "h1" | "h2" | "h3";
      const safeClass = sanitizeClassName(
        "font-bold",
        node.props?.className,
        combinedClassName,
        ...buildTypographyTokenClasses(node)
      );
      const Tag = level;
      return (
        <Tag
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {node.props?.text ?? ""}
        </Tag>
      );
    },
    exportCode: (node) => {
      const level = node.props?.level ?? "h2";
      const safeClass = sanitizeClassName(
        "font-bold",
        node.props?.className,
        ...buildTypographyTokenClasses(node)
      );
      return `<${level} className="${safeClass}">${node.props?.text ?? ""}</${level}>`;
    },
  },

  // ----------------------------------------------------------
  Text: {
    type: "Text",
    label: "段落文本",
    defaultProps: {
      className: "text-base text-slate-600",
      text: "这是一段描述文本。",
    },
    inspectorSchema: TextSchema,
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        combinedClassName,
        ...buildTypographyTokenClasses(node)
      );
      return (
        <p
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {node.props?.text ?? ""}
        </p>
      );
    },
    exportCode: (node) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        ...buildTypographyTokenClasses(node)
      );
      return `<p className="${safeClass}">${node.props?.text ?? ""}</p>`;
    },
  },

  // ----------------------------------------------------------
  Button: {
    type: "Button",
    label: "按钮",
    defaultProps: {
      className:
        "px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition",
      text: "点击按键",
    },
    inspectorSchema: ButtonSchema,
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(
        "inline-flex items-center justify-center",
        node.props?.className,
        combinedClassName,
        ...buildButtonTokenClasses(node)
      );
      return (
        <button
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {node.props?.text ?? ""}
        </button>
      );
    },
    exportCode: (node) => {
      const safeClass = sanitizeClassName(
        "inline-flex items-center justify-center",
        node.props?.className,
        ...buildButtonTokenClasses(node)
      );
      return `<button className="${safeClass}">${node.props?.text ?? ""}</button>`;
    },
  },

  // ----------------------------------------------------------
  Image: {
    type: "Image",
    label: "图片",
    defaultProps: {
      className: "w-full h-auto rounded-lg object-cover",
      src: "https://via.placeholder.com/600x400",
    },
    inspectorSchema: ImageSchema,
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        combinedClassName,
        resolveFit(node.props?.fit),
        resolveRadiusClass(node.design?.radius)
      );
      return (
        <img
          data-node-id={node.id}
          data-node-type={node.type}
          src={node.props?.src || "https://via.placeholder.com/600x400"}
          alt={node.props?.alt || node.props?.text || "image"}
          className={safeClass}
        />
      );
    },
    exportCode: (node) => {
      const safeClass = sanitizeClassName(
        node.props?.className,
        resolveFit(node.props?.fit),
        resolveRadiusClass(node.design?.radius)
      );
      const src = node.props?.src || "";
      const alt = node.props?.alt || node.props?.text || "";
      return `<img src="${src}" alt="${alt}" className="${safeClass}" />`;
    },
  },
};

// ============================================================
// 工具函数：根据节点类型查找 Registry
// ============================================================
export function getComponentSpec(type: string): ComponentSpec | undefined {
  return COMPONENT_REGISTRY[type as ComponentType];
}

export function getDefaultProps(type: string): Record<string, any> {
  return COMPONENT_REGISTRY[type as ComponentType]?.defaultProps ?? {};
}
