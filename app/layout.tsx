import './globals.css'

export const metadata = {
  title: 'DentalAI',
  description: 'Dental treatment plan conversion tool (v1)'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
