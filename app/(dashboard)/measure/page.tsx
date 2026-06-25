'use client'

import { useEffect, useState } from 'react'

type MeasureItem = {
  pmsPlanId: string
  status: string
  converted: boolean
}

type MeasureReport = {
  openValuePence: number
  workedValuePence: number
  convertedValuePence: number
  recoveredValuePence: number
  plans: MeasureItem[]
}

export default function MeasurePage() {
  const [report, setReport] = useState<MeasureReport | null>(null)

  useEffect(() => {
    fetch('/api/measure')
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(() => setReport(null))
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Measure — Conversion tracking</h2>
      <p>Track open, worked, converted, and recovered revenue from Dentally.</p>
      {!report && <p>Loading report…</p>}
      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#f4f4f5', borderRadius: 8 }}>
              <div>Open Value</div>
              <strong>£{(report.openValuePence / 100).toFixed(2)}</strong>
            </div>
            <div style={{ padding: 16, background: '#f4f4f5', borderRadius: 8 }}>
              <div>Worked Value</div>
              <strong>£{(report.workedValuePence / 100).toFixed(2)}</strong>
            </div>
            <div style={{ padding: 16, background: '#f4f4f5', borderRadius: 8 }}>
              <div>Converted Value</div>
              <strong>£{(report.convertedValuePence / 100).toFixed(2)}</strong>
            </div>
            <div style={{ padding: 16, background: '#f4f4f5', borderRadius: 8 }}>
              <div>Recovered Value</div>
              <strong>£{(report.recoveredValuePence / 100).toFixed(2)}</strong>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Plan</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Converted</th>
              </tr>
            </thead>
            <tbody>
              {report.plans.map(item => (
                <tr key={item.pmsPlanId}>
                  <td style={{ padding: 8 }}>{item.pmsPlanId}</td>
                  <td style={{ padding: 8 }}>{item.status}</td>
                  <td style={{ padding: 8 }}>{item.converted ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
