"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Building2, TrendingUp, AlertCircle } from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { calculateBalanceSheet, type BalanceSheetData } from "@/lib/journal-utils"

export default function BalanceSheet() {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData>({
    assets: { current: [], nonCurrent: [] },
    liabilities: { current: [], longTerm: [] },
    equity: [],
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
        const bsData = calculateBalanceSheet(journalData.journalEntries, accountsData.accounts)
        setBalanceSheetData(bsData)
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

  const currentAssets = balanceSheetData.assets.current.reduce((sum, item) => sum + item.amount, 0)
  const nonCurrentAssets = balanceSheetData.assets.nonCurrent.reduce((sum, item) => sum + item.amount, 0)
  const totalAssets = currentAssets + nonCurrentAssets

  const currentLiabilities = balanceSheetData.liabilities.current.reduce((sum, item) => sum + item.amount, 0)
  const longTermLiabilities = balanceSheetData.liabilities.longTerm.reduce((sum, item) => sum + item.amount, 0)
  const totalLiabilities = currentLiabilities + longTermLiabilities

  const totalEquity = balanceSheetData.equity.reduce((sum, item) => sum + item.amount, 0)
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01

  if (!user || !currentCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-gray-900">No Company Selected</CardTitle>
              <CardDescription className="text-gray-600">
                Please select a company from the dashboard to access the balance sheet.
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
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600 text-lg">
            {currentCompany.name} • Financial position as of {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="mb-8">
          <Navigation />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                Assets
              </CardTitle>
              <CardDescription className="text-gray-600">Resources owned by the company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-900">Current Assets</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.assets.current.length > 0 ? (
                        balanceSheetData.assets.current.map((item, index) => (
                          <TableRow key={index} className="border-gray-200">
                            <TableCell className="text-gray-900">{item.name}</TableCell>
                            <TableCell className="text-right text-gray-900">${item.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-gray-500 italic">No current assets found</TableCell>
                          <TableCell className="text-right text-gray-500">$0</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-medium bg-blue-50">
                        <TableCell className="text-blue-900">Total Current Assets</TableCell>
                        <TableCell className="text-right text-blue-900">${currentAssets.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-900">Non-Current Assets</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.assets.nonCurrent.length > 0 ? (
                        balanceSheetData.assets.nonCurrent.map((item, index) => (
                          <TableRow key={index} className="border-gray-200">
                            <TableCell className="text-gray-900">{item.name}</TableCell>
                            <TableCell className="text-right text-gray-900">
                              {item.amount < 0
                                ? `(${Math.abs(item.amount).toLocaleString()})`
                                : `$${item.amount.toLocaleString()}`}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-gray-500 italic">No non-current assets found</TableCell>
                          <TableCell className="text-right text-gray-500">$0</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-medium bg-blue-50">
                        <TableCell className="text-blue-900">Total Non-Current Assets</TableCell>
                        <TableCell className="text-right text-blue-900">${nonCurrentAssets.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t-2 pt-4">
                  <Table>
                    <TableBody>
                      <TableRow className="font-bold text-lg bg-blue-100">
                        <TableCell className="text-blue-900">TOTAL ASSETS</TableCell>
                        <TableCell className="text-right text-blue-900">${totalAssets.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities and Equity */}
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                Liabilities & Equity
              </CardTitle>
              <CardDescription className="text-gray-600">Claims against company assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-900">Current Liabilities</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.liabilities.current.length > 0 ? (
                        balanceSheetData.liabilities.current.map((item, index) => (
                          <TableRow key={index} className="border-gray-200">
                            <TableCell className="text-gray-900">{item.name}</TableCell>
                            <TableCell className="text-right text-gray-900">${item.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-gray-500 italic">No current liabilities found</TableCell>
                          <TableCell className="text-right text-gray-500">$0</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-medium bg-red-50">
                        <TableCell className="text-red-900">Total Current Liabilities</TableCell>
                        <TableCell className="text-right text-red-900">
                          ${currentLiabilities.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-900">Long-term Liabilities</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.liabilities.longTerm.length > 0 ? (
                        balanceSheetData.liabilities.longTerm.map((item, index) => (
                          <TableRow key={index} className="border-gray-200">
                            <TableCell className="text-gray-900">{item.name}</TableCell>
                            <TableCell className="text-right text-gray-900">${item.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-gray-500 italic">No long-term liabilities found</TableCell>
                          <TableCell className="text-right text-gray-500">$0</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-medium bg-red-50">
                        <TableCell className="text-red-900">Total Long-term Liabilities</TableCell>
                        <TableCell className="text-right text-red-900">
                          ${longTermLiabilities.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-900">Owner's Equity</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.equity.length > 0 ? (
                        balanceSheetData.equity.map((item, index) => (
                          <TableRow key={index} className="border-gray-200">
                            <TableCell className="text-gray-900">{item.name}</TableCell>
                            <TableCell className="text-right text-gray-900">
                              {item.amount < 0
                                ? `(${Math.abs(item.amount).toLocaleString()})`
                                : `$${item.amount.toLocaleString()}`}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-gray-500 italic">No equity accounts found</TableCell>
                          <TableCell className="text-right text-gray-500">$0</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-medium bg-green-50">
                        <TableCell className="text-green-900">Total Equity</TableCell>
                        <TableCell className="text-right text-green-900">${totalEquity.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t-2 pt-4">
                  <Table>
                    <TableBody>
                      <TableRow className="font-bold text-lg bg-blue-100">
                        <TableCell className="text-blue-900">TOTAL LIABILITIES & EQUITY</TableCell>
                        <TableCell className="text-right text-blue-900">
                          ${totalLiabilitiesAndEquity.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className={`${isBalanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isBalanced ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className={`text-lg font-semibold ${isBalanced ? "text-green-800" : "text-red-800"}`}>
                    Balance Sheet Status: {isBalanced ? "Balanced" : "Unbalanced"}
                  </p>
                </div>
                {!isBalanced && (
                  <p className="text-red-600 mt-2">
                    Difference: ${Math.abs(totalAssets - totalLiabilitiesAndEquity).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
