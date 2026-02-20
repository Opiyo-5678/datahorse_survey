import axios from 'axios'

const api = axios.create({ baseURL: 'https://datahorse-api.onrender.com/api' })

// Attach JWT token to every request if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('dh_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dh_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth
export const login = (username, password) =>
  api.post('/auth/login/', { username, password })

// ── Admin surveys
export const getDashboardStats = () => api.get('/dashboard/')
export const getSurveys        = () => api.get('/surveys/')
export const getSurvey         = (id) => api.get(`/surveys/${id}/`)
export const createSurvey      = (data) => api.post('/surveys/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateSurvey      = (id, data) => api.put(`/surveys/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteSurvey      = (id) => api.delete(`/surveys/${id}/`)

// ── Admin questions
export const addQuestion     = (surveyId, data) => api.post(`/surveys/${surveyId}/questions/`, data)
export const updateQuestion  = (id, data)       => api.put(`/questions/${id}/`, data)
export const deleteQuestion  = (id)             => api.delete(`/questions/${id}/`)
export const reorderQuestions = (surveyId, order) => api.post(`/surveys/${surveyId}/questions/reorder/`, { order })

// ── Admin results & export
export const getResults  = (slug) => api.get(`/surveys/${slug}/results/`)
export const exportCSV   = (id)   => `/api/surveys/${id}/export/csv/`
export const exportPDF   = (id)   => `/api/surveys/${id}/export/pdf/`

// ── Public
export const getPublicSurvey  = (slug) => api.get(`/public/surveys/${slug}/`)
export const submitResponse   = (slug, data) => api.post(`/public/surveys/${slug}/submit/`, data)
export const getPublicResults = (slug) => api.get(`/surveys/${slug}/results/`)

export default api
