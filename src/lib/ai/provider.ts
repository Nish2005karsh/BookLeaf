export interface CompletionRequest {
  systemInstruction?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
  responseMimeType?: string;
}

export interface CompletionResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}

export function getAiProvider(): "gemini" | "mock" {
  if (process.env.AI_PROVIDER === "mock") return "mock";
  if (!process.env.GEMINI_API_KEY) return "mock";
  return (process.env.AI_PROVIDER as "gemini" | "mock") || "gemini";
}

