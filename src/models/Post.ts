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
  parentPost?: mongoose.Types.ObjectId
  media: Array<{
    type: 'image' | 'video'
    url: string
    key: string
  }>
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new mongoose.Schema<IPost>({
  content: {
    type: String,
    required: function(this: any) {
      // Content is required only if there's no media
      return !this.media || this.media.length === 0;
    },
    default: ''
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: {
    type: [{
      type: { type: String, enum: ['image', 'video'] },
      url: String,
      key: String
    }],
    default: []
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  parentPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
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

// Add a validation middleware
PostSchema.pre('validate', function(next) {
  // If neither content nor media is provided, throw an error
  if ((!this.content || !this.content.trim()) && (!this.media || this.media.length === 0)) {
    this.invalidate('content', 'Either content or media is required');
  }
  next();
});

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema); 