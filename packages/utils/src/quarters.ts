export interface FiscalQuarter {
  quarter: 1 | 2 | 3 | 4
  start: Date
  end: Date
}

// Spanish Modelo 303 quarters align with calendar quarters
export function getFiscalQuarters(year: number): FiscalQuarter[] {
  return [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 2
    return {
      quarter: q as 1 | 2 | 3 | 4,
      start: new Date(year, startMonth, 1, 0, 0, 0, 0),
      end: new Date(year, endMonth + 1, 0, 23, 59, 59, 999),
    }
  })
}

export function getCurrentQuarterNumber(): 1 | 2 | 3 | 4 {
  return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4
}

export function getCurrentQuarter(now: Date = new Date()): FiscalQuarter {
  const quarters = getFiscalQuarters(now.getFullYear())
  const qNum = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4
  return quarters[qNum - 1]!
}

export function getDaysToQuarterEnd(now: Date = new Date()): number {
  const quarter = getCurrentQuarter(now)
  return Math.floor((quarter.end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
