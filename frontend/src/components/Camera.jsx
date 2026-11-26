/**
 * Camera Component for FaceMood AI
 * Manages camera access and video stream
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera as CameraIcon, CameraOff, Video, VideoOff } from 'lucide-react'

export default function Camera({
  onStream = () => {},
  onError = () => {},
  facingMode = 'user',
  width = 640,
  height = 480,
  autoStart = true,
  children,
}) {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setDevices(videoDevices)
      
      // Set default device
      if (videoDevices.length > 0) {
        const defaultDevice = videoDevices.find(device => device.facing === facingMode) || videoDevices[0]
        setSelectedDeviceId(defaultDevice.deviceId)
      }
    } catch (err) {
      console.error('Error enumerating devices:', err)
      setError(err)
    }
  }, [facingMode])

  // Start camera stream
  const startStream = useCallback(async (deviceId = null) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('MediaDevices API not supported')
      setError(err)
      onError(err)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      // Get constraints
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      }

      // Request media stream
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err)
          setError(err)
          onError(err)
        })
      }

      setStream(newStream)
      setIsActive(true)
      onStream(newStream)
      
    } catch (err) {
      console.error('Error starting camera:', err)
      setError(err)
      onError(err)
      setIsActive(false)
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, width, height, stream, onStream, onError])

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsActive(false)
      
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  // Toggle camera
  const toggleStream = useCallback(() => {
    if (isActive) {
      stopStream()
    } else {
      startStream(selectedDeviceId)
    }
  }, [isActive, stopStream, startStream, selectedDeviceId])

  // Switch camera
  const switchCamera = useCallback(() => {
    const currentFacingMode = facingMode === 'user' ? 'environment' : 'user'
    
    // Find device with opposite facing mode
    const oppositeDevice = devices.find(device => device.facing === currentFacingMode)
    
    if (oppositeDevice) {
      startStream(oppositeDevice.deviceId)
    } else {
      startStream(null) // Let browser choose
    }
  }, [facingMode, devices, startStream])

  // Initialize on mount
  useEffect(() => {
    getVideoDevices()
    
    if (autoStart) {
      startStream()
    }
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [autoStart, getVideoDevices, startStream, stream])

  // Handle device selection change
  useEffect(() => {
    if (selectedDeviceId && isActive) {
      startStream(selectedDeviceId)
    }
  }, [selectedDeviceId, isActive, startStream])

  // Update video dimensions when props change
  useEffect(() => {
    if (videoRef.current && stream) {
      // Note: Video dimensions are set by the stream, not by props
      // This is just for reference
    }
  }, [width, height, stream])

  // Context value
  const contextValue = {
    videoRef,
    stream,
    isActive,
    error,
    isLoading,
    devices,
    selectedDeviceId,
    startStream,
    stopStream,
    toggleStream,
    switchCamera,
    setSelectedDeviceId,
    getVideoDevices,
  }

  return (
    <div className="relative">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        playsInline
        muted
        autoPlay
        style={{ width, height }}
      />
      
      {/* Camera controls */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2">
        {isLoading && (
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary-600 border-r-primary-600 border-b-transparent border-l-transparent" />
        )}
        
        {!isLoading && (
          <>
            {isActive ? (
              <button
                onClick={stopStream}
                className="btn btn-error px-3 py-2"
                title="Arrêter la caméra"
              >
                <CameraOff className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => startStream()}
                className="btn btn-primary px-3 py-2"
                title="Démarrer la caméra"
                disabled={isLoading}
              >
                <CameraIcon className="w-5 h-5" />
              </button>
            )}
            
            {devices.length > 1 && isActive && (
              <button
                onClick={switchCamera}
                className="btn btn-secondary px-3 py-2"
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
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 alert alert-error">
          <span>{error.message}</span>
        </div>
      )}
      
      {/* Children */}
      {children && (
        <div className="absolute inset-0 pointer-events-none">
          {children}
        </div>
      )}
    </div>
  )
}

// Export context for advanced usage
import { createContext } from 'react'

export const CameraContext = createContext(null)

export function CameraProvider({ children, ...props }) {
  const camera = useCamera(props)
  return (
    <CameraContext.Provider value={camera}>
      {children}
    </CameraContext.Provider>
  )
}

export function useCamera(props) {
  return useFaceDetection(props)
}
