/** One try at the exam for each break of the streak, kept on this device (`diloloji:repair-tried`). */
const KEY = 'diloloji:repair-tried'

export function repairTried(key: string): boolean {
  try {
    return localStorage.getItem(KEY) === key
  } catch {
    return false
  }
}

export function markRepairTried(key: string) {
  try {
    localStorage.setItem(KEY, key)
  } catch {
    // Without storage the offer simply stays until the window passes.
  }
}
