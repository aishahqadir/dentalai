import { describe, expect, it } from 'vitest'
import { scorePlan } from './prioritisation'

describe('scorePlan', () => {
  it('scores recent plans higher than stale plans', () => {
    const recent = scorePlan(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 100000)
    const stale = scorePlan(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), 100000)

    expect(recent.score).toBeGreaterThan(stale.score)
    expect(recent.daysSincePresented).toBeLessThan(stale.daysSincePresented)
  })

  it('increases score when value is higher', () => {
    const lowValue = scorePlan(new Date(), 50000)
    const highValue = scorePlan(new Date(), 150000)

    expect(highValue.score).toBeGreaterThan(lowValue.score)
  })
})
