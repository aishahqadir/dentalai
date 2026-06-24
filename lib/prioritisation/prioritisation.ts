export interface ScoreDetails {
  score: number
  valueFactor: number
  recencyFactor: number
  daysSincePresented: number
}

export function daysBetween(a: Date, b: Date) {
  const diff = Math.abs(a.getTime() - b.getTime())
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// v1 prioritisation: value weighted by recency (transparent, overridable)
export function scorePlan(presentedAt: Date, totalValuePence: number): ScoreDetails {
  const days = daysBetween(new Date(), presentedAt)

  // valueFactor: scale value to thousands of pounds to keep numbers sensible
  const valueFactor = totalValuePence / 100000 // 100000 pence = £1000

  // recencyFactor: exponential decay, recent plans score higher
  // decay constant chosen so 30 days reduces factor to ~0.37
  const recencyFactor = Math.exp(-days / 30)

  // final score: value * (1 + recencyFactor) — keeps transparency
  const score = valueFactor * (1 + recencyFactor)

  return {
    score,
    valueFactor,
    recencyFactor,
    daysSincePresented: days,
  }
}
