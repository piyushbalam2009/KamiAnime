import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatNumber(num: number) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function calculateLevel(xp: number) {
  return Math.floor(xp / 1000) + 1
}

export function getXPForNextLevel(xp: number) {
  const currentLevel = calculateLevel(xp)
  return currentLevel * 1000 - xp
}

export function getXPProgress(xp: number) {
  const currentLevelXP = (calculateLevel(xp) - 1) * 1000
  const nextLevelXP = calculateLevel(xp) * 1000
  return ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getRandomColor() {
  const colors = ['#7B61FF', '#00C2FF', '#FF61DC', '#61FF7B', '#FFB661', '#FF6161']
  return colors[Math.floor(Math.random() * colors.length)]
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}
