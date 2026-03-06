import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDailyStore, type DailyAnswerResult } from '../store/dailyStore'
import { useAuthStore } from '../store/authStore'
import { useProgressStore } from '../store/progressStore'
import { showXPToast } from '../components/XPToast'

// ── Style constants ────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '0.875rem',
  padding: '1.5rem',
}

const CATEGORY_COLORS: Record<string, string> = {
  'assumption':        '#A855F7',
  'strengthen-weaken': '#22C55E',
  'inference':         '#3B82F6',
  'flaw-detection':    '#F97316',
  'formal-logic':      '#EC4899',
  'argument-analysis': '#EAB308',
  'indicator-words':   '#6366F1',
  'all':               '#6366F1',
}

const CATEGORY_LABELS: Record<string, string> = {
  'assumption':        'Assumption',
  'strengthen-weaken': 'Strengthen & Weaken',
  'inference':         'Inference',
  'flaw-detection':    'Flaw Detection',
  'formal-logic':      'Formal Logic',
  'argument-analysis': 'Argument Analysis',
  'indicator-words':   'Indicator Words',
  'all':               'All Topics',
}

const DIFF_CONFIG = {
  1: { label: 'Easy',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  2: { label: 'Medium', color: '#FCD34D', bg: 'rgba(252,211,77,0.1)'  },
  3: { label: 'Hard',   color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
} as const

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

function formatSolveTime(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(0)
  return `${mins}:${secs.padStart(2, '0')}`
}

// ── Share grid ─────────────────────────────────────────────────────────────────

function buildShareText(
  challengeNumber: number | null,
  category: string | null,
  score: number | null,
  maxStreak: number | null,
  answers: DailyAnswerResult[],
): string {
  const grid = answers.map((a) => {
    if (a.timedOut) return '⚫'
    return a.correct ? '🟢' : '🔴'
  }).join('')

  const catLabel = CATEGORY_LABELS[category ?? ''] ?? category ?? ''
  const num = challengeNumber ? `#${challengeNumber}` : ''

  const result = answers[0]?.correct ? '✅ Correct' : '❌ Incorrect'
  return `LogicLab Daily ${num} 📅\n${catLabel} · Hard\n${result} · ${(score ?? 0).toLocaleString()} pts\nhttps://logiclabs-pi.vercel.app/daily`
}

// ── Countdown to midnight UTC ──────────────────────────────────────────────────

function useCountdown() {
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeStr(`${h}h ${m}m`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  return timeStr
}

// ── Completed view ─────────────────────────────────────────────────────────────

function CompletedView() {
  const {
    challengeNumber, todayCategory, completionScore,
    completionMaxStreak, completionAnswers, completionSolveTimeMs,
  } = useDailyStore()
  const [copied, setCopied] = useState(false)
  const countdown = useCountdown()

  // Fetch leaderboard stats for the "vs average" comparison
  const [avgTimeMs, setAvgTimeMs] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState<number | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/daily-leaderboard')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.stats) return
        setAvgTimeMs(data.stats.avgSolveTimeMs)
        setCorrectCount(data.stats.correctCount)
        setTotalCount(data.stats.totalCompletions)
      })
      .catch(() => { /* non-critical */ })
  }, [])

  const catColor = CATEGORY_COLORS[todayCategory ?? ''] ?? '#6366F1'
  const catLabel = CATEGORY_LABELS[todayCategory ?? ''] ?? todayCategory

  const correct = completionAnswers.filter((a) => a.correct).length

  // Compute vs-average label (only for correct solvers with a recorded time)
  const vsAvgLabel = (() => {
    if (!correct || completionSolveTimeMs == null || avgTimeMs == null) return null
    const diff = completionSolveTimeMs - avgTimeMs
    if (diff < 0) return { text: `${formatSolveTime(-diff)} faster than avg`, color: '#34D399' }
    if (diff > 0) return { text: `${formatSolveTime(diff)} slower than avg`, color: '#F87171' }
    return { text: 'exactly avg time', color: '#FCD34D' }
  })()

  const handleShare = () => {
    const text = buildShareText(
      challengeNumber, todayCategory,
      completionScore, completionMaxStreak, completionAnswers,
    )
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ ...panel, maxWidth: 480, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ fontSize: 48 }}>
        {correct === 1 ? '🏆' : '💪'}
      </div>

      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {correct === 1 ? '✅ Correct!' : '❌ Not quite'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
          {correct === 1 ? 'You got today\'s hard question right.' : 'Better luck tomorrow!'}
        </p>
      </div>

      {/* Stats: Score | Solve Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818CF8' }}>
            {(completionScore ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 4 }}>Score</div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FCD34D' }}>
            {formatSolveTime(completionSolveTimeMs)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 4 }}>Your Time</div>
        </div>
      </div>

      {/* Vs-average comparison — appears once stats load */}
      {(vsAvgLabel || avgTimeMs != null) && (
        <div style={{
          backgroundColor: '#0f172a', border: '1px solid #1e293b',
          borderRadius: '0.75rem', padding: '0.875rem 1rem',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            vs. Today's Players
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#94A3B8' }}>
                {formatSolveTime(avgTimeMs)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#374151', marginTop: 2 }}>Avg correct time</div>
            </div>
            {vsAvgLabel && (
              <div style={{
                fontSize: '0.75rem', fontWeight: 700, color: vsAvgLabel.color,
                backgroundColor: vsAvgLabel.color + '15',
                border: `1px solid ${vsAvgLabel.color}30`,
                borderRadius: '0.375rem', padding: '0.25rem 0.625rem',
              }}>
                {vsAvgLabel.text}
              </div>
            )}
            {totalCount != null && correctCount != null && (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#94A3B8' }}>
                  {correctCount}/{totalCount}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#374151', marginTop: 2 }}>got it right</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emoji grid */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem' }}>
        <p style={{ fontSize: '0.7rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          Your Results
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {completionAnswers.map((a, i) => (
            <span key={i} style={{ fontSize: 20 }}>
              {a.timedOut ? '⚫' : a.correct ? '🟢' : '🔴'}
            </span>
          ))}
        </div>
      </div>

      {/* Category badge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, color: catColor,
          backgroundColor: catColor + '18', border: `1px solid ${catColor}35`,
          borderRadius: '0.375rem', padding: '0.25rem 0.75rem',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {catLabel}
        </span>
      </div>

      {/* Share + Leaderboard buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleShare}
          style={{
            padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.875rem',
            fontWeight: 700, cursor: 'pointer', width: '100%',
            backgroundColor: copied ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
            border: copied ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(99,102,241,0.35)',
            color: copied ? '#34D399' : '#818CF8', transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ Copied to clipboard!' : '📋 Share Results'}
        </button>

        <Link to="/daily/leaderboard" style={{ textDecoration: 'none', width: '100%' }}>
          <button
            style={{
              padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.875rem',
              fontWeight: 700, cursor: 'pointer', width: '100%',
              backgroundColor: 'rgba(252,211,77,0.08)',
              border: '1px solid rgba(252,211,77,0.25)',
              color: '#FCD34D', transition: 'all 0.15s',
            }}
          >
            ⚡ View Speed Rankings
          </button>
        </Link>
      </div>

      {/* Countdown */}
      <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0 }}>
        Next challenge in <strong style={{ color: '#4B5563' }}>{countdown}</strong>
      </p>
    </motion.div>
  )
}

// ── Quiz playing view ──────────────────────────────────────────────────────────

// Format elapsed seconds as M:SS or just Ss
function fmtElapsed(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function PlayingView() {
  const {
    questions, currentIndex, score, streak,
    timeElapsed, selectedAnswer, phase,
    selectAnswer, nextQuestion, tick,
  } = useDailyStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const question = questions[currentIndex]
  const isAnswered = selectedAnswer !== null
  const isCorrect = isAnswered && selectedAnswer === question?.correctIndex

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || isAnswered) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => tick(), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, isAnswered, currentIndex, tick])

  if (!question) return null

  const optionStyle = (i: number): React.CSSProperties => {
    if (!isAnswered) return { backgroundColor: 'transparent', borderColor: '#1e293b', color: '#CBD5E1' }
    if (i === question.correctIndex) return { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.5)', color: '#6EE7B7' }
    if (i === selectedAnswer) return { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#FCA5A5' }
    return { backgroundColor: 'transparent', borderColor: '#111827', color: '#374151' }
  }

  const diff = question.difficulty as 1 | 2 | 3
  const diffCfg = DIFF_CONFIG[diff]

  return (
    <div style={{ maxWidth: 640, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* HUD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818CF8' }}>{score.toLocaleString()}</div>
            <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: streak > 0 ? '#FCD34D' : '#1f2937' }}>
              {streak > 0 ? `🔥 ×${streak}` : '—'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</div>
          </div>
        </div>

        {/* Stopwatch — counts up, no time limit */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: isAnswered ? '#374151' : '#4B5563',
            fontFamily: 'system-ui, monospace',
            minWidth: 56,
          }}>
            {fmtElapsed(timeElapsed)}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
            elapsed
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: '#4B5563', fontWeight: 600 }}>{currentIndex + 1} / {questions.length}</div>
          <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions</div>
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* Category + Difficulty */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {CATEGORY_LABELS[question.category] ?? question.category}
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, color: diffCfg.color,
              backgroundColor: diffCfg.bg, border: `1px solid ${diffCfg.color}40`,
              borderRadius: '0.375rem', padding: '0.125rem 0.5rem',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {diffCfg.label}
            </span>
          </div>

          {/* Question text */}
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.65, color: '#E2E8F0', margin: 0, fontWeight: 500 }}>
            {question.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => !isAnswered && selectAnswer(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '0.75rem 1rem', borderRadius: '0.625rem',
                  border: '1px solid', cursor: isAnswered ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  ...optionStyle(i),
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, flexShrink: 0, paddingTop: 2 }}>
                  {OPTION_LETTERS[i]}
                </span>
                <span style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{opt}</span>
              </button>
            ))}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderTop: '1px solid #1e293b', paddingTop: 16,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCorrect ? '#34D399' : '#F87171' }}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>
                {question.explanation}
              </p>

              <button
                onClick={nextQuestion}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: '#4F46E5', color: '#fff',
                  border: '1px solid #4338CA',
                }}
              >
                {currentIndex + 1 < questions.length ? 'Next Question →' : 'See Results →'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {questions.map((_, i) => {
          const isDone = i < currentIndex || (i === currentIndex && isAnswered)
          const isCurrent = i === currentIndex
          return (
            <div key={i} style={{
              width: isCurrent ? 20 : 8, height: 8, borderRadius: 4,
              backgroundColor: isDone
                ? (i < currentIndex
                  ? (useDailyStore.getState().answers[i]?.correct ? '#34D399' : '#F87171')
                  : (isCorrect ? '#34D399' : '#F87171'))
                : isCurrent ? '#818CF8' : '#1e293b',
              transition: 'all 0.3s',
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function Daily() {
  const {
    loading, error, phase, questions, alreadyCompleted,
    todayDate, challengeNumber, todayCategory,
    fetchToday, startQuiz, submitCompletion,
  } = useDailyStore()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  // ── Submit when quiz finishes ─────────────────────────────────────────────
  // Must live here (not in PlayingView) because PlayingView unmounts the
  // moment phase becomes 'finished', so its effects never fire.
  useEffect(() => {
    if (phase === 'finished') {
      // Award XP for daily challenge completion
      const { score } = useDailyStore.getState()
      const xpGain = Math.floor(score / 10)
      if (xpGain > 0) {
        const prevXP = useProgressStore.getState().totalXP
        useProgressStore.getState().addXP(xpGain)
        showXPToast(xpGain, prevXP)
        // Sync XP to Supabase
        useProgressStore.getState().syncToSupabase()
      }
      submitCompletion()
    }
  }, [phase, submitCompletion])

  const catColor = CATEGORY_COLORS[todayCategory ?? ''] ?? '#6366F1'
  const catLabel = CATEGORY_LABELS[todayCategory ?? ''] ?? todayCategory

  const dateDisplay = todayDate
    ? new Date(todayDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div style={{ minHeight: '100vh', padding: '96px 20px 64px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
            📅 Daily Challenge
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0 0 12px' }}>
            {dateDisplay}{challengeNumber ? ` · #${challengeNumber}` : ''}
          </p>
          {todayCategory && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, color: catColor,
              backgroundColor: catColor + '18', border: `1px solid ${catColor}35`,
              borderRadius: '0.375rem', padding: '0.25rem 0.875rem',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {catLabel}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#4B5563' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading today's challenge…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            ...panel, textAlign: 'center', maxWidth: 440, width: '100%',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#F87171', fontSize: '0.875rem', margin: '0 0 16px' }}>{error}</p>
            <button
              onClick={fetchToday}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', backgroundColor: '#4F46E5', color: '#fff', border: '1px solid #4338CA' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Idle — ready to play */}
        {!loading && !error && phase === 'idle' && !alreadyCompleted && questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ ...panel, maxWidth: 440, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div style={{ fontSize: 40 }}>🧠</div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>
                1 Hard Question · No Time Limit
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                One graduate-level LSAT question — same for everyone today. Take your time reading. Complete once — results are final.
                {!user && ' Sign in to save your score to the leaderboard.'}
              </p>
            </div>

            <button
              onClick={startQuiz}
              style={{
                padding: '0.875rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
                fontWeight: 700, cursor: 'pointer', backgroundColor: '#4F46E5',
                color: '#fff', border: '1px solid #4338CA',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#6366F1' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#4F46E5' }}
            >
              Start Today's Challenge →
            </button>
          </motion.div>
        )}

        {/* Playing */}
        {!loading && !error && phase === 'playing' && <PlayingView />}

        {/* Finished (before submitCompletion resolves) or already completed */}
        {!loading && !error && (phase === 'finished' || alreadyCompleted) && <CompletedView />}

      </div>
    </div>
  )
}
