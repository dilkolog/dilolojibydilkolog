/** The last test taken on each list, on this device: its score and when. */
const KEY = 'diloloji:list-test'

export interface ListTest {
  /** 0–100 */
  percent: number
  /** ISO time. */
  at: string
}

function all(): Record<string, ListTest> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, ListTest> | null) ?? {}
  } catch {
    return {}
  }
}

export const lastListTest = (listId: string): ListTest | undefined => all()[listId]

export function saveListTest(listId: string, percent: number, at = new Date()) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...all(), [listId]: { percent, at: at.toISOString() } }))
  } catch {
    // Not kept: the list page just shows no last score.
  }
}
