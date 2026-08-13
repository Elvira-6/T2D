"use client";

import React from "react";
import { CoreASTNode } from "@/types/ast";
import { getInspectorSchema } from "@/inspector/schemaEngine";
import { SchemaField } from "@/inspector/schemaTypes";
import { getDeepValue } from "@/inspector/inspectorUtils";

// ============================================================
// Phase 3.1.2 — Inspector 面板（消费 Schema Engine 的最小渲染器）
// 依据 getInspectorSchema 动态渲染表单控件，字段变更回调派发 Mutation。
// ============================================================

interface InspectorPanelProps {
  selectedNode: CoreASTNode | null;
  onFieldChange: (field: SchemaField, value: unknown) => void;
}

const inputBase =
  "w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition";

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.controlType) {
    case "text-input":
      return (
        <input
          type="text"
          className={inputBase}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number-input":
      return (
        <input
          type="number"
          className={inputBase}
          value={(value as number) ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );

    case "boolean-switch":
      return (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-blue-500"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-xs text-slate-400">{Boolean(value) ? "On" : "Off"}</span>
        </label>
      );

    case "token-select":
      return (
        <select
          className={inputBase}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "segmented-control":
      return (
        <div className="flex bg-slate-950 border border-slate-800 rounded-md p-0.5 space-x-0.5">
          {field.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 text-[11px] px-1.5 py-1 rounded transition ${
                value === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  onFieldChange,
}) => {
  console.log("InspectorPanel",selectedNode)
  const schema = getInspectorSchema(selectedNode);
  console.log(
    "getInspectorSchema",schema
  )

  if (!selectedNode || !schema) {
    return (
      <div className="text-xs text-slate-500 italic leading-relaxed">
        选中画布中的任意节点以编辑属性。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.groups.map((group) => (
        <div
          key={group.id}
          className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-3"
        >
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {group.title}
          </h4>
          {group.fields.map((field) => {
            const value = getDeepValue(selectedNode, field.path) ?? field.defaultValue;
            return (
              <div key={field.id} className="space-y-1">
                <label className="text-[11px] text-slate-500 block">
                  {field.label}
                </label>
                <FieldControl
                  field={field}
                  value={value}
                  onChange={(v) => onFieldChange(field, v)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
