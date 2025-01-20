import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/notification'
import mongoose from 'mongoose'

interface PopulatedComment {
// ... existing code ...
} 