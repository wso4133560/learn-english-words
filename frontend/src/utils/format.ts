export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatProgress(learned: number, total: number): string {
  return `${learned}/${total}`
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
