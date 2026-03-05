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

const oauthBtnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
  padding: '0.75rem 1rem', borderRadius: '0.625rem', cursor: 'pointer',
  fontSize: '0.9375rem', fontWeight: 600, width: '100%',
  transition: 'background 0.15s',
}

export function SignInModal({ open, onClose }: Props) {
  const { signInWithGoogle, signInWithGitHub } = useAuthStore()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={overlayStyle}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            style={modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, color: '#FB923C', fontFamily: 'Georgia, serif', marginBottom: 10 }}>⊢</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px' }}>
                Sign in to LogicLab
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                Sync your progress across devices. The quiz always works without an account.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={signInWithGoogle}
                style={{ ...oauthBtnBase, backgroundColor: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }}
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

              <button
                onClick={signInWithGitHub}
                style={{ ...oauthBtnBase, backgroundColor: '#24292e', color: '#fff', border: '1px solid #374151' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#24292e')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                Continue with GitHub
              </button>
            </div>

            <button
              onClick={onClose}
              style={{ fontSize: '0.8125rem', color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '0.25rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
            >
              Continue without signing in
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
