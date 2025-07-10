import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../lib/auth"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create a demo user
  const hashedPassword = await hashPassword("password123")

  const user = await prisma.user.upsert({
    where: { email: "demo@accountech.com" },
    update: {},
    create: {
      email: "demo@accountech.com",
      password: hashedPassword,
      firstName: "Demo",
      lastName: "User",
    },
  })

  console.log("✅ Created demo user:", user.email)

  // Create a demo company
  const company = await prisma.company.upsert({
    where: { id: "demo-company-id" },
    update: {},
    create: {
      id: "demo-company-id",
      name: "Demo Company Inc.",
      description: "A sample company for demonstration purposes",
      industry: "Technology",
      address: "123 Demo Street, Demo City, DC 12345",
      phone: "+1 (555) 123-4567",
      email: "info@democompany.com",
      taxId: "12-3456789",
      createdById: user.id,
    },
  })

  console.log("✅ Created demo company:", company.name)

  // Add user to company as owner
  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      companyId: company.id,
      role: "OWNER",
    },
  })

  console.log("✅ Added user to company as owner")

  // Create default chart of accounts
  const accounts = [
    // Assets
    { code: "1000", name: "Cash", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1500", name: "Equipment", type: "ASSET" },
    { code: "1600", name: "Accumulated Depreciation - Equipment", type: "ASSET" },

    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "2500", name: "Long-term Debt", type: "LIABILITY" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" },

    // Revenue
    { code: "4000", name: "Sales Revenue", type: "REVENUE" },
    { code: "4100", name: "Service Revenue", type: "REVENUE" },

    // Expenses
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
    { code: "6000", name: "Salaries Expense", type: "EXPENSE" },
    { code: "6100", name: "Rent Expense", type: "EXPENSE" },
    { code: "6200", name: "Utilities Expense", type: "EXPENSE" },
    { code: "6300", name: "Office Supplies Expense", type: "EXPENSE" },
    { code: "6400", name: "Insurance Expense", type: "EXPENSE" },
    { code: "6500", name: "Depreciation Expense", type: "EXPENSE" },
  ]

  for (const account of accounts) {
    await prisma.account.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        code: account.code,
        name: account.name,
        type: account.type as any,
      },
    })
  }

  console.log("✅ Created default chart of accounts")

  // Create some sample journal entries
  const journalEntry1 = await prisma.journalEntry.create({
    data: {
      companyId: company.id,
      userId: user.id,
      date: new Date("2024-01-15"),
      description: "Initial capital investment",
      reference: "JE001",
      lines: {
        create: [
          {
            accountName: "Cash",
            description: "Initial investment",
            debit: 50000,
            credit: 0,
          },
          {
            accountName: "Owner's Equity",
            description: "Initial investment",
            debit: 0,
            credit: 50000,
          },
        ],
      },
    },
  })

  const journalEntry2 = await prisma.journalEntry.create({
    data: {
      companyId: company.id,
      userId: user.id,
      date: new Date("2024-01-16"),
      description: "Purchase of office supplies",
      reference: "JE002",
      lines: {
        create: [
          {
            accountName: "Office Supplies Expense",
            description: "Office supplies purchase",
            debit: 250,
            credit: 0,
          },
          {
            accountName: "Cash",
            description: "Payment for office supplies",
            debit: 0,
            credit: 250,
          },
        ],
      },
    },
  })

  console.log("✅ Created sample journal entries")
  console.log("🎉 Seeding completed!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
