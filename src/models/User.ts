import mongoose, { Model, Schema } from 'mongoose'

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  name?: string;
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

const userSchema = new Schema<IUser>({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: 24,
    validate: [
      {
        validator: function(v: string) {
          return v.length <= 24;
        },
        message: 'Username cannot be longer than 24 characters'
      },
      {
        validator: function(v: string) {
          return /^[a-z0-9]+$/.test(v);
        },
        message: 'Username can only contain lowercase letters and numbers'
      }
    ]
  },
  name: { 
    type: String,
    maxlength: 24,
    validate: {
      validator: function(v: string) {
        return !v || v.length <= 50;
      },
      message: 'Name cannot be longer than 50 characters'
    }
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: {
    type: String,
    default: '/placeholder.svg?height=128&width=128'
  },
  bio: { type: String },
  location: { type: String },
  website: { type: String },
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
})

// Fix for Next.js model compilation
const User = (mongoose.models?.User || mongoose.model('User', userSchema)) as Model<IUser>

export { User }
