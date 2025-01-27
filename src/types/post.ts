import { Types } from 'mongoose'

export type PostType = 'post' | 'comment'

export interface Author {
  _id: string
  username: string
  avatar?: string
}

export interface BasePost {
  _id: string
  content: string
  author: Author
  likes: string[]
  reposts: string[]
  comments: string[]
  type: PostType
  createdAt: string
  media?: {
    type: 'image' | 'video'
    url: string
    key: string
  }[]
}

export interface Post {
  _id: string
  content: string
  author: Author
  likes: string[]
  reposts: string[]
  replies: string[]
  createdAt: string
  updatedAt?: string
}

export interface PopulatedPost extends Omit<Post, 'likes' | 'reposts' | 'replies'> {
  likes: { _id: Types.ObjectId }[]
  reposts: { _id: Types.ObjectId }[]
  replies: {
    _id: Types.ObjectId
    content: string
    author: { username: string }
    likes: { _id: Types.ObjectId }[]
    reposts: { _id: Types.ObjectId }[]
  }[]
} 