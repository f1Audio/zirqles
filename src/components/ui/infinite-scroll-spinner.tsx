export function InfiniteScrollSpinner() {
  return (
    <div className="flex gap-1 items-center justify-center py-4">
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
    </div>
  )
} 