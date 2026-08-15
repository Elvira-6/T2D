"use client";

import { useCallback, useState } from "react";
import type { AgentEvent, AgentStage, AgentState, AgentTrace } from "./types";
import { Play, Loader2, Terminal } from "lucide-react";

// ============================================================
// Phase 2 — Agent Runtime 演示面板
//   通过 /api/agent/plan 在服务端跑 Agent 状态机，双视图展示：
//     - Tool Trace（每次工具执行：tool / duration / status）
//     - Agent Timeline（生命周期事件：STATE_CHANGE / ERROR）
// ============================================================

const STAGE_COLOR: Record<AgentStage, string> = {
  IDLE: "text-slate-400 bg-slate-800",
  PLANNING: "text-violet-300 bg-violet-500/15",
  RETRIEVING: "text-cyan-300 bg-cyan-500/15",
  GENERATING: "text-blue-300 bg-blue-500/15",
  VALIDATING: "text-amber-300 bg-amber-500/15",
  REPAIRING: "text-orange-300 bg-orange-500/15",
  WAITING_HUMAN: "text-slate-300 bg-slate-700",
  COMPLETED: "text-emerald-300 bg-emerald-500/15",
  FAILED: "text-red-300 bg-red-500/15",
};

const EVENT_COLOR: Record<AgentEvent["type"], string> = {
  STATE_CHANGE: "text-blue-400",
  TOOL_CALL: "text-violet-400",
  TOOL_RESULT: "text-emerald-400",
  ERROR: "text-red-400",
  REPAIR: "text-orange-400",
};

/** 从事件 payload 中提取简短说明 */
function eventDetail(ev: AgentEvent): string | null {
  const p = ev.payload;
  if (!p || typeof p !== "object") return null;
  if (typeof p.from === "string" && typeof p.to === "string") {
    return `${p.from} → ${p.to}`;
  }
  if (typeof p.reason === "string") return String(p.reason);
  if (typeof p.error === "string") return String(p.error);
  return null;
}

function EventRow({ ev }: { ev: AgentEvent }) {
  const detail = eventDetail(ev);
  return (
    <div className="flex items-start space-x-1.5 text-[10px] font-mono leading-4">
      <span className={`${EVENT_COLOR[ev.type]} mt-0.5 leading-4`}>●</span>
      <span className={`${EVENT_COLOR[ev.type]} whitespace-nowrap`}>
        {ev.type}
      </span>
      {detail && <span className="text-slate-500">→ {detail}</span>}
    </div>
  );
}

/** 单条 Tool Trace：tool · attempt · duration · status */
function TraceRow({ trace }: { trace: AgentTrace }) {
  const ok = trace.status === "success";
  return (
    <div className="flex items-start space-x-1.5 text-[10px] font-mono leading-4">
      <span
        className={`${ok ? "text-emerald-400" : "text-red-400"} mt-0.5 leading-4`}
      >
        ●
      </span>
      <span className={ok ? "text-emerald-300" : "text-red-300"}>
        {trace.tool}
      </span>
      {trace.attempt !== undefined && (
        <span className="text-slate-500">#{trace.attempt}</span>
      )}
      <span className="text-slate-500">{trace.durationMs}ms</span>
      <span className={ok ? "text-emerald-600" : "text-red-500"}>
        {trace.status}
      </span>
    </div>
  );
}

/** 检索到的设计上下文摘要 */
function ContextSummary({ data }: { data: Record<string, unknown> }) {
  const components = Array.isArray(data.components)
    ? (data.components as Array<{ type?: unknown }>).map((c) =>
        String(c?.type ?? "")
      )
    : [];
  const tokens = (data.tokens ?? {}) as Record<string, unknown>;
  const tokenKeys = Object.keys(tokens)
    .filter((k) => Array.isArray(tokens[k]))
    .map((k) => `${k}=${(tokens[k] as unknown[]).length}`);

  return (
    <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1">
      <div className="text-[10px] text-cyan-300 font-mono">
        context: {components.length} components
      </div>
      <div className="text-[10px] text-slate-500 font-mono break-all">
        {components.join(" · ")}
      </div>
      <div className="text-[10px] text-slate-500 font-mono">
        tokens: {tokenKeys.join(", ")}
      </div>
    </div>
  );
}

export function AgentRuntimePanel() {
  const [result, setResult] = useState<AgentState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "生成一个现代 SaaS Landing Page：hero 区 + 产品介绍 + 特性卡片 + CTA + footer，专业现代风格",
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Agent failed");
      } else {
        console.log("planner result", json.result);
        setResult(json.result as AgentState);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="space-y-3 pt-3 border-t border-slate-800">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
        <Terminal className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
        Agent Runtime · Phase 2
      </h4>

      <button
        onClick={run}
        disabled={running}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-2"
      >
        {running ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Agent 运行中...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>运行 Agent（Plan → Retrieve）</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-[11px] text-red-400 break-all">{error}</div>
      )}

      {result && (
        <div className="space-y-2">
          {/* 汇总行 */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${STAGE_COLOR[result.stage]}`}
            >
              {result.stage}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              steps={result.stepCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              tools={result.toolCallCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              attempts={result.plannerAttempts}/{result.maxPlannerAttempts}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              errors={result.errors.length}
            </span>
          </div>

          {/* 错误信息（若 planner 失败） */}
          {result.errors.length > 0 && (
            <div className="text-[10px] text-red-400 break-all">
              {result.errors[result.errors.length - 1]}
            </div>
          )}

          {/* Planner 输出摘要 */}
          {result.plan && (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1">
              <div className="text-[10px] text-violet-300 font-mono">
                plan: {result.plan.pageType}
              </div>
              <div className="text-[10px] text-slate-400 font-mono break-all">
                intent: {result.plan.intent}
              </div>
              <div className="text-[10px] text-slate-500 font-mono break-all">
                sections:{" "}
                {result.plan.sections
                  .map((s) => `${s.type}[${s.layout}]`)
                  .join(" · ")}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                design: {result.plan.design.theme} /{" "}
                {result.plan.design.spacing} / {result.plan.design.radius} /{" "}
                {result.plan.design.primaryColor}
              </div>
            </div>
          )}

          {/* 检索到的设计上下文摘要 */}
          {result.contextData && <ContextSummary data={result.contextData} />}

          {/* Tool Trace：每次工具执行 */}
          {result.traces.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Tool Trace
              </div>
              <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1">
                {result.traces.map((t) => (
                  <TraceRow key={t.id} trace={t} />
                ))}
              </div>
            </div>
          )}

          {/* Agent Timeline：生命周期事件 */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Agent Timeline
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {result.history.map((ev) => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
