import mongoose from 'mongoose'

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  following?: mongoose.Types.ObjectId[];
  followers?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: {
    type: String,
    default: '/placeholder.svg?height=128&width=128'
  },
  bio: { type: String },
  location: { type: String },
  website: { type: String },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema)
