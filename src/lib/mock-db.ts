import { v4 as uuidv4 } from "uuid"

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
  companyId: string // Added companyId to mock entries
}

interface JournalLine {
  id: string
  accountName: string
  description: string
  debit: number
  credit: number
}

// This will act as our in-memory "database"
export const mockJournalEntries: JournalEntry[] = [
  {
    id: uuidv4(),
    date: "2023-01-15",
    description: "Initial Capital Contribution",
    reference: "JE001",
    lines: [
      { id: uuidv4(), accountName: "Cash", description: "Cash received", debit: 10000, credit: 0 },
      { id: uuidv4(), accountName: "Owner's Equity", description: "Owner's investment", debit: 0, credit: 10000 },
    ],
    user: { firstName: "John", lastName: "Doe" },
    companyId: "company123", // Example company ID
  },
  {
    id: uuidv4(),
    date: "2023-01-20",
    description: "Purchase of Office Supplies",
    reference: "JE002",
    lines: [
      { id: uuidv4(), accountName: "Office Supplies", description: "Bought pens and paper", debit: 500, credit: 0 },
      { id: uuidv4(), accountName: "Cash", description: "Paid for supplies", debit: 0, credit: 500 },
    ],
    user: { firstName: "Jane", lastName: "Smith" },
    companyId: "company123", // Example company ID
  },
]

// You might also want mock accounts
export const mockAccounts = [
  { id: uuidv4(), code: "101", name: "Cash", type: "Asset" },
  { id: uuidv4(), code: "201", name: "Accounts Payable", type: "Liability" },
  { id: uuidv4(), code: "301", name: "Owner's Equity", type: "Equity" },
  { id: uuidv4(), code: "401", name: "Sales Revenue", type: "Revenue" },
  { id: uuidv4(), code: "501", name: "Office Supplies", type: "Asset" },
]
