import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore'
import { useProgressStore, getLevelProgress } from '../store/progressStore'
import { useAuthStore } from '../store/authStore'
import { QuizTimer } from '../components/quiz/QuizTimer'
import { ChallengeModal } from '../components/quiz/ChallengeModal'
import { showXPToast } from '../components/XPToast'
import { insertQuizResult } from '../lib/database'
import { quizQuestions, type QuizCategory, type Difficulty } from '../data/quizQuestions'

const CATEGORY_OPTIONS: { value: QuizCategory | 'all'; label: string; color: string }[] = [
  { value: 'all',               label: 'All Topics',         color: '#6366F1' },
  { value: 'indicator-words',   label: 'Indicator Words',    color: '#3B82F6' },
  { value: 'formal-logic',      label: 'Formal Logic',       color: '#A855F7' },
  { value: 'argument-analysis', label: 'Argument Analysis',  color: '#EC4899' },
  { value: 'flaw-detection',    label: 'Flaw Detection',     color: '#F97316' },
  { value: 'assumption',        label: 'Assumption',         color: '#A855F7' },
  { value: 'strengthen-weaken', label: 'Strengthen/Weaken',  color: '#22C55E' },
  { value: 'inference',         label: 'Inference',          color: '#3B82F6' },
]

const DIFFICULTY_OPTIONS: { value: Difficulty | 'mixed'; label: string; color: string; xpLabel: string }[] = [
  { value: 'mixed', label: 'Mixed',  color: '#6366F1', xpLabel: 'Balanced XP' },
  { value: 1,       label: 'Easy',   color: '#34D399', xpLabel: '1x XP' },
  { value: 2,       label: 'Medium', color: '#FCD34D', xpLabel: '1.5x XP' },
  { value: 3,       label: 'Hard',   color: '#F97316', xpLabel: '2x XP' },
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const panel: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '0.875rem',
  padding: '1.5rem',
}

