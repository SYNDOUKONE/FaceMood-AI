/**
 * Dashboard Page for FaceMood AI
 * Main page with camera, detection, and analysis features
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, ScanFace, Smile, Users, Plus, Settings, Play, Square, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import CameraComponent from '../components/Camera'
import FaceMesh from '../components/FaceMesh'
import AddFaceModal from '../components/AddFaceModal'
import RecognitionResult from '../components/RecognitionResult'
import { SimpleExpressionResult, LargeExpressionDisplay } from '../components/ExpressionResult'
import ProfileList from '../components/ProfileList'
import { FaceAPI, RecognitionAPI, ExpressionAPI, ProfileAPI, HealthAPI } from '../services/api'
import { loadSettings, SETTINGS_CHANGED_EVENT } from '../utils/settings'

export default function Dashboard() {
  // State
  const [appSettings, setAppSettings] = useState(() => loadSettings())
  const [isCameraActive, setIsCameraActive] = useState(true)
  const [isDetecting, setIsDetecting] = useState(() => loadSettings().autoRecognize)
  const [faces, setFaces] = useState([])
  const [landmarks, setLandmarks] = useState([])
  const [blendshapes, setBlendshapes] = useState([])
  const [recognitionResult, setRecognitionResult] = useState(null)
  const [expressionResult, setExpressionResult] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    profiles: 0,
    detections: 0,
    lastDetection: null,
  })
  const [apiStatus, setApiStatus] = useState('unknown')

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const lastRecognizeRef = useRef(0)
  const isRecognizingRef = useRef(false)

  // Listen for settings changes
  useEffect(() => {
    const onSettingsChanged = (e) => {
      const updated = e.detail || loadSettings()
      setAppSettings(updated)
      setIsDetecting(Boolean(updated.autoRecognize))
    }
    window.addEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged)
  }, [])

  // Check API health
  const checkApiHealth = useCallback(async () => {
    try {
      const result = await HealthAPI.check()
      if (result.status === 'healthy') {
        setApiStatus('healthy')
      } else {
        setApiStatus('unhealthy')
      }
    } catch (err) {
      setApiStatus('error')
    }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const countResult = await ProfileAPI.count()
      setStats(prev => ({ ...prev, profiles: countResult.count || 0 }))
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  // Initialize
  useEffect(() => {
    checkApiHealth()
    fetchStats()
    
    // Load MediaPipe model
    loadMediaPipeModel()
  }, [checkApiHealth, fetchStats])

  // Load MediaPipe model
  const loadMediaPipeModel = async () => {
    try {
      // Check if MediaPipe is already loaded
      if (window.FACEMESH_MODEL_PATH) return
      
      // This would normally load the model from a CDN or local path
      // For now, we'll use a placeholder
      window.FACEMESH_MODEL_PATH = '/models/face_landmarker.task'
    } catch (err) {
      console.error('Error loading MediaPipe model:', err)
    }
  }

  // Recognize face (throttled to at most once every 1200ms)
  const recognizeFace = useCallback(async (force = false) => {
    if (!videoRef.current || !isCameraActive) return
    const now = Date.now()
    if (!force && (isRecognizingRef.current || now - lastRecognizeRef.current < 1200)) {
      return
    }
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return

    isRecognizingRef.current = true
    lastRecognizeRef.current = now

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) return
      
      // Create file
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })
      
      // Call recognition API using configured threshold
      const result = await RecognitionAPI.recognize(file, appSettings.recognitionThreshold)
      setRecognitionResult(result)
    } catch (err) {
      console.error('Error recognizing face:', err)
      setError(err.message)
    } finally {
      isRecognizingRef.current = false
    }
  }, [videoRef, isCameraActive, appSettings.recognitionThreshold])

  // Handle face detection
  const handleFaceDetected = useCallback((detectedFaces, detectedLandmarks, detectedBlendshapes) => {
    setFaces(detectedFaces)
    setLandmarks(detectedLandmarks)
    setBlendshapes(detectedBlendshapes)
    setStats(prev => ({ ...prev, detections: prev.detections + 1, lastDetection: new Date() }))
    
    // Auto-recognize if face is detected and detection is enabled
    if (detectedFaces.length > 0 && isDetecting) {
      recognizeFace()
    }
  }, [isDetecting, recognizeFace])

  // Analyze expression
  const analyzeExpression = useCallback(async () => {
    if (!videoRef.current || !isCameraActive) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) return
      
      // Create file
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })
      
      // Call expression API
      const response = await ExpressionAPI.analyze(file)
      if (response && response.success && response.result) {
        setExpressionResult(response.result)
      } else if (response && !response.success) {
        setError(response.message || "Aucun visage détecté")
      } else {
        setExpressionResult(response)
      }
    } catch (err) {
      console.error('Error analyzing expression:', err)
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [videoRef, isCameraActive])

  // Toggle detection
  const toggleDetection = useCallback(() => {
    setIsDetecting(prev => !prev)
  }, [])

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Handle modal success
  const handleModalSuccess = useCallback(() => {
    fetchStats()
    setProfileRefreshKey((k) => k + 1)
    // Refresh recognition after adding a new profile
    if (isDetecting) {
      recognizeFace(true)
    }
  }, [fetchStats, isDetecting, recognizeFace])

  // Start/stop camera
  const toggleCamera = useCallback(() => {
    setIsCameraActive(prev => !prev)
  }, [])

  // Clear results
  const clearResults = useCallback(() => {
    setRecognitionResult(null)
    setExpressionResult(null)
  }, [])

  // Dismiss error
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">
            Détection et analyse faciale en temps réel
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* API Status */}
          {apiStatus === 'healthy' && (
            <div className="flex items-center space-x-1 text-success-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">API connectée</span>
            </div>
          )}
          {apiStatus === 'unhealthy' && (
            <div className="flex items-center space-x-1 text-warning-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">API instable</span>
            </div>
          )}
          {apiStatus === 'error' && (
            <div className="flex items-center space-x-1 text-error-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">API déconnectée</span>
            </div>
          )}
          
          {/* Settings button */}
          <button className="btn btn-secondary">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.profiles}</p>
              <p className="text-sm opacity-80">Profils</p>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.detections}</p>
              <p className="text-sm opacity-80">Détections</p>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isCameraActive ? 'ON' : 'OFF'}</p>
              <p className="text-sm opacity-80">Caméra</p>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{faces.length}</p>
              <p className="text-sm opacity-80">Visages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={dismissError} className="ml-auto text-error-600 hover:text-error-800">
            Fermer
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera section */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Caméra</span>
              </h2>
              
              <div className="flex items-center space-x-2">
                {/* Recognition toggle */}
                <button
                  onClick={toggleDetection}
                  className={`btn px-3 py-1 text-sm ${
                    isDetecting 
                      ? 'btn-success' 
                      : 'btn-secondary'
                  }`}
                  disabled={!isCameraActive}
                >
                  {isDetecting ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>Arrêter</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Reconnaître</span>
                    </>
                  )}
                </button>
                
                {/* Camera toggle */}
                <button
                  onClick={toggleCamera}
                  className="btn btn-primary px-3 py-1 text-sm"
                >
                  {isCameraActive ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>Arrêter</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Démarrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Camera */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <CameraComponent
                ref={videoRef}
                isActive={isCameraActive}
                onActiveChange={setIsCameraActive}
                autoStart={true}
                width="100%"
                height="100%"
              >
                {/* Face mesh overlay */}
                <FaceMesh
                  videoRef={videoRef}
                  onLandmarksDetected={handleFaceDetected}
                  showMesh={appSettings.showMesh}
                  showLandmarks={appSettings.showLandmarks}
                />
              </CameraComponent>

              {/* No camera message */}
              {!isCameraActive && (
                <div
                  onClick={() => setIsCameraActive(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/70 cursor-pointer z-30 transition-colors hover:bg-black/60"
                >
                  <div className="text-center text-white p-4">
                    <Camera className="w-12 h-12 mx-auto mb-2 text-primary-400 animate-pulse" />
                    <p className="font-semibold text-lg">Caméra en pause</p>
                    <p className="text-xs text-gray-300 mt-1">Cliquez ici ou sur &quot;Démarrer&quot; pour réactiver la caméra</p>
                  </div>
                </div>
              )}

              {/* Face count */}
              {faces.length > 0 && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{faces.length} visage(s) détecté(s)</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary flex-1 sm:flex-none"
                disabled={!isCameraActive}
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un visage</span>
              </button>
              
              <button
                onClick={analyzeExpression}
                className="btn btn-secondary flex-1 sm:flex-none"
                disabled={!isCameraActive || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-white border-r-white border-b-transparent border-l-transparent" />
                    <span>Analyse...</span>
                  </>
                ) : (
                  <>
                    <Smile className="w-5 h-5" />
                    <span>Analyser l'expression</span>
                  </>
                )}
              </button>
              
              <button
                onClick={clearResults}
                className="btn btn-secondary flex-1 sm:flex-none"
                disabled={!recognitionResult && !expressionResult}
              >
                <XCircle className="w-5 h-5" />
                <span>Effacer</span>
              </button>
            </div>

            {/* Results */}
            <div className="mt-4 space-y-3">
              {/* Recognition result */}
              {recognitionResult && (
                <RecognitionResult
                  result={recognitionResult}
                  onDismiss={() => setRecognitionResult(null)}
                />
              )}

              {/* Expression result */}
              {expressionResult && (
                <div className="expression-result">
                  <SimpleExpressionResult result={expressionResult} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Expression display */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Expression actuelle
            </h2>
            <LargeExpressionDisplay result={expressionResult} />
          </div>

          {/* Profiles list */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Profils
              </h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary px-3 py-1 text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <ProfileList
              maxHeight="400px"
              onAddProfile={() => setIsModalOpen(true)}
              showActions={false}
              showAddButton={false}
              refreshTrigger={profileRefreshKey}
            />
          </div>
        </div>
      </div>

      {/* Add Face Modal */}
      <AddFaceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        videoRef={videoRef}
        faceDetected={faces.length > 0}
        onSuccess={handleModalSuccess}
        onError={(err) => setError(err.message)}
      />
    </div>
  )
}
