"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Scale, TrendingUp, AlertCircle } from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { calculateTrialBalance, type TrialBalanceItem } from "@/lib/journal-utils"

export default function TrialBalance() {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceItem[]>([])
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
      const response = await fetch(`/api/journal?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        const trialBalance = calculateTrialBalance(data.journalEntries)
        setTrialBalanceData(trialBalance)
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

  const totalDebits = trialBalanceData.reduce((sum, item) => sum + item.debit, 0)
  const totalCredits = trialBalanceData.reduce((sum, item) => sum + item.credit, 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  if (!user || !currentCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-gray-900">No Company Selected</CardTitle>
              <CardDescription className="text-gray-600">
                Please select a company from the dashboard to access the trial balance.
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
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Trial Balance</h1>
          <p className="text-gray-600 text-lg">{currentCompany.name} • Verify that total debits equal total credits</p>
        </div>

        <Navigation />

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Scale className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Debits</p>
                    <p className="text-3xl font-bold text-gray-900">${totalDebits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Scale className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Credits</p>
                    <p className="text-3xl font-bold text-gray-900">${totalCredits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isBalanced ? "bg-green-100" : "bg-red-100"}`}>
                    {isBalanced ? (
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Status</p>
                    <Badge
                      className={
                        isBalanced
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {isBalanced ? "Balanced" : "Unbalanced"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-3">
                <Scale className="h-5 w-5 text-blue-600" />
                Trial Balance as of {new Date().toLocaleDateString()}
              </CardTitle>
              <CardDescription className="text-gray-600">
                List of all accounts with their debit and credit balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trialBalanceData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No journal entries found. Create journal entries to see the trial balance.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="text-gray-700 font-semibold">Account Name</TableHead>
                      <TableHead className="text-right text-gray-700 font-semibold">Debit</TableHead>
                      <TableHead className="text-right text-gray-700 font-semibold">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalanceData.map((item, index) => (
                      <TableRow key={index} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{item.account}</TableCell>
                        <TableCell className="text-right text-gray-900">
                          {item.debit > 0 ? `$${item.debit.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-gray-900">
                          {item.credit > 0 ? `$${item.credit.toLocaleString()}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-gray-300 font-bold bg-gray-50">
                      <TableCell className="text-gray-900">TOTALS</TableCell>
                      <TableCell className="text-right text-gray-900">${totalDebits.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-gray-900">${totalCredits.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!isBalanced && trialBalanceData.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Trial Balance Error
                </CardTitle>
                <CardDescription className="text-red-700">
                  The trial balance does not balance. Please review your journal entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">Difference: ${Math.abs(totalDebits - totalCredits).toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
