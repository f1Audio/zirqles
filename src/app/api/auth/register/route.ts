import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import { validatePassword } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json()
    
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

    console.log('Received data:', { username, email, password })
    await dbConnect()
    console.log('Database connected successfully')

    // Check if user already exists (by email or username)
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      console.log('Existing user found:', existingUser)
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
    console.log('Password hashed successfully')

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    })
    console.log('New user created:', newUser)

    // Return only necessary user data
    const userData = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email
    }

    return NextResponse.json(userData, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: error instanceof Error && error.name === 'MongoServerError' ? 400 : 500 }
    )
  }
}
