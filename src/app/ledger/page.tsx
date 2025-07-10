"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface JournalEntry {
  id: string
  date: string
  description: string
  reference: string
  lines: JournalLine[]
}

interface JournalLine {
  id: string
  accountName: string
  description: string
  debit: number
  credit: number
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface AccountLedger {
  account: Account
  entries: {
    date: string
    description: string
    reference: string
    debit: number
    credit: number
    balance: number
  }[]
  balance: number
}

export default function Ledger() {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()
  const [ledgers, setLedgers] = useState<AccountLedger[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  console.log("Current Company:", accounts)
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
      // Fetch accounts
      const accountsResponse = await fetch(`/api/accounts?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })

      // Fetch journal entries
      const journalResponse = await fetch(`/api/journal?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })

      if (accountsResponse.ok && journalResponse.ok) {
        const accountsData = await accountsResponse.json()
        const journalData = await journalResponse.json()

        setAccounts(accountsData.accounts)

        // Process ledger data
        const ledgerData = processLedgerData(accountsData.accounts, journalData.journalEntries)
        setLedgers(ledgerData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const processLedgerData = (accounts: Account[], journalEntries: JournalEntry[]): AccountLedger[] => {
    const ledgerMap = new Map<string, AccountLedger>()

    // Initialize ledgers for all accounts
    accounts.forEach((account) => {
      ledgerMap.set(account.name, {
        account,
        entries: [],
        balance: 0,
      })
    })

    // Process journal entries
    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const ledger = ledgerMap.get(line.accountName)
        if (ledger) {
          const debit = Number(line.debit)
          const credit = Number(line.credit)

          // Calculate running balance based on account type
          let balanceChange = 0
          if (["ASSET", "EXPENSE"].includes(ledger.account.type)) {
            balanceChange = debit - credit
          } else {
            balanceChange = credit - debit
          }

          ledger.balance += balanceChange

          ledger.entries.push({
            date: entry.date,
            description: line.description || entry.description,
            reference: entry.reference,
            debit,
            credit,
            balance: ledger.balance,
          })
        }
      })
    })

    // Sort entries by date
    ledgerMap.forEach((ledger) => {
      ledger.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })

    return Array.from(ledgerMap.values()).filter((ledger) => ledger.entries.length > 0)
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

  const groupedLedgers = {
    assets: ledgers.filter((l) => l.account.type === "ASSET"),
    liabilities: ledgers.filter((l) => l.account.type === "LIABILITY"),
    equity: ledgers.filter((l) => l.account.type === "EQUITY"),
    revenue: ledgers.filter((l) => l.account.type === "REVENUE"),
    expenses: ledgers.filter((l) => l.account.type === "EXPENSE"),
  }

  function AccountTable({ ledgers }: { ledgers: AccountLedger[] }) {
    if (ledgers.length === 0) {
      return <div className="text-center py-8 text-gray-500">No transactions found for this account type.</div>
    }

    return (
      <div className="space-y-6">
        {ledgers.map((ledger) => (
          <Card key={ledger.account.id} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>
                  {ledger.account.code} - {ledger.account.name}
                </span>
                <Badge className="bg-blue-500 text-white">Balance: ${ledger.balance.toLocaleString()}</Badge>
              </CardTitle>
              <CardDescription className="text-gray-400">Account ledger entries</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-800">
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Reference</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-right text-gray-300">Debit</TableHead>
                    <TableHead className="text-right text-gray-300">Credit</TableHead>
                    <TableHead className="text-right text-gray-300">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.entries.map((entry, index) => (
                    <TableRow key={index} className="border-gray-800 hover:bg-gray-800">
                      <TableCell className="text-white">{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-white">{entry.reference}</TableCell>
                      <TableCell className="text-white">{entry.description}</TableCell>
                      <TableCell className="text-right text-white">
                        {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-white">
                        ${entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!currentCompany) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto p-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">No Company Selected</CardTitle>
              <CardDescription className="text-gray-400">
                Please select a company from the dashboard to access the ledger.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-white">General Ledger</h1>
          <p className="text-gray-400 text-lg">{currentCompany.name} • View account balances and transaction history</p>
        </div>

        <Navigation />

        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-900 border border-gray-800">
            <TabsTrigger
              value="assets"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white"
            >
              Assets
            </TabsTrigger>
            <TabsTrigger
              value="liabilities"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white"
            >
              Liabilities
            </TabsTrigger>
            <TabsTrigger
              value="equity"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white"
            >
              Equity
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white"
            >
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <AccountTable ledgers={groupedLedgers.assets} />
          </TabsContent>

          <TabsContent value="liabilities">
            <AccountTable ledgers={groupedLedgers.liabilities} />
          </TabsContent>

          <TabsContent value="equity">
            <AccountTable ledgers={groupedLedgers.equity} />
          </TabsContent>

          <TabsContent value="revenue">
            <AccountTable ledgers={groupedLedgers.revenue} />
          </TabsContent>

          <TabsContent value="expenses">
            <AccountTable ledgers={groupedLedgers.expenses} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
