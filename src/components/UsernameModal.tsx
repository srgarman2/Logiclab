import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore } from '../store/progressStore'

type Props = {
  open: boolean
  onClose: () => void
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,20}$/

export function UsernameModal({ open, onClose }: Props) {
  const { username, setUsername } = useProgressStore()
  const [value, setValue] = useState(username ?? '')
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  const isValid = value.trim() === '' || USERNAME_REGEX.test(value.trim())
  const validationMsg = value.trim() && !isValid
    ? 'Letters, numbers and underscores only (max 20 chars)'
    : null

  const handleSave = async () => {
    if (!isValid || saving) return
    setSaving(true)
    setStatus(null)
    const result = await setUsername(value)
    setSaving(false)
    if (result.success) {
      setStatus({ msg: 'Username saved!', ok: true })
      setTimeout(() => {
        setStatus(null)
        onClose()
      }, 1000)
    } else {
      setStatus({ msg: result.error ?? 'Failed to save', ok: false })
    }
  }

  const handleClose = () => {
    setValue(username ?? '')
    setStatus(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            style={{
              backgroundColor: '#0c1424',
              border: '1px solid #1e293b',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: 380,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✏️</div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px' }}>
                Set Your Username
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                This is what appears on the leaderboard instead of your name. Leave blank to use your first name.
              </p>
            </div>

            {/* Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                autoFocus
                type="text"
                maxLength={20}
                placeholder="e.g. LogicMaster99"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setStatus(null)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.625rem',
                  fontSize: '0.9375rem',
                  backgroundColor: '#141e30',
                  border: `1px solid ${validationMsg ? '#F87171' : '#1e293b'}`,
                  color: '#E2E8F0',
                  outline: 'none',
                  fontFamily: 'monospace',
                  letterSpacing: '0.03em',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {validationMsg && (
                <span style={{ fontSize: '0.75rem', color: '#F87171' }}>{validationMsg}</span>
              )}
              <span style={{ fontSize: '0.65rem', color: '#374151' }}>
                Letters, numbers and underscores · Max 20 characters · Unique
              </span>
            </div>

            {/* Status */}
            {status && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: '0.8125rem', fontWeight: 600, textAlign: 'center',
                  color: status.ok ? '#34D399' : '#F87171',
                }}
              >
                {status.msg}
              </motion.div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving || !isValid}
                style={{
                  padding: '0.75rem', borderRadius: '0.625rem',
                  fontSize: '0.9375rem', fontWeight: 700, cursor: saving || !isValid ? 'not-allowed' : 'pointer',
                  backgroundColor: saving || !isValid ? '#1e293b' : '#4F46E5',
                  color: saving || !isValid ? '#4B5563' : '#fff',
                  border: '1px solid transparent',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
              >
                {saving ? 'Saving…' : 'Save Username'}
              </button>
              <button
                onClick={handleClose}
                style={{
                  fontSize: '0.8125rem', color: '#4B5563',
                  background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'center', padding: '0.25rem',
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
