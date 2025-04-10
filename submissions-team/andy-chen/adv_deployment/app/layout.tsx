import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Neurovison App',
  description: 'A brain tumor detection app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
