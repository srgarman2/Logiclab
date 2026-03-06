import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type QuizCategory } from '../data/quizQuestions'
import { useAuthStore } from './authStore'
import { upsertProfile, updateUsername as dbUpdateUsername, type DbProfile } from '../lib/database'

type CategoryMasteryEntry = { correct: number; attempted: number }
type AnswerRecord = { category: QuizCategory; correct: boolean }

// ── XP Level System ─────────────────────────────────────────────────────────────

export type XPLevel = {
  level: number
  title: string
  minXP: number
}

export const XP_LEVELS: XPLevel[] = [
  { level:  1, title: 'Novice',           minXP: 0 },
  { level:  2, title: 'Apprentice',       minXP: 100 },
  { level:  3, title: 'Student',          minXP: 300 },
  { level:  4, title: 'Scholar',          minXP: 600 },
  { level:  5, title: 'Analyst',          minXP: 1000 },
  { level:  6, title: 'Strategist',       minXP: 1600 },
  { level:  7, title: 'Tactician',        minXP: 2500 },
  { level:  8, title: 'Logician',         minXP: 3800 },
  { level:  9, title: 'Philosopher',      minXP: 5500 },
  { level: 10, title: 'Dialectician',     minXP: 7800 },
  { level: 11, title: 'Sage',             minXP: 10800 },
  { level: 12, title: 'Oracle',           minXP: 14500 },
  { level: 13, title: 'Grandmaster',      minXP: 19000 },
  { level: 14, title: 'Luminary',         minXP: 25000 },
  { level: 15, title: 'Master Logician',  minXP: 33000 },
]

export function getLevelForXP(xp: number): XPLevel {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXP) return XP_LEVELS[i]
  }
  return XP_LEVELS[0]
}

export function getLevelProgress(xp: number): { current: XPLevel; next: XPLevel | null; progressPct: number; xpToNext: number } {
  const current = getLevelForXP(xp)
  const nextIdx = XP_LEVELS.findIndex((l) => l.level === current.level) + 1
  const next = nextIdx < XP_LEVELS.length ? XP_LEVELS[nextIdx] : null

  if (!next) return { current, next: null, progressPct: 100, xpToNext: 0 }

  const xpInLevel = xp - current.minXP
  const xpForLevel = next.minXP - current.minXP
  const progressPct = Math.min((xpInLevel / xpForLevel) * 100, 100)
  const xpToNext = next.minXP - xp

  return { current, next, progressPct, xpToNext }
}

// ── Login Streak ────────────────────────────────────────────────────────────────

const LOGIN_STREAK_BONUSES: Record<number, number> = {
  3: 25, 7: 50, 14: 100, 30: 200, 60: 400, 100: 800,
}

function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ── State type ──────────────────────────────────────────────────────────────────

type ProgressState = {
  // Quiz
  quizHighScore: number
  quizLongestStreak: number
  quizTotalPlayed: number
  updateQuizScore: (score: number, streak: number) => void

  // Overall XP
  totalXP: number
  addXP: (amount: number) => number  // returns previous XP (for toast)

  // Streak Shields
  streakShields: number
  addShield: () => void
  consumeShield: () => void

  // Login Streak
  loginStreak: number
  lastLoginDate: string | null
  checkLoginStreak: () => { bonusXP: number; newStreak: number } | null

  // Username (optional, shown on leaderboards instead of full name)
  username: string | null
  setUsername: (username: string) => Promise<{ success: boolean; error?: string }>

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
      addXP: (amount) => {
        const prev = get().totalXP
        set({ totalXP: prev + amount })
        return prev
      },

      streakShields: 0,
      addShield: () => set((state) => ({ streakShields: state.streakShields + 1 })),
      consumeShield: () => set((state) => ({ streakShields: Math.max(0, state.streakShields - 1) })),

      // Login Streak
      loginStreak: 0,
      lastLoginDate: null,
      checkLoginStreak: () => {
        const today = getTodayDateStr()
        const { lastLoginDate, loginStreak } = get()

        // Already checked today
        if (lastLoginDate === today) return null

        let newStreak: number
        if (!lastLoginDate) {
          // First ever login
          newStreak = 1
        } else {
          const last = new Date(lastLoginDate + 'T12:00:00Z')
          const now = new Date(today + 'T12:00:00Z')
          const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
          newStreak = diffDays === 1 ? loginStreak + 1 : 1
        }

        set({ loginStreak: newStreak, lastLoginDate: today })

        // Check for streak bonus XP
        const bonusXP = LOGIN_STREAK_BONUSES[newStreak] ?? 0
        if (bonusXP > 0) {
          get().addXP(bonusXP)
        }

        return { bonusXP, newStreak }
      },

      // Username
      username: null,
      setUsername: async (username: string) => {
        const { user } = useAuthStore.getState()
        if (!user) return { success: false, error: 'Not signed in' }
        const trimmed = username.trim()
        const result = await dbUpdateUsername(user.id, trimmed)
        if (result.success) {
          set({ username: trimmed || null })
        }
        return result
      },

      categoryMastery: {
        'indicator-words':   { correct: 0, attempted: 0 },
        'formal-logic':      { correct: 0, attempted: 0 },
        'argument-analysis': { correct: 0, attempted: 0 },
        'flaw-detection':    { correct: 0, attempted: 0 },
        'assumption':        { correct: 0, attempted: 0 },
        'strengthen-weaken': { correct: 0, attempted: 0 },
        'inference':         { correct: 0, attempted: 0 },
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
          login_streak: state.loginStreak,
          last_login_date: state.lastLoginDate,
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
          loginStreak: Math.max(local.loginStreak, dbProfile.login_streak ?? 0),
          lastLoginDate: dbProfile.last_login_date ?? local.lastLoginDate,
          // Prefer DB username over local (source of truth)
          username: dbProfile.username ?? local.username,
        })
      },
    }),
    {
      name: 'logiclab-progress',
    }
  )
)
