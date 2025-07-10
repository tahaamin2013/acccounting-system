export interface JournalLine {
  accountName: string
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  debit: number | string
  credit: number | string
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  lines: JournalLine[]
}

export interface TrialBalanceItem {
  account: string
  debit: number
  credit: number
}

export interface AccountBalance {
  account: string
  balance: number
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
}
