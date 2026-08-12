import React from "react";
import { CoreASTNode, ComponentType } from "@/types/ast";

// ============================================================
// Component Registry — 单点注册模式 (Single Source of Truth)
// ============================================================

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
    onClick?: (e: React.MouseEvent, nodeId: string) => void;
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
    render: ({ combinedClassName, onClick, node, children }) => (
      <div
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {children}
      </div>
    ),
    exportCode: (node, childrenCode) =>
      `<div className="${node.props.className ?? ""}">\n${childrenCode ?? ""}\n</div>`,
  },

  // ----------------------------------------------------------
  Flex: {
    type: "Flex",
    label: "Flex 布局",
    defaultProps: {
      className: "flex items-center gap-4",
    },
    render: ({ combinedClassName, onClick, node, children }) => (
      <div
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {children}
      </div>
    ),
    exportCode: (node, childrenCode) =>
      `<div className="${node.props.className ?? "flex"}">\n${childrenCode ?? ""}\n</div>`,
  },

  // ----------------------------------------------------------
  Grid: {
    type: "Grid",
    label: "Grid 网格",
    defaultProps: {
      className: "grid grid-cols-3 gap-4",
    },
    render: ({ combinedClassName, onClick, node, children }) => (
      <div
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {children}
      </div>
    ),
    exportCode: (node, childrenCode) =>
      `<div className="${node.props.className ?? "grid"}">\n${childrenCode ?? ""}\n</div>`,
  },

  // ----------------------------------------------------------
  Heading: {
    type: "Heading",
    label: "标题",
    defaultProps: {
      className: "text-2xl font-bold text-slate-900",
      text: "标题文本",
    },
    render: ({ combinedClassName, onClick, node }) => (
      <h2
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {node.props.text}
      </h2>
    ),
    exportCode: (node) =>
      `<h2 className="${node.props.className ?? ""}">${node.props.text ?? ""}</h2>`,
  },

  // ----------------------------------------------------------
  Text: {
    type: "Text",
    label: "段落文本",
    defaultProps: {
      className: "text-base text-slate-600",
      text: "这是一段描述文本。",
    },
    render: ({ combinedClassName, onClick, node }) => (
      <p
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {node.props.text}
      </p>
    ),
    exportCode: (node) =>
      `<p className="${node.props.className ?? ""}">${node.props.text ?? ""}</p>`,
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
    render: ({ combinedClassName, onClick, node }) => (
      <button
        onClick={(e) => onClick?.(e, node.id)}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        {node.props.text}
      </button>
    ),
    exportCode: (node) =>
      `<button className="${node.props.className ?? ""}">${node.props.text ?? ""}</button>`,
  },

  // ----------------------------------------------------------
  Image: {
    type: "Image",
    label: "图片",
    defaultProps: {
      className: "w-full h-auto rounded-lg object-cover",
      src: "https://via.placeholder.com/600x400",
    },
    render: ({ combinedClassName, onClick, node }) => (
      <img
        onClick={(e) => onClick?.(e, node.id)}
        src={node.props.src}
        alt={node.props.text ?? "image"}
        className={combinedClassName ?? node.props.className}
        data-node-id={node.id}
        data-node-type={node.type}
      />
    ),
    exportCode: (node) =>
      `<img src="${node.props.src ?? ""}" alt="${node.props.text ?? ""}" className="${node.props.className ?? ""}" />`,
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
