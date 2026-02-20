import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicResults } from '../api'

const COLORS = ['#2E7D32', '#2B6CB0', '#D97706', '#7B2D8B', '#C53030']

export default function ResultsScreen() {
  const { slug } = useParams()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    getPublicResults(slug)
      .then(res => setResults(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner"/>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
          <div style={{ background: '#2E7D32', color: '#fff', fontWeight: 800, fontSize: '0.7rem', padding: '3px 9px', borderRadius: 4, letterSpacing: '0.05em' }}>DATAHORSE</div>
          <div style={{ height: 1, width: 40, background: 'var(--border)' }}/>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-low)' }}>Survey Results</span>
        </div>

        {/* Thank you card */}
        <div className="card" style={{ marginBottom: '1.25rem', borderTop: '3px solid var(--green)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--green-dim)', border: '2px solid var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0
            }}>✓</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 3 }}>
                Thank you for your response!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-low)' }}>
                {error
                  ? 'Results are not available for this survey.'
                  : `Here's how ${results?.total_responses} people answered so far`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {!error && results && results.results.map((q, qi) => (
          <div className="card" key={q.id} style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {q.heading && (
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {q.heading}
                </div>
              )}
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', marginBottom: '1.1rem', lineHeight: 1.4 }}>
                {q.text}
              </div>

              {q.question_type !== 'text' ? (
                <div className="bar-chart">
                  {q.options.map((opt, oi) => (
                    <div className="bar-row" key={opt.id}>
                      <div className="bar-label-row">
                        <span className="bar-option-text">{opt.text}</span>
                        <span className="bar-pct">{opt.percent}%</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${opt.percent}%`, background: COLORS[oi % COLORS.length] }}/>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-low)' }}>{opt.count} response{opt.count !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '0.85rem',
                  fontSize: '0.82rem', color: 'var(--text-low)', fontStyle: 'italic'
                }}>
                  Open text responses are reviewed privately by the Datahorse team.
                </div>
              )}
            </div>
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-low)', marginTop: '1.5rem' }}>
          Powered by Datahorse Surveys · <a href="https://datahorse.no" style={{ color: 'var(--green)', textDecoration: 'none' }}>datahorse.no</a>
        </p>
      </div>
    </div>
  )
}
