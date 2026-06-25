'use client'

import { useEffect, useState } from 'react'

type FollowUpContext = {
  patientFirstName: string
  proposedTreatmentSummary: string
  daysSincePresented: number
  practiceName: string
  tone: 'warm' | 'neutral'
}

export default function ActPage() {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<FollowUpContext>({
    patientFirstName: 'Sofia',
    proposedTreatmentSummary: 'composite filling and hygiene therapy',
    daysSincePresented: 7,
    practiceName: 'Bright Dental',
    tone: 'warm',
  })

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      const data = await res.json()
      setMessage(data.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h2>Act — Draft follow-up message</h2>
      <div style={{ marginBottom: 24, display: 'grid', gap: 12, maxWidth: 640 }}>
        <label>
          Patient first name
          <input
            value={context.patientFirstName}
            onChange={e => setContext({ ...context, patientFirstName: e.target.value })}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Proposed treatment summary
          <textarea
            value={context.proposedTreatmentSummary}
            onChange={e => setContext({ ...context, proposedTreatmentSummary: e.target.value })}
            rows={3}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Days since presented
          <input
            type="number"
            value={context.daysSincePresented}
            onChange={e => setContext({ ...context, daysSincePresented: Number(e.target.value) })}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Practice name
          <input
            value={context.practiceName}
            onChange={e => setContext({ ...context, practiceName: e.target.value })}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Tone
          <select
            value={context.tone}
            onChange={e => setContext({ ...context, tone: e.target.value as 'warm' | 'neutral' })}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="warm">Warm</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
        <button onClick={generate} disabled={loading} style={{ width: 120, padding: 10 }}>
          {loading ? 'Generating…' : 'Generate draft'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && (
        <section style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
          {message}
        </section>
      )}
    </main>
  )
}
