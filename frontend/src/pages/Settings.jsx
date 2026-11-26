/**
 * Settings Page for FaceMood AI
 * Application settings and configuration
 */
import { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon, Sliders, Eye, EyeOff, Shield, Bell, Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { RecognitionAPI, HealthAPI } from '../services/api'
import { DEFAULT_SETTINGS, loadSettings, saveSettingsToStorage, applyTheme } from '../utils/settings'

export default function Settings() {
  const [settings, setSettings] = useState(() => loadSettings())
  const [apiStatus, setApiStatus] = useState('unknown')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const local = loadSettings()
      // Get recognition threshold from backend
      const thresholdResult = await RecognitionAPI.getThreshold()
      const merged = {
        ...local,
        recognitionThreshold: thresholdResult.threshold ?? local.recognitionThreshold,
      }
      setSettings(merged)
      applyTheme(merged.darkMode)

      // Check API health
      const healthResult = await HealthAPI.check()
      setApiStatus(healthResult.status || 'unknown')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Handle setting change
  const handleSettingChange = useCallback((key, value) => {
    setSuccessMessage(null)
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'darkMode') {
        applyTheme(value)
      }
      return next
    })
  }, [])

  // Save settings
  const saveSettings = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Save recognition threshold on backend
      await RecognitionAPI.setThreshold(settings.recognitionThreshold)

      // Persist and broadcast to all mounted components
      saveSettingsToStorage(settings)
      setSuccessMessage('Paramètres enregistrés et appliqués avec succès.')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  // Reset settings
  const resetSettings = useCallback(async () => {
    setError(null)
    setSuccessMessage(null)
    const defaults = { ...DEFAULT_SETTINGS }
    setSettings(defaults)
    saveSettingsToStorage(defaults)
    try {
      await RecognitionAPI.setThreshold(defaults.recognitionThreshold)
      setSuccessMessage('Paramètres réinitialisés par défaut.')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Dismiss error
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6" />
          <span>Paramètres</span>
        </h1>
        <p className="text-gray-500 mt-1">
          Configurez l'application FaceMood AI
        </p>
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

      {/* Success message */}
      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-success-600 hover:text-success-800">
            Fermer
          </button>
        </div>
      )}

      {/* API Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>État de l'API</span>
          </h2>
          
          {apiStatus === 'healthy' && (
            <div className="flex items-center space-x-1 text-success-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Connectée</span>
            </div>
          )}
          {apiStatus === 'unhealthy' && (
            <div className="flex items-center space-x-1 text-warning-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Instable</span>
            </div>
          )}
          {apiStatus === 'error' && (
            <div className="flex items-center space-x-1 text-error-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">Déconnectée</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success-500 rounded-full" />
            <span className="text-sm">Détection faciale</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success-500 rounded-full" />
            <span className="text-sm">Reconnaissance faciale</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success-500 rounded-full" />
            <span className="text-sm">Analyse d'expressions</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-success-500 rounded-full" />
            <span className="text-sm">Gestion des profils</span>
          </div>
        </div>
      </div>

      {/* Recognition Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Paramètres de reconnaissance
        </h2>

        <div className="space-y-6">
          {/* Recognition Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">Seuil de reconnaissance</h3>
                <p className="text-sm text-gray-500">
                  Ajustez la sensibilité de la reconnaissance faciale
                </p>
              </div>
              <span className="font-medium text-primary-600">
                {settings.recognitionThreshold.toFixed(2)}
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.recognitionThreshold}
              onChange={(e) => handleSettingChange('recognitionThreshold', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0 (Très strict)</span>
              <span>0.5 (Équilibré)</span>
              <span>1.0 (Très large)</span>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Affichage</h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showLandmarks}
                  onChange={(e) => handleSettingChange('showLandmarks', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Afficher les points caractéristiques</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showMesh}
                  onChange={(e) => handleSettingChange('showMesh', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Afficher le maillage facial</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRecognize}
                  onChange={(e) => handleSettingChange('autoRecognize', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Reconnaissance automatique</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notifications
        </h2>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Activer les notifications</span>
          </label>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Apparence
        </h2>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">Mode sombre</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={saveSettings}
          disabled={isSaving || isLoading}
          className="btn btn-primary flex-1"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-white border-r-white border-b-transparent border-l-transparent" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Enregistrer les paramètres</span>
            </>
          )}
        </button>
        
        <button
          onClick={resetSettings}
          disabled={isSaving || isLoading}
          className="btn btn-secondary"
        >
          <Info className="w-5 h-5" />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* Information */}
      <div className="card bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>Informations</span>
        </h2>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Version:</strong> 2.0.0
          </p>
          <p>
            <strong>Technologies:</strong> React, FastAPI, MediaPipe, InsightFace
          </p>
          <p>
            <strong>Confidentialité:</strong> Toutes les données biométriques sont chiffrées et stockées localement.
          </p>
          <p>
            <strong>Support:</strong> Pour toute question, consultez la documentation ou contactez l'équipe de développement.
          </p>
        </div>
      </div>
    </div>
  )
}
