"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { CompanySelector } from "@/components/company/company-selector"
import { BookOpen, FileText, Scale, TrendingUp, DollarSign, LogOut, Building2, BarChart3, Activity } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { calculateTrialBalance, calculateProfitLoss, calculateBalanceSheet } from "@/lib/journal-utils"

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { currentCompany, companies } = useCompany()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalAssets: 0,
    netIncome: 0,
    journalEntries: 0,
    activeAccounts: 0,
    isBalanced: true,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchDashboardData = async () => {
    if (!currentCompany) {
      setLoading(false)
      return
    }

    try {
      const [journalResponse, accountsResponse] = await Promise.all([
        fetch(`/api/journal?companyId=${currentCompany.id}`, { headers: getAuthHeaders() }),
        fetch(`/api/accounts?companyId=${currentCompany.id}`, { headers: getAuthHeaders() }),
      ])

      if (journalResponse.ok && accountsResponse.ok) {
        const journalData = await journalResponse.json()
        const accountsData = await accountsResponse.json()

        // Calculate statistics
        const trialBalance = calculateTrialBalance(journalData.journalEntries)
        const profitLoss = calculateProfitLoss(journalData.journalEntries, accountsData.accounts)
        const balanceSheet = calculateBalanceSheet(journalData.journalEntries, accountsData.accounts)

        const totalDebits = trialBalance.reduce((sum, item) => sum + item.debit, 0)
        const totalCredits = trialBalance.reduce((sum, item) => sum + item.credit, 0)
        const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

        const totalAssets =
          balanceSheet.assets.current.reduce((sum, item) => sum + item.amount, 0) +
          balanceSheet.assets.nonCurrent.reduce((sum, item) => sum + item.amount, 0)

        setStats({
          totalAssets,
          netIncome: profitLoss.netIncome,
          journalEntries: journalData.journalEntries.length,
          activeAccounts: accountsData.accounts.filter((a) => a.isActive).length,
          isBalanced,
        })

        // Set recent activity from journal entries
        const recentEntries = journalData.journalEntries
          .slice(-3)
          .reverse()
          .map((entry) => ({
            title: `Journal entry: ${entry.reference}`,
            description: entry.description,
            time: new Date(entry.date).toLocaleDateString(),
          }))

        setRecentActivity(recentEntries)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [currentCompany])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (!user) {
    router.push("/")
    return null
  }

  const quickActions = [
    {
      title: "New Journal Entry",
      description: "Record a new transaction",
      icon: BookOpen,
      href: "/journal",
    },
    {
      title: "View Ledger",
      description: "Check account balances",
      icon: FileText,
      href: "/ledger",
    },
    {
      title: "Trial Balance",
      description: "Verify account balances",
      icon: Scale,
      href: "/trial-balance",
    },
    {
      title: "Financial Reports",
      description: "Generate reports",
      icon: BarChart3,
      href: "/balance-sheet",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Welcome back, {user.firstName}!</h1>
            <p className="text-gray-600 text-lg">
              {currentCompany ? `Managing ${currentCompany.name}` : "Select a company to get started"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Company Selector */}
        <CompanySelector />

        {currentCompany ? (
          <>
            <Navigation />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Assets</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalAssets.toLocaleString()}</p>
                      <p className="text-blue-600 text-sm mt-1">From balance sheet</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Net Income</p>
                      <p
                        className={`text-3xl font-bold mt-2 ${stats.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${stats.netIncome.toLocaleString()}
                      </p>
                      <p className={`text-sm mt-1 ${stats.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {stats.netIncome >= 0 ? "Profit" : "Loss"} this period
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stats.netIncome >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                      <TrendingUp className={`h-8 w-8 ${stats.netIncome >= 0 ? "text-green-600" : "text-red-600"}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Journal Entries</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.journalEntries}</p>
                      <p className="text-blue-600 text-sm mt-1">Total transactions</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Active Accounts</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeAccounts}</p>
                      <p className={`text-sm mt-1 ${stats.isBalanced ? "text-green-600" : "text-red-600"}`}>
                        {stats.isBalanced ? "Books balanced" : "Needs attention"}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stats.isBalanced ? "bg-green-100" : "bg-red-100"}`}>
                      <FileText className={`h-8 w-8 ${stats.isBalanced ? "text-green-600" : "text-red-600"}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link key={index} href={action.href}>
                    <Card className="border-blue-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-6">
                        <Icon className="h-10 w-10 text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-200" />
                        <h3 className="font-semibold text-lg mb-2 text-gray-900">{action.title}</h3>
                        <p className="text-gray-600 text-sm">{action.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-blue-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-gray-600">Latest transactions and updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No recent activity. Create your first journal entry to get started.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Company Information
                  </CardTitle>
                  <CardDescription className="text-gray-600">Current company details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-700">Company Name</span>
                    <span className="text-gray-900">{currentCompany.name}</span>
                  </div>
                  {currentCompany.industry && (
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="font-medium text-gray-700">Industry</span>
                      <span className="text-gray-900">{currentCompany.industry}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-700">Your Role</span>
                    <span className="text-gray-900 capitalize">{currentCompany.role}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-700">Total Companies</span>
                    <span className="text-gray-900">{companies.length} companies</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">No Company Selected</CardTitle>
              <CardDescription className="text-gray-600">
                Please select or create a company above to access your accounting features.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
