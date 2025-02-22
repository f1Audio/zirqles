import mongoose from 'mongoose'

const mongoUri = process.env.MONGODB_URI

if (!mongoUri) {
  console.warn('Missing MONGODB_URI environment variable in .env.local')
}

const options: mongoose.ConnectOptions = {
  bufferCommands: false,
  autoIndex: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxIdleTimeMS: 10000,
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

async function dbConnect(): Promise<typeof mongoose> {
  if (!mongoUri) {
    throw new Error('Please define MONGODB_URI in .env.local')
  }

  try {
    if (cached.conn) {
      const state = mongoose.connection.readyState;
      if (state === 1) {
        return cached.conn;
      }
      // Reset connection if not connected
      cached.conn = null;
      cached.promise = null;
    }

    cached.promise = mongoose.connect(mongoUri, options);
    cached.conn = await cached.promise;
    return cached.conn;

  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }
}

export default dbConnect

export async function connectDB() {
  try {
    const mongoose = await dbConnect()
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready')
    }
    return mongoose.connection.db
  } catch (error) {
    console.error('Error connecting to MongoDB:', error)
    throw error
  }
}

