import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPublicSurvey, submitResponse } from '../api'

export default function WelcomeScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [survey, setSurvey]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers]       = useState({})
  const [errors, setErrors]         = useState({})

  const questionsRef = useRef(null)
  const questionRefs = useRef({})

  const storageKey = `dh_answers_${slug}`

  useEffect(() => {
    getPublicSurvey(slug)
      .then(res => {
        setSurvey(res.data)
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}')
        setAnswers(saved)
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
        else toast.error('Failed to load survey')
      })
      .finally(() => setLoading(false))
  }, [slug])

  function setAnswer(qId, value) {
    setAnswers(prev => {
      const next = { ...prev, [qId]: value }
      sessionStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
    setErrors(prev => ({ ...prev, [qId]: false }))
  }

  function toggleMulti(qId, optId) {
    const prev = Array.isArray(answers[qId]) ? answers[qId] : []
    const next = prev.includes(optId) ? prev.filter(x => x !== optId) : [...prev, optId]
    setAnswer(qId, next)
  }

  async function handleSubmit() {
    const newErrors = {}
    let firstErrorId = null
    survey.questions.forEach(q => {
      if (!q.is_required) return
      const val = answers[q.id]
      const empty =
        val === null || val === undefined ||
        (q.question_type === 'text' && !String(val).trim()) ||
        (q.question_type === 'multiple' && (!Array.isArray(val) || val.length === 0))
      if (empty) {
        newErrors[q.id] = true
        if (!firstErrorId) firstErrorId = q.id
      }
    })

    if (firstErrorId) {
      setErrors(newErrors)
      questionRefs.current[firstErrorId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast.error('Please answer all required questions')
      return
    }

    setSubmitting(true)
    const payload = {
      answers: survey.questions.map(q => {
        const val = answers[q.id]
        if (q.question_type === 'text') {
          return { question_id: q.id, text_answer: val || '', option_ids: [] }
        } else if (q.question_type === 'multiple') {
          return { question_id: q.id, option_ids: Array.isArray(val) ? val : [], text_answer: '' }
        } else {
          return { question_id: q.id, option_ids: val ? [val] : [], text_answer: '' }
        }
      })
    }

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
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={s.centered}><div className="spinner" /></div>
  )

  if (notFound) return (
    <div style={s.centered}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
        <h2 style={s.notFoundTitle}>Survey not found</h2>
        <p style={s.notFoundSub}>This survey may have been closed or the link is incorrect.</p>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* ══ HERO ══ */}
      <section style={s.hero}>
        {survey.cover_image_url ? (
          <>
            <img src={survey.cover_image_url} alt="" style={s.coverImg} />
            <div style={s.coverOverlay} />
          </>
        ) : (
          <div style={s.heroBg} />
        )}
        <div style={s.heroContent}>
          <div style={s.surveyLabel}>DATAHORSE - SURVEY</div>
          <h1 style={s.heroTitle} className="dh-fade-up">{survey.title}</h1>
          {survey.description && (
            <p style={s.heroDesc} className="dh-fade-up dh-delay-1">{survey.description}</p>
          )}
          {/* <div style={s.metaRow} className="dh-fade-up dh-delay-2">
            <span style={s.metaBadge}>{survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}</span>
            <span style={s.metaDot}>·</span>
            <span style={s.metaBadge}>Anonymous</span>
            <span style={s.metaDot}>·</span>
            <span style={s.metaBadge}>No account needed</span>
          </div> */}
          <button
            className="dh-fade-up dh-delay-3 dh-scroll-btn"
            style={s.scrollBtn}
            onClick={() => questionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span style={s.scrollBtnText}>Begin</span>
            <span className="dh-bounce" style={s.scrollArrow}>↓</span>
          </button>
        </div>
      </section>

      {/* ══ QUESTIONS ══ */}
      <section ref={questionsRef} style={s.questionsSection}>
        <div style={s.questionsInner}>

          {survey.questions.map((question, index) => {
            const answer   = answers[question.id]
            const hasError = errors[question.id]

            return (
              <div
                key={question.id}
                ref={el => questionRefs.current[question.id] = el}
                style={{ ...s.questionBlock, ...(hasError ? s.questionBlockError : {}) }}
              >
                <div style={s.qNumber}>{String(index + 1).padStart(2, '0')}</div>

                <div style={s.qBody}>
                  {question.heading && <div style={s.qHeading}>{question.heading}</div>}

                  <h2 style={s.qText}>
                    {question.text}
                    {question.is_required && <span style={s.required}> *</span>}
                  </h2>

                  {hasError && <div style={s.errorMsg}> Please answer this question</div>}

                  {/* Single choice */}
                  {question.question_type === 'single' && (
                    <div style={s.optionsList}>
                      {question.options.map(opt => {
                        const sel = answer === opt.id
                        return (
                          <div key={opt.id} onClick={() => setAnswer(question.id, opt.id)}
                            style={{ ...s.optionItem, ...(sel ? s.optionSelected : {}) }}
                            className="dh-option"
                          >
                            <div style={{ ...s.optionRadio, ...(sel ? s.optionRadioSel : {}) }}>
                              {sel && <div style={s.optionDot} />}
                            </div>
                            <span style={{ ...s.optionLabel, ...(sel ? s.optionLabelSel : {}) }}>
                              {opt.text}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Multiple choice */}
                  {question.question_type === 'multiple' && (
                    <div style={s.optionsList}>
                      <div style={s.multiHint}>Select all that apply</div>
                      {question.options.map(opt => {
                        const sel = Array.isArray(answer) && answer.includes(opt.id)
                        return (
                          <div key={opt.id} onClick={() => toggleMulti(question.id, opt.id)}
                            style={{ ...s.optionItem, ...(sel ? s.optionMultiSel : {}) }}
                            className="dh-option"
                          >
                            <div style={{ ...s.optionCheck, ...(sel ? s.optionCheckSel : {}) }}>
                              {sel && '✓'}
                            </div>
                            <span style={{ ...s.optionLabel, ...(sel ? s.optionLabelMultiSel : {}) }}>
                              {opt.text}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Text */}
                  {question.question_type === 'text' && (
                    <textarea
                      className="dh-textarea"
                      style={s.textarea}
                      placeholder="Type your answer here…"
                      value={answer || ''}
                      onChange={e => setAnswer(question.id, e.target.value)}
                      rows={4}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {/* Submit */}
          <div style={s.submitWrap}>
            <button
              style={{ ...s.submitBtn, ...(submitting ? s.submitBtnDisabled : {}) }}
              onClick={handleSubmit}
              disabled={submitting}
              className="dh-submit-btn"
            >
              {submitting ? 'Submitting…' : 'Submit Survey ✓'}
            </button>
            <p style={s.submitNote}> Your response is anonymous and secure</p>
          </div>
        </div>
      </section>

      <div style={s.footer}>
        Powered by Datahorse Surveys ·{' '}
        <a href="https://datahorse.no" style={{ color: '#2E7D32', textDecoration: 'none' }}>datahorse.no</a>
      </div>
    </div>
  )
}

/* ══ STYLES ══ */
const s = {
  page:          { minHeight: '100vh', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" },
  centered:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: { fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: '#1A1A1A', marginBottom: 8 },
  notFoundSub:   { color: '#888', fontSize: '0.95rem' },

  hero:        { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroBg:      { position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0F2010 0%, #1E4020 50%, #2E7D32 100%)', zIndex: 0 },
  coverImg:    { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, zIndex: 0 },
  coverOverlay:{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,32,16,0.55) 0%, rgba(15,32,16,0.88) 100%)', zIndex: 0 },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 740, width: '100%', padding: '4rem 2rem', textAlign: 'center', color: '#fff' },
  surveyLabel: { fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2rem' },
  heroTitle:   { fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 400, lineHeight: 1.15, color: '#fff', marginBottom: '1.5rem' },
  heroDesc:    { fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: 1.75, color: 'rgba(255,255,255,0.72)', maxWidth: 540, margin: '0 auto 2rem' },
  metaRow:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '3rem', flexWrap: 'wrap' },
  metaBadge:   { fontSize: '0.78rem', color: 'rgba(255,255,255,0.52)', fontWeight: 500 },
  metaDot:     { color: 'rgba(255,255,255,0.22)' },
  scrollBtn:   { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid rgba(255,255,255,0.28)', borderRadius: 100, padding: '12px 32px', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' },
  scrollBtnText:{ fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase' },
  scrollArrow: { fontSize: '1.1rem', display: 'inline-block' },

  questionsSection: { background: '#FAFAF8', padding: '6rem 2rem 4rem' },
  questionsInner:   { maxWidth: 760, margin: '0 auto' },
  questionBlock:    { display: 'flex', gap: '2.5rem', marginBottom: '5rem', paddingBottom: '4rem', borderBottom: '1px solid #E8E8E2', transition: 'all 0.2s' },
  questionBlockError:{ borderBottom: '2px solid #FC8181' },
  qNumber:     { fontFamily: "'DM Serif Display', serif", fontSize: '3.5rem', color: '#D4E8D5', lineHeight: 1, flexShrink: 0, width: 72, textAlign: 'right', paddingTop: 4, userSelect: 'none' },
  qBody:       { flex: 1, minWidth: 0 },
  qHeading:    { fontSize: '0.68rem', fontWeight: 700, color: '#2E7D32', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 },
  qText:       { fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(1.25rem, 3vw, 1.7rem)', fontWeight: 400, color: '#1A1A1A', lineHeight: 1.35, marginBottom: '1.5rem' },
  required:    { color: '#C53030' },
  errorMsg:    { fontSize: '0.78rem', color: '#C53030', fontWeight: 600, marginBottom: '0.75rem' },
  multiHint:   { fontSize: '0.78rem', color: '#999', fontStyle: 'italic', marginBottom: '0.85rem' },

  optionsList:       { display: 'flex', flexDirection: 'column', gap: 10 },
  optionItem:        { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', border: '1.5px solid #E2E8E0', borderRadius: 8, background: '#fff', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' },
  optionSelected:    { border: '1.5px solid #2E7D32', background: '#F0FBF0' },
  optionMultiSel:    { border: '1.5px solid #2B6CB0', background: '#EBF4FF' },
  optionRadio:       { width: 20, height: 20, borderRadius: '50%', border: '2px solid #CBD5D0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' },
  optionRadioSel:    { border: '2px solid #2E7D32', background: '#2E7D32' },
  optionDot:         { width: 7, height: 7, borderRadius: '50%', background: '#fff' },
  optionCheck:       { width: 20, height: 20, borderRadius: 4, border: '2px solid #CBD5D0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 700, transition: 'all 0.15s' },
  optionCheckSel:    { border: '2px solid #2B6CB0', background: '#2B6CB0' },
  optionLabel:       { fontSize: '0.95rem', color: '#2D3748', lineHeight: 1.45 },
  optionLabelSel:    { color: '#2E7D32', fontWeight: 600 },
  optionLabelMultiSel:{ color: '#2B6CB0', fontWeight: 600 },
  textarea:    { width: '100%', background: '#fff', border: '1.5px solid #E2E8E0', borderRadius: 8, padding: '14px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#1A1A1A', resize: 'vertical', outline: 'none', transition: 'border 0.2s', lineHeight: 1.6 },

  submitWrap:       { textAlign: 'center', paddingTop: '2rem', paddingBottom: '2rem' },
  submitBtn:        { background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '16px 56px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(46,125,50,0.25)' },
  submitBtnDisabled:{ background: '#A0AEC0', cursor: 'not-allowed', boxShadow: 'none' },
  submitNote:  { marginTop: 14, fontSize: '0.78rem', color: '#AAA' },

  footer: { textAlign: 'center', padding: '1.5rem', fontSize: '0.72rem', color: '#B0B0A8', letterSpacing: '0.06em', borderTop: '1px solid #EEEEE8' },
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

  .dh-fade-up {
    opacity: 0;
    transform: translateY(22px);
    animation: dhFadeUp 0.7s ease forwards;
  }
  .dh-delay-1 { animation-delay: 0.15s; }
  .dh-delay-2 { animation-delay: 0.28s; }
  .dh-delay-3 { animation-delay: 0.42s; }

  @keyframes dhFadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .dh-bounce {
    animation: dhBounce 1.6s 1s ease-in-out infinite;
  }
  @keyframes dhBounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(7px); }
  }

  .dh-scroll-btn:hover {
    border-color: rgba(255,255,255,0.6) !important;
    color: #fff !important;
  }

  .dh-option:hover {
    border-color: #2E7D32 !important;
    background: #F6FBF6 !important;
    transform: translateX(3px);
  }

  .dh-textarea:focus {
    border-color: #2E7D32 !important;
    box-shadow: 0 0 0 3px rgba(46,125,50,0.1);
  }

  .dh-submit-btn:hover:not(:disabled) {
    background: #276228 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(46,125,50,0.3) !important;
  }

  @media (max-width: 600px) {
    .dh-q-block { flex-direction: column !important; gap: 1rem !important; }
  }
`