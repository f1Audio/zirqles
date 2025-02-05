import { PostPageComponent } from '@/components/post-page'

export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostPageComponent postId={params.postId} />
} 