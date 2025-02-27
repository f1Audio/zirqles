import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import * as DialogRoot from "@radix-ui/react-dialog"

interface Point {
  x: number
  y: number
}

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface CroppedArea {
  x: number
  y: number
  width: number
  height: number
}

interface AvatarCropperProps {
  imageUrl: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

export function AvatarCropper({ imageUrl, onCropComplete, onCancel, aspectRatio = 1 }: AvatarCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = (crop: Point) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const onCropCompleteCallback = useCallback((croppedArea: CroppedArea, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // Set canvas size to the cropped size
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.95
      )
    })
  }

  const handleSave = async () => {
    try {
      setIsProcessing(true)
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels)
        onCropComplete(croppedImage)
      }
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <DialogRoot.Root open={true} onOpenChange={() => !isProcessing && onCancel()}>
      <DialogRoot.Portal>
        <DialogRoot.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogRoot.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[95vw] sm:w-[90vw] max-w-[550px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-gray-900/95 shadow-2xl focus:outline-none border border-cyan-500/30 backdrop-blur-xl overflow-hidden">
          <DialogRoot.Title className="text-cyan-100 text-xl p-6 pb-4">
            Crop Your Avatar
          </DialogRoot.Title>
          <DialogRoot.Description className="sr-only">
            Crop and adjust your profile picture
          </DialogRoot.Description>
          
          <div className="relative w-full h-[400px] px-6 rounded-2xl overflow-hidden">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              classes={{
                containerClassName: "rounded-2xl",
                mediaClassName: "rounded-2xl",
                cropAreaClassName: "rounded-full border-4 border-white/80"
              }}
              style={{
                containerStyle: {
                  background: 'rgba(0, 0, 0, 0.8)',
                },
              }}
            />
          </div>

          <div className="flex items-center gap-3 px-6 mt-4 mb-4">
            <span className="text-sm text-cyan-300 min-w-16">Zoom:</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 accent-cyan-500 bg-cyan-900/50 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="flex gap-3 p-6 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 bg-transparent border border-cyan-500/50 text-white hover:text-white hover:bg-cyan-500/20 rounded-xl py-4 text-base font-medium hover:scale-105 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white rounded-xl py-4 text-base font-medium hover:scale-105 transition-all duration-300"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogRoot.Content>
      </DialogRoot.Portal>
    </DialogRoot.Root>
  )
} 