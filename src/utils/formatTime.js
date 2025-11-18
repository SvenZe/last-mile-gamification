/**
 * formatTime.js
 * Converts minutes to readable time strings (e.g., "2h 30min").
 */

export function formatTime(minutes) {
  const mins = Math.round(minutes)
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  
  if (hours > 0) {
    return `${hours}h ${remainingMins}min`
  }
  
  return `${mins}min`
}
