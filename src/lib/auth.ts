import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"
import type { User, Company, UserCompany, Role } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export type { User, Company, UserCompany, Role }
export type CompanyWithRole = Company & { role: Role }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

export async function createUser(userData: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<User> {
  const hashedPassword = await hashPassword(userData.password)
  return await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
    },
  })
}

export async function createCompany(companyData: {
  name: string
  description?: string
  industry?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  createdById: string
}): Promise<Company> {
  return await prisma.company.create({
    data: companyData,
  })
}

export async function addUserToCompany(userId: string, companyId: string, role: Role = "OWNER"): Promise<UserCompany> {
  return await prisma.userCompany.create({
    data: {
      userId,
      companyId,
      role,
    },
  })
}

export async function getUserCompanies(userId: string): Promise<CompanyWithRole[]> {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    include: {
      company: true,
    },
    orderBy: {
      company: {
        createdAt: "desc",
      },
    },
  })
  return userCompanies.map((uc) => ({
    ...uc.company,
    role: uc.role,
  }))
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  return await prisma.company.findUnique({
    where: { id: companyId },
  })
}

export async function updateCompany(
  companyId: string,
  companyData: Partial<{
    name: string
    description: string
    industry: string
    address: string
    phone: string
    email: string
    taxId: string
  }>,
): Promise<Company> {
  return await prisma.company.update({
    where: { id: companyId },
    data: companyData,
  })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  })
}

export async function findUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  })
}

export async function checkUserCompanyAccess(userId: string, companyId: string): Promise<UserCompany | null> {
  return await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  })
}

// Journal Entry functions
export async function createJournalEntry(data: {
  companyId: string
  userId: string
  date: Date
  description: string
  reference: string
  lines: {
    accountName: string
    description?: string
    debit: number
    credit: number
  }[]
}) {
  return await prisma.journalEntry.create({
    data: {
      companyId: data.companyId,
      userId: data.userId,
      date: data.date,
      description: data.description,
      reference: data.reference,
      lines: {
        create: data.lines.map((line) => ({
          accountName: line.accountName,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
    include: {
      lines: true,
    },
  })
}

export async function getJournalEntries(companyId: string) {
  return await prisma.journalEntry.findMany({
    where: { companyId },
    include: {
      lines: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  })
}

export async function deleteJournalEntry(entryId: string, userId: string, companyId: string) {
  // Verify user has access to this company and entry
  const entry = await prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      companyId,
    },
  })
  if (!entry) {
    throw new Error("Journal entry not found")
  }
  const userAccess = await checkUserCompanyAccess(userId, companyId)
  if (!userAccess || (userAccess.role !== "OWNER" && userAccess.role !== "ADMIN" && userAccess.role !== "ACCOUNTANT")) {
    throw new Error("Insufficient permissions")
  }
  return await prisma.journalEntry.delete({
    where: { id: entryId },
  })
}

// Account functions
export async function createAccount(data: {
  companyId: string
  code: string
  name: string
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  parentId?: string
}) {
  return await prisma.account.create({
    data,
  })
}

export async function getCompanyAccounts(companyId: string) {
  return await prisma.account.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })
}

export async function initializeDefaultAccounts(companyId: string) {
  const defaultAccounts = [
    // Assets
    { code: "1000", name: "Cash", type: "ASSET" as const },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
    { code: "1200", name: "Inventory", type: "ASSET" as const },
    { code: "1500", name: "Equipment", type: "ASSET" as const },
    { code: "1600", name: "Accumulated Depreciation - Equipment", type: "ASSET" as const },
    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
    { code: "2100", name: "Accrued Expenses", type: "LIABILITY" as const },
    { code: "2500", name: "Long-term Debt", type: "LIABILITY" as const },
    // Equity
    { code: "3000", name: "Owner's Equity", type: "EQUITY" as const },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" as const },
    // Revenue
    { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
    { code: "4100", name: "Service Revenue", type: "REVENUE" as const },
    // Expenses
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
    { code: "6000", name: "Salaries Expense", type: "EXPENSE" as const },
    { code: "6100", name: "Rent Expense", type: "EXPENSE" as const },
    { code: "6200", name: "Utilities Expense", type: "EXPENSE" as const },
    { code: "6300", name: "Office Supplies Expense", type: "EXPENSE" as const },
    { code: "6400", name: "Insurance Expense", type: "EXPENSE" as const },
    { code: "6500", name: "Depreciation Expense", type: "EXPENSE" as const },
  ]
  for (const account of defaultAccounts) {
    try {
      await createAccount({
        companyId,
        ...account,
      })
    } catch {
      // Account might already exist, continue
      console.log(`Account ${account.code} might already exist`)
    }
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
