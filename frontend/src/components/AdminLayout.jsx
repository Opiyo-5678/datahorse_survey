import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const NAV = [
  { to: '/admin',              label: 'Dashboard',    icon: '▦', end: true },
  { to: '/admin/surveys/new',  label: 'New Survey',   icon: '+' },
  { to: '/admin/users',        label: 'Admin Users',  icon: '👤' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user = localStorage.getItem('dh_username') || 'Admin'

  function logout() {
    localStorage.removeItem('dh_token')
    localStorage.removeItem('dh_username')
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── SIDEBAR */}
      <aside style={{
        width: 220, flexShrink: 0, background: '#fff',
        borderRight: '1px solid var(--border)', position: 'fixed',
        top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.2rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: '#2E7D32', color: '#fff', fontWeight: 700,
              fontSize: '0.7rem', padding: '3px 7px', borderRadius: 3,
              letterSpacing: '0.05em'
            }}>DH</div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A202C', lineHeight: 1.2 }}>Datahorse</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-low)', letterSpacing: '0.06em' }}>SURVEYS ADMIN</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          <div style={{ padding: '0.4rem 1.25rem 0.3rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-low)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Menu
          </div>
          {NAV.map(item => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 1.25rem',
                color: isActive ? '#2E7D32' : 'var(--text-mid)',
                background: isActive ? '#E8F5E9' : 'transparent',
                borderLeft: `3px solid ${isActive ? '#2E7D32' : 'transparent'}`,
                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                textDecoration: 'none', transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#E8F5E9', border: '1.5px solid #2E7D32',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32'
            }}>
              {user.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A202C' }}>{user}</div>
              <div style={{ fontSize: '0.65rem', color: '#2E7D32', letterSpacing: '0.05em' }}>ADMIN</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: 'var(--bg2)' }}>
        <Outlet />
      </main>
    </div>
  )
}
