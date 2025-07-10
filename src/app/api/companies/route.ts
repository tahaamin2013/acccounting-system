import { type NextRequest, NextResponse } from "next/server"
import { createCompany, addUserToCompany, getUserCompanies, verifyToken, initializeDefaultAccounts } from "@/lib/auth"

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

    const { name, description, industry, address, phone, email, taxId } = await request.json()

    // Validate input
    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    }

    // Create company
    const company = await createCompany({
      name,
      description,
      industry,
      address,
      phone,
      email,
      taxId,
      createdById: decoded.userId,
    })

    // Add user as owner of the company
    await addUserToCompany(decoded.userId, company.id, "OWNER")

    // Initialize default chart of accounts
    await initializeDefaultAccounts(company.id)

    return NextResponse.json({
      message: "Company created successfully",
      company,
    })
  } catch (error) {
    console.error("Company creation error:", error)
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

    const companies = await getUserCompanies(decoded.userId)

    return NextResponse.json({ companies })
  } catch (error) {
    console.error("Get companies error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
