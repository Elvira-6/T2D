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
    className:
      "min-h-screen bg-slate-900 text-white p-8 flex flex-col justify-center items-center",
  },
  children: [
    {
      id: "hero_flex_box",
      type: "Flex",
      props: {
        className:
          "flex flex-col items-center text-center max-w-2xl space-y-6",
      },
      children: [
        {
          id: "hero_title",
          type: "Heading",
          props: {
            className:
              "text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent sm:text-6xl",
            text: "AI 驱动的 Next.js 设计生成器",
          },
        },
        {
          id: "hero_subtitle",
          type: "Text",
          props: {
            className: "text-lg text-slate-400",
            text: "输入一句 Prompt，自动规划布局、生成响应式 Component AST 并实时导出生产级干净代码。",
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
                className:
                  "px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition",
                text: "免费开始使用",
              },
            },
            {
              id: "btn_secondary",
              type: "Button",
              props: {
                className:
                  "px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition",
                text: "查看 Demo 演示",
              },
            },
          ],
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
