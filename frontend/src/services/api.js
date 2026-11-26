/**
 * API Service for FaceMood AI
 * Handles all API calls to the backend
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - API response
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error)
    throw error
  }
}

/**
 * Upload file to API
 * @param {string} endpoint - API endpoint
 * @param {File|Blob} file - File to upload
 * @param {Object} additionalData - Additional form data
 * @returns {Promise<Object>} - API response
 */
async function uploadFile(endpoint, file, additionalData = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const formData = new FormData()
  formData.append('file', file)
  
  // Append additional data
  for (const [key, value] of Object.entries(additionalData)) {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  } catch (error) {
    console.error(`File upload failed: ${endpoint}`, error)
    throw error
  }
}

/**
 * Upload multiple files to API
 * @param {string} endpoint - API endpoint
 * @param {File[]} files - Files to upload
 * @param {Object} additionalData - Additional form data
 * @returns {Promise<Object>} - API response
 */
async function uploadFiles(endpoint, files, additionalData = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const formData = new FormData()
  
  // Append files
  files.forEach((file, index) => {
    formData.append(`files`, file)
  })
  
  // Append additional data
  for (const [key, value] of Object.entries(additionalData)) {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Multiple files upload failed: ${endpoint}`, error)
    throw error
  }
}

// ============================================
// Face Detection API
// ============================================

export const FaceAPI = {
  /**
   * Detect faces in an image
   * @param {File|Blob} image - Image file
   * @returns {Promise<Object>} - Detection result
   */
  detect: async (image) => {
    return uploadFile('/api/faces/detect', image)
  },
  
  /**
   * Detect faces with landmarks
   * @param {File|Blob} image - Image file
   * @returns {Promise<Object>} - Detection result with landmarks
   */
  detectLandmarks: async (image) => {
    return uploadFile('/api/faces/detect-landmarks', image)
  },
  
  /**
   * Enroll a new face
   * @param {string} name - Profile name
   * @param {File[]} images - Face images
   * @param {boolean} consent - User consent
   * @returns {Promise<Object>} - Enrollment result
   */
  enroll: async (name, images, consent = true) => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('consent', consent.toString())
    
    images.forEach((image, index) => {
      formData.append('files', image)
    })
    
    const url = `${API_BASE}/api/faces/enroll`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  },
}

// ============================================
// Face Recognition API
// ============================================

export const RecognitionAPI = {
  /**
   * Recognize a face in an image
   * @param {File|Blob} image - Image file
   * @param {number} threshold - Recognition threshold (0.0 to 1.0)
   * @returns {Promise<Object>} - Recognition result
   */
  recognize: async (image, threshold = null) => {
    const url = new URL(`${API_BASE}/api/recognize/`)
    if (threshold !== null) {
      url.searchParams.append('threshold', threshold.toString())
    }
    
    return uploadFile(url.pathname + url.search, image)
  },
  
  /**
   * Verify identity against a specific profile
   * @param {number} profileId - Profile ID
   * @param {File|Blob} image - Image file
   * @param {number} threshold - Verification threshold
   * @returns {Promise<Object>} - Verification result
   */
  verify: async (profileId, image, threshold = null) => {
    const url = new URL(`${API_BASE}/api/recognize/verify/${profileId}`)
    if (threshold !== null) {
      url.searchParams.append('threshold', threshold.toString())
    }
    
    return uploadFile(url.pathname + url.search, image)
  },
  
  /**
   * Find similar profiles
   * @param {number} profileId - Reference profile ID
   * @param {number} threshold - Minimum similarity threshold
   * @param {number} topK - Number of results to return
   * @returns {Promise<Object>} - Similar profiles
   */
  findSimilar: async (profileId, threshold = 0.0, topK = 5) => {
    const url = new URL(`${API_BASE}/api/recognize/similar/${profileId}`)
    url.searchParams.append('threshold', threshold.toString())
    url.searchParams.append('top_k', topK.toString())
    
    return apiRequest(url.pathname + url.search)
  },
  
  /**
   * Get recognition threshold
   * @returns {Promise<Object>} - Current threshold
   */
  getThreshold: async () => {
    return apiRequest('/api/recognize/threshold')
  },
  
  /**
   * Set recognition threshold
   * @param {number} threshold - New threshold (0.0 to 1.0)
   * @returns {Promise<Object>} - Confirmation
   */
  setThreshold: async (threshold) => {
    const url = new URL(`${API_BASE}/api/recognize/threshold`)
    url.searchParams.append('threshold', threshold.toString())
    
    return apiRequest(url.pathname + url.search, { method: 'POST' })
  },
}

// ============================================
// Expression Analysis API
// ============================================

export const ExpressionAPI = {
  /**
   * Analyze facial expression
   * @param {File|Blob} image - Image file
   * @returns {Promise<Object>} - Expression analysis result
   */
  analyze: async (image) => {
    return uploadFile('/api/expressions/analyze', image)
  },
  
  /**
   * List all possible expressions
   * @returns {Promise<Object>} - List of expressions
   */
  list: async () => {
    return apiRequest('/api/expressions/list')
  },
  
  /**
   * Get live analysis info
   * @returns {Promise<Object>} - Analysis information
   */
  getInfo: async () => {
    return apiRequest('/api/expressions/analyze-live')
  },
}

// ============================================
// Profile Management API
// ============================================

export const ProfileAPI = {
  /**
   * List all profiles
   * @returns {Promise<Object>} - List of profiles
   */
  list: async () => {
    return apiRequest('/api/profiles/')
  },
  
  /**
   * Get a specific profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object>} - Profile information
   */
  get: async (profileId) => {
    return apiRequest(`/api/profiles/${profileId}`)
  },
  
  /**
   * Create a new profile
   * @param {Object} data - Profile data
   * @param {File[]} files - Face images
   * @returns {Promise<Object>} - Created profile
   */
  create: async (data, files) => {
    const formData = new FormData()
    
    // Append data
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        formData.append(key, value)
      }
    }
    
    // Append files
    files.forEach((file) => {
      formData.append('files', file)
    })
    
    const url = `${API_BASE}/api/profiles/`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  },
  
  /**
   * Update a profile
   * @param {number} profileId - Profile ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} - Updated profile
   */
  update: async (profileId, data) => {
    const url = new URL(`${API_BASE}/api/profiles/${profileId}`)
    
    // Add query parameters
    if (data.name) url.searchParams.append('name', data.name)
    if (data.consent !== undefined) url.searchParams.append('consent', data.consent.toString())
    
    return apiRequest(url.pathname + url.search, { method: 'PUT' })
  },
  
  /**
   * Delete a profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object>} - Confirmation
   */
  delete: async (profileId) => {
    return apiRequest(`/api/profiles/${profileId}`, { method: 'DELETE' })
  },
  
  /**
   * Update profile embedding
   * @param {number} profileId - Profile ID
   * @param {File[]} files - New face images
   * @returns {Promise<Object>} - Confirmation
   */
  updateEmbedding: async (profileId, files) => {
    const formData = new FormData()
    
    files.forEach((file) => {
      formData.append('files', file)
    })
    
    const url = `${API_BASE}/api/profiles/${profileId}/update-embedding`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || `HTTP error! status: ${response.status}`
      )
    }
    
    return await response.json()
  },
  
  /**
   * Get profile embedding
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object>} - Profile embedding
   */
  getEmbedding: async (profileId) => {
    return apiRequest(`/api/profiles/${profileId}/embedding`)
  },
  
  /**
   * Get profile count
   * @returns {Promise<Object>} - Count of profiles
   */
  count: async () => {
    return apiRequest('/api/profiles/count')
  },
  
  /**
   * Search profiles by name
   * @param {string} name - Name to search for
   * @returns {Promise<Object>} - Matching profiles
   */
  search: async (name) => {
    const url = new URL(`${API_BASE}/api/profiles/search`)
    url.searchParams.append('name', name)
    
    return apiRequest(url.pathname + url.search)
  },
}

// ============================================
// Health Check API
// ============================================

export const HealthAPI = {
  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  check: async () => {
    return apiRequest('/health')
  },
}

// ============================================
// Export all APIs
// ============================================

export default {
  FaceAPI,
  RecognitionAPI,
  ExpressionAPI,
  ProfileAPI,
  HealthAPI,
  apiRequest,
  uploadFile,
  uploadFiles,
}
