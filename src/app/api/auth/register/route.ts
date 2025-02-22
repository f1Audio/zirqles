import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import { validatePassword, validateUsername } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json()
    
    // Add username validation
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid username', 
        message: usernameValidation.message 
      }, { status: 400 })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid password', 
        message: passwordValidation.missing[0]
      }, { status: 400 })
    }

    // Update length validation
    if (username.length > 24) {
      return NextResponse.json({ 
        error: 'Username too long', 
        message: 'Username cannot be longer than 24 characters' 
      }, { status: 400 })
    }

    await dbConnect()

    // Check if user already exists (by email or username)
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json({ 
          error: 'Email already exists', 
          message: 'The email you entered is already associated with an account. Please use a different email.' 
        }, { status: 400 })
      }
      if (existingUser.username === username) {
        return NextResponse.json({ 
          error: 'Username already taken', 
          message: 'The username you chose is already taken. Please try a different username.' 
        }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      name: username,
    })

    // Return only necessary user data
    const userData = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email
    }

    return NextResponse.json(userData, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: error instanceof Error && error.name === 'MongoServerError' ? 400 : 500 }
    )
  }
}
