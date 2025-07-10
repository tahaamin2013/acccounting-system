import { type NextRequest, NextResponse } from "next/server"
import { getCompanyById, updateCompany, checkUserCompanyAccess, verifyToken } from "@/lib/auth"

// Define a type for the context object, reflecting that params is now a Promise in Next.js 15 RC
interface RouteParamsContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteParamsContext) {
  try {
    // Await context.params to get the actual route parameters
    const { id } = await context.params

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
    const access = await checkUserCompanyAccess(decoded.userId, id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    const company = await getCompanyById(id)
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    return NextResponse.json({ company, role: access.role })
  } catch (error) {
    console.error("Get company error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteParamsContext) {
  try {
    // Await context.params to get the actual route parameters
    const { id } = await context.params

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
    const access = await checkUserCompanyAccess(decoded.userId, id)
    if (!access || (access.role !== "OWNER" && access.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    const updateData = await request.json()
    const company = await updateCompany(id, updateData)
    return NextResponse.json({
      message: "Company updated successfully",
      company,
    })
  } catch (error) {
    console.error("Update company error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
