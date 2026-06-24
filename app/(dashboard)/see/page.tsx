"use client"
import { useEffect, useState } from 'react'

type Priority = {
  score: number
  valueFactor: number
  recencyFactor: number
  daysSincePresented: number
}

type Plan = {
  pmsPlanId: string
  pmsPatientId: string
  items: { description: string; valuePence: number }[]
  totalValuePence: number
  presentedAt: string
  status: string
  priority?: Priority
}

export default function SeePage() {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('planPriorityOverrides')
      if (raw) setOverrides(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
  }, [])

  const saveOverride = (planId: string, value: number) => {
    const next = { ...overrides, [planId]: value }
    setOverrides(next)
    try {
      localStorage.setItem('planPriorityOverrides', JSON.stringify(next))
    } catch (e) {
      console.error('failed to save override', e)
    }
  }

  const clearOverride = (planId: string) => {
    const next = { ...overrides }
    delete next[planId]
    setOverrides(next)
    try {
      localStorage.setItem('planPriorityOverrides', JSON.stringify(next))
    } catch (e) {
      console.error('failed to save override', e)
    }
  }

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => setPlans(data.plans))
      .catch(() => setPlans([]))
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>See — Open Treatment Plans</h2>
      {!plans && <p>Loading…</p>}
      {plans && plans.length === 0 && <p>No open plans.</p>}
      {plans && plans.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Plan</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Patient</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Value</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Presented</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Priority</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => {
              const override = overrides[p.pmsPlanId]
              const displayScore = override ?? p.priority?.score ?? 0
              return (
                <tr key={p.pmsPlanId}>
                  <td style={{ padding: 8 }}>{p.pmsPlanId}</td>
                  <td style={{ padding: 8 }}>{p.pmsPatientId}</td>
                  <td style={{ padding: 8 }}>£{(p.totalValuePence / 100).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{new Date(p.presentedAt).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>{p.status}</td>
                  <td style={{ padding: 8 }}>
                    <div>
                      <strong>{displayScore.toFixed(3)}</strong>
                      {override && <span style={{ marginLeft: 8, color: '#b36' }}>Overridden</span>}
                    </div>
                    {p.priority && (
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <div>valueFactor: {p.priority.valueFactor.toFixed(3)}</div>
                        <div>recencyFactor: {p.priority.recencyFactor.toFixed(3)}</div>
                        <div>days: {p.priority.daysSincePresented}</div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <OverrideControl
                      planId={p.pmsPlanId}
                      current={override}
                      base={p.priority?.score}
                      onSave={saveOverride}
                      onClear={clearOverride}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}

function OverrideControl({ planId, current, base, onSave, onClear }: { planId: string; current?: number; base?: number; onSave: (id: string, v: number) => void; onClear: (id: string) => void }) {
  const [value, setValue] = useState<string>(current != null ? String(current) : base != null ? String(base) : '')

  useEffect(() => {
    setValue(current != null ? String(current) : base != null ? String(base) : '')
  }, [current, base])

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        aria-label={`override-${planId}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ width: 100 }}
      />
      <button onClick={() => onSave(planId, Number(value))}>Save</button>
      <button onClick={() => onClear(planId)}>Clear</button>
    </div>
  )
}
