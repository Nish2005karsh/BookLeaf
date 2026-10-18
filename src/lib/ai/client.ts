import { prisma } from "../prisma";
import { AiCallKind } from "@prisma/client";
import { getAiProvider } from "./provider";
import { canMakeAiCall, consumeAiCallSlot, recordAiSuccess, recordAiFailure } from "./budget";
import { geminiClassify, geminiDraft } from "./gemini";
import { mockClassify, mockDraft, ClassificationResult, DraftResult } from "./mock";
import { ClassifyInputSignals } from "./prompts/classifyPrompt";
import { DraftPromptInput } from "./prompts/draftPrompt";

const MODEL_NAME = process.env.AI_MODEL || "gemini-2.5-flash";

async function logAiCall(params: {
  ticketId?: string;
  kind: AiCallKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}) {
  try {
    await prisma.aiCallLog.create({
      data: {
        ticketId: params.ticketId,
        kind: params.kind,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        latencyMs: params.latencyMs,
        success: params.success,
        errorCode: params.errorCode,
      },
    });
  } catch (err) {
    console.error("[AiClient] Failed to persist AiCallLog:", err);
  }
}

/** Sleep helper with jitter */
function wait(ms: number) {
  const jitter = Math.floor(Math.random() * 200);
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Classify a ticket with fallback and audit logging.
 */
export async function classifyTicketAI(
  signals: ClassifyInputSignals,
  ticketId?: string
): Promise<ClassificationResult> {
  const provider = getAiProvider();

  if (provider === "mock") {
    return mockClassify(signals);
  }

  // Budget & Circuit breaker check
  const budget = canMakeAiCall();
  if (!budget.allowed) {
    console.warn(`[AiClient] Skipping Gemini classification: ${budget.reason}`);
    const fallback = await mockClassify(signals);
    fallback.reason = `[Rule-based (${budget.reason})] ${fallback.reason}`;
    return fallback;
  }

  consumeAiCallSlot();
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3; // initial + 2 retries

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const result = await geminiClassify(signals);
      const latencyMs = Date.now() - startTime;
      recordAiSuccess();

      await logAiCall({
        ticketId,
        kind: AiCallKind.CLASSIFY,
        model: MODEL_NAME,
        inputTokens: result.promptTokens,
        outputTokens: result.completionTokens,
        latencyMs,
        success: true,
      });

      return result;
    } catch (err: any) {
      const status = err?.status || err?.statusCode || 500;
      const isRetryable = status === 429 || status >= 500 || err.message?.includes("Timeout");

      if (isRetryable && attempts < maxAttempts) {
        const backoffMs = Math.pow(2, attempts) * 1000;
        await wait(backoffMs);
        continue;
      }

      // Max attempts reached or non-retryable error
      const latencyMs = Date.now() - startTime;
      const retryAfterSec = err?.retryAfter ? parseInt(err.retryAfter, 10) : undefined;
      recordAiFailure(status, retryAfterSec);

      await logAiCall({
        ticketId,
        kind: AiCallKind.CLASSIFY,
        model: MODEL_NAME,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        success: false,
        errorCode: err?.message?.slice(0, 200) || "UNKNOWN_ERROR",
      });

      // Degrade gracefully to rule-based fallback
      const fallback = await mockClassify(signals);
      fallback.reason = `[Rule-based fallback] ${fallback.reason}`;
      return fallback;
    }
  }

  // Final fallback
  return mockClassify(signals);
}

/**
 * Generate a draft response with fallback and audit logging.
 */
export async function draftTicketAI(
  input: DraftPromptInput,
  ticketId?: string
): Promise<DraftResult> {
  const provider = getAiProvider();

  if (provider === "mock") {
    return mockDraft(input);
  }

  // Budget & Circuit breaker check
  const budget = canMakeAiCall();
  if (!budget.allowed) {
    console.warn(`[AiClient] Skipping Gemini draft: ${budget.reason}`);
    return mockDraft(input);
  }

  consumeAiCallSlot();
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const result = await geminiDraft(input);
      const latencyMs = Date.now() - startTime;
      recordAiSuccess();

      await logAiCall({
        ticketId,
        kind: AiCallKind.DRAFT,
        model: MODEL_NAME,
        inputTokens: result.promptTokens || 0,
        outputTokens: result.completionTokens || 0,
        latencyMs,
        success: true,
      });

      return result;
    } catch (err: any) {
      const status = err?.status || err?.statusCode || 500;
      const isRetryable = status === 429 || status >= 500 || err.message?.includes("Timeout");

      if (isRetryable && attempts < maxAttempts) {
        const backoffMs = Math.pow(2, attempts) * 1000;
        await wait(backoffMs);
        continue;
      }

      const latencyMs = Date.now() - startTime;
      const retryAfterSec = err?.retryAfter ? parseInt(err.retryAfter, 10) : undefined;
      recordAiFailure(status, retryAfterSec);

      await logAiCall({
        ticketId,
        kind: AiCallKind.DRAFT,
        model: MODEL_NAME,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        success: false,
        errorCode: err?.message?.slice(0, 200) || "UNKNOWN_ERROR",
      });

      // Degrade gracefully to deterministic template draft
      return mockDraft(input);
    }
  }

  return mockDraft(input);
}
