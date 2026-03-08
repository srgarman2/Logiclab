import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'

type Props = {
  open: boolean
  onClose: () => void
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1.25rem',
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '1rem',
  padding: '2rem',
  maxWidth: 380,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
}

export function SignInModal({ open, onClose }: Props) {
  const { signInWithGoogle, signInWithMagicLink } = useAuthStore()

  const [email, setEmail]           = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [magicError, setMagicError] = useState<string | null>(null)

  function handleClose() {
    setEmail('')
    setSending(false)
    setSent(false)
    setMagicError(null)
    onClose()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setMagicError(null)
    const result = await signInWithMagicLink(email)
    setSending(false)
    if (result.error) {
      setMagicError(result.error)
    } else {
      setSent(true)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={overlayStyle}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            style={modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#FB923C', fontFamily: 'Georgia, serif', marginBottom: 10 }}>⊢</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px' }}>
                Sign in to LogicLab
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                Sync your progress across devices. The quiz always works without an account.
              </p>
            </div>

            {sent ? (
              /* ── Sent confirmation ── */
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 12, padding: '0.5rem 0',
                }}
              >
                <div style={{ fontSize: 40 }}>📬</div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
                  Check your inbox
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                  We sent a magic link to <strong style={{ color: '#9CA3AF' }}>{email}</strong>.
                  Click it to sign in — no password needed.
                </p>
                <button
                  onClick={handleClose}
                  style={{ marginTop: 4, fontSize: '0.8125rem', color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <>
                {/* Google OAuth */}
                <button
                  onClick={signInWithGoogle}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                    padding: '0.75rem 1rem', borderRadius: '0.625rem', cursor: 'pointer',
                    fontSize: '0.9375rem', fontWeight: 600, width: '100%', transition: 'background 0.15s',
                    backgroundColor: '#fff', color: '#1e293b', border: '1px solid #e2e8f0',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
                  <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>or continue with email</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
                </div>

                {/* Magic link form */}
                <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setMagicError(null) }}
                    required
                    style={{
                      padding: '0.75rem 1rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
                      backgroundColor: '#0f172a', border: `1px solid ${magicError ? '#EF4444' : '#1e293b'}`,
                      color: '#F1F5F9', outline: 'none', width: '100%', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                    onBlur={e => (e.currentTarget.style.borderColor = magicError ? '#EF4444' : '#1e293b')}
                  />

                  {magicError && (
                    <p style={{ fontSize: '0.8rem', color: '#F87171', margin: 0 }}>{magicError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending || !email.trim()}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
                      fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', width: '100%',
                      backgroundColor: sending ? '#312e81' : '#4F46E5',
                      color: '#fff', border: '1px solid #4338CA',
                      opacity: !email.trim() ? 0.5 : 1,
                      transition: 'background 0.15s, opacity 0.15s',
                    }}
                  >
                    {sending ? 'Sending…' : '✉️ Send magic link'}
                  </button>
                </form>
              </>
            )}

            {/* Skip */}
            {!sent && (
              <button
                onClick={handleClose}
                style={{ fontSize: '0.8125rem', color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '0.25rem' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
              >
                Continue without signing in
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
