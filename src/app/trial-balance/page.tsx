"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scale, TrendingUp, AlertCircle, Download } from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import type { TrialBalanceItem, JournalEntry, AccountBalance } from "@/lib/types"

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

  const processTrialBalanceData = (journalEntries: JournalEntry[]) => {
    const accountBalances = new Map<string, AccountBalance>()

    // Process all journal entries to calculate net balances
    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const existing = accountBalances.get(line.accountName) || {
          account: line.accountName,
          balance: 0,
          type: line.accountType || "ASSET", // Default to ASSET if type is missing
        }

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0

        // Calculate net balance based on account type
        if (["ASSET", "EXPENSE"].includes(existing.type)) {
          existing.balance += debit - credit
        } else {
          existing.balance += credit - debit
        }

        accountBalances.set(line.accountName, existing)
      })
    })

    // Convert to trial balance format
    const trialBalanceData: TrialBalanceItem[] = []
    accountBalances.forEach((account) => {
      if (Math.abs(account.balance) > 0.01) {
        // Only include accounts with non-zero balances
        if (["ASSET", "EXPENSE"].includes(account.type)) {
          // For Assets and Expenses, positive balance goes to Debit
          trialBalanceData.push({
            account: account.account,
            debit: account.balance > 0 ? account.balance : 0,
            credit: account.balance < 0 ? Math.abs(account.balance) : 0,
          })
        } else {
          // For Liabilities, Equity, Revenue, positive balance goes to Credit
          trialBalanceData.push({
            account: account.account,
            debit: account.balance < 0 ? Math.abs(account.balance) : 0,
            credit: account.balance > 0 ? account.balance : 0,
          })
        }
      }
    })

    return trialBalanceData
  }

  const fetchData = async () => {
    if (!currentCompany) return

    try {
      const response = await fetch(`/api/journal?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        const trialBalance = processTrialBalanceData(data.journalEntries)
        setTrialBalanceData(trialBalance)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportTrialBalanceToCSV = () => {
    if (!currentCompany) return

    const currentDate = new Date().toLocaleDateString()
    const totalDebits = trialBalanceData.reduce((sum, item) => sum + item.debit, 0)
    const totalCredits = trialBalanceData.reduce((sum, item) => sum + item.credit, 0)
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

    const csvContent = [
      // Header information
      [`Trial Balance - ${currentCompany.name}`],
      [`As of ${currentDate}`],
      [`Status: ${isBalanced ? "Balanced" : "Unbalanced"}`],
      [`Total Debits: $${totalDebits.toLocaleString()}`],
      [`Total Credits: $${totalCredits.toLocaleString()}`],
      [], // Empty row
      // Column headers
      ["Account Name", "Debit", "Credit"],
      // Account data
      ...trialBalanceData.map((item) => [
        item.account,
        item.debit > 0 ? item.debit.toString() : "",
        item.credit > 0 ? item.credit.toString() : "",
      ]),
      // Totals row
      ["TOTALS", totalDebits.toString(), totalCredits.toString()],
      // Additional info if unbalanced
      ...(isBalanced
        ? []
        : [
            [], // Empty row
            [`Difference: $${Math.abs(totalDebits - totalCredits).toLocaleString()}`],
          ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `Trial_Balance_${currentCompany.name.replace(/\s+/g, "_")}_${currentDate.replace(/\//g, "-")}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 flex items-center gap-3">
                    <Scale className="h-5 w-5 text-blue-600" />
                    Trial Balance as of {new Date().toLocaleDateString()}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    List of all accounts with their debit and credit balances
                  </CardDescription>
                </div>
                <Button
                  onClick={exportTrialBalanceToCSV}
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                  disabled={trialBalanceData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
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
