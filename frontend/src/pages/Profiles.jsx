/**
 * Profiles Page for FaceMood AI
 * Manage face profiles
 */
import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import ProfileList from '../components/ProfileList'
import AddFaceModal from '../components/AddFaceModal'
import { ProfileAPI } from '../services/api'

export default function Profiles() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)

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

  // Initial fetch
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // Handle add profile
  const handleAddProfile = useCallback(() => {
    setSelectedProfile(null)
    setIsModalOpen(true)
  }, [])

  // Handle edit profile
  const handleEditProfile = useCallback((profile) => {
    setSelectedProfile(profile)
    // For now, we'll just open the modal with the profile pre-selected
    // In a real implementation, we'd pass the profile to the modal
    setIsModalOpen(true)
  }, [])

  // Handle view profile
  const handleViewProfile = useCallback((profile) => {
    setSelectedProfile(profile)
    // In a real implementation, we'd open a profile details modal
  }, [])

  // ProfileList already performed the API delete; just refresh stats
  const handleDeleteProfile = useCallback(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // Handle modal close / success
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    setSelectedProfile(null)
    fetchProfiles()
    setProfileRefreshKey((k) => k + 1)
  }, [fetchProfiles])

  // Dismiss error
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="w-6 h-6" />
            <span>Gestion des profils</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez les profils faciaux enregistrés
          </p>
        </div>

        <button
          onClick={handleAddProfile}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter un profil</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={dismissError} className="ml-auto text-error-600 hover:text-error-800">
            Fermer
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{profiles.length}</p>
              <p className="text-sm text-gray-500">Total des profils</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {profiles.filter(p => p.consent_given).length}
              </p>
              <p className="text-sm text-gray-500">Avec consentement</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {profiles.length > 0 
                  ? new Date(Math.max(...profiles.map(p => new Date(p.created_at)))).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </p>
              <p className="text-sm text-gray-500">Dernier ajouté</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile List */}
      <ProfileList
        onAddProfile={handleAddProfile}
        onViewProfile={handleViewProfile}
        onEditProfile={handleEditProfile}
        onDeleteProfile={handleDeleteProfile}
        showActions={true}
        refreshTrigger={profileRefreshKey}
      />

      {/* Add/Edit Profile Modal */}
      <AddFaceModal
        isOpen={isModalOpen}
        profile={selectedProfile}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        onError={(err) => setError(err.message)}
      />

      {/* Empty state */}
      {!isLoading && profiles.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun profil trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter un profil pour utiliser la reconnaissance faciale.
          </p>
          <button
            onClick={handleAddProfile}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un profil</span>
          </button>
        </div>
      )}
    </div>
  )
}
