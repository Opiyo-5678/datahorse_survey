import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getResults, getSurvey } from '../api'
import api from '../api'   // default axios instance (sends JWT automatically)

const COLORS = ['var(--green)', 'var(--blue)', 'var(--amber)', '#7B2D8B', '#C53030']

export default function ResultsAdmin() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey]       = useState(null)
  const [results, setResults]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(null) // 'csv' | 'pdf' | null

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const s = await getSurvey(id)
      setSurvey(s.data)
      const r = await getResults(s.data.slug)
      setResults(r.data)
    } catch {
      toast.error('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  // ── Authenticated download (sends JWT token via axios) ──
  async function handleDownload(type) {
    setDownloading(type)
    try {
      const res = await api.get(`/surveys/${id}/export/${type}/`, {
        responseType: 'blob',   // tells axios to treat response as binary file
      })

      // Create a temporary download link and click it
      const url      = window.URL.createObjectURL(new Blob([res.data]))
      const link     = document.createElement('a')
      const ext      = type === 'csv' ? 'csv' : 'pdf'
      const filename = `${survey.slug}-results.${ext}`
      link.href      = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(`${type.toUpperCase()} downloaded!`)
    } catch (err) {
      console.error(err)
      toast.error(`Failed to download ${type.toUpperCase()}. Check that the export endpoint exists in Django.`)
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>
  if (!survey || !results) return null

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Results & Statistics</div>
          <h1 className="page-title">{survey.title}</h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-low)', marginTop: 4 }}>
            {results.total_responses} response{results.total_responses !== 1 ? 's' : ''} recorded
          </div>
        </div>
        <div className="page-actions">
          {/* CSV download — now authenticated via axios */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleDownload('csv')}
            disabled={!!downloading}
          >
            {downloading === 'csv' ? '⏳ Downloading…' : '⬇ CSV'}
          </button>

          {/* PDF download — now authenticated via axios */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleDownload('pdf')}
            disabled={!!downloading}
          >
            {downloading === 'pdf' ? '⏳ Downloading…' : '⬇ PDF'}
          </button>

          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>← Back</button>
        </div>
      </div>

      {results.total_responses === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No responses yet</div>
            <div className="empty-state-sub">Share the survey link to start collecting responses</div>
          </div>
        </div>
      )}

      {results.results.map((q, qi) => (
        <div className="card" key={q.id} style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <div>
              {q.heading && (
                <div style={{
                  fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700,
                  marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>
                  {q.heading}
                </div>
              )}
              <span className="card-title">Q{qi + 1} — {q.text}</span>
            </div>
            <span style={{
              background: 'var(--bg3)', color: 'var(--text-low)',
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 3,
              fontFamily: 'Source Code Pro, monospace'
            }}>
              {q.question_type === 'text'
                ? 'Open Text'
                : q.question_type === 'single'
                  ? 'Single Choice'
                  : 'Multiple Choice'}
            </span>
          </div>

          <div className="card-body">
            {q.question_type !== 'text' ? (
              <div className="bar-chart">
                {q.options.map((opt, oi) => (
                  <div className="bar-row" key={opt.id}>
                    <div className="bar-label-row">
                      <span className="bar-option-text">{opt.text}</span>
                      <span className="bar-pct">
                        {opt.percent}%{' '}
                        <span style={{ color: 'var(--text-low)', fontWeight: 400 }}>({opt.count})</span>
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${opt.percent}%`, background: COLORS[oi % COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {q.text_answers.length === 0 ? (
                  <span style={{ color: 'var(--text-low)', fontSize: '0.85rem' }}>No text responses yet.</span>
                ) : (
                  q.text_answers.map((ans, i) => (
                    <div key={i} style={{
                      background: 'var(--bg2)', borderLeft: '3px solid var(--green)',
                      padding: '0.65rem 1rem', marginBottom: '0.5rem',
                      borderRadius: '0 var(--radius) var(--radius) 0',
                      fontSize: '0.875rem', color: 'var(--text-mid)', fontStyle: 'italic'
                    }}>
                      "{ans}"
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Share link */}
      <div className="card" style={{ background: 'var(--green-dim)', border: '1px solid #A5D6A7' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.1rem' }}>🔗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>
              Survey link
            </div>
            <code style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>
              {window.location.origin}/{survey.slug}
            </code>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/${survey.slug}`)
            toast.success('Link copied!')
          }}>
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}