import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgressStore } from '../store/progressStore'
import { useAuthStore } from '../store/authStore'
import { useQuizStore } from '../store/quizStore'
import { quizQuestions, type QuizCategory } from '../data/quizQuestions'
import { SignInModal } from '../components/auth/SignInModal'

// Total question counts per category (matches the full expanded bank)
const CATEGORY_TOTALS: Record<QuizCategory, number> = {
  'indicator-words':   35,
  'formal-logic':      40,
  'argument-analysis': 35,
  'flaw-detection':    40,
}

function MasteryBar({ category, color }: { category: QuizCategory; color: string }) {
  const { categoryMastery } = useProgressStore()
  const entry = categoryMastery[category]
  const pct = entry.attempted === 0 ? 0 : Math.min(entry.correct / CATEGORY_TOTALS[category], 1) * 100
  return (
    <div style={{ marginTop: 8, paddingInline: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.6rem', color: '#4B5563' }}>
          Mastery · {entry.correct}/{CATEGORY_TOTALS[category]} correct
        </span>
        <span style={{ fontSize: '0.6rem', color, fontWeight: 700 }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 4, backgroundColor: '#1e293b', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: 9999,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

const CATEGORIES: { value: QuizCategory | 'all'; label: string; color: string; icon: string }[] = [
  { value: 'all',               label: 'All Topics',        color: '#6366F1', icon: '∀' },
  { value: 'indicator-words',   label: 'Indicator Words',   color: '#3B82F6', icon: '→' },
  { value: 'formal-logic',      label: 'Formal Logic',      color: '#A855F7', icon: '⊢' },
  { value: 'argument-analysis', label: 'Argument Analysis', color: '#EC4899', icon: '§' },
  { value: 'flaw-detection',    label: 'Flaw Detection',    color: '#22C55E', icon: '⚠' },
]

const card: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '0.875rem',
}

export function Home() {
  const { quizHighScore, quizLongestStreak, quizTotalPlayed } = useProgressStore()
  const { user } = useAuthStore()
  const { start } = useQuizStore()
  const [signInOpen, setSignInOpen] = useState(false)

  const stats = [
    { label: 'Best Score',     value: quizHighScore.toLocaleString(), color: '#818CF8' },
    { label: 'Best Streak',    value: String(quizLongestStreak),      color: '#FCD34D' },
    { label: 'Quizzes Played', value: String(quizTotalPlayed),        color: '#34D399' },
  ]

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, paddingBottom: 64, paddingLeft: 20, paddingRight: 20 }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 56, fontFamily: 'Georgia, serif', color: '#FB923C', lineHeight: 1, marginBottom: 20 }}>⊢</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#F9FAFB', margin: '0 0 14px' }}>
            LogicLab
          </h1>
          <p style={{ color: '#6B7280', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7, fontSize: '1rem' }}>
            Sharpen your logical reasoning. Identify flaws, trace conditional chains, master formal logic — one timed question at a time.
          </p>
          <Link to="/quiz" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '0.75rem 2.25rem', borderRadius: '0.625rem', fontSize: '1rem', fontWeight: 700,
                backgroundColor: '#4F46E5', color: '#fff', border: '1px solid #4338CA',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6366F1')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4F46E5')}
            >
              Start Quiz →
            </button>
          </Link>
        </div>

        {/* Sign-in nudge — only when signed out */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              ...card,
              backgroundColor: 'rgba(79,70,229,0.06)',
              borderColor: 'rgba(79,70,229,0.2)',
              padding: '0.875rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
              Sign in to sync your progress across devices.
            </p>
            <button
              onClick={() => setSignInOpen(true)}
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#818CF8', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}
            >
              Sign in →
            </button>
          </motion.div>
        )}

        {/* Stats */}
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Your Progress
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ ...card, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#4B5563', textAlign: 'center' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category quick-select */}
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Jump into a Category
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATEGORIES.map((cat, i) => {
              const count = cat.value === 'all'
                ? quizQuestions.length
                : quizQuestions.filter((q) => q.category === cat.value).length
              return (
                <motion.div
                  key={cat.value}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    style={{
                      ...card,
                      padding: '0.875rem 1.25rem',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = cat.color + '55')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
                  >
                    <Link to="/quiz" style={{ textDecoration: 'none' }} onClick={() => start(cat.value)}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <span style={{ fontSize: 18, color: cat.color, fontFamily: 'Georgia, serif', width: 24, textAlign: 'center' }}>
                            {cat.icon}
                          </span>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#E2E8F0' }}>{cat.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>{count} questions</span>
                          <span style={{ fontSize: '0.75rem', color: cat.color, fontWeight: 700 }}>Start →</span>
                        </div>
                      </div>
                    </Link>
                    {cat.value !== 'all' && (
                      <MasteryBar category={cat.value as QuizCategory} color={cat.color} />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: 24 }}>
          <p style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
            {user
              ? `Progress saves automatically · Syncing as ${user.email}`
              : 'Progress saves automatically in your browser · Sign in to sync across devices'}
          </p>
        </div>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  )
}
