import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

// Define an interface for the JWT payload
interface JwtPayload {
  userId: string
  // Add other properties if your JWT payload contains them
  [key: string]: any // Allow for other properties if they exist
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: JwtPayload // Specify the type for decoded
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
      // Ensure verified is an object and has userId
      if (typeof verified === "object" && verified !== null && "userId" in verified) {
        decoded = verified as JwtPayload
      } else {
        return NextResponse.json({ error: "Invalid token payload" }, { status: 401 })
      }
    } catch (error: unknown) {
      // Log the error for debugging, but don't expose sensitive details to the client
      console.error("JWT verification failed:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { entryId, companyId } = (await request.json()) as { entryId: string; companyId: string }

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

    // Delete the journal entry and its lines (cascade delete should handle this,
    // but explicit deletion is safer if cascade is not perfectly configured or understood)
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
  } catch (error: unknown) {
    console.error("Error deleting journal entry:", error)
    let errorMessage = "Internal server error"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
