import { NextResponse } from 'next/server'
import { dentallyProvider } from '../../../lib/pms/dentally'
import { scorePlan } from '../../../lib/prioritisation/prioritisation'

export async function GET() {
  const plans = await dentallyProvider.listOpenTreatmentPlans()

  // Attach prioritisation score and serialize dates
  const serialized = plans.map(p => {
    const score = scorePlan(p.presentedAt, p.totalValuePence)
    return ({
      ...p,
      presentedAt: p.presentedAt.toISOString(),
      priority: score,
    })
  })

  return NextResponse.json({ plans: serialized })
}
