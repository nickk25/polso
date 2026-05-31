export function truncate<T>(rows: T[], max = 50): T[] {
  return rows.slice(0, max)
}

export function pickFields<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, k) => {
    if (k in obj) acc[k] = obj[k]
    return acc
  }, {} as Partial<T>)
}
