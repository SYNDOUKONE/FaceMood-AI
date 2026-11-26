import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Profiles from './pages/Profiles'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'
import { loadSettings, applyTheme, SETTINGS_CHANGED_EVENT } from './utils/settings'

function App() {
  useEffect(() => {
    applyTheme(loadSettings().darkMode)
    const handleSettingsChange = (e) => {
      applyTheme(e.detail?.darkMode)
    }
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChange)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
