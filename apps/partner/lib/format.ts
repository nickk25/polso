export function getInitials(name: string | null | undefined, emailFallback?: string | null): string {
  const source = name || emailFallback?.split("@")[0] || "?"
  const words = source.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}
