import { GoogleGenAI, Type } from "@google/genai";
import { Category, Priority } from "@prisma/client";
import { CLASSIFY_SYSTEM_PROMPT, buildClassifyPrompt, ClassifyInputSignals } from "./prompts/classifyPrompt";
import { DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt, DraftPromptInput } from "./prompts/draftPrompt";
import { ClassificationResult, DraftResult } from "./mock";

const DEFAULT_MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || "12000", 10);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

/** Timeout wrapper around any promise */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(`Timeout after ${ms}ms: ${errorMessage}`));
      }, ms);
    }),
  ]);
}

/** Structured JSON schema for ticket classification */
const classifySchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        Category.ROYALTY_PAYMENTS,
        Category.PRINTING_QUALITY,
        Category.DISTRIBUTION_AVAILABILITY,
        Category.ISBN_METADATA,
        Category.BOOK_STATUS_PRODUCTION,
        Category.GENERAL_INQUIRY,
      ],
      description: "One of the 6 defined ticket categories",
    },
    priority: {
      type: Type.STRING,
      enum: [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW],
      description: "Priority assigned to the ticket based on rubric",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0.0 and 1.0",
    },
    reason: {
      type: Type.STRING,
      description: "Under 20 words explaining the classification",
    },
  },
  required: ["category", "priority", "confidence", "reason"],
};

export async function geminiClassify(
  signals: ClassifyInputSignals
): Promise<ClassificationResult & { promptTokens: number; completionTokens: number; totalTokens: number }> {
  const ai = getGeminiClient();
  const userPrompt = buildClassifyPrompt(signals);

  const callPromise = ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: CLASSIFY_SYSTEM_PROMPT,
      temperature: 0,
      maxOutputTokens: 150,
      responseMimeType: "application/json",
      responseSchema: classifySchema,
    },
  });

  const response = await withTimeout(callPromise, TIMEOUT_MS, "Gemini classification timed out");

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  const usage = response.usageMetadata;
  const promptTokens = usage?.promptTokenCount || 0;
  const completionTokens = usage?.candidatesTokenCount || 0;
  const totalTokens = usage?.totalTokenCount || promptTokens + completionTokens;

  const validCategories: Category[] = Object.values(Category);
  const validPriorities: Priority[] = Object.values(Priority);

  const category = validCategories.includes(parsed.category) ? (parsed.category as Category) : Category.GENERAL_INQUIRY;
  const priority = validPriorities.includes(parsed.priority) ? (parsed.priority as Priority) : Priority.MEDIUM;
  const confidence = typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85;
  const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 150) : "Classified by Gemini";

  return {
    category,
    priority,
    confidence,
    reason,
    source: "ai",
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

export async function geminiDraft(
  input: DraftPromptInput
): Promise<DraftResult> {
  const ai = getGeminiClient();
  const userPrompt = buildDraftUserPrompt(input);

  const callPromise = ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: DRAFT_SYSTEM_PROMPT,
      temperature: 0.4,
      maxOutputTokens: 450,
    },
  });

  const response = await withTimeout(callPromise, TIMEOUT_MS, "Gemini draft generation timed out");

  const draftText = (response.text || "").trim();
  const usage = response.usageMetadata;
  const promptTokens = usage?.promptTokenCount || 0;
  const completionTokens = usage?.candidatesTokenCount || 0;
  const totalTokens = usage?.totalTokenCount || promptTokens + completionTokens;

  return {
    draft: draftText,
    source: "ai",
    promptTokens,
    completionTokens,
    totalTokens,
  };
}
