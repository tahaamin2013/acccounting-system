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

    const { accountId, companyId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
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

    // Verify the account exists and belongs to this company
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId: companyId,
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Check if the account is being used in any journal entries
    const journalLinesCount = await prisma.journalLine.count({
      where: {
        accountName: account.name,
        journalEntry: {
          companyId: companyId,
        },
      },
    })

    if (journalLinesCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete account "${account.name}" because it is being used in ${journalLinesCount} journal entries. Please remove or reassign these entries first.`,
        },
        { status: 400 },
      )
    }

    // Delete the account
    await prisma.account.delete({
      where: {
        id: accountId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
