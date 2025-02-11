import { useState } from 'react'
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Image as ImageIcon, Film, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { formatTextWithMentions } from '@/lib/utils'

interface PostComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (media?: { type: string; url: string; key: string }[]) => Promise<void>
}

export function PostComposer({ value, onChange, onSubmit }: PostComposerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [media, setMedia] = useState<{ type: string; url: string; key: string }[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    setIsUploading(true)
    const newMedia = [...media]
 

    try {
      for (const file of Array.from(files)) {
        
        
        // Get presigned URL
        const res = await fetch('/api/posts/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: file.type }),
        })

        if (!res.ok) throw new Error('Failed to get upload URL')
        const { uploadUrl, key, publicUrl, type } = await res.json()
        

        // Upload file to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        
        if (!uploadRes.ok) throw new Error('Failed to upload to S3')
       

        newMedia.push({ type, url: publicUrl, key })
      }

      
      setMedia(newMedia)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload media')
    } finally {
      setIsUploading(false)
    }
  }

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index))
  }

  const handleImageClick = () => {
    const input = document.getElementById('image-upload') as HTMLInputElement
    input?.click()
  }

  const handleVideoClick = () => {
    const input = document.getElementById('video-upload') as HTMLInputElement
    input?.click()
  }

  const handleSubmit = async () => {
    if (isUploading) {
      toast.error('Please wait for media upload to complete')
      return
    }

    // Extract mentions from the post content
    const mentions = formatTextWithMentions(value)
      .filter(part => part.type === 'mention')
      .map(part => (part as { username: string }).username)

    // Validate mentions if needed
    if (mentions.length > 0) {
      try {
        const response = await fetch('/api/users/validate-mentions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: mentions })
        })
        
        if (!response.ok) {
          const data = await response.json()
          toast.error(data.message || 'Invalid mentions in your post')
          return
        }
      } catch (error) {
        console.error('Error validating mentions:', error)
        toast.error('Failed to validate mentions')
        return
      }
    }
    
    console.log('Submitting post with media:', media)
    try {
      await onSubmit(media.length > 0 ? media : undefined)
      setMedia([]) // Clear media after successful post
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  return (
    <div className="mb-4 bg-cyan-900/20 rounded-xl p-4 backdrop-blur-sm border border-cyan-500/30 
      shadow-lg shadow-cyan-500/10 hover:shadow-cyan-400/30 hover:bg-cyan-800/30 
      transition-all duration-300 ease-in-out">
      <Textarea
        placeholder="Share your thoughts..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] w-full bg-transparent border-none focus:border-none text-cyan-100 placeholder-cyan-300/50 resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() || media.length > 0) {
              handleSubmit();
            }
          }
        }}
      />
      
      {/* Media Preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {media.map((item, index) => (
            <div key={index} className="relative">
              {item.type === 'image' ? (
                <div className="aspect-square relative overflow-hidden rounded-xl">
                  <Image 
                    src={item.url} 
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <video 
                  src={item.url} 
                  className="rounded-xl w-full aspect-square object-cover"
                  controls
                />
              )}
              <button
                onClick={() => removeMedia(index)}
                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-cyan-500/30">
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="image-upload"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <input
            type="file"
            accept="video/*"
            className="hidden"
            id="video-upload"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading}
            onClick={handleImageClick}
            className="text-cyan-300 hover:text-cyan-200 transition-colors duration-300"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading}
            onClick={handleVideoClick}
            className="text-cyan-300 hover:text-cyan-200 transition-colors duration-300"
          >
            <Film className="w-4 h-4" />
          </Button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!value.trim() && media.length === 0}
          className="bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-cyan-500/20"
        >
          {isUploading ? 'Uploading...' : 'Post'}
        </Button>
      </div>
    </div>
  )
} 