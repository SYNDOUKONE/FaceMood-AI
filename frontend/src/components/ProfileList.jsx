/**
 * ProfileList Component for FaceMood AI
 * Displays a list of profiles
 */
import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Grid, List, Users } from 'lucide-react'
import ProfileCard, { ProfileGridCard, ProfileCompactCard } from './ProfileCard'
import { ProfileAPI } from '../services/api'

export default function ProfileList({
  onAddProfile = () => {},
  onViewProfile = () => {},
  onEditProfile = () => {},
  onDeleteProfile = () => {},
  showActions = true,
  maxHeight = 'none',
}) {
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
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

  // Initial fetch
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

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

  // Get filtered profiles
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery.trim()) return true
    return profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

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
          <button
            onClick={onAddProfile}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
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
