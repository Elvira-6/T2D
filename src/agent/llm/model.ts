import { createDeepSeek } from "@ai-sdk/deepseek";
import { LanguageModel } from "ai";

/**
 * ============================================================
 * Phase 1 — LLM Provider
 * ============================================================
 *
 * Agent Runtime 不直接依赖 DeepSeek。
 *
 * 只有这里知道：
 * - DeepSeek
 * - API Key
 * - Model
 *
 * 未来换模型只需要修改这里。
 *
 * 注意：与文档「顶层 throw」不同，这里采用惰性初始化：
 *   Next.js build / SSR 阶段会 import 本文件，若在顶层 throw，
 *   缺少 DEEPSEEK_API_KEY 会导致 build 失败。
 *   改为首次调用 getModel() 时才检查并抛错；
 *   错误会被 executor 捕获 → 转为 failed trace（由 Planner 或 Decision Engine 触发）。
 */

let cached: LanguageModel | null = null;

export function getModel(): LanguageModel {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is not configured. 请在 .env.local 中配置 DEEPSEEK_API_KEY。"
    );
  }

  if (!cached) {
    cached = createDeepSeek({ apiKey })("deepseek-v4-pro");
  }

  return cached;
}
