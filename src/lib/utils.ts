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

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,128}$/

export const validatePassword = (password: string): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  if (password.length < 8) missing.push('Must be at least 8 characters long');
  if (password.length > 128) missing.push('Must not exceed 128 characters');
  if (!password.match(/[a-z]/)) missing.push('Must include a lowercase letter');
  if (!password.match(/[A-Z]/)) missing.push('Must include an uppercase letter');
  if (!password.match(/\d/)) missing.push('Must include a number');
  if (!password.match(/[!@#$%^&*(),.?":{}|<>]/)) missing.push('Must include a special character');
  
  return { 
    isValid: missing.length === 0,
    missing 
  };
}

export const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  // Check if username matches the pattern of only lowercase letters and numbers
  const usernamePattern = /^[a-z0-9]+$/
  
  if (!usernamePattern.test(username)) {
    return {
      isValid: false,
      message: 'Username can only contain lowercase letters and numbers'
    }
  }
  
  return { isValid: true }
}
