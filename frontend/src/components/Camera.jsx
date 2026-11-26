/**
 * Camera Component for FaceMood AI
 * Manages camera access and video stream
 */
import { useEffect, useRef, useState, useCallback, forwardRef } from 'react'
import { Camera as CameraIcon, CameraOff, Video, AlertCircle } from 'lucide-react'

const Camera = forwardRef(function Camera(
  {
    onStream = () => {},
    onError = () => {},
    onActiveChange = () => {},
    isActive: propIsActive,
    facingMode = 'user',
    width = '100%',
    height = '100%',
    autoStart = false,
    children,
  },
  ref
) {
  const internalVideoRef = useRef(null)
  const streamRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)

  // Attach video node to both external ref and internal ref
  const setVideoRef = useCallback(
    (node) => {
      internalVideoRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref]
  )

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter((device) => device.kind === 'videoinput')
      setDevices(videoDevices)

      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.warn('Error enumerating devices:', err)
    }
  }, [selectedDeviceId])

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsActive(false)
    onActiveChange(false)

    if (internalVideoRef.current) {
      internalVideoRef.current.srcObject = null
    }
  }, [onActiveChange])

  // Start camera stream
  const startStream = useCallback(
    async (deviceId = null) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error("L'accès à la caméra n'est pas supporté par ce navigateur ou nécessite HTTPS/localhost.")
        setError(err)
        onError(err)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Stop any existing stream before starting a new one
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        const constraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: deviceId ? undefined : facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = newStream
        setStream(newStream)

        if (internalVideoRef.current) {
          internalVideoRef.current.srcObject = newStream
          try {
            await internalVideoRef.current.play()
          } catch (playErr) {
            console.warn('Video play interrupted:', playErr)
          }
        }

        setIsActive(true)
        onStream(newStream)
        onActiveChange(true)
      } catch (err) {
        console.error('Error starting camera:', err)
        let message = 'Impossible de démarrer la caméra.'
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = "Permission caméra refusée. Veuillez autoriser l'accès à la caméra dans votre navigateur."
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'Aucune caméra détectée sur cet appareil.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'La caméra est déjà utilisée par une autre application.'
        }
        const errorObj = new Error(message)
        setError(errorObj)
        onError(errorObj)
        setIsActive(false)
        onActiveChange(false)
      } finally {
        setIsLoading(false)
      }
    },
    [facingMode, onStream, onError, onActiveChange]
  )

  // Toggle camera
  const toggleStream = useCallback(() => {
    if (isActive) {
      stopStream()
    } else {
      startStream(selectedDeviceId)
    }
  }, [isActive, stopStream, startStream, selectedDeviceId])

  // Switch camera if multiple devices exist
  const switchCamera = useCallback(() => {
    if (devices.length < 2) return
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDeviceId = devices[nextIndex].deviceId
    setSelectedDeviceId(nextDeviceId)
    startStream(nextDeviceId)
  }, [devices, selectedDeviceId, startStream])

  // React to propIsActive changes from parent
  useEffect(() => {
    if (propIsActive === true && !isActive && !isLoading) {
      startStream(selectedDeviceId)
    } else if (propIsActive === false && isActive) {
      stopStream()
    }
  }, [propIsActive])

  // Auto-start on mount if requested
  useEffect(() => {
    getVideoDevices()
    if (autoStart) {
      startStream()
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={setVideoRef}
        className="w-full h-full object-cover bg-black"
        playsInline
        muted
        autoPlay
        style={{ width, height }}
      />

      {/* Camera controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2">
        {isLoading && (
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary-600 border-r-primary-600 border-b-transparent border-l-transparent" />
        )}

        {!isLoading && (
          <>
            {isActive ? (
              <button
                type="button"
                onClick={stopStream}
                className="btn btn-error px-3 py-2 shadow-lg"
                title="Arrêter la caméra"
              >
                <CameraOff className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startStream(selectedDeviceId)}
                className="btn btn-primary px-3 py-2 shadow-lg"
                title="Démarrer la caméra"
                disabled={isLoading}
              >
                <CameraIcon className="w-5 h-5" />
              </button>
            )}

            {devices.length > 1 && isActive && (
              <button
                type="button"
                onClick={switchCamera}
                className="btn btn-secondary px-3 py-2 shadow-lg"
                title="Changer de caméra"
              >
                <Video className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 alert alert-error max-w-md shadow-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error.message}</span>
        </div>
      )}

      {/* Children overlays (FaceMesh, etc.) */}
      {children && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {children}
        </div>
      )}
    </div>
  )
})

export default Camera
