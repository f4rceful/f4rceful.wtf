import { useState, useEffect } from 'react'

const BIRTHDAY = new Date(2010, 5, 7).getTime() // June 7, 2010

export function useLiveAge() {
  const [age, setAge] = useState(() => getAge())

  useEffect(() => {
    const interval = setInterval(() => setAge(getAge()), 50)
    return () => clearInterval(interval)
  }, [])

  return age
}

function getAge() {
  const now = Date.now()
  const years = (now - BIRTHDAY) / (365.25 * 24 * 60 * 60 * 1000)
  return years.toFixed(9)
}
