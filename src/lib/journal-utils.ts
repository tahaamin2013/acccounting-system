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

export interface TrialBalanceItem {
  account: string
  debit: number
  credit: number
}

export interface ProfitLossData {
  revenue: { name: string; amount: number }[]
  expenses: { name: string; amount: number }[]
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

export interface BalanceSheetData {
  assets: {
    current: { name: string; amount: number }[]
    nonCurrent: { name: string; amount: number }[]
  }
  liabilities: {
    current: { name: string; amount: number }[]
    longTerm: { name: string; amount: number }[]
  }
  equity: { name: string; amount: number }[]
}

export function calculateTrialBalance(journalEntries: JournalEntry[]): TrialBalanceItem[] {
  const accountBalances = new Map<string, { debit: number; credit: number }>()
  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const existing = accountBalances.get(line.accountName) || { debit: 0, credit: 0 }
      accountBalances.set(line.accountName, {
        debit: existing.debit + Number(line.debit),
        credit: existing.credit + Number(line.credit),
      })
    })
  })
  return Array.from(accountBalances.entries()).map(([account, balances]) => ({
    account,
    debit: balances.debit,
    credit: balances.credit,
  }))
}

export function calculateProfitLoss(journalEntries: JournalEntry[], accounts: Account[]): ProfitLossData {
  const accountBalances = new Map<string, number>()
  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const account = accounts.find((a) => a.name === line.accountName)
      if (!account) return
      const existing = accountBalances.get(line.accountName) || 0
      if (account.type === "REVENUE") {
        accountBalances.set(line.accountName, existing + Number(line.credit) - Number(line.debit))
      } else if (account.type === "EXPENSE") {
        accountBalances.set(line.accountName, existing + Number(line.debit) - Number(line.credit))
      }
    })
  })

  const revenue: { name: string; amount: number }[] = []
  const expenses: { name: string; amount: number }[] = []

  accounts.forEach((account) => {
    const balance = accountBalances.get(account.name) || 0
    if (balance !== 0) {
      if (account.type === "REVENUE") {
        revenue.push({ name: account.name, amount: balance })
      } else if (account.type === "EXPENSE") {
        expenses.push({ name: account.name, amount: balance })
      }
    }
  })

  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
  const netIncome = totalRevenue - totalExpenses

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome }
}

export function calculateBalanceSheet(journalEntries: JournalEntry[], accounts: Account[]): BalanceSheetData {
  const accountBalances = new Map<string, number>()

  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const account = accounts.find((a) => a.name === line.accountName)
      if (!account) return

      const existing = accountBalances.get(line.accountName) || 0

      if (account.type === "ASSET" || account.type === "EXPENSE") {
        accountBalances.set(line.accountName, existing + Number(line.debit) - Number(line.credit))
      } else {
        // LIABILITY, EQUITY, REVENUE
        accountBalances.set(line.accountName, existing + Number(line.credit) - Number(line.debit))
      }
    })
  })

  const assets: { current: { name: string; amount: number }[]; nonCurrent: { name: string; amount: number }[] } = {
    current: [],
    nonCurrent: [],
  }
  const liabilities: { current: { name: string; amount: number }[]; longTerm: { name: string; amount: number }[] } = {
    current: [],
    longTerm: [],
  }
  const equity: { name: string; amount: number }[] = [] // Explicitly type the equity array

  accounts.forEach((account) => {
    const balance = accountBalances.get(account.name) || 0
    if (balance !== 0) {
      if (account.type === "ASSET") {
        // Simple categorization - you can enhance this based on account names
        if (
          account.name.toLowerCase().includes("cash") ||
          account.name.toLowerCase().includes("receivable") ||
          account.name.toLowerCase().includes("inventory")
        ) {
          assets.current.push({ name: account.name, amount: balance })
        } else {
          assets.nonCurrent.push({ name: account.name, amount: balance })
        }
      } else if (account.type === "LIABILITY") {
        if (account.name.toLowerCase().includes("payable") || account.name.toLowerCase().includes("accrued")) {
          liabilities.current.push({ name: account.name, amount: balance })
        } else {
          liabilities.longTerm.push({ name: account.name, amount: balance })
        }
      } else if (account.type === "EQUITY") {
        equity.push({ name: account.name, amount: balance })
      }
    }
  })

  return { assets, liabilities, equity }
}
