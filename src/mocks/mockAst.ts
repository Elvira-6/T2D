import { CoreASTNode } from "@/types/ast";

/**
 * Mock AST — Landing Page Hero 区域
 * 模拟 LLM 输出，供渲染沙盒测试使用
 */
export const mockHeroAST: CoreASTNode = {
  id: "root_container",
  type: "Container",
  schemaVersion: 1,
  props: {
    className: "min-h-[200vh] bg-slate-900 text-white p-8 flex flex-col space-y-16",
  },
  children: [
    // 1. Hero 顶部首屏区块
    {
      id: "hero_section",
      type: "Flex",
      props: {
        className: "flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 pt-12",
      },
      children: [
        {
          id: "hero_title",
          type: "Heading",
          props: {
            className: "text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent sm:text-6xl",
            text: "AI 驱动的 Next.js 设计生成器",
          },
        },
        {
          id: "hero_subtitle",
          type: "Text",
          props: {
            className: "text-lg text-slate-400",
            text: "输入 Prompt，自动规划布局、生成响应式 Component AST 并实时导出生产级干净代码。",
          },
          design: {
            color: "neutral",
          },
        },
        {
          id: "hero_btn_group",
          type: "Flex",
          props: {
            className: "flex items-center gap-4 pt-4",
          },
          children: [
            {
              id: "btn_primary",
              type: "Button",
              props: {
                className: "px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition",
                text: "免费开始使用",
              },
              design: {
                background: "primary",
                radius: "lg",
              },
            },
            {
              id: "btn_secondary",
              type: "Button",
              props: {
                className: "px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition",
                text: "查看 Demo 演示",
              },
            },
          ],
        },
      ],
    },

    // 2. Feature 网格区块（拉长页面高度）
    {
      id: "feature_section",
      type: "Container",
      props: {
        className: "max-w-5xl mx-auto w-full pt-12",
      },
      children: [
        {
          id: "feature_title",
          type: "Heading",
          props: {
            className: "text-2xl font-bold text-center mb-8 text-slate-200",
            text: "核心功能亮点",
          },
        },
        {
          id: "feature_grid",
          type: "Grid",
          props: {
            className: "grid grid-cols-1 md:grid-cols-3 gap-6",
          },
          children: [
            {
              id: "card_1",
              type: "Container",
              props: {
                className: "p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-3",
              },
              children: [
                {
                  id: "card_1_title",
                  type: "Heading",
                  props: { className: "text-lg font-bold text-blue-400", text: "零白屏容错" },
                },
                {
                  id: "card_1_desc",
                  type: "Text",
                  props: { className: "text-sm text-slate-400", text: "内置 tailwind-merge 与语法清洗管道，自动修剪 LLM 幻觉类名。" },
                },
              ],
            },
            {
              id: "card_2",
              type: "Container",
              props: {
                className: "p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-3",
              },
              children: [
                {
                  id: "card_2_title",
                  type: "Heading",
                  props: { className: "text-lg font-bold text-indigo-400", text: "LangGraph 自愈" },
                },
                {
                  id: "card_2_desc",
                  type: "Text",
                  props: { className: "text-sm text-slate-400", text: "多 Agent 协同质检，检测到 Schema 异常时自动退回 Generator 重试。" },
                },
              ],
            },
            {
              id: "card_3",
              type: "Container",
              props: {
                className: "p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-3",
              },
              children: [
                {
                  id: "card_3_title",
                  type: "Heading",
                  props: { className: "text-lg font-bold text-sky-400", text: "双向可视化" },
                },
                {
                  id: "card_3_desc",
                  type: "Text",
                  props: { className: "text-sm text-slate-400", text: "实时画板与跨 iframe 坐标同步，支持右侧 Inspector 属性二次微调。" },
                },
              ],
            },
          ],
        },
      ],
    },

    // 3. 底部 Footer 沉底区块（位于页面下方 1200px+ 处）
    {
      id: "footer_section",
      type: "Flex",
      props: {
        className: "flex justify-between items-center max-w-5xl mx-auto w-full pt-24 border-t border-slate-800 text-slate-500 text-xs",
      },
      children: [
        {
          id: "footer_text",
          type: "Text",
          props: { className: "text-slate-500", text: "© 2026 T2D2C Engine. All rights reserved." },
        },
        {
          id: "footer_btn",
          type: "Button",
          props: {
            className: "px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition",
            text: "回到顶部",
          },
        },
      ],
    },
  ],
};

/**
 * 简单卡片 Mock（用于初始调试）
 */
export const mockSimpleCard: CoreASTNode = {
  id: "card_root",
  type: "Container",
  schemaVersion: 1,
  props: {
    className: "max-w-sm mx-auto mt-12 p-6 bg-white rounded-2xl shadow-lg space-y-4",
  },
  children: [
    {
      id: "card_title",
      type: "Heading",
      props: {
        className: "text-xl font-bold text-slate-900",
        text: "开源 T2D2C 生成器",
      },
    },
    {
      id: "card_desc",
      type: "Text",
      props: {
        className: "text-slate-500 text-sm",
        text: "将自然语言描述一键转化为可用于生产的 React + Tailwind 代码。",
      },
    },
    {
      id: "card_btn",
      type: "Button",
      props: {
        className:
          "w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition",
        text: "立即体验",
      },
    },
  ],
};