const DIFF_CONFIG = {
  1: { label: 'Easy',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  2: { label: 'Medium', color: '#FCD34D', bg: 'rgba(252,211,77,0.1)'  },
  3: { label: 'Hard',   color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
} as const

function DifficultyBadge({ d }: { d: 1 | 2 | 3 }) {
  const c = DIFF_CONFIG[d]
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, color: c.color,
      backgroundColor: c.bg, border: `1px solid ${c.color}40`,
      borderRadius: '0.375rem', padding: '0.125rem 0.5rem',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {c.label}
    </span>
  )
}

export function Quiz() {
  const {
    phase, deck, currentIndex, selectedAnswer, score, streak, maxStreak,
    timeLeft, shieldUsed, challengeTarget,
    start, selectAnswer, nextQuestion, tick, reset, setChallengeTarget, markXPAwarded,
  } = useQuizStore()

  const { updateQuizScore, streakShields, recordAnswers } = useProgressStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const question = deck[currentIndex]

  const [searchParams] = useSearchParams()
  const [answersLog, setAnswersLog] = useState<Array<{ category: QuizCategory; correct: boolean }>>([])
  const [shieldEarned, setShieldEarned] = useState(false)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [activeChallenge, setActiveChallenge] = useState<{
    challengerName: string
    challengerScore: number
    challengerStreak: number
    category: QuizCategory | 'all'
    questionIds: string[]
  } | null>(null)

  // Parse challenge URL param on mount
  useEffect(() => {
    const param = searchParams.get('challenge')
    if (!param) return
    try {
      const challenge = JSON.parse(atob(param))
      setActiveChallenge(challenge)
      start(challenge.category, challenge.questionIds)
      setChallengeTarget(challenge.challengerScore)
    } catch {
      // malformed param — ignore
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer interval
  useEffect(() => {
    if (phase !== 'playing') { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => tick(), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, tick])

  // Reset log and flags when new quiz starts
  useEffect(() => {
    if (phase === 'playing') {
      setAnswersLog([])
      setShieldEarned(false)
      setShowChallengeModal(false)
    }
  }, [phase])

  // Record each answered question
  useEffect(() => {
    if (selectedAnswer === null || !question) return
    const isCorrect = selectedAnswer !== -1 && selectedAnswer === question.correctIndex
    setAnswersLog((prev) => [...prev, { category: question.category, correct: isCorrect }])
  }, [selectedAnswer]) // eslint-disable-line react-hooks/exhaustive-deps

  // On finish — save score, record mastery, detect shield earned, show XP toast, sync to Supabase
  // xpAwarded guard prevents double-award when the component re-mounts while phase is still 'finished'
  useEffect(() => {
    if (phase !== 'finished') return
    if (useQuizStore.getState().xpAwarded) return
    markXPAwarded()

    const newTotal = useProgressStore.getState().quizTotalPlayed + 1
    const xpGain = Math.floor(score / 10)
    const prevXP = useProgressStore.getState().totalXP
    updateQuizScore(score, maxStreak)
    if (newTotal % 5 === 0) setShieldEarned(true)
    recordAnswers(answersLog)

    // Show XP toast
    if (xpGain > 0) {
      showXPToast(xpGain, prevXP)
    }

    // Sync to Supabase (fire-and-forget — never blocks UI)
    const user = useAuthStore.getState().user
    if (user) {
      useProgressStore.getState().syncToSupabase()
      insertQuizResult({
        userId: user.id,
        score,
        maxStreak,
        category: useQuizStore.getState().category,
        questionIds: deck.map((q) => q.id),
        answers: answersLog,
      })
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Selected difficulty for the idle screen
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'mixed'>('mixed')

  // Level info for display
  const { totalXP } = useProgressStore()
  const levelInfo = getLevelProgress(totalXP)

  /* ── IDLE ── */
  if (phase === 'idle') {
    return (
      <div style={{ minHeight: '100vh', paddingTop: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 48px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏱</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.03em', margin: '0 0 8px' }}>Timed Quiz</h1>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', margin: 0 }}>30 seconds per question. Build streaks. Beat your score.</p>
          </div>

          {/* Difficulty selector */}
          <div style={{ ...panel, marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Difficulty</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {DIFFICULTY_OPTIONS.map((d) => {
                const isActive = selectedDifficulty === d.value
                return (
                  <button
                    key={String(d.value)}
                    onClick={() => setSelectedDifficulty(d.value)}
                    style={{
                      flex: 1, padding: '0.5rem 0.25rem', borderRadius: '0.5rem',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      backgroundColor: isActive ? d.color + '22' : 'transparent',
                      border: `1.5px solid ${isActive ? d.color : '#1e293b'}`,
                      color: isActive ? d.color : '#4B5563',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span>{d.label}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.7 }}>{d.xpLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Choose a category</p>
            {CATEGORY_OPTIONS.map((opt) => {
              let count: number
              if (opt.value === 'all') {
                count = selectedDifficulty === 'mixed' ? quizQuestions.length : quizQuestions.filter((q) => q.difficulty === selectedDifficulty).length
              } else {
                count = quizQuestions.filter((q) => q.category === opt.value && (selectedDifficulty === 'mixed' || q.difficulty === selectedDifficulty)).length
              }
              return (
                <button
                  key={opt.value}
                  onClick={() => start(opt.value, undefined, selectedDifficulty)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '0.625rem', cursor: 'pointer',
                    backgroundColor: opt.color + '14', border: `1px solid ${opt.color}30`,
                    transition: 'all 0.15s', width: '100%',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = opt.color + '22' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = opt.color + '14' }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E2E8F0' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.75rem', color: opt.color, fontWeight: 500 }}>{count} questions</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ── FINISHED ── */
  if (phase === 'finished') {
    const { quizHighScore } = useProgressStore.getState()
    const isHighScore = score >= quizHighScore
    const beatChallenge = activeChallenge && score > activeChallenge.challengerScore

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 48px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          style={{ ...panel, maxWidth: 400, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ fontSize: 48 }}>{score > 800 ? '🏆' : score > 400 ? '🎯' : '📚'}</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F1F5F9', margin: 0, letterSpacing: '-0.02em' }}>Quiz Complete!</h2>

          {/* Challenge result banner */}
          {activeChallenge && (
            <div style={{
              backgroundColor: beatChallenge ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)',
              border: `1px solid ${beatChallenge ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
              borderRadius: '0.625rem', padding: '0.75rem',
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9rem', color: beatChallenge ? '#34D399' : '#F97316' }}>
                {beatChallenge ? `🏆 You beat ${activeChallenge.challengerName}!` : `So close! Keep practicing!`}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>
                {activeChallenge.challengerName}: {activeChallenge.challengerScore.toLocaleString()} pts · You: {score.toLocaleString()} pts
              </p>
            </div>
          )}

          {/* Score grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Final Score', value: score.toLocaleString(), color: '#818CF8', sub: isHighScore ? '★ New best!' : undefined },
              { label: 'Best Streak', value: String(maxStreak), color: '#34D399' },
              { label: 'XP Earned', value: `+${Math.floor(score / 10)}`, color: '#10B981' },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 4 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: '0.7rem', color: '#FCD34D', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Shield earned */}
          {shieldEarned && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.625rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#818CF8' }}>
              🛡️ Shield earned! {useProgressStore.getState().streakShields} shield{useProgressStore.getState().streakShields !== 1 ? 's' : ''} total.
            </motion.div>
          )}

          {/* Actions */}
          <button onClick={reset} style={{ padding: '0.75rem', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#4F46E5', color: '#fff', border: '1px solid #4338CA', cursor: 'pointer', width: '100%' }}>
            Play Again
          </button>
          <button
            onClick={() => setShowChallengeModal(true)}
            style={{ padding: '0.625rem', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', width: '100%', backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: '#F97316' }}
          >
            ⚡ Challenge a Friend
          </button>
        </motion.div>

        {showChallengeModal && (
          <ChallengeModal
            deck={deck}
            score={score}
            maxStreak={maxStreak}
            category={useQuizStore.getState().category}
            onClose={() => setShowChallengeModal(false)}
          />
        )}
      </div>
    )
  }

  if (!question) return null
  const isAnswered = selectedAnswer !== null
  const isTimeout = selectedAnswer === -1
  const isCorrect = !isTimeout && selectedAnswer === question.correctIndex

  const optionStyle = (i: number): React.CSSProperties => {
    if (!isAnswered) return { backgroundColor: 'transparent', borderColor: '#1e293b', color: '#CBD5E1' }
    if (i === question.correctIndex) return { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.5)', color: '#6EE7B7' }
    if (i === selectedAnswer) return { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#FCA5A5' }
    return { backgroundColor: 'transparent', borderColor: '#111827', color: '#374151' }
  }

  /* ── PLAYING ── */
  return (
    <div style={{ minHeight: '100vh', padding: '96px 20px 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Challenge banner */}
        {activeChallenge && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '0.625rem', padding: '0.625rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: '#9CA3AF' }}>⚡ Challenge from <strong style={{ color: '#F9FAFB' }}>{activeChallenge.challengerName}</strong></span>
            <span style={{ color: '#F97316', fontWeight: 700 }}>Beat {activeChallenge.challengerScore.toLocaleString()} pts</span>
          </motion.div>
        )}

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
            {streakShields > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818CF8' }}>🛡️×{streakShields}</div>
                <div style={{ fontSize: '0.6rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Shields</div>
              </div>
            )}
          </div>

          <QuizTimer timeLeft={timeLeft} totalTime={30} />

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: '#4B5563', fontWeight: 600 }}>{currentIndex + 1} / {deck.length}</div>
            <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions</div>
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Category + Difficulty row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {question.category.replace(/-/g, ' ')}
              </div>
              <DifficultyBadge d={question.difficulty} />
            </div>

            {/* Question */}
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#E2E8F0', lineHeight: 1.65, margin: 0 }}>{question.question}</p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !isAnswered && selectAnswer(i)}
                  disabled={isAnswered}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '0.75rem 1rem', borderRadius: '0.625rem',
                    border: '1px solid', textAlign: 'left', cursor: isAnswered ? 'default' : 'pointer',
                    transition: 'all 0.15s', width: '100%',
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

            {/* Feedback */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Shield flash */}
                  {shieldUsed && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, color: '#818CF8', textAlign: 'center' }}
                    >
                      🛡️ Shield activated — streak protected!
                    </motion.div>
                  )}

                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isTimeout ? '#F87171' : isCorrect ? '#34D399' : '#F87171' }}>
                    {isTimeout
                      ? "⏱ Time's up!"
                      : isCorrect
                        ? `✓ Correct!${streak > 1 ? ` 🔥 ${streak} streak!` : ''}`
                        : shieldUsed
                          ? '✗ Incorrect — but shield saved your streak!'
                          : '✗ Incorrect — streak reset'}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#4B5563', lineHeight: 1.65, margin: 0, borderLeft: '2px solid #1e293b', paddingLeft: 12 }}>
                    {question.explanation}
                  </p>
                  <button onClick={nextQuestion} style={{ padding: '0.625rem', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#4F46E5', color: '#fff', border: '1px solid #4338CA', cursor: 'pointer', width: '100%' }}>
                    {currentIndex + 1 >= deck.length ? 'See Results' : 'Next Question →'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
