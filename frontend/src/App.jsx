import { Routes, Route, Navigate } from 'react-router-dom'
import Login          from './admin/Login'
import Dashboard      from './admin/Dashboard'
import SurveyBuilder  from './admin/SurveyBuilder'
import ResultsAdmin   from './admin/ResultsAdmin'
import AdminUsers     from './admin/AdminUsers'
import AdminLayout    from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import WelcomeScreen  from './survey/WelcomeScreen'
import QuestionScreen from './survey/QuestionScreen'
import ResultsScreen  from './survey/ResultsScreen'

export default function App() {
  return (
    <Routes>
      {/* ── Admin routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="surveys/new"              element={<SurveyBuilder />} />
        <Route path="surveys/:id/edit"         element={<SurveyBuilder />} />
        <Route path="surveys/:id/results"      element={<ResultsAdmin />} />
        <Route path="users"                    element={<AdminUsers />} />
      </Route>

      {/* ── Public survey routes */}
      <Route path="/:slug"                element={<WelcomeScreen />} />
      <Route path="/:slug/q/:num"         element={<QuestionScreen />} />
      <Route path="/:slug/results"        element={<ResultsScreen />} />

      {/* ── Default */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
