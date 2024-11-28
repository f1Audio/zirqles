import mongoose from 'mongoose'
import type { IUser } from './User'

export interface IPost {
  _id: mongoose.Types.ObjectId
  content: string
  author: mongoose.Types.ObjectId | IUser
  likes: mongoose.Types.ObjectId[]
  reposts: mongoose.Types.ObjectId[]
  replies: mongoose.Types.ObjectId[]
  replyTo?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new mongoose.Schema<IPost>({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
}, {
  timestamps: true,
})

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema) 