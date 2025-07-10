import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { CompanyProvider } from "@/contexts/company-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AccounTech - Modern Accounting System",
  description: "Professional accounting software for modern businesses",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} dark bg-black text-white`}>
        <AuthProvider>
          <CompanyProvider>{children}</CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
