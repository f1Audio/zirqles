import mongoose from 'mongoose'
import type { IUser } from './User'

export interface IPost {
  _id: mongoose.Types.ObjectId
  content: string
  author: mongoose.Types.ObjectId | IUser
  likes: mongoose.Types.ObjectId[]
  reposts: mongoose.Types.ObjectId[]
  comments: mongoose.Types.ObjectId[]
  parentId?: mongoose.Types.ObjectId  // Reference to parent post/comment
  rootId?: mongoose.Types.ObjectId    // Reference to the root post
  type: 'post' | 'comment'           // Discriminator field
  depth: number                      // Nesting level (0 for posts, increments for comments)
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
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  rootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  type: { type: String, enum: ['post', 'comment'], required: true, default: 'post' },
  depth: { type: Number, required: true, default: 0, max: 2 }  // Max depth of 2 for nested comments
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

// Middleware to set rootId if not provided
PostSchema.pre('save', function(next) {
  if (this.type === 'comment' && !this.rootId && this.parentId) {
    // Find the root post by traversing up the parent chain
    Post.findById(this.parentId).then(parentPost => {
      if (parentPost) {
        this.rootId = parentPost.rootId || parentPost._id;
        this.depth = (parentPost.depth || 0) + 1;
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

export const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema); 