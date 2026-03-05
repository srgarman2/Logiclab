import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type QuizCategory } from '../data/quizQuestions'
import { useAuthStore } from './authStore'
import { upsertProfile, type DbProfile } from '../lib/database'

type CategoryMasteryEntry = { correct: number; attempted: number }
type AnswerRecord = { category: QuizCategory; correct: boolean }

type ProgressState = {
  // Quiz
  quizHighScore: number
  quizLongestStreak: number
  quizTotalPlayed: number
  updateQuizScore: (score: number, streak: number) => void

  // Overall XP
  totalXP: number
  addXP: (amount: number) => void

  // Streak Shields
  streakShields: number
  addShield: () => void
  consumeShield: () => void

  // Category Mastery
  categoryMastery: Record<QuizCategory, CategoryMasteryEntry>
  recordAnswers: (answers: AnswerRecord[]) => void

  // Supabase sync
  syncToSupabase: () => Promise<void>
  hydrateFromSupabase: (dbProfile: DbProfile) => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      quizHighScore: 0,
      quizLongestStreak: 0,
      quizTotalPlayed: 0,
      updateQuizScore: (score, streak) => {
        const { quizHighScore, quizLongestStreak, quizTotalPlayed, addXP, addShield } = get()
        const newTotal = quizTotalPlayed + 1
        set({
          quizHighScore: Math.max(quizHighScore, score),
          quizLongestStreak: Math.max(quizLongestStreak, streak),
          quizTotalPlayed: newTotal,
        })
        addXP(Math.floor(score / 10))
        if (newTotal % 5 === 0) addShield()
      },

      totalXP: 0,
      addXP: (amount) => set((state) => ({ totalXP: state.totalXP + amount })),

      streakShields: 0,
      addShield: () => set((state) => ({ streakShields: state.streakShields + 1 })),
      consumeShield: () => set((state) => ({ streakShields: Math.max(0, state.streakShields - 1) })),

      categoryMastery: {
        'indicator-words':   { correct: 0, attempted: 0 },
        'formal-logic':      { correct: 0, attempted: 0 },
        'argument-analysis': { correct: 0, attempted: 0 },
        'flaw-detection':    { correct: 0, attempted: 0 },
      },
      recordAnswers: (answers) =>
        set((state) => {
          const updated = { ...state.categoryMastery }
          for (const { category, correct } of answers) {
            const e = updated[category]
            updated[category] = {
              correct: e.correct + (correct ? 1 : 0),
              attempted: e.attempted + 1,
            }
          }
          return { categoryMastery: updated }
        }),

      // ── Supabase sync ──────────────────────────────────────────────────────

      syncToSupabase: async () => {
        const { user } = useAuthStore.getState()
        if (!user) return // guest mode — no-op

        const state = get()
        await upsertProfile(user.id, {
          quiz_high_score: state.quizHighScore,
          quiz_longest_streak: state.quizLongestStreak,
          quiz_total_played: state.quizTotalPlayed,
          total_xp: state.totalXP,
          streak_shields: state.streakShields,
          category_mastery: state.categoryMastery,
        })
      },

      hydrateFromSupabase: (dbProfile: DbProfile) => {
        const local = get()

        // Merge mastery: take max per category to avoid double-counting
        const mergedMastery = { ...local.categoryMastery }
        for (const cat of Object.keys(dbProfile.category_mastery) as QuizCategory[]) {
          const db = dbProfile.category_mastery[cat]
          const lc = mergedMastery[cat]
          if (db) {
            mergedMastery[cat] = {
              correct: Math.max(db.correct, lc.correct),
              attempted: Math.max(db.attempted, lc.attempted),
            }
          }
        }

        set({
          quizHighScore: Math.max(local.quizHighScore, dbProfile.quiz_high_score),
          quizLongestStreak: Math.max(local.quizLongestStreak, dbProfile.quiz_longest_streak),
          quizTotalPlayed: Math.max(local.quizTotalPlayed, dbProfile.quiz_total_played),
          totalXP: Math.max(local.totalXP, dbProfile.total_xp),
          streakShields: Math.max(local.streakShields, dbProfile.streak_shields),
          categoryMastery: mergedMastery,
        })
      },
    }),
    {
      name: 'logiclab-progress',
    }
  )
)
