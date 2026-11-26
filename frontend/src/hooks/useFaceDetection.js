/**
 * Custom hook for face detection using MediaPipe
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Face, Camera } from '@mediapipe/face_landmarks'
import { drawConnectors } from '@mediapipe/drawing_utils'

export function useFaceDetection(options = {}) {
  const {
    onFaceDetected = () => {},
    onNoFace = () => {},
    onError = () => {},
    maxFaces = 1,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [faces, setFaces] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState(null)
  const [landmarks, setLandmarks] = useState([])
  const [blendshapes, setBlendshapes] = useState([])

  // Store the face detector instance
  const detectorRef = useRef(null)

  // Initialize the face detector
  const initDetector = useCallback(async () => {
    try {
      // Check if MediaPipe is available
      if (typeof Face === 'undefined') {
        throw new Error('MediaPipe Face Landmarker not loaded')
      }

      // Create face detector
      const detector = await Face.createFromOptions(
        window.FACEMESH_MODEL_PATH || '/models/face_landmarker.task',
        {
          baseOptions: {
            modelAssetPath: window.FACEMESH_MODEL_PATH || '/models/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          maxNumFaces: maxFaces,
          minDetectionConfidence,
          minTrackingConfidence,
          outputFaceBlendshapes: true,
        }
      )

      detectorRef.current = detector
      return detector
    } catch (err) {
      console.error('Failed to initialize face detector:', err)
      setError(err)
      onError(err)
      return null
    }
  }, [maxFaces, minDetectionConfidence, minTrackingConfidence, onError])

  // Start face detection
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError(new Error('Video or canvas element not available'))
      return
    }

    try {
      // Initialize detector if not already done
      if (!detectorRef.current) {
        await initDetector()
      }

      const detector = detectorRef.current
      if (!detector) return

      setIsDetecting(true)
      setError(null)

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Process video frames
      const processFrame = async () => {
        if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
          return
        }

        try {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Detect faces
          const results = await detector.detectForVideo(video, Date.now())

          if (results.detections && results.detections.length > 0) {
            const detectedFaces = []
            const detectedLandmarks = []
            let detectedBlendshapes = []

            // Process each face
            for (const detection of results.detections) {
              detectedFaces.push({
                boundingBox: detection.boundingBox,
                confidence: detection.confidence,
              })

              // Draw landmarks
              if (detection.landmarks) {
                // Convert landmarks to normalized coordinates
                const landmarks2d = detection.landmarks.map(landmark => ({
                  x: landmark.x * canvas.width,
                  y: landmark.y * canvas.height,
                }))
                detectedLandmarks.push(landmarks2d)

                // Draw connections
                drawConnectors(
                  ctx,
                  detection.landmarks,
                  Face.FACE_LANDMARKS_TESSELATION,
                  { color: '#C0C0C070', lineWidth: 1 }
                )

                // Draw landmarks
                detection.landmarks.forEach(landmark => {
                  ctx.beginPath()
                  ctx.arc(
                    landmark.x * canvas.width,
                    landmark.y * canvas.height,
                    2,
                    0,
                    2 * Math.PI
                  )
                  ctx.fillStyle = '#00FF00'
                  ctx.fill()
                })
              }

              // Process blendshapes
              if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                detectedBlendshapes = results.faceBlendshapes[0].categories.map(cat => ({
                  categoryName: cat.categoryName,
                  score: cat.score,
                }))
              }
            }

            setFaces(detectedFaces)
            setLandmarks(detectedLandmarks)
            setBlendshapes(detectedBlendshapes)
            onFaceDetected(detectedFaces, detectedLandmarks, detectedBlendshapes)
          } else {
            setFaces([])
            setLandmarks([])
            setBlendshapes([])
            onNoFace()
          }

          // Continue processing
          requestAnimationFrame(processFrame)
        } catch (err) {
          console.error('Error processing frame:', err)
          setError(err)
          onError(err)
        }
      }

      // Start processing
      processFrame()
    } catch (err) {
      console.error('Error starting detection:', err)
      setError(err)
      onError(err)
    }
  }, [initDetector, onFaceDetected, onNoFace, onError])

  // Stop face detection
  const stopDetection = useCallback(() => {
    setIsDetecting(false)
  }, [])

  // Toggle face detection
  const toggleDetection = useCallback(() => {
    if (isDetecting) {
      stopDetection()
    } else {
      startDetection()
    }
  }, [isDetecting, startDetection, stopDetection])

  // Capture current frame
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      return null
    }

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  // Get face ROI (Region of Interest)
  const getFaceROI = useCallback((faceIndex = 0) => {
    if (!videoRef.current || faces.length === 0) {
      return null
    }

    const video = videoRef.current
    const face = faces[faceIndex]
    const bbox = face.boundingBox

    const x = bbox.originX * video.videoWidth
    const y = bbox.originY * video.videoHeight
    const width = bbox.width * video.videoWidth
    const height = bbox.height * video.videoHeight

    // Add padding
    const padding = 20
    const x1 = Math.max(0, x - padding)
    const y1 = Math.max(0, y - padding)
    const x2 = Math.min(video.videoWidth, x + width + padding)
    const y2 = Math.min(video.videoHeight, y + height + padding)

    const canvas = document.createElement('canvas')
    canvas.width = x2 - x1
    canvas.height = y2 - y1

    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      video,
      x1, y1, x2 - x1, y2 - y1,
      0, 0, x2 - x1, y2 - y1
    )

    return canvas
  }, [faces])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection()
      if (detectorRef.current) {
        detectorRef.current.close()
        detectorRef.current = null
      }
    }
  }, [stopDetection])

  return {
    videoRef,
    canvasRef,
    faces,
    landmarks,
    blendshapes,
    isDetecting,
    error,
    startDetection,
    stopDetection,
    toggleDetection,
    captureFrame,
    getFaceROI,
    detector: detectorRef.current,
  }
}

export default useFaceDetection
