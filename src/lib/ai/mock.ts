import { Category, Priority } from "@prisma/client";
import { ClassifyInputSignals } from "./prompts/classifyPrompt";
import { DraftPromptInput } from "./prompts/draftPrompt";
import { fallbackClassify } from "./fallback";
import { generateFallbackDraft } from "./fallback-drafts";

export interface ClassificationResult {
  category: Category;
  priority: Priority;
  confidence: number;
  reason: string;
  source: "ai" | "fallback";
}

export interface DraftResult {
  draft: string;
  source: "ai" | "template";
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export async function mockClassify(signals: ClassifyInputSignals): Promise<ClassificationResult> {
  const result = fallbackClassify(signals.subject, signals.description);
  return {
    category: result.category,
    priority: result.priority,
    confidence: result.confidence,
    reason: `[Rule-based] ${result.reason}`,
    source: "fallback",
  };
}

export async function mockDraft(input: DraftPromptInput): Promise<DraftResult> {
  const draft = generateFallbackDraft(input.category, input.facts);
  return {
    draft,
    source: "template",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}
