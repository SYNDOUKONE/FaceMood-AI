/**
 * AddFaceModal Component for FaceMood AI
 * Modal for adding a new face profile
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Camera, Check, AlertCircle, Loader2 } from 'lucide-react'
import { ProfileAPI } from '../services/api'

export default function AddFaceModal({
  isOpen,
  onClose,
  videoRef,
  onSuccess = () => {},
  onError = () => {},
}) {
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureCount, setCaptureCount] = useState(0)
  const [totalCaptures, setTotalCaptures] = useState(5)
  const [capturedImages, setCapturedImages] = useState([])
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  
  const canvasRef = useRef(null)
  const captureTimeoutRef = useRef(null)

  // Check if face is detected in the current frame
  const checkFaceDetection = useCallback(() => {
    if (!videoRef.current) return false
    
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Simple face detection check (in practice, use MediaPipe)
    // For now, we'll assume face is detected if video is playing
    return video.readyState >= video.HAVE_CURRENT_DATA
  }, [videoRef])

  // Capture a frame from the video
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null
    
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.9)
    })
  }, [videoRef])

  // Start capturing multiple frames
  const startCapturing = useCallback(async () => {
    if (!videoRef.current) {
      setError(new Error('Caméra non disponible'))
      return
    }

    // Check if face is detected
    if (!checkFaceDetection()) {
      setError(new Error('Aucun visage détecté. Veuillez positionner votre visage devant la caméra.'))
      return
    }

    setIsCapturing(true)
    setCaptureCount(0)
    setCapturedImages([])
    setError(null)

    // Capture frames with delay
    const captureNext = async () => {
      if (captureCount >= totalCaptures) {
        setIsCapturing(false)
        return
      }

      try {
        const blob = await captureFrame()
        if (blob) {
          const file = new File([blob], `face_${captureCount}.jpg`, { type: 'image/jpeg' })
          setCapturedImages(prev => [...prev, file])
          setCaptureCount(prev => prev + 1)
        }
      } catch (err) {
        setError(err)
        setIsCapturing(false)
      }

      // Schedule next capture
      if (captureCount < totalCaptures - 1) {
        captureTimeoutRef.current = setTimeout(captureNext, 1000)
      }
    }

    await captureNext()
  }, [videoRef, captureCount, totalCaptures, checkFaceDetection, captureFrame])

  // Stop capturing
  const stopCapturing = useCallback(() => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current)
    }
    setIsCapturing(false)
  }, [])

  // Submit the form
  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError(new Error('Veuillez entrer un nom pour le profil'))
      return
    }

    if (capturedImages.length === 0) {
      setError(new Error('Aucune image capturée. Veuillez capturer des images d\'abord.'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await ProfileAPI.enroll(name.trim(), capturedImages, consent)
      
      if (result.success) {
        onSuccess(result)
        resetForm()
        onClose()
      } else {
        throw new Error(result.message || 'Échec de l\'enregistrement')
      }
    } catch (err) {
      setError(err)
      onError(err)
    } finally {
      setIsSubmitting(false)
    }
  }, [name, consent, capturedImages, onSuccess, onError, onClose])

  // Reset form
  const resetForm = useCallback(() => {
    setName('')
    setConsent(true)
    setCaptureCount(0)
    setCapturedImages([])
    setError(null)
    setIsCapturing(false)
    setIsSubmitting(false)
    setFaceDetected(false)
    
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current)
    }
  }, [])

  // Close modal
  const handleClose = useCallback(() => {
    stopCapturing()
    resetForm()
    onClose()
  }, [stopCapturing, resetForm, onClose])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current)
      }
    }
  }, [])

  // Update face detection status
  useEffect(() => {
    if (videoRef.current) {
      setFaceDetected(checkFaceDetection())
    }
  }, [videoRef, checkFaceDetection])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="modal-close" onClick={handleClose}>
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Ajouter un visage</h2>
          <p className="text-gray-500 mt-1">
            Enregistrez un nouveau profil pour la reconnaissance faciale
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          {/* Name input */}
          <div className="mb-4">
            <label className="form-label" htmlFor="name">
              Nom ou pseudonyme
            </label>
            <input
              type="text"
              id="name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entrez un nom"
              disabled={isCapturing || isSubmitting}
              autoFocus
            />
          </div>

          {/* Consent checkbox */}
          <div className="mb-6">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={isCapturing || isSubmitting}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Je consens à l'enregistrement de mon visage pour la reconnaissance faciale.
                Mes données seront protégées et chiffrées.
              </span>
            </label>
          </div>

          {/* Camera preview */}
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {videoRef.current && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              )}
              
              {/* Face detection indicator */}
              <div className="absolute bottom-4 left-4">
                {faceDetected ? (
                  <div className="flex items-center space-x-2 text-success-400">
                    <Check className="w-5 h-5" />
                    <span>Visage détecté</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-warning-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>Pas de visage</span>
                  </div>
                )}
              </div>

              {/* Capture progress */}
              {isCapturing && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-sm font-medium">
                      Capture {captureCount}/{totalCaptures}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {isCapturing ? (
              <button
                type="button"
                onClick={stopCapturing}
                className="btn btn-error flex-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
                <span>Annuler</span>
              </button>
            ) : capturedImages.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={startCapturing}
                  className="btn btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  <Camera className="w-5 h-5" />
                  <span>Recapturer</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-success flex-1"
                  disabled={isSubmitting || !name.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startCapturing}
                className="btn btn-primary flex-1"
                disabled={isSubmitting || !faceDetected}
              >
                <Camera className="w-5 h-5" />
                <span>Capturer {totalCaptures} images</span>
              </button>
            )}
          </div>

          {/* Captured images preview */}
          {capturedImages.length > 0 && !isCapturing && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">
                {capturedImages.length} image(s) capturée(s)
              </p>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {capturedImages.map((img, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Captured face ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
