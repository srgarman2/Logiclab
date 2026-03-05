import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { type QuizQuestion, type QuizCategory } from '../data/quizQuestions'
import { useAuthStore } from './authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DailyAnswerResult = {
  correct: boolean
  timedOut: boolean
}

type DailyState = {
  // Today's challenge metadata
  todayDate: string | null          // YYYY-MM-DD
  challengeNumber: number | null    // Day count since launch (#1, #2, ...)
  todayCategory: QuizCategory | 'all' | null

  // Questions (loaded from API)
  questions: QuizQuestion[]
  loading: boolean
  error: string | null

  // Quiz in-progress state
  phase: 'idle' | 'playing' | 'finished'
  currentIndex: number
  score: number
  streak: number
  maxStreak: number
  timeLeft: number
  selectedAnswer: number | null
  answers: DailyAnswerResult[]

  // Completion state
  alreadyCompleted: boolean
  completionScore: number | null
  completionMaxStreak: number | null
  completionAnswers: DailyAnswerResult[]

  // Actions
  fetchToday: () => Promise<void>
  startQuiz: () => void
  selectAnswer: (index: number) => void
  nextQuestion: () => void
  tick: () => void
  submitCompletion: () => Promise<void>
  reset: () => void
}

// ── Scoring constants (same as quizStore) ─────────────────────────────────────

const BASE_SCORE: Record<1 | 2 | 3, number> = { 1: 100, 2: 150, 3: 200 }
const SPEED_BONUS = 50
const SPEED_THRESHOLD = 10

// ── Store ──────────────────────────────────────────────────────────────────────

export const useDailyStore = create<DailyState>()((set, get) => ({
  todayDate: null,
  challengeNumber: null,
  todayCategory: null,
  questions: [],
  loading: false,
  error: null,

  phase: 'idle',
  currentIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  timeLeft: 30,
  selectedAnswer: null,
  answers: [],

  alreadyCompleted: false,
  completionScore: null,
  completionMaxStreak: null,
  completionAnswers: [],

  // ── fetchToday ──────────────────────────────────────────────────────────────

  fetchToday: async () => {
    set({ loading: true, error: null })

    const { session } = useAuthStore.getState()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    try {
      const res = await fetch('/api/daily-status', { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      set({
        todayDate: data.date,
        challengeNumber: data.challengeNumber,
        todayCategory: data.category as QuizCategory | 'all',
        questions: data.questions ?? [],
        loading: false,
        alreadyCompleted: data.completed ?? false,
        completionScore: data.completion?.score ?? null,
        completionMaxStreak: data.completion?.max_streak ?? null,
        completionAnswers: data.completion?.answers ?? [],
      })
    } catch (err) {
      console.error('Failed to fetch daily challenge:', err)
      set({ loading: false, error: 'Could not load today\'s challenge. Try again later.' })
    }
  },

  // ── startQuiz ───────────────────────────────────────────────────────────────

  startQuiz: () => {
    set({
      phase: 'playing',
      currentIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      timeLeft: 30,
      selectedAnswer: null,
      answers: [],
    })
  },

  // ── selectAnswer ─────────────────────────────────────────────────────────────

  selectAnswer: (index: number) => {
    const { currentIndex, questions, score, streak, maxStreak, timeLeft, answers } = get()
    const question = questions[currentIndex]
    if (!question || get().selectedAnswer !== null) return

    const isCorrect = index === question.correctIndex
    const speedBonus = timeLeft >= SPEED_THRESHOLD ? SPEED_BONUS : 0
    const newStreak = isCorrect ? streak + 1 : 0
    const streakMult = 1 + Math.min(streak, 4) * 0.25
    const points = isCorrect
      ? Math.round((BASE_SCORE[question.difficulty as 1 | 2 | 3] + speedBonus) * streakMult)
      : 0

    const newAnswers: DailyAnswerResult[] = [...answers, { correct: isCorrect, timedOut: false }]

    set({
      selectedAnswer: index,
      score: score + points,
      streak: newStreak,
      maxStreak: Math.max(maxStreak, newStreak),
      answers: newAnswers,
    })
  },

  // ── nextQuestion ─────────────────────────────────────────────────────────────

  nextQuestion: () => {
    const { currentIndex, questions } = get()
    if (currentIndex + 1 >= questions.length) {
      set({ phase: 'finished', selectedAnswer: null })
    } else {
      set({ currentIndex: currentIndex + 1, selectedAnswer: null, timeLeft: 30 })
    }
  },

  // ── tick ─────────────────────────────────────────────────────────────────────

  tick: () => {
    const { timeLeft, currentIndex, questions, answers } = get()
    if (get().selectedAnswer !== null) return

    if (timeLeft <= 1) {
      // Timeout — mark as timed out, move on
      const question = questions[currentIndex]
      if (!question) return
      const newAnswers: DailyAnswerResult[] = [...answers, { correct: false, timedOut: true }]
      const isLast = currentIndex + 1 >= questions.length
      set({
        selectedAnswer: -1,
        streak: 0,
        answers: newAnswers,
        phase: isLast ? 'finished' : 'playing',
        ...(isLast ? {} : { currentIndex: currentIndex + 1, timeLeft: 30 }),
      })
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  // ── submitCompletion ─────────────────────────────────────────────────────────

  submitCompletion: async () => {
    const { todayDate, score, maxStreak, answers } = get()
    const { user } = useAuthStore.getState()
    if (!user || !todayDate) return

    try {
      await supabase.from('daily_completions').insert({
        user_id: user.id,
        challenge_date: todayDate,
        score,
        max_streak: maxStreak,
        answers,
      })

      set({
        alreadyCompleted: true,
        completionScore: score,
        completionMaxStreak: maxStreak,
        completionAnswers: answers,
      })
    } catch (err) {
      console.error('Failed to save daily completion:', err)
    }
  },

  // ── reset ────────────────────────────────────────────────────────────────────

  reset: () => {
    set({
      phase: 'idle',
      currentIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      timeLeft: 30,
      selectedAnswer: null,
      answers: [],
    })
  },
}))
