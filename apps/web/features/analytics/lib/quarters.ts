import { startOfQuarter, endOfQuarter, setMonth, setDate } from "date-fns"

export interface FiscalQuarter {
  quarter: 1 | 2 | 3 | 4
  start: Date
  end: Date
}

// Spanish Modelo 303 quarters align with calendar quarters (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
export function getFiscalQuarters(year: number): FiscalQuarter[] {
  return [1, 2, 3, 4].map((q) => {
    const anchor = new Date(year, (q - 1) * 3, 1)
    return {
      quarter: q as 1 | 2 | 3 | 4,
      start: startOfQuarter(anchor),
      end: endOfQuarter(anchor),
    }
  })
}

export function getCurrentQuarterNumber(): 1 | 2 | 3 | 4 {
  return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4
}
