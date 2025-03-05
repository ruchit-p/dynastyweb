import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { EmulatorProvider } from '@/context/EmulatorContext'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dynasty',
  description: 'Dynasty - Family Tree Application',
  icons: {
    icon: '/dynasty.png',
    apple: '/dynasty.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <EmulatorProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </EmulatorProvider>
      </body>
    </html>
  )
} 