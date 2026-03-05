import { create } from 'zustand'
import { quizQuestions, type QuizCategory, type Difficulty } from '../data/quizQuestions'
import { useProgressStore } from './progressStore'

export type QuizPhase = 'idle' | 'playing' | 'finished'

type QuizQuestion = typeof quizQuestions[number]

type QuizState = {
  phase: QuizPhase
  category: QuizCategory | 'all'
  deck: QuizQuestion[]
  currentIndex: number
  selectedAnswer: number | null
  score: number
  streak: number
  maxStreak: number
  timeLeft: number
  totalTime: number
  shieldUsed: boolean
  challengeTarget: number | null

  start: (category?: QuizCategory | 'all', questionIds?: string[]) => void
  selectAnswer: (index: number) => void
  nextQuestion: () => void
  tick: () => void
  finish: () => void
  reset: () => void
  setChallengeTarget: (score: number) => void
}

const TIME_PER_QUESTION = 30
const SPEED_BONUS_THRESHOLD = 10
const QUIZ_LENGTH = 10

const BASE_SCORE: Record<Difficulty, number> = { 1: 100, 2: 150, 3: 200 }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(category: QuizCategory | 'all'): QuizQuestion[] {
  const pool = category === 'all'
    ? quizQuestions
    : quizQuestions.filter((q) => q.category === category)

  const easy   = shuffle(pool.filter((q) => q.difficulty === 1))
  const medium = shuffle(pool.filter((q) => q.difficulty === 2))
  const hard   = shuffle(pool.filter((q) => q.difficulty === 3))

  // Ramp difficulty: 3 easy → 4 medium → 3 hard (= 10 total)
  return [...easy.slice(0, 3), ...medium.slice(0, 4), ...hard.slice(0, 3)]
}

export const useQuizStore = create<QuizState>((set, get) => ({
  phase: 'idle',
  category: 'all',
  deck: [],
  currentIndex: 0,
  selectedAnswer: null,
  score: 0,
  streak: 0,
  maxStreak: 0,
  timeLeft: TIME_PER_QUESTION,
  totalTime: 0,
  shieldUsed: false,
  challengeTarget: null,

  start: (category = 'all', questionIds?: string[]) => {
    let deck: QuizQuestion[]
    if (questionIds && questionIds.length > 0) {
      // Challenge mode — play the exact questions in exact order
      deck = questionIds
        .map((id) => quizQuestions.find((q) => q.id === id))
        .filter((q): q is QuizQuestion => q !== undefined)
    } else {
      deck = buildDeck(category)
    }
    set({
      phase: 'playing',
      category,
      deck,
      currentIndex: 0,
      selectedAnswer: null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      timeLeft: TIME_PER_QUESTION,
      totalTime: 0,
      shieldUsed: false,
      challengeTarget: null,
    })
  },

  setChallengeTarget: (score: number) => set({ challengeTarget: score }),

  selectAnswer: (index) => {
    const { selectedAnswer, deck, currentIndex, score, streak, maxStreak, timeLeft } = get()
    if (selectedAnswer !== null) return

    const question = deck[currentIndex]
    const isCorrect = index === question.correctIndex

    let newScore = score
    let newStreak = streak
    let newMaxStreak = maxStreak

    if (isCorrect) {
      const base = BASE_SCORE[question.difficulty]
      const speedBonus = timeLeft >= TIME_PER_QUESTION - SPEED_BONUS_THRESHOLD ? 50 : 0
      const streakMultiplier = 1 + Math.min(newStreak, 4) * 0.25
      newScore = Math.round(score + (base + speedBonus) * streakMultiplier)
      newStreak = streak + 1
      newMaxStreak = Math.max(maxStreak, newStreak)
      set({ selectedAnswer: index, score: newScore, streak: newStreak, maxStreak: newMaxStreak, shieldUsed: false })
    } else {
      // Wrong — check for shield
      const { streakShields } = useProgressStore.getState()
      if (streak > 0 && streakShields > 0) {
        useProgressStore.getState().consumeShield()
        set({ selectedAnswer: index, shieldUsed: true })
        // streak preserved — do not reset
      } else {
        set({ selectedAnswer: index, score: newScore, streak: 0, maxStreak: newMaxStreak, shieldUsed: false })
      }
    }
  },

  nextQuestion: () => {
    const { currentIndex, deck } = get()
    if (currentIndex + 1 >= deck.length) {
      get().finish()
    } else {
      set({
        currentIndex: currentIndex + 1,
        selectedAnswer: null,
        timeLeft: TIME_PER_QUESTION,
        shieldUsed: false,
      })
    }
  },

  tick: () => {
    const { timeLeft, selectedAnswer, streak } = get()
    if (selectedAnswer !== null) return
    if (timeLeft <= 0) {
      // Time's up — check shield before resetting streak
      const { streakShields } = useProgressStore.getState()
      if (streak > 0 && streakShields > 0) {
        useProgressStore.getState().consumeShield()
        set({ selectedAnswer: -1, shieldUsed: true })
      } else {
        set({ streak: 0, selectedAnswer: -1, shieldUsed: false })
      }
      return
    }
    set((state) => ({
      timeLeft: state.timeLeft - 1,
      totalTime: state.totalTime + 1,
    }))
  },

  finish: () => set({ phase: 'finished' }),

  reset: () => set({
    phase: 'idle',
    deck: [],
    currentIndex: 0,
    selectedAnswer: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    timeLeft: TIME_PER_QUESTION,
    totalTime: 0,
    shieldUsed: false,
    challengeTarget: null,
  }),
}))
