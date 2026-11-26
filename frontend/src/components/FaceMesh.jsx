/**
 * FaceMesh Component for FaceMood AI
 * Displays face landmarks and mesh on top of camera/video
 */
import { useEffect, useRef, useCallback } from 'react'
import { useFaceDetection } from '../hooks/useFaceDetection'

export default function FaceMesh({
  videoRef,
  onLandmarksDetected = () => {},
  showMesh = true,
  showLandmarks = true,
  meshColor = '#C0C0C070',
  landmarkColor = '#00FF00',
  landmarkSize = 2,
  lineWidth = 1,
}) {
  const canvasRef = useRef(null)
  const {
    landmarks: detectedLandmarks,
    faces,
    isDetecting,
  } = useFaceDetection({ onFaceDetected: onLandmarksDetected })

  // Face landmark connections (MediaPipe Face Landmarker)
  // These are the connections for the tessellation (mesh)
  const FACE_LANDMARKS_TESSELATION = [
    // This is a simplified version - in practice, use the full tessellation
    // from MediaPipe
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18],
    [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26],
    // Add more connections as needed
  ]

  // Draw landmarks and mesh on canvas
  const drawFaceMesh = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || detectedLandmarks.length === 0) {
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Process each face
    detectedLandmarks.forEach((faceLandmarks, faceIndex) => {
      if (!faceLandmarks || faceLandmarks.length === 0) return

      // Draw mesh connections
      if (showMesh) {
        ctx.strokeStyle = meshColor
        ctx.lineWidth = lineWidth
        
        FACE_LANDMARKS_TESSELATION.forEach(([start, end]) => {
          const startLandmark = faceLandmarks[start]
          const endLandmark = faceLandmarks[end]
          
          if (startLandmark && endLandmark) {
            ctx.beginPath()
            ctx.moveTo(startLandmark.x, startLandmark.y)
            ctx.lineTo(endLandmark.x, endLandmark.y)
            ctx.stroke()
          }
        })
      }

      // Draw landmarks
      if (showLandmarks) {
        ctx.fillStyle = landmarkColor
        
        faceLandmarks.forEach(landmark => {
          if (landmark && !isNaN(landmark.x) && !isNaN(landmark.y)) {
            ctx.beginPath()
            ctx.arc(landmark.x, landmark.y, landmarkSize, 0, 2 * Math.PI)
            ctx.fill()
          }
        })
      }
    })
  }, [detectedLandmarks, showMesh, showLandmarks, meshColor, landmarkColor, landmarkSize, lineWidth])

  // Update canvas when landmarks change
  useEffect(() => {
    drawFaceMesh()
  }, [detectedLandmarks, drawFaceMesh])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawFaceMesh()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawFaceMesh])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
}

// Simplified version that uses MediaPipe directly
import { useEffect, useRef } from 'react'

export function SimpleFaceMesh({
  videoRef,
  faceLandmarker,
  showMesh = true,
  showLandmarks = true,
  meshColor = '#C0C0C070',
  landmarkColor = '#00FF00',
  landmarkSize = 2,
  lineWidth = 1,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    let animationFrameId

    const detectAndDraw = async () => {
      if (!video.videoWidth || !video.videoHeight) return

      // Set canvas dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      try {
        // Detect faces
        const results = await faceLandmarker.detectForVideo(video, Date.now())

        if (results.faceLandmarks) {
          results.faceLandmarks.forEach(faceLandmarks => {
            // Draw mesh
            if (showMesh && faceLandmarker.FACE_LANDMARKS_TESSELATION) {
              ctx.strokeStyle = meshColor
              ctx.lineWidth = lineWidth
              
              faceLandmarker.FACE_LANDMARKS_TESSELATION.forEach(([start, end]) => {
                const startLandmark = faceLandmarks[start]
                const endLandmark = faceLandmarks[end]
                
                ctx.beginPath()
                ctx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height)
                ctx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height)
                ctx.stroke()
              })
            }

            // Draw landmarks
            if (showLandmarks) {
              ctx.fillStyle = landmarkColor
              
              faceLandmarks.forEach(landmark => {
                ctx.beginPath()
                ctx.arc(
                  landmark.x * canvas.width,
                  landmark.y * canvas.height,
                  landmarkSize,
                  0,
                  2 * Math.PI
                )
                ctx.fill()
              })
            }
          })
        }

        animationFrameId = requestAnimationFrame(detectAndDraw)
      } catch (err) {
        console.error('Error in face detection:', err)
      }
    }

    detectAndDraw()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [videoRef, faceLandmarker, showMesh, showLandmarks, meshColor, landmarkColor, landmarkSize, lineWidth])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  )
}
