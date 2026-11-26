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
  faceDetected: propFaceDetected,
  profile = null,
  onSuccess = () => {},
  onError = () => {},
}) {
  const isEditMode = Boolean(profile)
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureCount, setCaptureCount] = useState(0)
  const [totalCaptures] = useState(5)
  const [capturedImages, setCapturedImages] = useState([])
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const modalVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const isCancelledRef = useRef(false)

  // Populate fields when opening in edit mode or reset when opening in create mode
  useEffect(() => {
    if (!isOpen) return
    if (profile) {
      setName(profile.name || '')
      setConsent(profile.consent_given ?? true)
    } else {
      setName('')
      setConsent(true)
    }
    setCapturedImages([])
    setCaptureCount(0)
    setError(null)
  }, [isOpen, profile])

  // Attach existing stream from parent videoRef or start a local camera stream
  useEffect(() => {
    if (!isOpen) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
      return
    }

    let isMounted = true

    const setupStream = async () => {
      const parentStream = videoRef?.current?.srcObject
      if (parentStream && modalVideoRef.current) {
        modalVideoRef.current.srcObject = parentStream
        try {
          await modalVideoRef.current.play()
        } catch (e) {
          console.warn('Modal video play:', e)
        }
        return
      }

      // Start own stream if parent has none (e.g. opened from Profiles page)
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        if (modalVideoRef.current) {
          modalVideoRef.current.srcObject = stream
          await modalVideoRef.current.play()
        }
      } catch (err) {
        console.error('Failed to access camera in modal:', err)
        if (isMounted) {
          setError(new Error("Impossible d'accéder à la caméra."))
        }
      }
    }

    setupStream()

    return () => {
      isMounted = false
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
    }
  }, [isOpen, videoRef])

  // Continuously check whether video stream is ready / face is detected
  useEffect(() => {
    if (!isOpen) return

    const checkReady = () => {
      const video = modalVideoRef.current || videoRef?.current
      const streamReady = !!(video && video.readyState >= 2 && video.videoWidth > 0)
      if (propFaceDetected !== undefined) {
        setFaceDetected(propFaceDetected || streamReady)
      } else {
        setFaceDetected(streamReady)
      }
    }

    checkReady()
    const interval = setInterval(checkReady, 400)
    return () => clearInterval(interval)
  }, [isOpen, propFaceDetected, videoRef])

  // Capture a single frame from the video
  const captureFrame = useCallback(() => {
    const video = modalVideoRef.current || videoRef?.current
    if (!video || !video.videoWidth || !video.videoHeight) return Promise.resolve(null)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    })
  }, [videoRef])

  // Start capturing multiple frames sequentially
  const startCapturing = useCallback(async () => {
    const video = modalVideoRef.current || videoRef?.current
    if (!video || video.readyState < 2 || !video.videoWidth) {
      setError(new Error('Caméra non disponible ou en cours de démarrage.'))
      return
    }

    isCancelledRef.current = false
    setIsCapturing(true)
    setCaptureCount(0)
    setCapturedImages([])
    setError(null)

    const images = []
    try {
      for (let i = 0; i < totalCaptures; i++) {
        if (isCancelledRef.current) break

        setCaptureCount(i + 1)
        const blob = await captureFrame()
        if (blob) {
          const file = new File([blob], `face_${i}.jpg`, { type: 'image/jpeg' })
          images.push(file)
        }

        if (i < totalCaptures - 1 && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 600))
        }
      }

      if (!isCancelledRef.current) {
        setCapturedImages(images)
      }
    } catch (err) {
      setError(err)
    } finally {
      setIsCapturing(false)
    }
  }, [videoRef, totalCaptures, captureFrame])

  // Stop capturing
  const stopCapturing = useCallback(() => {
    isCancelledRef.current = true
    setIsCapturing(false)
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    isCancelledRef.current = true
    setName('')
    setConsent(true)
    setCaptureCount(0)
    setCapturedImages([])
    setError(null)
    setIsCapturing(false)
    setIsSubmitting(false)
  }, [])

  // Submit the form (create or update)
  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault()

      if (!name.trim()) {
        setError(new Error('Veuillez entrer un nom pour le profil'))
        return
      }

      if (!isEditMode && capturedImages.length === 0) {
        setError(new Error("Aucune image capturée. Veuillez capturer des images d'abord."))
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        let result
        if (isEditMode) {
          result = await ProfileAPI.update(profile.id, {
            name: name.trim(),
            consent,
          })
          if (capturedImages.length > 0) {
            await ProfileAPI.updateEmbedding(profile.id, capturedImages)
          }
          onSuccess(result)
          resetForm()
          onClose()
        } else {
          result = await ProfileAPI.enroll(name.trim(), capturedImages, consent)
          if (result.success) {
            onSuccess(result)
            resetForm()
            onClose()
          } else {
            throw new Error(result.message || "Échec de l'enregistrement")
          }
        }
      } catch (err) {
        setError(err)
        onError(err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [isEditMode, profile, name, consent, capturedImages, onSuccess, onError, onClose, resetForm]
  )

  // Close modal
  const handleClose = useCallback(() => {
    stopCapturing()
    resetForm()
    onClose()
  }, [stopCapturing, resetForm, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button type="button" className="modal-close" onClick={handleClose}>
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Modifier le profil' : 'Ajouter un visage'}
        </h2>
        <p className="text-gray-500 mb-6">
          {isEditMode
            ? 'Modifiez le nom ou recapturez de nouvelles photos pour ce profil'
            : 'Enregistrez un nouveau profil pour la reconnaissance faciale'}
        </p>

        {/* Error message */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom ou pseudonyme
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entrez un nom"
              className="input"
              disabled={isCapturing || isSubmitting}
              required
            />
          </div>

          {/* Consent checkbox */}
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={isCapturing || isSubmitting}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                Je consens à l&apos;enregistrement de mon visage pour la reconnaissance faciale.
                Mes données seront protégées et chiffrées.
              </span>
            </label>
          </div>

          {/* Camera preview */}
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={modalVideoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Face detection indicator */}
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {faceDetected ? (
                  <div className="flex items-center space-x-2 text-success-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Caméra prête</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-warning-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">En attente de la caméra...</span>
                  </div>
                )}
              </div>

              {/* Capture progress */}
              {isCapturing && (
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 shadow">
                    <span className="text-sm font-medium text-gray-900">
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
              <div className="flex space-x-3 w-full">
                <button
                  type="button"
                  onClick={startCapturing}
                  className={`btn ${isEditMode ? 'btn-secondary' : 'btn-primary'} flex-1`}
                  disabled={isSubmitting || !faceDetected}
                >
                  <Camera className="w-5 h-5" />
                  <span>
                    {isEditMode
                      ? `Recapturer (${totalCaptures} images)`
                      : `Capturer ${totalCaptures} images`}
                  </span>
                </button>
                {isEditMode && (
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
                )}
              </div>
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
