import { NextRequest } from "next/server";
import { CoreASTNode } from "@/types/ast";

// ============================================================
// Phase 2.2 — SSE 流式生成 API 路由（脏数据测试版）
// ============================================================
// 注入极具代表性的 LLM 冲突与非法类名脏数据，
// 用于验证 sanitizeClassName 样式防御管道的可靠性。

// 模拟 LLM 输出，包含冲突类名、幻觉类名、换行符等脏数据
const DIRTY_STREAM_STEPS: Partial<CoreASTNode>[] = [
  {
    id: "root_container",
    type: "Container",
    schemaVersion: 1,
    // 注入脏数据：冲突类名 p-4 p-12，无效类名 undefined bg-undefined，多余换行符
    props: {
      className:
        "min-h-screen bg-slate-900 text-white p-4 p-12 undefined bg-undefined \n\n flex flex-col space-y-12",
    },
    children: [],
  },
  {
    id: "hero_section",
    type: "Flex",
    props: {
      className:
        "flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 pt-12 null [object Object]",
    },
    children: [
      {
        id: "hero_title",
        type: "Heading",
        props: {
          // 注入冲突：text-red-500 与 text-transparent 冲突，防御管道将保留最后一个有效值
          className:
            "text-4xl font-extrabold text-red-500 text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text",
          text: "🛡️ 已开启 Tailwind 样式防御管道",
        },
      },
    ],
  },
  {
    id: "hero_subtitle",
    type: "Text",
    props: {
      className: "text-base text-slate-400 max-w-md text-undefined",
      text: "LLM 输出的 p-4 与 p-12 冲突、undefined 类名均已被自动清洗与解离，页面完美稳定！",
    },
  },
];

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 深度拷贝根节点作为当前累积树
      let currentTree: CoreASTNode = JSON.parse(
        JSON.stringify(DIRTY_STREAM_STEPS[0])
      );

      // 推送初始根节点
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "CHUNK", ast: currentTree })}\n\n`
        )
      );

      // 模拟 Agent 增量拼接 AST 节点
      for (let i = 1; i < DIRTY_STREAM_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟 LLM 生成耗时

        const stepNode = DIRTY_STREAM_STEPS[i];

        if (stepNode.id === "hero_section") {
          currentTree.children = [stepNode as CoreASTNode];
        } else if (stepNode.id === "hero_subtitle") {
          currentTree.children![0].children!.push(stepNode as CoreASTNode);
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "CHUNK", ast: currentTree })}\n\n`
          )
        );
      }

      // 发送完成标志
      await new Promise((resolve) => setTimeout(resolve, 300));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "DONE" })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
