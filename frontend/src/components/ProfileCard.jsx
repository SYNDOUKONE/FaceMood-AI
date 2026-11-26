/**
 * ProfileCard Component for FaceMood AI
 * Displays a single profile card
 */
import { useState } from 'react'
import { User, Trash2, Edit2, Eye, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { ProfileAPI } from '../services/api'

export default function ProfileCard({
  profile,
  onDelete = () => {},
  onEdit = () => {},
  onView = () => {},
  showActions = true,
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    if (!profile || !profile.id) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ? Cette action est irréversible.`)) {
      setIsDeleting(true)
      setError(null)

      try {
        const result = await ProfileAPI.delete(profile.id)
        if (result.success) {
          onDelete(profile.id)
        } else {
          throw new Error(result.message || 'Échec de la suppression')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  if (!profile) return null

  return (
    <div className="profile-card group">
      <div className="flex items-center space-x-4">
        {/* Profile avatar */}
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
            {profile.consent_given && (
              <span className="badge badge-success">Consenti</span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
              </span>
            </div>
            
            {profile.updated_at && profile.updated_at !== profile.created_at && (
              <div className="flex items-center space-x-1">
                <Edit2 className="w-3 h-3" />
                <span>
                  Modifié: {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(profile)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Voir"
            >
              <Eye className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onEdit(profile)}
              className="p-2 text-gray-500 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-gray-500 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors disabled:opacity-50"
              title="Supprimer"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-error-600 border-r-error-600 border-b-transparent border-l-transparent" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 alert alert-error text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

// Grid version
export function ProfileGridCard({ profile, onDelete, onEdit, onView }) {
  return (
    <div className="profile-card p-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <User className="w-10 h-10 text-white" />
      </div>
      
      <h3 className="font-semibold text-gray-900 truncate mb-1">{profile.name}</h3>
      <p className="text-xs text-gray-500 mb-4">
        {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
      </p>

      <div className="flex justify-center space-x-2">
        <button
          onClick={() => onView(profile)}
          className="btn btn-secondary px-3 py-1 text-sm"
        >
          Voir
        </button>
        <button
          onClick={() => onEdit(profile)}
          className="btn btn-secondary px-3 py-1 text-sm"
        >
          Modifier
        </button>
        <button
          onClick={() => onDelete(profile.id)}
          className="btn btn-error px-3 py-1 text-sm"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}

// Compact version for lists
export function ProfileCompactCard({ profile, onClick }) {
  return (
    <button
      onClick={() => onClick(profile)}
      className="profile-card text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{profile.name}</p>
          <p className="text-xs text-gray-500">
            {profile.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
          </p>
        </div>
      </div>
    </button>
  )
}
