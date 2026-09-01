import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>DentalAI v1</h1>
      <p>Dental treatment plan conversion tool. Supabase schema with RLS and audit logging.</p>
      
      <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 20, fontWeight: 600 }}>Core Pipeline</h2>
      <ul style={{ marginBottom: 24 }}>
        <li>
          <Link href="/see">See — open plans</Link>
        </li>
        <li>
          <Link href="/act">Act — draft follow-up</Link>
        </li>
        <li>
          <Link href="/measure">Measure — conversion tracking</Link>
        </li>
      </ul>

      <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 20, fontWeight: 600 }}>Settings</h2>
      <ul>
        <li>
          <Link href="/settings/decline-reasons">Decline Reasons — manage picklist</Link>
        </li>
      </ul>
    </main>
  )
}
