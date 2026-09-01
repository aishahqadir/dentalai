// Repo path: lib/measure/attribution.test.ts

import { describe, it, expect } from "vitest";
import {
  isToolAttributed,
  type OutreachTouchpoint,
  type Conversion,
} from "./attribution";

const at = (iso: string) => new Date(iso);
const conversion: Conversion = { detectedAt: at("2026-06-20T10:00:00Z") };

describe("isToolAttributed", () => {
  it("credits a confirmed touchpoint sent before the conversion", () => {
    const touchpoints: OutreachTouchpoint[] = [
      { sentAt: at("2026-06-18T09:00:00Z"), isConfirmed: true },
    ];
    expect(isToolAttributed(touchpoints, conversion)).toBe(true);
  });

  it("does not credit a conversion with no touchpoint", () => {
    expect(isToolAttributed([], conversion)).toBe(false);
  });

  it("does not credit an unconfirmed touchpoint", () => {
    const touchpoints: OutreachTouchpoint[] = [
      { sentAt: at("2026-06-18T09:00:00Z"), isConfirmed: false },
    ];
    expect(isToolAttributed(touchpoints, conversion)).toBe(false);
  });

  it("does not credit a touchpoint sent after the conversion", () => {
    const touchpoints: OutreachTouchpoint[] = [
      { sentAt: at("2026-06-21T09:00:00Z"), isConfirmed: true },
    ];
    expect(isToolAttributed(touchpoints, conversion)).toBe(false);
  });

  it("flips to credited when an earlier call is confirmed after detection", () => {
    // Same call, sent before the conversion, confirmed late by one tap.
    const sentAt = at("2026-06-19T14:00:00Z");
    expect(
      isToolAttributed([{ sentAt, isConfirmed: false }], conversion),
    ).toBe(false);
    expect(
      isToolAttributed([{ sentAt, isConfirmed: true }], conversion),
    ).toBe(true);
  });

  it("credits once, not per touchpoint, with several confirmed before", () => {
    const touchpoints: OutreachTouchpoint[] = [
      { sentAt: at("2026-06-15T09:00:00Z"), isConfirmed: true },
      { sentAt: at("2026-06-17T09:00:00Z"), isConfirmed: true },
      { sentAt: at("2026-06-19T09:00:00Z"), isConfirmed: true },
    ];
    const result = isToolAttributed(touchpoints, conversion);
    expect(result).toBe(true);
    expect(typeof result).toBe("boolean");
  });
});
