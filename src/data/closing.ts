/**
 * Whether the app is closing the database on purpose (signing out and wiping the device, deleting all data): until
 * the page reloads, a timer or a pending read that meets the closed database throws DatabaseClosedError. That is
 * expected then, and not worth a report; a database closed at any other time still is.
 */
let closing = false

export const markClosing = () => void (closing = true)
export const isClosing = () => closing
