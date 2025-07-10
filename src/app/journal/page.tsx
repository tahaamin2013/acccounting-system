"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, X, Check, AlertCircle, BookOpen, Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface JournalEntry {
  id: string
  date: string
  description: string
  reference: string
  lines: JournalLine[]
  user?: {
    firstName: string
    lastName: string
  }
}

interface JournalLine {
  id: string
  accountName: string
  description: string
  debit: number
  credit: number
}

interface NewJournalLine {
  account: string
  description: string
  debit: string
  credit: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

export default function Journal() {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
  })
  const [journalLines, setJournalLines] = useState<NewJournalLine[]>([])
  const [currentLine, setCurrentLine] = useState<NewJournalLine>({
    account: "",
    description: "",
    debit: "",
    credit: "",
  })

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchAccounts = async () => {
    if (!currentCompany) return
    try {
      const response = await fetch(`/api/accounts?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }

  const fetchJournalEntries = async () => {
    if (!currentCompany) return
    try {
      const response = await fetch(`/api/journal?companyId=${currentCompany.id}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setEntries(data.journalEntries)
      }
    } catch (error) {
      console.error("Error fetching journal entries:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteJournalEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this journal entry? This action cannot be undone.")) {
      return
    }

    setDeletingId(entryId)
    try {
      const response = await fetch("/api/journal-entry-delete", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          entryId: entryId,
          companyId: currentCompany?.id,
        }),
      })

      if (response.ok) {
        // Remove the entry from the local state
        setEntries(entries.filter((entry) => entry.id !== entryId))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete journal entry")
      }
    } catch (error) {
      console.error("Error deleting journal entry:", error)
      alert("Failed to delete journal entry")
    } finally {
      setDeletingId(null)
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
    fetchAccounts()
    fetchJournalEntries()
  }, [currentCompany, user, router])

  const totalDebits = journalLines.reduce((sum, line) => sum + (Number.parseFloat(line.debit) || 0), 0)
  const totalCredits = journalLines.reduce((sum, line) => sum + (Number.parseFloat(line.credit) || 0), 0)
  const isBalanced = totalDebits === totalCredits && totalDebits > 0

  const allEntryDebits = entries.reduce(
    (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit), 0),
    0,
  )
  const allEntryCredits = entries.reduce(
    (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit), 0),
    0,
  )

  const addLine = () => {
    if (!currentLine.account || (!currentLine.debit && !currentLine.credit)) {
      return
    }
    if (currentLine.debit && currentLine.credit) {
      alert("A line cannot have both debit and credit amounts")
      return
    }

    const newLine: NewJournalLine = {
      account: currentLine.account,
      description: currentLine.description || newEntry.description,
      debit: currentLine.debit || "0",
      credit: currentLine.credit || "0",
    }

    setJournalLines([...journalLines, newLine])
    setCurrentLine({
      account: "",
      description: "",
      debit: "",
      credit: "",
    })
  }

  const removeLine = (index: number) => {
    setJournalLines(journalLines.filter((_, i) => i !== index))
  }

  const saveJournalEntry = async () => {
    if (!isBalanced) {
      alert("Journal entry must be balanced (Total Debits = Total Credits)")
      return
    }
    if (!newEntry.description || !newEntry.reference) {
      alert("Please fill in description and reference")
      return
    }
    if (!currentCompany) {
      alert("Please select a company")
      return
    }

    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId: currentCompany.id,
          date: newEntry.date,
          description: newEntry.description,
          reference: newEntry.reference,
          lines: journalLines.map((line) => ({
            account: line.account,
            description: line.description,
            debit: Number.parseFloat(line.debit) || 0,
            credit: Number.parseFloat(line.credit) || 0,
          })),
        }),
      })

      if (response.ok) {
        // Reset form
        setNewEntry({
          date: new Date().toISOString().split("T")[0],
          description: "",
          reference: "",
        })
        setJournalLines([])
        setShowForm(false)
        // Refresh entries
        await fetchJournalEntries()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to create journal entry")
      }
    } catch (error) {
      console.error("Error creating journal entry:", error)
      alert("Failed to create journal entry")
    }
  }

  const cancelEntry = () => {
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
    })
    setJournalLines([])
    setCurrentLine({
      account: "",
      description: "",
      debit: "",
      credit: "",
    })
    setShowForm(false)
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
                Please select a company from the dashboard to access journal entries.
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
          <h1 className="text-4xl font-bold mb-2 text-white">Journal Entries</h1>
          <p className="text-gray-400 text-lg">{currentCompany.name} • Record and manage transactions</p>
        </div>

        <Navigation />

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <Calculator className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Debits</p>
                      <p className="text-3xl font-bold text-white">${allEntryDebits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <Calculator className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Credits</p>
                      <p className="text-3xl font-bold text-white">${allEntryCredits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Status</p>
                      <Badge
                        className={
                          allEntryDebits === allEntryCredits ? "bg-blue-500 text-white" : "bg-red-600 text-white"
                        }
                      >
                        {allEntryDebits === allEntryCredits ? "Balanced" : "Unbalanced"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => setShowForm(!showForm)} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>

          {showForm && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  New Journal Entry
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Create a balanced journal entry (Debits must equal Credits)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Entry Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date" className="text-white">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference" className="text-white">
                      Reference
                    </Label>
                    <Input
                      id="reference"
                      placeholder="JE003"
                      value={newEntry.reference}
                      onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-white">
                      Description
                    </Label>
                    <Input
                      id="description"
                      placeholder="Transaction description"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Add Line Form */}
                <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="font-medium mb-4 text-white">Add Account Line</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <Label htmlFor="account" className="text-white">
                        Account
                      </Label>
                      <Select
                        value={currentLine.account}
                        onValueChange={(value) => setCurrentLine({ ...currentLine, account: value })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.name} className="text-white hover:bg-gray-800">
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="lineDescription" className="text-white">
                        Line Description
                      </Label>
                      <Input
                        id="lineDescription"
                        placeholder="Optional"
                        value={currentLine.description}
                        onChange={(e) => setCurrentLine({ ...currentLine, description: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="debit" className="text-white">
                        Debit Amount
                      </Label>
                      <Input
                        id="debit"
                        type="number"
                        placeholder="0.00"
                        value={currentLine.debit}
                        onChange={(e) => setCurrentLine({ ...currentLine, debit: e.target.value, credit: "" })}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit" className="text-white">
                        Credit Amount
                      </Label>
                      <Input
                        id="credit"
                        type="number"
                        placeholder="0.00"
                        value={currentLine.credit}
                        onChange={(e) => setCurrentLine({ ...currentLine, credit: e.target.value, debit: "" })}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={addLine}
                        disabled={!currentLine.account}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Line
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Journal Lines */}
                {journalLines.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4 text-white">Journal Entry Lines</h3>
                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700 hover:bg-gray-700">
                            <TableHead className="text-gray-300">Account</TableHead>
                            <TableHead className="text-gray-300">Description</TableHead>
                            <TableHead className="text-right text-gray-300">Debit</TableHead>
                            <TableHead className="text-right text-gray-300">Credit</TableHead>
                            <TableHead className="text-gray-300">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {journalLines.map((line, index) => (
                            <TableRow key={index} className="border-gray-700 hover:bg-gray-700">
                              <TableCell className="text-white">{line.account}</TableCell>
                              <TableCell className="text-gray-300">{line.description}</TableCell>
                              <TableCell className="text-right text-white">
                                {Number.parseFloat(line.debit) > 0
                                  ? `$${Number.parseFloat(line.debit).toLocaleString()}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right text-white">
                                {Number.parseFloat(line.credit) > 0
                                  ? `$${Number.parseFloat(line.credit).toLocaleString()}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLine(index)}
                                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 border-gray-600 font-bold">
                            <TableCell colSpan={2} className="text-white">
                              TOTALS
                            </TableCell>
                            <TableCell className="text-right text-white">${totalDebits.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-white">${totalCredits.toLocaleString()}</TableCell>
                            <TableCell>
                              {isBalanced ? (
                                <Check className="h-4 w-4 text-blue-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Balance Status */}
                {journalLines.length > 0 && (
                  <Alert
                    className={`${isBalanced ? "border-blue-500 bg-blue-500/10" : "border-red-500 bg-red-500/10"}`}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className={isBalanced ? "text-blue-400" : "text-red-400"}>
                      {isBalanced
                        ? "✓ Journal entry is balanced and ready to save"
                        : `⚠ Entry is unbalanced. Difference: $${Math.abs(totalDebits - totalCredits).toLocaleString()}`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={saveJournalEntry}
                    disabled={!isBalanced || journalLines.length === 0}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save Journal Entry
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEntry}
                    className="border-gray-700 text-white hover:bg-gray-800 bg-black"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Journal Entries
              </CardTitle>
              <CardDescription className="text-gray-400">
                All recorded transactions for {currentCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {entries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No journal entries found. Create your first entry above.</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-white text-lg">
                            {entry.reference} - {entry.description}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Date: {new Date(entry.date).toLocaleDateString()}
                            {entry.user && ` • Created by: ${entry.user.firstName} ${entry.user.lastName}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteJournalEntry(entry.id)}
                            disabled={deletingId === entry.id}
                            className="text-gray-400 hover:text-red-400 hover:bg-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-600 hover:bg-gray-600">
                              <TableHead className="text-gray-300">Account</TableHead>
                              <TableHead className="text-gray-300">Description</TableHead>
                              <TableHead className="text-right text-gray-300">Debit</TableHead>
                              <TableHead className="text-right text-gray-300">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entry.lines.map((line) => (
                              <TableRow key={line.id} className="border-gray-600 hover:bg-gray-600">
                                <TableCell className="text-white">{line.accountName}</TableCell>
                                <TableCell className="text-gray-300">{line.description}</TableCell>
                                <TableCell className="text-right text-white">
                                  {Number(line.debit) > 0 ? `$${Number(line.debit).toLocaleString()}` : "-"}
                                </TableCell>
                                <TableCell className="text-right text-white">
                                  {Number(line.credit) > 0 ? `$${Number(line.credit).toLocaleString()}` : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t border-gray-600 font-semibold">
                              <TableCell colSpan={2} className="text-white">
                                Entry Totals
                              </TableCell>
                              <TableCell className="text-right text-white">
                                ${entry.lines.reduce((sum, line) => sum + Number(line.debit), 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-white">
                                ${entry.lines.reduce((sum, line) => sum + Number(line.credit), 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
// This code is a React component for managing journal entries in an accounting application.