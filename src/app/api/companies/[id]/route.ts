import { type NextRequest, NextResponse } from "next/server"
import { getCompanyById, updateCompany, checkUserCompanyAccess, verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if user has access to this company
    const access = await checkUserCompanyAccess(decoded.userId, params.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const company = await getCompanyById(params.id)
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({ company, role: access.role })
  } catch (error) {
    console.error("Get company error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if user has admin access to this company
    const access = await checkUserCompanyAccess(decoded.userId, params.id)
    if (!access || (access.role !== "OWNER" && access.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const updateData = await request.json()
    const company = await updateCompany(params.id, updateData)

    return NextResponse.json({
      message: "Company updated successfully",
      company,
    })
  } catch (error) {
    console.error("Update company error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
