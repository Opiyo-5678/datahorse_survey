import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  getSurvey, createSurvey, updateSurvey,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestions
} from '../api'

const EMPTY_QUESTION = {
  heading: '', text: '', question_type: 'single',
  is_required: true, options_data: [{ text: '' }, { text: '' }]
}

export default function SurveyBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [meta, setMeta]       = useState({ title: '', description: '', slug: '', status: 'draft', show_results: true })
  const [questions, setQs]    = useState([])
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [coverFile, setCover] = useState(null)

  useEffect(() => {
    if (isEdit) loadSurvey()
  }, [id])

  async function loadSurvey() {
    try {
      const res = await getSurvey(id)
      const s = res.data
      setMeta({ title: s.title, description: s.description, slug: s.slug, status: s.status, show_results: s.show_results })
      setQs(s.questions.map(q => ({
        ...q,
        options_data: q.options.map(o => ({ id: o.id, text: o.text })),
        _saved: true
      })))
    } catch { toast.error('Failed to load survey') }
    finally  { setLoading(false) }
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function handleMetaChange(field, val) {
    setMeta(p => ({
      ...p,
      [field]: val,
      ...(field === 'title' && !isEdit ? { slug: slugify(val) } : {})
    }))
  }

  function addQ() {
    setQs(p => [...p, { ...JSON.parse(JSON.stringify(EMPTY_QUESTION)), _id: Date.now() }])
  }

  function updateQ(index, field, val) {
    setQs(p => p.map((q, i) => i === index ? { ...q, [field]: val } : q))
  }

  function addOption(qIndex) {
    setQs(p => p.map((q, i) => i === qIndex
      ? { ...q, options_data: [...q.options_data, { text: '' }] }
      : q))
  }

  function updateOption(qIndex, oIndex, val) {
    setQs(p => p.map((q, i) => i === qIndex
      ? { ...q, options_data: q.options_data.map((o, j) => j === oIndex ? { ...o, text: val } : o) }
      : q))
  }

  function removeOption(qIndex, oIndex) {
    setQs(p => p.map((q, i) => i === qIndex
      ? { ...q, options_data: q.options_data.filter((_, j) => j !== oIndex) }
      : q))
  }

  async function removeQ(index) {
    const q = questions[index]
    if (q.id && q._saved) {
      if (!window.confirm('Remove this question and its data?')) return
      try { await deleteQuestion(q.id) } catch { toast.error('Failed to delete question'); return }
    }
    setQs(p => p.filter((_, i) => i !== index))
  }

  function onDragEnd(result) {
    if (!result.destination) return
    const items = Array.from(questions)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setQs(items)
    if (isEdit && id) {
      const savedIds = items.filter(q => q.id).map(q => q.id)
      reorderQuestions(id, savedIds).catch(() => toast.error('Failed to save order'))
    }
  }

  async function handleSave() {
    if (!meta.title.trim()) { toast.error('Please enter a survey title'); return }
    if (!meta.slug.trim())  { toast.error('Please enter a URL slug');      return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(meta).forEach(([k, v]) => fd.append(k, v))
      if (coverFile) fd.append('cover_image', coverFile)

      let surveyId = id
      if (isEdit) {
        await updateSurvey(id, fd)
      } else {
        const res = await createSurvey(fd)
        surveyId = res.data.id
      }

      // Save each question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qData = {
          heading: q.heading, text: q.text,
          question_type: q.question_type,
          is_required: q.is_required, order: i,
          options_data: q.question_type !== 'text' ? q.options_data.filter(o => o.text.trim()) : []
        }
        if (q.id && q._saved) {
          await updateQuestion(q.id, qData)
        } else {
          await addQuestion(surveyId, qData)
        }
      }

      toast.success(isEdit ? 'Survey updated!' : 'Survey created!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save survey')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>

  return (
    <div className="page-wrap" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{isEdit ? 'Edit Survey' : 'New Survey'}</div>
          <h1 className="page-title">{isEdit ? 'Edit Survey' : 'Build Survey'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => navigate('/admin')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Survey'}
          </button>
        </div>
      </div>

      {/* ── Survey meta */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><span className="card-title">Survey Details</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. V75 Season Satisfaction 2025"
                value={meta.title} onChange={e => handleMetaChange('title', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">URL Slug *</label>
              <input className="form-input" placeholder="e.g. v75-satisfaction"
                value={meta.slug} onChange={e => handleMetaChange('slug', slugify(e.target.value))} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Description (shown on welcome screen)</label>
            <textarea className="form-textarea" placeholder="Optional survey description…"
              value={meta.description} onChange={e => handleMetaChange('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Cover Image (shown on welcome screen)</label>
            <input type="file" accept="image/*" className="form-input" style={{ padding: '6px 12px' }}
              onChange={e => setCover(e.target.files[0])} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={meta.status} onChange={e => handleMetaChange('status', e.target.value)}>
                <option value="draft">Draft — not visible to public</option>
                <option value="active">Active — accepting responses</option>
                <option value="closed">Closed — no more responses</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Show results to respondents?</label>
              <div className="toggle-wrap" style={{ marginTop: 6 }}>
                <button className={`toggle-switch ${meta.show_results ? 'on' : ''}`}
                  onClick={() => handleMetaChange('show_results', !meta.show_results)} type="button"/>
                <span className="toggle-label">{meta.show_results ? 'Yes — users see charts after submitting' : 'No — results stay private'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Questions */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Questions ({questions.length})</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-low)' }}>Drag ⠿ to reorder</span>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((q, qi) => (
                <Draggable key={q.id || q._id || qi} draggableId={String(q.id || q._id || qi)} index={qi}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}
                      className="card" style={{ marginBottom: '0.85rem', border: snap.isDragging ? '2px solid var(--blue)' : undefined }}>
                      {/* Q Header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.75rem 1rem', background: 'var(--bg2)',
                        borderBottom: '1px solid var(--border)', borderRadius: '10px 10px 0 0'
                      }}>
                        <span {...prov.dragHandleProps} style={{ color: 'var(--text-low)', cursor: 'grab', fontSize: '1.1rem', lineHeight: 1 }}>⠿</span>
                        <span style={{
                          background: 'var(--green-dim)', color: 'var(--green)',
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em'
                        }}>Q {qi + 1}</span>
                        <select className="form-select" style={{ width: 'auto', marginLeft: 'auto', fontSize: '0.8rem', padding: '4px 8px' }}
                          value={q.question_type} onChange={e => updateQ(qi, 'question_type', e.target.value)}>
                          <option value="single">Single Choice</option>
                          <option value="multiple">Multiple Choice</option>
                          <option value="text">Open Text</option>
                        </select>
                        <button onClick={() => removeQ(qi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-low)', fontSize: '1rem' }} title="Remove question">✕</button>
                      </div>

                      {/* Q Body */}
                      <div style={{ padding: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Heading <span style={{ color: 'var(--text-low)', fontWeight: 400 }}>(optional — shown above the question)</span></label>
                          <input className="form-input" placeholder="e.g. About your experience"
                            value={q.heading} onChange={e => updateQ(qi, 'heading', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: q.question_type !== 'text' ? '1rem' : 0 }}>
                          <label className="form-label">Question Text *</label>
                          <input className="form-input" placeholder="Type your question here…"
                            value={q.text} onChange={e => updateQ(qi, 'text', e.target.value)} />
                        </div>

                        {/* Options for choice questions */}
                        {q.question_type !== 'text' && (
                          <div>
                            <label className="form-label">Answer Options</label>
                            {q.options_data.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: 'var(--text-low)', fontSize: '0.8rem', minWidth: 16 }}>{oi + 1}.</span>
                                <input className="form-input" placeholder={`Option ${oi + 1}`} style={{ flex: 1 }}
                                  value={opt.text} onChange={e => updateOption(qi, oi, e.target.value)} />
                                <button onClick={() => removeOption(qi, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-low)', fontSize: '0.9rem', padding: 4 }}>✕</button>
                              </div>
                            ))}
                            <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => addOption(qi)}>
                              + Add Option
                            </button>
                          </div>
                        )}

                        {q.question_type === 'text' && (
                          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 'var(--radius)', padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-low)' }}>Free text response — respondent types their answer</span>
                          </div>
                        )}
                      </div>

                      {/* Q Footer */}
                      <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="toggle-wrap">
                          <button className={`toggle-switch ${q.is_required ? 'on' : ''}`} type="button"
                            onClick={() => updateQ(qi, 'is_required', !q.is_required)}/>
                          <span className="toggle-label" style={{ fontSize: '0.8rem' }}>
                            {q.is_required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add question */}
      <button onClick={addQ} style={{
        width: '100%', padding: '0.9rem', background: 'transparent',
        border: '2px dashed var(--border2)', borderRadius: 'var(--radius-lg)',
        cursor: 'pointer', color: 'var(--text-low)', fontSize: '0.875rem',
        fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: '1.5rem'
      }}
        onMouseEnter={e => { e.target.style.borderColor = '#2E7D32'; e.target.style.color = '#2E7D32' }}
        onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text-low)' }}>
        ⊕ &nbsp; Add Question
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: '2rem' }}>
        <button className="btn btn-outline" onClick={() => navigate('/admin')}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Survey'}
        </button>
      </div>
    </div>
  )
}
