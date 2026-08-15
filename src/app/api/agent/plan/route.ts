import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/agent/runtime";
import { createInitialState } from "@/agent/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// POST /api/agent/plan
//   服务端跑 Agent 状态机（PLAN → DeepSeek → UIPlan → Event Trace），
//   返回最终 AgentState。
// ============================================================

export async function POST(req: NextRequest) {
  let prompt = "";
  try {
    const body = await req.json();
    if (body && typeof body.prompt === "string") {
      prompt = body.prompt;
    }
  } catch {
    // ignore malformed body
  }

  if (!prompt.trim()) {
    return NextResponse.json(
      { ok: false, error: "prompt is required" },
      { status: 400 }
    );
  }

  try {
    const result = await runAgent(createInitialState(prompt));
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
