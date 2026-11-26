/**
 * ExpressionResult Component for FaceMood AI
 * Displays facial expression analysis results
 */
import { useState, useEffect } from 'react'
import { Smile, Meh, Frown, Eye, EyeOff, AlertCircle, XCircle } from 'lucide-react'

// Expression icons mapping
const EXPRESSION_ICONS = {
  'Neutre': Meh,
  'Sourire': Smile,
  'Surprise': Eye,
  'Colère': Frown,
  'Triste': Frown,
  'Dégoût': Frown,
  'Peur': EyeOff,
  'Sourcils levés': Eye,
  'Bouche ouverte': Smile,
  'Clignement': EyeOff,
  'Inconnu': AlertCircle,
}

// Expression colors mapping
const EXPRESSION_COLORS = {
  'Neutre': 'gray',
  'Sourire': 'success',
  'Surprise': 'warning',
  'Colère': 'error',
  'Triste': 'error',
  'Dégoût': 'error',
  'Peur': 'warning',
  'Sourcils levés': 'warning',
  'Bouche ouverte': 'warning',
  'Clignement': 'gray',
  'Inconnu': 'gray',
}

export default function ExpressionResult({
  result,
  onDismiss = () => {},
  autoDismiss = true,
  dismissAfter = 5000,
}) {
  const [isVisible, setIsVisible] = useState(true)

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismiss && isVisible && result) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss()
      }, dismissAfter)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, isVisible, onDismiss, dismissAfter, result])

  // Reset visibility when result changes
  useEffect(() => {
    if (result) {
      setIsVisible(true)
    }
  }, [result])

  if (!result || !isVisible) return null

  const data = result?.result || result
  const { expression = 'Inconnu', confidence = 0, blendshapes } = data
  const Icon = EXPRESSION_ICONS[expression] || AlertCircle
  const color = EXPRESSION_COLORS[expression] || 'gray'

  return (
    <div className="expression-result animate-fade-in">
      <div className="flex items-center space-x-3">
        <div className={`flex-shrink-0 w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {expression}
          </h3>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <span className="text-gray-500">Confiance:</span>
              <span className={`font-medium text-${color}-600`}>
                {(confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Top blendshapes */}
          {blendshapes && Object.keys(blendshapes).length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {Object.entries(blendshapes)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([name, score]) => (
                  <span key={name} className="mr-2">
                    {name}: {(score * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
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
export function SimpleExpressionResult({ result, className = '' }) {
  if (!result) return null

  const data = result?.result || result
  const { expression = 'Inconnu', confidence = 0 } = data
  const Icon = EXPRESSION_ICONS[expression] || AlertCircle
  const color = EXPRESSION_COLORS[expression] || 'gray'

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Icon className={`w-4 h-4 text-${color}-500`} />
      <span className={`text-sm font-medium text-${color}-600`}>
        {expression} ({((confidence || 0) * 100).toFixed(0)}%)
      </span>
    </div>
  )
}

// Badge version
export function ExpressionBadge({ result, className = '' }) {
  if (!result) return null

  const data = result?.result || result
  const { expression = 'Inconnu', confidence = 0 } = data
  const color = EXPRESSION_COLORS[expression] || 'gray'

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${className} bg-${color}-100 text-${color}-800`}
    >
      {expression} ({((confidence || 0) * 100).toFixed(0)}%)
    </span>
  )
}

// Large display version
export function LargeExpressionDisplay({ result }) {
  if (!result) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Analysez votre expression</p>
      </div>
    )
  }

  const data = result?.result || result
  const { expression = 'Inconnu', confidence = 0, blendshapes } = data
  const Icon = EXPRESSION_ICONS[expression] || AlertCircle
  const color = EXPRESSION_COLORS[expression] || 'gray'

  return (
    <div className="text-center py-6">
      <div className={`mx-auto w-20 h-20 bg-${color}-100 rounded-full flex items-center justify-center mb-4`}>
        <Icon className={`w-10 h-10 text-${color}-600`} />
      </div>
      
      <h2 className={`text-2xl font-bold text-${color}-600 mb-2`}>
        {expression}
      </h2>
      
      <div className="flex justify-center items-center space-x-2 mb-4">
        <span className="text-gray-500">Confiance:</span>
        <span className={`font-semibold text-${color}-600 text-xl`}>
          {(confidence * 100).toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`bg-${color}-500 h-2 rounded-full`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>

      {/* Top blendshapes */}
      {blendshapes && Object.keys(blendshapes).length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(blendshapes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 4)
            .map(([name, score]) => (
              <div key={name} className="flex justify-between">
                <span className="text-gray-500 truncate">{name}</span>
                <span className="font-medium">{(score * 100).toFixed(0)}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
