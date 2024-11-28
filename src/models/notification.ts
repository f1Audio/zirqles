import mongoose from 'mongoose'

export interface INotification {
  recipient: mongoose.Types.ObjectId | string
  sender: mongoose.Types.ObjectId | string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'system'
  post?: mongoose.Types.ObjectId | string
  read: boolean
  createdAt: Date
}

const notificationSchema = new mongoose.Schema<INotification>({
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { 
    type: String, 
    required: true, 
    enum: ['like', 'comment', 'follow', 'repost', 'system'] 
  },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema) 