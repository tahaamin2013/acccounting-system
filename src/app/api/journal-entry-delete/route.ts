import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { entryId, companyId } = await request.json()

    if (!entryId) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    // Verify the user has access to this company
    const userCompany = await prisma.userCompany.findFirst({
      where: {
        userId: decoded.userId,
        companyId: companyId,
      },
    })

    if (!userCompany) {
      return NextResponse.json({ error: "Access denied to this company" }, { status: 403 })
    }

    // Verify the journal entry exists and belongs to this company
    const journalEntry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        companyId: companyId,
      },
      include: {
        lines: true,
      },
    })

    if (!journalEntry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })
    }

    // Delete the journal entry and its lines (cascade delete should handle this)
    await prisma.$transaction(async (tx) => {
      // First delete all journal lines
      await tx.journalLine.deleteMany({
        where: {
          journalEntryId: entryId,
        },
      })

      // Then delete the journal entry
      await tx.journalEntry.delete({
        where: {
          id: entryId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: "Journal entry deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting journal entry:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
