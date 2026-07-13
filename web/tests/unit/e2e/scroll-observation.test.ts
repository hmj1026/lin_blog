import { describe, expect, it } from "vitest";
import {
  observeStableScrollWindow,
  waitForScrollSettled,
  type ScrollObservationSource,
} from "../../e2e/helpers/scroll-observation";

/** Creates a deterministic scroll sampler with a virtual monotonic clock. */
const createSource = (samples: number[]) => {
  let elapsedMs = 0;
  let sampleIndex = 0;
  const source: ScrollObservationSource = {
    readScrollY: async () => samples[Math.min(sampleIndex++, samples.length - 1)] ?? 0,
    wait: async (milliseconds) => {
      elapsedMs += milliseconds;
    },
    now: () => elapsedMs,
  };

  return { source, elapsedMs: () => elapsedMs };
};

describe("E2E scroll observation", () => {
  it("resolves only after movement and consecutive stable samples", async () => {
    const { source } = createSource([0, 40, 120, 180, 180, 180]);

    await expect(
      waitForScrollSettled(source, {
        movedFrom: 0,
        timeoutMs: 1000,
        intervalMs: 100,
        stableSamples: 2,
      }),
    ).resolves.toBe(180);
  });

  it("rejects when movement never settles before the timeout", async () => {
    const { source } = createSource([0, 120, 180, 240, 300, 360]);

    await expect(
      waitForScrollSettled(source, {
        movedFrom: 0,
        timeoutMs: 400,
        intervalMs: 100,
        stableSamples: 2,
      }),
    ).rejects.toThrow(/未在 400ms 內穩定/);
  });

  it("observes the complete negative window before succeeding", async () => {
    const { source, elapsedMs } = createSource([200, 200, 200, 200, 200, 200]);

    await expect(
      observeStableScrollWindow(source, {
        baseline: 200,
        durationMs: 500,
        intervalMs: 100,
      }),
    ).resolves.toBe(200);
    expect(elapsedMs()).toBeGreaterThanOrEqual(500);
  });

  it("rejects a delayed movement during the negative window", async () => {
    const { source } = createSource([200, 200, 200, 200, 280]);

    await expect(
      observeStableScrollWindow(source, {
        baseline: 200,
        durationMs: 500,
        intervalMs: 100,
        tolerance: 50,
      }),
    ).rejects.toThrow(/觀察期間發生捲動/);
  });
});
