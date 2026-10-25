// Real Mikrus sample: 2026-10-25, 18:54:10–18:54:44 UTC (request to HTTPS readiness).
// This is an estimate, not a deadline. Readiness always comes from the service.
export const LAUNCH_SECONDS = 34;
export const LAUNCH_TOLERANCE_SECONDS = 3;
export const LAUNCH_ESTIMATE = `Około ${LAUNCH_SECONDS} s (±${LAUNCH_TOLERANCE_SECONDS} s)`;

export function launchView(elapsedMs, backendProgress = 0, waiting = false) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0) / 1000;
  if (waiting) return { progress: 6, remaining: null, delayed: false, waiting: true };
  const fraction = elapsed / LAUNCH_SECONDS;
  const timed = fraction <= 1 ? 90 * fraction : 90 + 6 * (1 - Math.exp(-(fraction - 1)));
  return {
    // Percentages are an estimated animation, never a claim that readiness passed.
    progress: Math.min(96, Math.max(3, Math.min(95, Number(backendProgress) || 0) * .45, timed)),
    remaining: Math.max(0, Math.ceil(LAUNCH_SECONDS - elapsed)),
    delayed: elapsed > LAUNCH_SECONDS + LAUNCH_TOLERANCE_SECONDS,
    waiting: false,
  };
}
