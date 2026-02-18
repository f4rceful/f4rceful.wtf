export function getSessionId(): string {
  let id = sessionStorage.getItem('_sid')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_sid', id)
  }
  return id
}
