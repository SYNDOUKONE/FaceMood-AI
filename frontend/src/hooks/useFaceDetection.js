/**
 * Custom hook for face detection using MediaPipe Tasks Vision
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

export function useFaceDetection(options = {}) {
  const {
    videoRef: externalVideoRef,
    canvasRef: externalCanvasRef,
    onFaceDetected = () => {},
    onNoFace = () => {},
    onError = () => {},
    maxFaces = 5,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options

  const internalVideoRef = useRef(null)
  const internalCanvasRef = useRef(null)
  const videoRef = externalVideoRef || internalVideoRef
  const canvasRef = externalCanvasRef || internalCanvasRef

  const [faces, setFaces] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState(null)
  const [landmarks, setLandmarks] = useState([])
  const [blendshapes, setBlendshapes] = useState([])

  const detectorRef = useRef(null)
  const animFrameRef = useRef(null)
  const isDetectingRef = useRef(false)

  // Initialize the face detector
  const initDetector = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )

      const detector = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            window.FACEMESH_MODEL_PATH ||
            '/models/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: maxFaces,
        minFaceDetectionConfidence: minDetectionConfidence,
        minTrackingConfidence,
        outputFaceBlendshapes: true,
      })

      detectorRef.current = detector
      return detector
    } catch (err) {
      console.error('Failed to initialize FaceLandmarker:', err)
      setError(err)
      onError(err)
      return null
    }
  }, [maxFaces, minDetectionConfidence, minTrackingConfidence, onError])

  // Stop face detection
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false
    setIsDetecting(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [canvasRef])

  // Start face detection loop
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    try {
      let detector = detectorRef.current
      if (!detector) {
        detector = await initDetector()
      }
      if (!detector) return

      isDetectingRef.current = true
      setIsDetecting(true)
      setError(null)

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      const processFrame = () => {
        if (!isDetectingRef.current || !videoRef.current || !canvasRef.current || !detectorRef.current) {
          return
        }

        const currentVideo = videoRef.current
        const currentCanvas = canvasRef.current

        // Check if video is playing and has valid dimensions
        if (currentVideo.readyState >= 2 && currentVideo.videoWidth > 0 && currentVideo.videoHeight > 0) {
          if (currentCanvas.width !== currentVideo.videoWidth || currentCanvas.height !== currentVideo.videoHeight) {
            currentCanvas.width = currentVideo.videoWidth
            currentCanvas.height = currentVideo.videoHeight
          }

          ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height)

          try {
            const results = detectorRef.current.detectForVideo(currentVideo, performance.now())

            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              const detectedFaces = []
              const detectedLandmarks = []
              let detectedBlendshapes = []

              const drawingUtils = new DrawingUtils(ctx)

              for (let i = 0; i < results.faceLandmarks.length; i++) {
                const faceMarks = results.faceLandmarks[i]
                const xs = faceMarks.map((p) => p.x)
                const ys = faceMarks.map((p) => p.y)
                const minX = Math.min(...xs)
                const maxX = Math.max(...xs)
                const minY = Math.min(...ys)
                const maxY = Math.max(...ys)

                detectedFaces.push({
                  boundingBox: {
                    originX: minX,
                    originY: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                  },
                  confidence: 0.95,
                })

                const landmarks2d = faceMarks.map((lm) => ({
                  x: lm.x * currentCanvas.width,
                  y: lm.y * currentCanvas.height,
                }))
                detectedLandmarks.push(landmarks2d)

                // Draw mesh tesselation
                drawingUtils.drawConnectors(
                  faceMarks,
                  FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  { color: '#C0C0C070', lineWidth: 1 }
                )

                // Draw landmarks points
                faceMarks.forEach((lm) => {
                  ctx.beginPath()
                  ctx.arc(lm.x * currentCanvas.width, lm.y * currentCanvas.height, 2, 0, 2 * Math.PI)
                  ctx.fillStyle = '#00FF00'
                  ctx.fill()
                })

                // Blendshapes
                if (results.faceBlendshapes && results.faceBlendshapes[i]) {
                  detectedBlendshapes = results.faceBlendshapes[i].categories.map((cat) => ({
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
          } catch (detErr) {
            // Frame processing can skip occasionally without crashing
          }
        }

        if (isDetectingRef.current) {
          animFrameRef.current = requestAnimationFrame(processFrame)
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame)
    } catch (err) {
      console.error('Error starting face detection:', err)
      setError(err)
      onError(err)
    }
  }, [videoRef, canvasRef, initDetector, onFaceDetected, onNoFace, onError])

  // Toggle face detection
  const toggleDetection = useCallback(() => {
    if (isDetectingRef.current) {
      stopDetection()
    } else {
      startDetection()
    }
  }, [startDetection, stopDetection])

  // Capture current frame as data URL
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [videoRef])

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
    detector: detectorRef.current,
  }
}

export default useFaceDetection
