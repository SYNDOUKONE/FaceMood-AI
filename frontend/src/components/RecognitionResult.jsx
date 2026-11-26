/**
 * RecognitionResult Component for FaceMood AI
 * Displays face recognition results
 */
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, User, Clock, AlertCircle } from 'lucide-react'

export default function RecognitionResult({
  result,
  onDismiss = () => {},
  autoDismiss = true,
  dismissAfter = 5000,
}) {
  const [isVisible, setIsVisible] = useState(true)

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss()
      }, dismissAfter)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, isVisible, onDismiss, dismissAfter])

  // Reset visibility when result changes
  useEffect(() => {
    if (result) {
      setIsVisible(true)
    }
  }, [result])

  if (!result || !isVisible) return null

  const { recognized, profile, confidence, threshold, message } = result

  return (
    <div className="recognition-result animate-fade-in">
      <div className="flex items-center space-x-3">
        {recognized ? (
          <div className="flex-shrink-0 w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-success-600" />
          </div>
        ) : (
          <div className="flex-shrink-0 w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
            <XCircle className="w-6 h-6 text-warning-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {recognized ? (
              <>
                <User className="w-5 h-5 text-success-600" />
                <h3 className="font-semibold text-gray-900 truncate">
                  {profile?.name || 'Visage reconnu'}
                </h3>
              </>
            ) : (
              <h3 className="font-semibold text-gray-900">Visage inconnu</h3>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm">
            {recognized && confidence && (
              <div className="flex items-center space-x-1 text-success-600">
                <span>Confiance: {(confidence * 100).toFixed(1)}%</span>
              </div>
            )}
            
            {threshold && (
              <div className="flex items-center space-x-1 text-gray-500">
                <span>Seuil: {(threshold * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          {message && (
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          )}
        </div>

        {autoDismiss && (
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title="Fermer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Simplified version for inline display
export function SimpleRecognitionResult({ result }) {
  if (!result) return null

  const { recognized, profile, confidence } = result

  return (
    <div className="flex items-center space-x-2">
      {recognized ? (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-success-600">
            {profile?.name} ({(confidence * 100).toFixed(0)}%)
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-500">Visage inconnu</span>
      )}
    </div>
  )
}

// Badge version
export function RecognitionBadge({ result, className = '' }) {
  if (!result) return null

  const { recognized, profile, confidence } = result

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${className} ${
        recognized 
          ? 'bg-success-100 text-success-800' 
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {recognized ? (
        <>
          <span className="mr-1">✓</span>
          {profile?.name} ({(confidence * 100).toFixed(0)}%)
        </>
      ) : (
        'Visage inconnu'
      )}
    </span>
  )
}
