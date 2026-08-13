import React from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";
import { sanitizeClassName } from "@/lib/sanitizer";

// ============================================================
// Component Registry — 单点注册模式 (Single Source of Truth)
// ============================================================
// 所有 render 与 exportCode 均接入 sanitizeClassName 防御管道，
// 确保无论 LLM 输出多么混乱的 className，渲染结果都经过类型防护。

/**
 * 组件规范接口：
 * 将 LLM Prompt 描述、Zod 校验规则、沙盒渲染函数、
 * 代码导出模板集中收拢在一个配置对象中。
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
}

// ============================================================
export const COMPONENT_REGISTRY: Record<ComponentType, ComponentSpec> = {

  Container: {
    type: "Container",
    label: "容器区块",
    defaultProps: {
      className: "w-full p-4 bg-background",
    },
    render: ({ node, combinedClassName, children }) => {
      const safeClass = sanitizeClassName(node.props?.className, combinedClassName);
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
      const safeClass = sanitizeClassName(node.props?.className);
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
    render: ({ node, combinedClassName, children }) => {
      const safeClass = sanitizeClassName("flex", node.props?.className, combinedClassName);
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
      const safeClass = sanitizeClassName("flex", node.props?.className);
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
    render: ({ node, combinedClassName, children }) => {
      const safeClass = sanitizeClassName("grid", node.props?.className, combinedClassName);
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
      const safeClass = sanitizeClassName("grid", node.props?.className);
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
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName("font-bold", node.props?.className, combinedClassName);
      return (
        <h2
          data-node-id={node.id}
          data-node-type={node.type}
          className={safeClass}
        >
          {node.props?.text ?? ""}
        </h2>
      );
    },
    exportCode: (node) => {
      const safeClass = sanitizeClassName("font-bold", node.props?.className);
      return `<h2 className="${safeClass}">${node.props?.text ?? ""}</h2>`;
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
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(node.props?.className, combinedClassName);
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
      const safeClass = sanitizeClassName(node.props?.className);
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
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(
        "inline-flex items-center justify-center",
        node.props?.className,
        combinedClassName
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
        node.props?.className
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
    render: ({ node, combinedClassName }) => {
      const safeClass = sanitizeClassName(node.props?.className, combinedClassName);
      return (
        <img
          data-node-id={node.id}
          data-node-type={node.type}
          src={node.props?.src || "https://via.placeholder.com/600x400"}
          alt={node.props?.text || "image"}
          className={safeClass}
        />
      );
    },
    exportCode: (node) => {
      const safeClass = sanitizeClassName(node.props?.className);
      return `<img src="${node.props?.src || ""}" alt="${node.props?.text || ""}" className="${safeClass}" />`;
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
