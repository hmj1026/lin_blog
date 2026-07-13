/** Provides time and scroll samples without coupling the algorithm to Playwright. */
export type ScrollObservationSource = {
  readScrollY: () => Promise<number>;
  wait: (milliseconds: number) => Promise<void>;
  now: () => number;
};

/** Options for waiting until a positive scroll movement has settled. */
export type ScrollSettledOptions = {
  movedFrom: number;
  timeoutMs?: number;
  intervalMs?: number;
  stableSamples?: number;
  movementThreshold?: number;
};

/** Options for observing that a scroll position remains unchanged. */
export type StableScrollWindowOptions = {
  baseline: number;
  durationMs?: number;
  intervalMs?: number;
  tolerance?: number;
};

/** Waits for a positive scroll movement to reach consecutive stable samples. */
export const waitForScrollSettled = async (
  source: ScrollObservationSource,
  options: ScrollSettledOptions,
): Promise<number> => {
  const {
    movedFrom,
    timeoutMs = 3000,
    intervalMs = 100,
    stableSamples = 3,
    movementThreshold = 100,
  } = options;
  const deadline = source.now() + timeoutMs;
  let lastY = await source.readScrollY();
  let stableCount = 0;

  while (source.now() < deadline) {
    await source.wait(Math.min(intervalMs, deadline - source.now()));
    const y = await source.readScrollY();
    const movedEnough = Math.abs(y - movedFrom) >= movementThreshold;

    if (y === lastY && movedEnough) {
      stableCount += 1;
      if (stableCount >= stableSamples) return y;
    } else {
      stableCount = 0;
    }
    lastY = y;
  }

  throw new Error(`捲動未在 ${timeoutMs}ms 內穩定`);
};

/** Observes the complete window and fails immediately if scroll movement exceeds tolerance. */
export const observeStableScrollWindow = async (
  source: ScrollObservationSource,
  options: StableScrollWindowOptions,
): Promise<number> => {
  const {
    baseline,
    durationMs = 3000,
    intervalMs = 100,
    tolerance = 50,
  } = options;
  const deadline = source.now() + durationMs;
  let lastY = baseline;

  while (source.now() < deadline) {
    await source.wait(Math.min(intervalMs, deadline - source.now()));
    lastY = await source.readScrollY();
    if (Math.abs(lastY - baseline) >= tolerance) {
      throw new Error(
        `觀察期間發生捲動：baseline=${baseline}, current=${lastY}, tolerance=${tolerance}`,
      );
    }
  }

  return lastY;
};
