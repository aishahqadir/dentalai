import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'system-ui', margin: 0, padding: 0 }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #ddd' }}>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link href="/">Home</Link>
          <Link href="/see">See</Link>
          <Link href="/act">Act</Link>
          <Link href="/measure">Measure</Link>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  )
}
