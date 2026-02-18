import { useEffect, useState } from 'react'
import { MainPage } from './pages/Main'
import { PrivacyPage } from './pages/Privacy'
import { AdminPanel } from './sections/AdminPanel'
import { useRotatingTitle } from './hooks/use-rotating-title'
import { useAnalytics } from './hooks/use-analytics'
import { useScrollReveal } from './hooks/use-scroll-reveal'
import { useParallax } from './hooks/use-parallax'
import { NoiseCanvas } from './components/NoiseCanvas'
import { ParticleCanvas } from './components/ParticleCanvas'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ToastContainer } from './components/Toast'
import './app.css'

export function App() {
  useRotatingTitle('f4rceful.wtf ')
  useAnalytics()
  useScrollReveal()
  useParallax()
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    console.log(
      '%cf4rceful.wtf',
      'color: #64ffd8; font-size: 24px; font-weight: bold;'
    )
  }, [])

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname)
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <>
      <NoiseCanvas />
      <ParticleCanvas />
      <main id="app">
        {route === '/admin' ? <AdminPanel /> : route === '/privacy' ? <PrivacyPage /> : <MainPage />}
      </main>
      <ThemeSwitcher />
      <ToastContainer />
    </>

  )
}
