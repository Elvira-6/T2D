import { NextRequest, NextResponse } from "next/server";
import { runAgentService } from "@/agent/api/runAgentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// POST /api/agent/run
//   UI → 本 Route（输入校验）→ runAgentService → runAgent → AgentRunResponse。
//   Route 只负责 HTTP：校验 prompt + 统一错误处理，不直接操作 Runtime。
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    const result = await runAgentService({
      prompt: body.prompt.trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Agent execution failed",
      },
      { status: 500 }
    );
  }
}
