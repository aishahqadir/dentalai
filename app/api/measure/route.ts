import { NextResponse } from 'next/server'

export async function GET() {
  const report = {
    openValuePence: 20000,
    workedValuePence: 8000,
    convertedValuePence: 8000,
    recoveredValuePence: 8000,
    plans: [
      { pmsPlanId: 'plan_1', status: 'proposed', converted: false },
      { pmsPlanId: 'plan_2', status: 'booked', converted: true },
    ],
  }

  return NextResponse.json(report)
}
