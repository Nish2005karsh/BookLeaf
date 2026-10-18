/**
 * AI Budget, Rate Limiter & Circuit Breaker.
 * Enforces:
 * 1. Token-bucket RPM (AI_MAX_RPM, default 10)
 * 2. Daily call limit (AI_DAILY_CALL_LIMIT, default 500)
 * 3. Circuit breaker on repeated 429 / 5xx / timeout failures
 */

interface BudgetState {
  // Rate limiting (token bucket / sliding window per minute)
  rpmTokens: number;
  lastRpmRefill: number;
  maxRpm: number;

  // Daily counter
  dailyCalls: number;
  dailyResetDate: string; // YYYY-MM-DD
  dailyLimit: number;

  // Circuit breaker
  consecutiveFailures: number;
  circuitOpenUntil: number | null; // timestamp ms
  failureThreshold: number;
  openDurationMs: number;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const state: BudgetState = {
  rpmTokens: parseInt(process.env.AI_MAX_RPM || "10", 10),
  lastRpmRefill: Date.now(),
  maxRpm: parseInt(process.env.AI_MAX_RPM || "10", 10),

  dailyCalls: 0,
  dailyResetDate: getTodayString(),
  dailyLimit: parseInt(process.env.AI_DAILY_CALL_LIMIT || "500", 10),

  consecutiveFailures: 0,
  circuitOpenUntil: null,
  failureThreshold: 3,
  openDurationMs: 60 * 1000, // 60s
};

/** Refill RPM tokens based on elapsed seconds */
function refillRpm() {
  const now = Date.now();
  const elapsedMs = now - state.lastRpmRefill;
  if (elapsedMs > 1000) {
    const refillAmount = (elapsedMs / 60000) * state.maxRpm;
    state.rpmTokens = Math.min(state.maxRpm, state.rpmTokens + refillAmount);
    state.lastRpmRefill = now;
  }

  // Daily reset check
  const today = getTodayString();
  if (state.dailyResetDate !== today) {
    state.dailyCalls = 0;
    state.dailyResetDate = today;
  }
}

export interface AiBudgetCheck {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

export function canMakeAiCall(): AiBudgetCheck {
  const now = Date.now();
  refillRpm();

  // 1. Check circuit breaker
  if (state.circuitOpenUntil && now < state.circuitOpenUntil) {
    const remainingSec = Math.ceil((state.circuitOpenUntil - now) / 1000);
    return {
      allowed: false,
      reason: `Circuit breaker active after repeated failures (resets in ${remainingSec}s)`,
      retryAfterSeconds: remainingSec,
    };
  } else if (state.circuitOpenUntil && now >= state.circuitOpenUntil) {
    // Half-open: allow a trial request
    state.circuitOpenUntil = null;
  }

  // 2. Check daily limit
  if (state.dailyCalls >= state.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily AI call limit reached (${state.dailyLimit})`,
      retryAfterSeconds: 3600,
    };
  }

  // 3. Check RPM token bucket
  if (state.rpmTokens < 1) {
    return {
      allowed: false,
      reason: `RPM limit exceeded (max ${state.maxRpm}/min)`,
      retryAfterSeconds: 10,
    };
  }

  return { allowed: true };
}

export function consumeAiCallSlot(): void {
  refillRpm();
  state.rpmTokens = Math.max(0, state.rpmTokens - 1);
  state.dailyCalls += 1;
}

export function recordAiSuccess(): void {
  state.consecutiveFailures = 0;
  state.circuitOpenUntil = null;
}

export function recordAiFailure(status?: number, retryAfterSec?: number): void {
  state.consecutiveFailures += 1;
  const now = Date.now();

  // If explicit 429 / quota hit or consecutive threshold reached, trip circuit breaker
  const isRateLimit = status === 429;
  const reachedThreshold = state.consecutiveFailures >= state.failureThreshold;

  if (isRateLimit || reachedThreshold) {
    const cooldownMs = retryAfterSec ? retryAfterSec * 1000 : state.openDurationMs;
    state.circuitOpenUntil = now + cooldownMs;
  }
}

export function getBudgetStatus() {
  refillRpm();
  return {
    rpmTokens: Math.floor(state.rpmTokens),
    maxRpm: state.maxRpm,
    dailyCalls: state.dailyCalls,
    dailyLimit: state.dailyLimit,
    consecutiveFailures: state.consecutiveFailures,
    isCircuitOpen: Boolean(state.circuitOpenUntil && Date.now() < state.circuitOpenUntil),
    circuitOpenUntil: state.circuitOpenUntil,
  };
}

export function resetBudgetForTesting(): void {
  state.rpmTokens = state.maxRpm;
  state.lastRpmRefill = Date.now();
  state.dailyCalls = 0;
  state.dailyResetDate = getTodayString();
  state.consecutiveFailures = 0;
  state.circuitOpenUntil = null;
}
