"use client";

import { useCallback, useState } from "react";
import { runAgent } from "./runtime";
import { createInitialState } from "./state";
import { AgentEvent, AgentState, AgentStage } from "./types";
import { Play, Loader2, Terminal } from "lucide-react";

// ============================================================
// Phase 0 — Agent Runtime 演示面板
//   一键跑通状态机，并可视化事件时间线（Event Trace）。
// ============================================================

const STAGE_COLOR: Record<AgentStage, string> = {
  IDLE: "text-slate-400 bg-slate-800",
  PLANNING: "text-violet-300 bg-violet-500/15",
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

/** 从事件 output 中提取简短说明（stage / reason） */
function eventDetail(ev: AgentEvent): string | null {
  if (!ev.output || typeof ev.output !== "object") return null;
  const o = ev.output as Record<string, unknown>;
  if (typeof o.stage === "string") return o.stage;
  if (typeof o.reason === "string") return o.reason;
  return null;
}

function EventRow({ ev }: { ev: AgentEvent }) {
  const detail = eventDetail(ev);
  return (
    <div className="flex items-start space-x-1.5 text-[10px] font-mono leading-4">
      <span className={`${EVENT_COLOR[ev.type]} mt-0.5 leading-4`}>●</span>
      <span className={`${EVENT_COLOR[ev.type]} whitespace-nowrap`}>{ev.type}</span>
      {ev.action && <span className="text-slate-300">{ev.action}</span>}
      {detail && <span className="text-slate-500">→ {detail}</span>}
      {ev.duration !== undefined && (
        <span className="text-slate-600">{ev.duration}ms</span>
      )}
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
      const r = await runAgent(createInitialState("生成一个 SaaS Landing Page"));
      setResult(r);
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
        Agent Runtime · Phase 0
      </h4>

      <button
        onClick={run}
        disabled={running}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-2"
      >
        {running ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>状态机运行中...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>运行 Agent 状态机</span>
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
              errors={result.errors.length}
            </span>
          </div>

          {/* Planner 输出摘要 */}
          {result.plan && (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1">
              <div className="text-[10px] text-violet-300 font-mono">
                plan: {result.plan.pageType}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                sections: {result.plan.sections.map((s) => s.component).join(", ")}
              </div>
            </div>
          )}

          {/* Generator 输出摘要 */}
          {result.ast && (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded space-y-1">
              <div className="text-[10px] text-blue-300 font-mono">
                ast: {result.ast.type} · {result.ast.id}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                children: {result.ast.children?.length ?? 0}
              </div>
            </div>
          )}

          {/* 事件时间线 */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {result.history.map((ev) => (
              <EventRow key={ev.id} ev={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
