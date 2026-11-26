import { Link, useLocation } from 'react-router-dom'
import { ScanFace, Users, Settings as SettingsIcon } from 'lucide-react'

const navItems = [
  { path: '/', icon: ScanFace, label: 'Détection' },
  { path: '/profiles', icon: Users, label: 'Profils' },
  { path: '/settings', icon: SettingsIcon, label: 'Paramètres' },
]

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
              <ScanFace className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">FaceMood AI</h1>
              <p className="text-xs text-gray-500">Analyse Faciale Intelligente</p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-full p-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-colors ${
                    isActive 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
