'use client'

import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  return (
    <div 
      className={cn(
        "relative rounded-full",
        sizeClasses[size],
        className,
        "shadow-[0_0_50px_rgba(34,211,238,0.3)]"
      )} 
      {...props}
    >
      {/* White of the eye (sclera) with more detail */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50 to-cyan-100 rounded-full shadow-[inset_0_0_20px_rgba(34,211,238,0.4)]">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 origin-center border-t border-red-400/5"
            style={{
              transform: `rotate(${i * 45}deg)`,
            }}
          />
        ))}
      </div>

      {/* Outer iris ring with more mechanical details */}
      <div className="absolute inset-[12%]">
        <div className="absolute inset-0 border-4 border-cyan-600/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin">
          {/* Detailed iris segments */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 origin-center"
              style={{
                transform: `rotate(${i * 30}deg)`,
                borderLeft: '2px solid rgba(6, 182, 212, 0.2)',
                clipPath: 'polygon(50% 0, 51% 50%, 50% 100%)',
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Middle iris layer with texture */}
      <div className="absolute inset-[18%]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-800 to-cyan-700"></div>
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_15px_rgba(34,211,238,0.5)]">
          {/* Radial texture */}
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-[10%] origin-center border-t border-cyan-300/20"
              style={{
                transform: `rotate(${i * 22.5}deg)`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Inner mechanical ring */}
      <div className="absolute inset-[24%]">
        <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin-reverse"></div>
      </div>
      
      {/* Enhanced pupil */}
      <div className="absolute inset-[32%] bg-gradient-to-b from-cyan-950 to-black rounded-full overflow-hidden">
        {/* Pupil inner glow */}
        <div className="absolute inset-0 bg-cyan-900/20 rounded-full shadow-[inset_0_0_20px_rgba(34,211,238,0.7)]"></div>
        
        {/* Scanning effect */}
        <div className="absolute inset-x-0 h-[2px] bg-cyan-400 animate-scan"></div>
        
        {/* Central mechanism */}
        <div className="absolute inset-[20%] rounded-full bg-black animate-glow">
          <div className="absolute inset-[30%] bg-cyan-400/30 rounded-full">
            {/* Light reflections */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-200 rounded-full opacity-70"></div>
            <div className="absolute top-1 left-1 w-1 h-1 bg-cyan-200 rounded-full opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  )
} 