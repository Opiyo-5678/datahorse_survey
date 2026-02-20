import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSurveys, getDashboardStats, deleteSurvey } from '../api'

export default function Dashboard() {
  const [surveys, setSurveys]   = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [s, st] = await Promise.all([getSurveys(), getDashboardStats()])
      setSurveys(s.data)
      setStats(st.data)
    } catch { toast.error('Failed to load surveys') }
    finally  { setLoading(false) }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}" and all its responses? This cannot be undone.`)) return
    try {
      await deleteSurvey(id)
      toast.success('Survey deleted')
      load()
    } catch { toast.error('Failed to delete survey') }
  }

  const statusLabel = s => ({ active: 'Active', draft: 'Draft', closed: 'Closed' }[s] || s)
  const statusClass = s => ({ active: 'pill-active', draft: 'pill-draft', closed: 'pill-closed' }[s])

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Admin Dashboard</div>
          <h1 className="page-title">All Surveys</h1>
        </div>
        <div className="page-actions">
          <Link to="/admin/surveys/new" className="btn btn-primary">+ New Survey</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Total Surveys</div>
          <div className="stat-value">{stats.total_surveys ?? '—'}</div>
          <div className="stat-sub">{stats.active_surveys} active</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Responses</div>
          <div className="stat-value">{stats.total_responses ?? '—'}</div>
          <div className="stat-sub">across all surveys</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Active Now</div>
          <div className="stat-value">{stats.active_surveys ?? '—'}</div>
          <div className="stat-sub">accepting responses</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Survey List</span>
        </div>
        <div className="table-wrap">
          {surveys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No surveys yet</div>
              <div className="empty-state-sub">Create your first survey to get started</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Responses</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-low)', fontFamily: 'Source Code Pro, monospace' }}>
                        /survey/{s.slug}
                      </div>
                    </td>
                    <td><span className={`pill ${statusClass(s.status)}`}><span className="pill-dot"/>{ statusLabel(s.status)}</span></td>
                    <td style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-mid)' }}>{s.question_count}</td>
                    <td style={{ fontFamily: 'Source Code Pro, monospace', fontWeight: 600 }}>{s.response_count}</td>
                    <td style={{ color: 'var(--text-low)', fontSize: '0.82rem' }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/surveys/${s.id}/results`)}>Results</button>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/surveys/${s.id}/edit`)}>Edit</button>
                        <button className="btn btn-danger btn-sm"  onClick={() => handleDelete(s.id, s.title)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
