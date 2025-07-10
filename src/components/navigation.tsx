"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen, FileText, Scale, PieChart, TrendingUp, Home, FolderOpen } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "COA", href: "/statement-of-accounts", icon: FolderOpen },
  { name: "Journal", href: "/journal", icon: BookOpen },
  { name: "General Ledger", href: "/ledger", icon: FileText },
  { name: "Trial Balance", href: "/trial-balance", icon: Scale },
  { name: "Balance Sheet", href: "/balance-sheet", icon: PieChart },
  { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex space-x-1 bg-gray-900 p-2 rounded-lg border border-gray-800">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200",
              isActive ? "bg-blue-500 text-white" : "text-white hover:bg-gray-800 hover:text-blue-500",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
