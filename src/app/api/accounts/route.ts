import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Assuming you have this file
import { verifyToken } from "@/lib/auth" // Your existing auth.ts

/**
 * Handles GET requests to fetch accounts for a specific company.
 * Requires a valid JWT token in the Authorization header and a 'companyId' query parameter.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid Authorization header" }, { status: 401 })
  }

  const token = authHeader.split(" ")[1]
  const payload = verifyToken(token) // Using your verifyToken function
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
  }

  const companyId = req.nextUrl.searchParams.get("companyId")
  if (!companyId) {
    return NextResponse.json({ error: "Bad Request: Company ID is required as a query parameter" }, { status: 400 })
  }

  try {
    // Verify user has access to this company
    const userCompanyAccess = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: payload.userId,
          companyId: companyId,
        },
      },
    })

    if (!userCompanyAccess) {
      return NextResponse.json({ error: "Forbidden: User does not have access to this company" }, { status: 403 })
    }

    // Fetch accounts from the database using Prisma
    const accounts = await prisma.account.findMany({
      where: {
        companyId: companyId,
        // The client code in StatementOfAccounts.tsx filters for isActive: true
        // If you want the API to return all accounts regardless of status, remove this line.
        // For now, matching client's expected behavior.
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    })

    return NextResponse.json({ accounts })
  } catch (error: unknown) {
    console.error("Error fetching accounts:", error)
    let errorMessage = "Internal Server Error: Failed to fetch accounts"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage, details: errorMessage }, { status: 500 })
  }
}

/**
 * Handles POST requests to create a new account.
 * Requires a valid JWT token in the Authorization header and account details in the request body.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid Authorization header" }, { status: 401 })
  }

  const token = authHeader.split(" ")[1]
  const payload = verifyToken(token) // Using your verifyToken function
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
  }

  try {
    const { companyId, code, name, type } = await req.json()

    // Validate required fields
    if (!companyId || !code || !name || !type) {
      return NextResponse.json(
        { error: "Bad Request: Missing required fields (companyId, code, name, type)" },
        { status: 400 },
      )
    }

    // Validate account type against the defined enum values from your schema
    const validAccountTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
    if (!validAccountTypes.includes(type)) {
      return NextResponse.json(
        { error: `Bad Request: Invalid account type '${type}'. Must be one of ${validAccountTypes.join(", ")}` },
        { status: 400 },
      )
    }

    // Verify user has access to this company and appropriate role for creating accounts
    const userCompanyAccess = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: payload.userId,
          companyId: companyId,
        },
      },
    })

    if (!userCompanyAccess || !["OWNER", "ADMIN", "ACCOUNTANT"].includes(userCompanyAccess.role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions to create accounts" }, { status: 403 })
    }

    // Check if an account with the same code already exists for this company
    const existingAccount = await prisma.account.findUnique({
      where: {
        companyId_code: {
          // This is the unique constraint defined in your schema
          companyId: companyId,
          code: code,
        },
      },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: `Conflict: Account with code '${code}' already exists for this company.` },
        { status: 409 },
      )
    }

    // Insert the new account into the database using Prisma
    const newAccount = await prisma.account.create({
      data: {
        companyId: companyId,
        code: code,
        name: name,
        type: type,
        isActive: true, // Default to active
      },
    })

    return NextResponse.json({ message: "Account created successfully", account: newAccount }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating account:", error)
    // Handle Prisma unique constraint violation error specifically
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Conflict: An account with this code already exists for this company." },
        { status: 409 },
      )
    }
    let errorMessage = "Internal Server Error: Failed to create account"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage, details: errorMessage }, { status: 500 })
  }
}
