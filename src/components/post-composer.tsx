import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

interface PostComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => Promise<void>
}

export function PostComposer({ value, onChange, onSubmit }: PostComposerProps) {
  return (
    <div className="mt-4 sm:mt-6 mb-6 bg-cyan-900/20 rounded-xl p-4 backdrop-blur-sm border border-cyan-500/20 shadow-md shadow-cyan-500/5 hover:shadow-cyan-400/10 transition-all duration-300 ease-in-out">
      <Textarea
        placeholder="Share your thoughts..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mb-4 bg-transparent border-cyan-500/30 focus:border-cyan-400 text-cyan-100 placeholder-cyan-300/50 resize-none rounded-xl font-light tracking-wide text-sm leading-relaxed"
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="relative inline-flex h-12 overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 hover:scale-[1.01] transition-all duration-300"
      >
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 px-6 py-2 text-sm font-medium text-white transition-all duration-300 ease-in-out hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 hover:shadow-md hover:shadow-cyan-500/50">
          Broadcast
        </span>
      </button>
    </div>
  )
} 