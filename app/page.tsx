import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>DentalAI — Scaffold</h1>
      <p>Next.js + TypeScript scaffold with Supabase client placeholders.</p>
      <ul>
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
    </main>
  )
}
