import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPublicSurvey, submitResponse } from '../api'

export default function QuestionScreen() {
  const { slug, num } = useParams()
  const navigate = useNavigate()
  const qIndex = parseInt(num) - 1

  const [survey, setSurvey]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Store all answers across questions in sessionStorage
  const storageKey = `dh_answers_${slug}`
  const getAnswers = () => JSON.parse(sessionStorage.getItem(storageKey) || '{}')
  const saveAnswer = (qId, val) => {
    const prev = getAnswers()
    sessionStorage.setItem(storageKey, JSON.stringify({ ...prev, [qId]: val }))
  }

  const [currentAnswer, setCurrentAnswer] = useState(null)

  useEffect(() => {
    getPublicSurvey(slug)
      .then(res => {
        setSurvey(res.data)
        // Load existing answer for this question if navigating back
        const q = res.data.questions[qIndex]
        if (q) {
          const saved = getAnswers()[q.id]
          if (saved !== undefined) setCurrentAnswer(saved)
          else setCurrentAnswer(q.question_type === 'multiple' ? [] : null)
        }
      })
      .catch(() => navigate(`/${slug}`))
      .finally(() => setLoading(false))
  }, [slug, num])

  if (loading || !survey) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner"/>
    </div>
  )

  const question = survey.questions[qIndex]
  const total    = survey.questions.length
  const isLast   = qIndex === total - 1
  const progress = Math.round(((qIndex + 1) / total) * 100)

  if (!question) { navigate(`/${slug}`); return null }

  const canProceed = !question.is_required || (
    question.question_type === 'text'
      ? (currentAnswer && currentAnswer.trim())
      : question.question_type === 'multiple'
        ? currentAnswer && currentAnswer.length > 0
        : currentAnswer !== null
  )

  function handleSingleSelect(optId) {
    setCurrentAnswer(optId)
    saveAnswer(question.id, optId)
  }

  function handleMultiToggle(optId) {
    const prev = Array.isArray(currentAnswer) ? currentAnswer : []
    const next = prev.includes(optId) ? prev.filter(x => x !== optId) : [...prev, optId]
    setCurrentAnswer(next)
    saveAnswer(question.id, next)
  }

  function handleText(val) {
    setCurrentAnswer(val)
    saveAnswer(question.id, val)
  }

  function goNext() {
    // Save current answer
    if (currentAnswer !== null) saveAnswer(question.id, currentAnswer)

    if (!isLast) {
      navigate(`/${slug}/q/${qIndex + 2}`)
    } else {
      handleSubmit()
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    const savedAnswers = getAnswers()

    const payload = { answers: survey.questions.map(q => {
      const val = savedAnswers[q.id]
      if (q.question_type === 'text') {
        return { question_id: q.id, text_answer: val || '', option_ids: [] }
      } else if (q.question_type === 'multiple') {
        return { question_id: q.id, option_ids: Array.isArray(val) ? val : [], text_answer: '' }
      } else {
        return { question_id: q.id, option_ids: val ? [val] : [], text_answer: '' }
      }
    })}

    try {
      await submitResponse(slug, payload)
      sessionStorage.removeItem(storageKey)
      navigate(`/${slug}/results`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit'
      if (msg.includes('already submitted')) {
        toast.error('You have already submitted a response to this survey')
        navigate(`/${slug}/results`)
      } else {
        toast.error(msg)
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>

      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
        <div style={{ background: '#2E7D32', color: '#fff', fontWeight: 800, fontSize: '0.7rem', padding: '3px 9px', borderRadius: 4, letterSpacing: '0.05em' }}>DATAHORSE</div>
        <div style={{ height: 1, width: 40, background: 'var(--border)' }}/>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-low)' }}>{survey.title}</span>
      </div>

      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Progress */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-low)' }}>Question {qIndex + 1} of {total}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green)' }}>{progress}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.4s ease' }}/>
          </div>
        </div>

        {/* Question card */}
        <div className="card" style={{ boxShadow: 'var(--shadow-md)', marginBottom: '1rem' }}>
          <div style={{ padding: '1.75rem 2rem' }}>
            {/* Heading */}
            {question.heading && (
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {question.heading}
              </div>
            )}

            {/* Question text */}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              {question.text}
              {question.is_required && <span style={{ color: 'var(--red)', marginLeft: 4, fontSize: '1rem' }}>*</span>}
            </h2>

            {/* Single choice */}
            {question.question_type === 'single' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {question.options.map(opt => {
                  const selected = currentAnswer === opt.id
                  return (
                    <div key={opt.id} onClick={() => handleSingleSelect(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', borderRadius: 'var(--radius)',
                        border: `1.5px solid ${selected ? '#2E7D32' : 'var(--border)'}`,
                        background: selected ? 'var(--green-dim)' : 'var(--bg)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${selected ? '#2E7D32' : 'var(--border2)'}`,
                        background: selected ? '#2E7D32' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>}
                      </div>
                      <span style={{ fontSize: '0.9rem', color: selected ? '#2E7D32' : 'var(--text)', fontWeight: selected ? 600 : 400 }}>
                        {opt.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Multiple choice */}
            {question.question_type === 'multiple' && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-low)', marginBottom: '0.75rem' }}>Select all that apply</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {question.options.map(opt => {
                    const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id)
                    return (
                      <div key={opt.id} onClick={() => handleMultiToggle(opt.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 'var(--radius)',
                          border: `1.5px solid ${selected ? '#2B6CB0' : 'var(--border)'}`,
                          background: selected ? 'var(--blue-dim)' : 'var(--bg)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                          border: `2px solid ${selected ? '#2B6CB0' : 'var(--border2)'}`,
                          background: selected ? '#2B6CB0' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', color: '#fff',
                        }}>
                          {selected && '✓'}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: selected ? '#2B6CB0' : 'var(--text)', fontWeight: selected ? 600 : 400 }}>
                          {opt.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Open text */}
            {question.question_type === 'text' && (
              <textarea className="form-textarea"
                placeholder="Type your answer here…"
                style={{ minHeight: 120, fontSize: '0.9rem' }}
                value={currentAnswer || ''}
                onChange={e => handleText(e.target.value)}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 2rem', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              {qIndex > 0 && (
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/${slug}/q/${qIndex}`)}>
                  ← Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!question.is_required && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-low)' }}>Optional</span>
              )}
              <button className="btn btn-primary" onClick={goNext}
                disabled={question.is_required && !canProceed || submitting}
                style={{ minWidth: 110, justifyContent: 'center' }}>
                {submitting ? 'Submitting…' : isLast ? 'Submit ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-low)' }}>
          🔒 Your response is anonymous
        </p>
      </div>
    </div>
  )
}
