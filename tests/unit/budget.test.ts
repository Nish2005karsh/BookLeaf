import { describe, it, expect, beforeEach } from "vitest";
import {
  canMakeAiCall,
  consumeAiCallSlot,
  recordAiSuccess,
  recordAiFailure,
  resetBudgetForTesting,
  getBudgetStatus,
} from "@/lib/ai/budget";

describe("AI Budget & Circuit Breaker Guard", () => {
  beforeEach(() => {
    resetBudgetForTesting();
  });

  it("permits AI calls when budget and circuit breaker are clean", () => {
    const check = canMakeAiCall();
    expect(check.allowed).toBe(true);
    expect(check.reason).toBeUndefined();
  });

  it("immediately trips the circuit breaker on HTTP 429 quota exhaustion", () => {
    expect(canMakeAiCall().allowed).toBe(true);

    // Record a 429 Rate Limit error from provider
    recordAiFailure(429, 30);

    const check = canMakeAiCall();
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Circuit breaker active");
    expect(check.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("trips circuit breaker after consecutive general failures reach threshold (3)", () => {
    recordAiFailure(500);
    expect(canMakeAiCall().allowed).toBe(true);

    recordAiFailure(500);
    expect(canMakeAiCall().allowed).toBe(true);

    // 3rd failure trips the breaker
    recordAiFailure(500);
    const check = canMakeAiCall();
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Circuit breaker active");
  });

  it("resets failure counter upon a successful AI response", () => {
    recordAiFailure(500);
    recordAiFailure(500);
    expect(getBudgetStatus().consecutiveFailures).toBe(2);

    recordAiSuccess();
    expect(getBudgetStatus().consecutiveFailures).toBe(0);
    expect(canMakeAiCall().allowed).toBe(true);
  });

  it("consumes RPM call slots and tracks daily call count", () => {
    const initialStatus = getBudgetStatus();
    expect(initialStatus.dailyCalls).toBe(0);

    consumeAiCallSlot();
    const updatedStatus = getBudgetStatus();
    expect(updatedStatus.dailyCalls).toBe(1);
  });
});
