// Repo path: lib/measure/attribution.ts
//
// Pure attribution logic for the Measure step. Binary, item-level credit: an
// item is tool-attributed when at least one confirmed touchpoint was sent
// before the conversion was detected. No fractional credit, no single
// attributing touchpoint. The full touchpoint sequence lives in
// outreach_events; this function reads it and returns one boolean.

export interface OutreachTouchpoint {
  // The real contact time. For a digital touchpoint this is the send time; for
  // a call it is the reported call time. Ordering is on this value, never on
  // row-creation time, so a call confirmed late by one tap still counts as long
  // as it happened before the conversion.
  sentAt: Date | null;
  isConfirmed: boolean;
}

export interface Conversion {
  detectedAt: Date;
}

// True when the conversion can be defensibly credited to the tool: at least one
// confirmed touchpoint strictly precedes it. Strict ordering, so a touchpoint
// sent at the exact detection instant does not count.
export function isToolAttributed(
  touchpoints: readonly OutreachTouchpoint[],
  conversion: Conversion,
): boolean {
  const detected = conversion.detectedAt.getTime();
  return touchpoints.some(
    (t) => t.isConfirmed && t.sentAt !== null && t.sentAt.getTime() < detected,
  );
}
