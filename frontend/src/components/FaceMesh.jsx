/**
 * FaceMesh Component for FaceMood AI
 * Displays face landmarks and mesh on top of camera/video
 */
import { useEffect, useRef } from 'react'
import { useFaceDetection } from '../hooks/useFaceDetection'

export default function FaceMesh({
  videoRef,
  onLandmarksDetected = () => {},
  maxFaces = 5,
  showMesh = true,
  showLandmarks = true,
}) {
  const canvasRef = useRef(null)

  const {
    landmarks,
    faces,
    isDetecting,
    startDetection,
    stopDetection,
  } = useFaceDetection({
    videoRef,
    canvasRef,
    maxFaces,
    onFaceDetected: onLandmarksDetected,
  })

  // Watch video stream and automatically start/stop detection
  useEffect(() => {
    let checkInterval = null
    const checkAndStart = () => {
      const video = videoRef?.current
      if (video && video.readyState >= 2 && !video.paused) {
        startDetection()
      }
    }

    const video = videoRef?.current
    if (video) {
      video.addEventListener('play', checkAndStart)
      video.addEventListener('loadeddata', checkAndStart)
      checkAndStart()
    }

    // Polling in case video was already playing
    checkInterval = setInterval(checkAndStart, 1000)

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      if (video) {
        video.removeEventListener('play', checkAndStart)
        video.removeEventListener('loadeddata', checkAndStart)
      }
      stopDetection()
    }
  }, [videoRef, startDetection, stopDetection])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full z-10"
    />
  )
}
