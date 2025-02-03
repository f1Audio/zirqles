import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTextWithMentions(text: string) {
  // Regex to match @username patterns
  // Usernames can contain letters, numbers, and underscores
  const mentionPattern = /@(\w+)/g
  
  // Split the text into parts and map them to either text or links
  const parts = text.split(mentionPattern)
  
  return parts.map((part, i) => {
    // Even indices are regular text, odd indices are usernames
    if (i % 2 === 1) {
      return {
        type: 'mention' as const,
        username: part,
      }
    }
    return {
      type: 'text' as const,
      content: part,
    }
  }).filter(part => part.type === 'text' ? part.content : true) // Filter out empty parts
}
