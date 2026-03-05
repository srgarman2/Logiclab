import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { type QuizCategory, type QuizQuestion } from '../../data/quizQuestions'

type Props = {
  deck: QuizQuestion[]
  score: number
  maxStreak: number
  category: QuizCategory | 'all'
  onClose: () => void
}

export function ChallengeModal({ deck, score, maxStreak, category, onClose }: Props) {
  const { user } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const challenge = {
    challengerName: user?.user_metadata?.full_name ?? 'A LogicLab player',
    challengerScore: score,
    challengerStreak: maxStreak,
    category,
    questionIds: deck.map((q) => q.id),
  }

  const encoded = btoa(JSON.stringify(challenge))
  const shareUrl = `${window.location.origin}/quiz?challenge=${encoded}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    backgroundColor: 'rgba(3,7,18,0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }

  const modal: React.CSSProperties = {
    backgroundColor: '#0c1424',
    border: '1px solid #1e293b',
    borderRadius: '1rem',
    padding: '2rem',
    maxWidth: 420,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          style={modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Challenge a Friend
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              They'll play the same {deck.length} questions.<br />
              Can they beat <strong style={{ color: '#F97316' }}>{score.toLocaleString()} pts</strong>?
            </p>
          </div>

          {/* Score summary */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            {[
              { label: 'Your Score', value: score.toLocaleString(), color: '#818CF8' },
              { label: 'Best Streak', value: `🔥 ×${maxStreak}`, color: '#FCD34D' },
            ].map((s) => (
              <div key={s.label} style={{
                backgroundColor: '#0f172a', border: '1px solid #1e293b',
                borderRadius: '0.625rem', padding: '0.75rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: '#374151', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Share link */}
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              Shareable Link
            </p>
            <div style={{
              backgroundColor: '#0f172a', border: '1px solid #1e293b',
              borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
              fontFamily: 'monospace', fontSize: '0.7rem', color: '#6B7280',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {shareUrl}
            </div>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
              fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.15s',
              backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.12)',
              border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(249,115,22,0.35)',
              color: copied ? '#34D399' : '#F97316',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>

          {/* Done */}
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
              fontWeight: 500, cursor: 'pointer', background: 'transparent',
              border: '1px solid #1e293b', color: '#6B7280',
            }}
          >
            Done
          </button>

          {/* Disclaimer */}
          <p style={{ fontSize: '0.7rem', color: '#374151', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            🔗 Link works best when both players use the same device.<br />
            Full cross-device support coming with Supabase sync.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
