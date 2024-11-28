import mongoose from 'mongoose'

export interface INotification {
  recipient: string
  sender: string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'system'
  post?: string
  read: boolean
  createdAt: Date
}

const notificationSchema = new mongoose.Schema<INotification>({
  recipient: { type: String, required: true, ref: 'User' },
  sender: { type: String, required: true, ref: 'User' },
  type: { 
    type: String, 
    required: true, 
    enum: ['like', 'comment', 'follow', 'repost', 'system'] 
  },
  post: { type: String, ref: 'Post' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema) 