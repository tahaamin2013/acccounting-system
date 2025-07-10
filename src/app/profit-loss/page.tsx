"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { calculateProfitLoss, type ProfitLossData } from "@/lib/journal-utils"

export default function ProfitLoss() {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()
  const [profitLossData, setProfitLossData] = useState<ProfitLossData>({
    revenue: [],
    expenses: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
  })
  const [loading, setLoading] = useState(true)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchData = async () => {
    if (!currentCompany) return

    try {
      const [journalResponse, accountsResponse] = await Promise.all([
        fetch(`/api/journal?companyId=${currentCompany.id}`, { headers: getAuthHeaders() }),
        fetch(`/api/accounts?companyId=${currentCompany.id}`, { headers: getAuthHeaders() }),
      ])

      if (journalResponse.ok && accountsResponse.ok) {
        const journalData = await journalResponse.json()
        const accountsData = await accountsResponse.json()
        const plData = calculateProfitLoss(journalData.journalEntries, accountsData.accounts)
        setProfitLossData(plData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }
    if (!currentCompany) {
      router.push("/dashboard")
      return
    }
    fetchData()
  }, [currentCompany, user, router])

  const netProfitMargin =
    profitLossData.totalRevenue > 0
      ? ((profitLossData.netIncome / profitLossData.totalRevenue) * 100).toFixed(1)
      : "0.0"

  if (!user || !currentCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-gray-900">No Company Selected</CardTitle>
              <CardDescription className="text-gray-600">
                Please select a company from the dashboard to access profit & loss.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-600 text-lg">{currentCompany.name} • Income and expenses for the period</p>
        </div>

        <div className="mb-8">
          <Navigation />
        </div>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${profitLossData.totalRevenue.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${profitLossData.totalExpenses.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${profitLossData.netIncome >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                    <TrendingUp
                      className={`h-8 w-8 ${profitLossData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-2xl font-bold ${profitLossData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${profitLossData.netIncome.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600">Net Income ({netProfitMargin}%)</p>
                    <Badge
                      className={
                        profitLossData.netIncome >= 0
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {profitLossData.netIncome >= 0 ? "Profit" : "Loss"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed P&L Statement */}
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Profit & Loss Statement</CardTitle>
              <CardDescription className="text-gray-600">
                For the period ended {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profitLossData.revenue.length === 0 && profitLossData.expenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No revenue or expense transactions found. Create journal entries to see the profit & loss statement.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableBody>
                    {/* Revenue Section */}
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold text-lg bg-blue-50 text-blue-900">
                        REVENUE
                      </TableCell>
                    </TableRow>
                    {profitLossData.revenue.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-6 text-gray-900">{item.name}</TableCell>
                        <TableCell className="text-right text-gray-900">${item.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {profitLossData.revenue.length === 0 && (
                      <TableRow>
                        <TableCell className="pl-6 text-gray-500 italic">No revenue accounts found</TableCell>
                        <TableCell className="text-right text-gray-500">$0</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t font-semibold bg-blue-50">
                      <TableCell className="pl-6 text-blue-900">Total Revenue</TableCell>
                      <TableCell className="text-right text-blue-900">
                        ${profitLossData.totalRevenue.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {/* Expenses Section */}
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold text-lg bg-red-50 text-red-900 pt-6">
                        EXPENSES
                      </TableCell>
                    </TableRow>
                    {profitLossData.expenses.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-6 text-gray-900">{item.name}</TableCell>
                        <TableCell className="text-right text-gray-900">${item.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {profitLossData.expenses.length === 0 && (
                      <TableRow>
                        <TableCell className="pl-6 text-gray-500 italic">No expense accounts found</TableCell>
                        <TableCell className="text-right text-gray-500">$0</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t font-semibold bg-red-50">
                      <TableCell className="pl-6 text-red-900">Total Expenses</TableCell>
                      <TableCell className="text-right text-red-900">
                        ${profitLossData.totalExpenses.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {/* Net Income */}
                    <TableRow className="border-t-4 border-double font-bold text-xl">
                      <TableCell className="text-gray-900">NET INCOME</TableCell>
                      <TableCell
                        className={`text-right ${profitLossData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ${profitLossData.netIncome.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
