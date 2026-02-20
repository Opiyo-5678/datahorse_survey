import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

export default function AdminUsers() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ username: '', first_name: '', last_name: '', password: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/users/')
      setUsers(res.data)
    } catch { toast.error('Failed to load users') }
    finally  { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/users/', { ...form, is_staff: true })
      toast.success(`Admin user "${form.username}" created`)
      setForm({ username: '', first_name: '', last_name: '', password: '' })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.username?.[0] || 'Failed to create user')
    } finally { setSaving(false) }
  }

  async function handleDelete(id, username) {
    if (!window.confirm(`Remove admin access for "${username}"?`)) return
    try {
      await api.delete(`/users/${id}/`)
      toast.success('User removed')
      load()
    } catch { toast.error('Failed to remove user') }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>

  return (
    <div className="page-wrap" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">System</div>
          <h1 className="page-title">Admin Users</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(p => !p)}>
          {showForm ? 'Cancel' : '+ Add Admin'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><span className="card-title">New Admin User</span></div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={form.first_name} onChange={e => setForm(p => ({...p, first_name: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={form.last_name} onChange={e => setForm(p => ({...p, last_name: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" required value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" required value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Admin User'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Current Admins</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                  <td style={{ fontFamily: 'Source Code Pro, monospace', color: 'var(--text-mid)' }}>{u.username}</td>
                  <td><span className="pill pill-active">{u.is_superuser ? 'Super Admin' : 'Admin'}</span></td>
                  <td>
                    {!u.is_superuser && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.username)}>Remove</button>
                    )}
                    {u.is_superuser && <span style={{ fontSize: '0.78rem', color: 'var(--text-low)' }}>Cannot remove</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
