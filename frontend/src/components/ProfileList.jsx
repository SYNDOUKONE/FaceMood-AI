/**
 * ProfileList Component for FaceMood AI
 * Displays a list of profiles
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Grid, List, Users, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import ProfileCard, { ProfileGridCard, ProfileCompactCard } from './ProfileCard'
import { ProfileAPI } from '../services/api'

// Sort options
const SORT_OPTIONS = [
  { value: 'name_asc',    label: 'Nom (A → Z)' },
  { value: 'name_desc',   label: 'Nom (Z → A)' },
  { value: 'date_desc',   label: 'Plus récent' },
  { value: 'date_asc',    label: 'Plus ancien' },
]

function sortProfiles(profiles, sortKey) {
  const sorted = [...profiles]
  switch (sortKey) {
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    case 'name_desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' }))
    case 'date_asc':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'date_desc':
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export default function ProfileList({
  onAddProfile = () => {},
  onViewProfile = () => {},
  onEditProfile = () => {},
  onDeleteProfile = () => {},
  showActions = true,
  showAddButton = true,
  maxHeight = 'none',
  refreshTrigger = 0,
}) {
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
  const [sortKey, setSortKey] = useState('date_desc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await ProfileAPI.list()
      if (result.success) {
        setProfiles(result.profiles || [])
      } else {
        throw new Error(result.message || 'Échec du chargement des profils')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Search profiles
  const searchProfiles = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchProfiles()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await ProfileAPI.search(searchQuery)
      if (result.success) {
        setProfiles(result.profiles || [])
      } else {
        throw new Error(result.message || 'Échec de la recherche')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, fetchProfiles])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProfiles()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, searchProfiles])

  // Initial fetch and external refresh trigger
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles, refreshTrigger])

  // Handle delete
  const handleDelete = useCallback(async (profileId) => {
    try {
      const result = await ProfileAPI.delete(profileId)
      if (result.success) {
        // Refresh the list
        fetchProfiles()
        onDeleteProfile(profileId)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [fetchProfiles, onDeleteProfile])

  // Handle profile selection
  const handleProfileClick = useCallback((profile) => {
    setSelectedProfile(profile)
    onViewProfile(profile)
  }, [onViewProfile])

  // Get filtered and sorted profiles
  const filteredProfiles = useMemo(() => {
    const filtered = profiles.filter(profile => {
      if (!searchQuery.trim()) return true
      return profile.name.toLowerCase().includes(searchQuery.toLowerCase())
    })
    return sortProfiles(filtered, sortKey)
  }, [profiles, searchQuery, sortKey])

  // Close sort menu when clicking outside
  useEffect(() => {
    if (!sortMenuOpen) return
    const handler = (e) => {
      if (!e.target.closest('[data-sort-menu]')) {
        setSortMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortMenuOpen])

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'grid' : 'list')
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>Profils enregistrés</span>
          </h2>
          <p className="text-gray-500 mt-1">
            {profiles.length} profil(s) enregistrés
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort control */}
          <div className="relative" data-sort-menu>
            <button
              onClick={() => setSortMenuOpen(prev => !prev)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                sortMenuOpen
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
              title={SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? 'Trier'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortMenuOpen
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />}
            </button>

            {sortMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => { setSortKey(option.value); setSortMenuOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      sortKey === option.value
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50'
              }`}
              title="Liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50'
              }`}
              title="Grille"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Add profile button */}
          {showAddButton && (
            <button
              onClick={onAddProfile}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un profil..."
          className="form-input pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary-600 border-r-primary-600 border-b-transparent border-l-transparent" />
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredProfiles.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun profil trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? `Aucun profil ne correspond à "${searchQuery}"` 
              : 'Aucun profil n\'a encore été enregistré.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddProfile}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un profil</span>
            </button>
          )}
        </div>
      )}

      {/* Profile list */}
      {!isLoading && filteredProfiles.length > 0 && (
        <div
          className={`space-y-3 ${maxHeight !== 'none' ? 'overflow-y-auto' : ''}`}
          style={{ maxHeight }}
        >
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProfiles.map(profile => (
                <ProfileGridCard
                  key={profile.id}
                  profile={profile}
                  onDelete={handleDelete}
                  onEdit={() => onEditProfile(profile)}
                  onView={() => handleProfileClick(profile)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onDelete={handleDelete}
                  onEdit={() => onEditProfile(profile)}
                  onView={() => handleProfileClick(profile)}
                  showActions={showActions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for sidebars
export function CompactProfileList({
  profiles,
  onSelect = () => {},
  maxItems = 5,
}) {
  return (
    <div className="space-y-2">
      {profiles.slice(0, maxItems).map(profile => (
        <ProfileCompactCard
          key={profile.id}
          profile={profile}
          onClick={onSelect}
        />
      ))}
      
      {profiles.length > maxItems && (
        <div className="text-xs text-gray-500 text-center py-2">
          +{profiles.length - maxItems} autres
        </div>
      )}
    </div>
  )
}
