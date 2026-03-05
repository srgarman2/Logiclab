import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { SignInModal } from '../auth/SignInModal'

export function NavBar() {
  const { user, signOut } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'rgba(3,7,18,0.95)',
        borderBottom: '1px solid #1f2937',
      }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* Brand */}
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <span style={{ fontSize: 20, color: '#FB923C', fontFamily: 'Georgia, serif' }}>⊢</span>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F9FAFB', letterSpacing: '-0.01em' }}>LogicLab</span>
          </NavLink>

          {/* Center nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink
              to="/quiz"
              style={({ isActive }) => ({
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                backgroundColor: isActive ? '#4F46E5' : 'transparent',
                color: isActive ? '#fff' : '#9CA3AF',
              })}
            >
              Quiz
            </NavLink>
            <NavLink
              to="/daily"
              style={({ isActive }) => ({
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                backgroundColor: isActive ? '#4F46E5' : 'transparent',
                color: isActive ? '#fff' : '#9CA3AF',
              })}
            >
              📅 Daily
            </NavLink>
            <NavLink
              to="/leaderboard"
              style={({ isActive }) => ({
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                backgroundColor: isActive ? '#4F46E5' : 'transparent',
                color: isActive ? '#fff' : '#9CA3AF',
              })}
            >
              🏆 Leaderboard
            </NavLink>
          </div>

          {/* Auth section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={user.user_metadata?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email ?? 'U')}`}
                    alt="avatar"
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #1e293b' }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', background: 'transparent', border: '1px solid #1e293b', color: '#6B7280', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#E5E7EB' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#6B7280' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                style={{ padding: '0.375rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.35)', color: '#818CF8', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.15)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
