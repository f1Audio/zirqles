import mongoose from 'mongoose'
import type { IUser } from './User'

export interface IPost {
  _id: mongoose.Types.ObjectId
  content: string
  author: mongoose.Types.ObjectId | IUser
  likes: mongoose.Types.ObjectId[]
  reposts: mongoose.Types.ObjectId[]
  comments: mongoose.Types.ObjectId[]
  type: 'post' | 'comment'
  media: Array<{
    type: 'image' | 'video'
    url: string
    key: string
  }>
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new mongoose.Schema<IPost>({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: {
    type: [{
      type: { type: String, enum: ['image', 'video'], required: true },
      url: { type: String, required: true },
      key: { type: String, required: true }
    }],
    default: []
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  type: { type: String, enum: ['post', 'comment'], required: true, default: 'post' },
}, {
  timestamps: true,
  strict: true
});

// Index for faster querying of comments
PostSchema.index({ parentId: 1, createdAt: -1 });
PostSchema.index({ rootId: 1, createdAt: -1 });

// Middleware to handle media array
PostSchema.pre('save', function(next) {
  if (this.media === undefined) {
    this.media = [];
  }
  next();
});

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema); 