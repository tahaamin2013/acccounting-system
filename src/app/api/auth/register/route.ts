import { type NextRequest, NextResponse } from "next/server"
import { createUser, findUserByEmail, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Create user
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
    })

    // Generate token
    const token = generateToken(user.id)

    // Return success response
    return NextResponse.json({
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: `Internal server error ${error}` }, { status: 500 })
  }
}