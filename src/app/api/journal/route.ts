import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, checkUserCompanyAccess, createJournalEntry, getJournalEntries } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { companyId, date, description, reference, lines } = await request.json()

    // Validate input
    if (!companyId || !date || !description || !reference || !lines || lines.length === 0) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check if user has access to this company
    const access = await checkUserCompanyAccess(decoded.userId, companyId)
    if (!access || (access.role !== "OWNER" && access.role !== "ADMIN" && access.role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0)
    const totalCredits = lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({ error: "Journal entry must be balanced (debits must equal credits)" }, { status: 400 })
    }

    // Create journal entry
    const journalEntry = await createJournalEntry({
      companyId,
      userId: decoded.userId,
      date: new Date(date),
      description,
      reference,
      lines: lines.map((line: any) => ({
        accountName: line.account,
        description: line.description,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      })),
    })

    return NextResponse.json({
      message: "Journal entry created successfully",
      journalEntry,
    })
  } catch (error) {
    console.error("Journal entry creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const url = new URL(request.url)
    const companyId = url.searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    // Check if user has access to this company
    const access = await checkUserCompanyAccess(decoded.userId, companyId)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const journalEntries = await getJournalEntries(companyId)

    return NextResponse.json({ journalEntries })
  } catch (error) {
    console.error("Get journal entries error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
