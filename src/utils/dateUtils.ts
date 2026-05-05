/**
 * Returns the number of days in the given month/year.
 * month is 1-based (1=January, 12=December).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Clamps day to the last valid day of the given month/year.
 * E.g. clampDayToMonth(2026, 2, 31) → 28
 */
export function clampDayToMonth(year: number, month: number, day: number): number {
  const maxDay = daysInMonth(year, month)
  return Math.min(day, maxDay)
}

/**
 * Creates a YYYY-MM-DD string for the given year/month/day,
 * clamping the day to the last valid day of that month.
 */
export function makeDateSafe(year: number, month: number, day: number): string {
  const safeDay = clampDayToMonth(year, month, day)
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

/**
 * Adds `months` months to a YYYY-MM-DD date string.
 * If the original day exceeds the number of days in the target month,
 * the day is clamped to the last valid day.
 *
 * Examples:
 *   addMonthsSafe('2026-01-31', 1)  → '2026-02-28'
 *   addMonthsSafe('2026-01-30', 1)  → '2026-02-28'
 *   addMonthsSafe('2026-03-31', -1) → '2026-02-28'
 *   addMonthsSafe('2026-01-15', 2)  → '2026-03-15'
 */
export function addMonthsSafe(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  let targetYear = y
  let targetMonth = m + months
  // Normalize months (handles both positive and negative overflow)
  while (targetMonth > 12) { targetMonth -= 12; targetYear++ }
  while (targetMonth < 1)  { targetMonth += 12; targetYear-- }
  return makeDateSafe(targetYear, targetMonth, d)
}
