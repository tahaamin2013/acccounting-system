"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Check, Edit, FolderOpen, Plus, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCompany } from "@/contexts/company-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"

// Define the Account interface
interface Account {
  id: string
  companyId: string
  code: string
  name: string
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" // This is the strict type
  isActive: boolean
  createdAt: string // Assuming these are strings from the API
  updatedAt: string
}

// Define an interface for the form state, where 'type' can be a generic string
interface NewAccountFormState {
  code: string
  name: string
  type: string // Allow string for form input before validation
}

const accountTypes = [
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "EQUITY", label: "Equity" },
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expense" },
]

const StatementOfAccounts = () => {
  const { currentCompany } = useCompany()
  const { user } = useAuth()
  const router = useRouter()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newAccount, setNewAccount] = useState<NewAccountFormState>({
    code: "",
    name: "",
    type: "",
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
        const data: { accounts: Account[] } = await response.json() // Explicitly type the incoming data
        setAccounts(data.accounts)
      } else {
        console.error("Failed to fetch accounts, status:", response.status)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching accounts:", error.message)
      } else {
        console.error("An unknown error occurred while fetching accounts:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account? This action cannot be undone.")) {
      return
    }
    setDeletingId(accountId)
    try {
      const response = await fetch("/api/account-delete", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          accountId: accountId,
          companyId: currentCompany?.id,
        }),
      })

      if (response.ok) {
        setAccounts(accounts.filter((account) => account.id !== accountId))
        alert("Account deleted successfully!")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete account")
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting account:", error.message)
        alert(`Failed to delete account: ${error.message}`)
      } else {
        console.error("An unknown error occurred while deleting account:", error)
        alert("Failed to delete account due to an unknown error.")
      }
    } finally {
      setDeletingId(null)
    }
  }

  const editAccount = (account: Account) => {
    setEditingAccount(account)
    setNewAccount({
      code: account.code,
      name: account.name,
      type: account.type, // This is already a valid type from the Account object
    })
    setShowForm(true)
  }

  const saveAccount = async () => {
    if (!newAccount.code || !newAccount.name || !newAccount.type) {
      alert("Please fill in all fields")
      return
    }
    if (!currentCompany) {
      alert("Please select a company")
      return
    }

    // Client-side validation for account type
    const validAccountTypeValues = accountTypes.map((t) => t.value)
    if (!validAccountTypeValues.includes(newAccount.type)) {
      alert(`Invalid account type '${newAccount.type}'. Must be one of ${validAccountTypeValues.join(", ")}`)
      return
    }

    try {
      const isEditing = editingAccount !== null
      const url = isEditing ? "/api/account-update" : "/api/account-create"
      const body = isEditing
        ? {
            accountId: editingAccount?.id,
            companyId: currentCompany.id,
            code: newAccount.code,
            name: newAccount.name,
            type: newAccount.type as Account["type"], // Cast after validation
          }
        : {
            companyId: currentCompany.id,
            code: newAccount.code,
            name: newAccount.name,
            type: newAccount.type as Account["type"], // Cast after validation
          }

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const result: { account: Account } = await response.json() // Explicitly type the incoming data
        if (isEditing) {
          setAccounts(
            accounts.map((acc) =>
              acc.id === editingAccount?.id
                ? { ...acc, code: newAccount.code, name: newAccount.name, type: newAccount.type as Account["type"] } // Cast here
                : acc,
            ),
          )
          alert("Account updated successfully!")
        } else {
          setAccounts([...accounts, result.account])
          alert("Account created successfully!")
        }
        setNewAccount({ code: "", name: "", type: "" })
        setEditingAccount(null)
        setShowForm(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || `Failed to ${isEditing ? "update" : "create"} account`)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error ${editingAccount ? "updating" : "creating"} account:`, error.message)
        alert(`Network error: ${error.message}`)
      } else {
        console.error(`An unknown error occurred while ${editingAccount ? "updating" : "creating"} account:`, error)
        alert(`Network error: An unknown error occurred.`)
      }
    }
  }

  const cancelForm = () => {
    setNewAccount({ code: "", name: "", type: "" })
    setEditingAccount(null)
    setShowForm(false)
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
  }, [currentCompany, user, router])

  const groupedAccounts = accountTypes.map((type) => ({
    ...type,
    accounts: accounts.filter((account) => account.type === type.value),
  }))

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

  if (!user) {
    return null
  }

  if (!currentCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">No Company Selected</CardTitle>
              <CardDescription className="text-gray-600">
                Please select a company from the dashboard to access accounts.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 text-lg">{currentCompany.name} • Manage your account structure</p>
        </div>
        <Navigation />
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FolderOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Accounts</p>
                      <p className="text-3xl font-bold text-gray-900">{accounts.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Check className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Active Accounts</p>
                      <p className="text-3xl font-bold text-gray-900">{accounts.filter((a) => a.isActive).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
          {showForm && (
            <Card className="border-blue-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-3">
                  <Plus className="h-5 w-5 text-blue-600" />
                  {editingAccount ? "Edit Account" : "Add New Account"}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {editingAccount ? "Update the account details" : "Create a new account in your chart of accounts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="code" className="text-gray-700 font-medium">
                      Account Code
                    </Label>
                    <Input
                      id="code"
                      placeholder="1000"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      Account Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Cash"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type" className="text-gray-700 font-medium">
                      Account Type
                    </Label>
                    <Select
                      value={newAccount.type}
                      onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-gray-900 hover:bg-gray-100">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={saveAccount} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Check className="h-4 w-4 mr-2" />
                    {editingAccount ? "Update Account" : "Save Account"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelForm}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {groupedAccounts.map((group) => (
            <Card key={group.value} className="border-blue-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    {group.label} Accounts
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {group.accounts.length} accounts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {group.accounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 hover:bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Account Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.accounts.map((account) => (
                        <TableRow key={account.id} className="border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-mono font-medium text-gray-900">{account.code}</TableCell>
                          <TableCell className="font-medium text-gray-900">{account.name}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{account.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                account.isActive
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                              }
                            >
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editAccount(account)}
                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAccount(account.id)}
                                disabled={deletingId === account.id}
                                className="text-gray-600 hover:text-red-600 hover:bg-gray-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No {group.label.toLowerCase()} accounts found. Add one above.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StatementOfAccounts
