import { create } from 'zustand'
import { useProgressStore } from './progressStore'
import { useAuthStore } from './authStore'
import { type QuizCategory } from '../data/quizQuestions'
import {
  fetchWeeklyLeaderboard,
  fetchAllTimeLeaderboard,
  fetchFriendIds as dbFetchFriendIds,
  addFriendByCode,
  resolveDisplayName,
  type WeeklyLeaderboardRow,
  type DbProfile,
} from '../lib/database'

export type LeaderboardEntry = {
  id: string
  name: string
  avatarSeed: string
  weeklyScore: number
  allTimeScore: number
  weeklyStreak: number
  allTimeStreak: number
  topCategory: string
  isFriend: boolean
  isYou?: boolean
}

type LeaderboardState = {
  weeklyEntries: LeaderboardEntry[]
  allTimeEntries: LeaderboardEntry[]
  friendEntries: LeaderboardEntry[]
  loading: boolean
  friendIds: string[]
  myFriendCode: string | null

  fetchWeekly: () => Promise<void>
  fetchAllTime: () => Promise<void>
  fetchFriends: () => Promise<void>
  fetchFriendIdsList: () => Promise<void>
  addFriend: (code: string) => Promise<{ success: boolean; error?: string }>
  setMyFriendCode: (code: string) => void
  setFriendIds: (ids: string[]) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<QuizCategory, string> = {
  'indicator-words':   'Indicator Words',
  'formal-logic':      'Formal Logic',
  'argument-analysis': 'Argument Analysis',
  'flaw-detection':    'Flaw Detection',
  'assumption':        'Assumption',
  'strengthen-weaken': 'Strengthen/Weaken',
  'inference':         'Inference',
}

function topCategoryFromMastery(
  mastery: Record<QuizCategory, { correct: number; attempted: number }> | null,
): string {
  if (!mastery) return 'All Topics'
  let best: QuizCategory | null = null
  let bestPct = -1
  for (const [cat, entry] of Object.entries(mastery) as [QuizCategory, { correct: number; attempted: number }][]) {
    if (!entry || entry.attempted === 0) continue
    const pct = entry.correct / entry.attempted
    if (pct > bestPct) {
      bestPct = pct
      best = cat
    }
  }
  return best ? CATEGORY_LABELS[best] : 'All Topics'
}

function buildYouEntry(): LeaderboardEntry {
  const { quizHighScore, quizLongestStreak, username } = useProgressStore.getState()
  const { user } = useAuthStore.getState()
  const displayName = resolveDisplayName(
    user?.user_metadata?.full_name,
    username,
  )
  return {
    id: user?.id ?? 'you',
    name: displayName,
    avatarSeed: user?.email ?? 'you',
    weeklyScore: quizHighScore,
    allTimeScore: quizHighScore,
    weeklyStreak: quizLongestStreak,
    allTimeStreak: quizLongestStreak,
    topCategory: 'All Topics',
    isFriend: false,
    isYou: true,
  }
}

function weeklyRowToEntry(
  row: WeeklyLeaderboardRow,
  friendIdSet: Set<string>,
  userId: string | undefined,
): LeaderboardEntry {
  return {
    id: row.id,
    name: resolveDisplayName(row.display_name, row.username),
    avatarSeed: row.display_name || 'anon',
    weeklyScore: row.weekly_score,
    allTimeScore: row.all_time_score,
    weeklyStreak: row.weekly_streak,
    allTimeStreak: row.all_time_streak,
    topCategory: topCategoryFromMastery(row.category_mastery),
    isFriend: friendIdSet.has(row.id),
    isYou: userId === row.id,
  }
}

function profileToEntry(
  row: DbProfile,
  friendIdSet: Set<string>,
  userId: string | undefined,
): LeaderboardEntry {
  return {
    id: row.id,
    name: resolveDisplayName(row.display_name, row.username),
    avatarSeed: row.display_name || 'anon',
    weeklyScore: 0, // Not available from profiles table directly
    allTimeScore: row.quiz_high_score,
    weeklyStreak: 0,
    allTimeStreak: row.quiz_longest_streak,
    topCategory: topCategoryFromMastery(row.category_mastery),
    isFriend: friendIdSet.has(row.id),
    isYou: userId === row.id,
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useLeaderboardStore = create<LeaderboardState>()((set, get) => ({
  weeklyEntries: [],
  allTimeEntries: [],
  friendEntries: [],
  loading: false,
  friendIds: [],
  myFriendCode: null,

  setMyFriendCode: (code: string) => set({ myFriendCode: code }),
  setFriendIds: (ids: string[]) => set({ friendIds: ids }),

  fetchFriendIdsList: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return
    const ids = await dbFetchFriendIds(user.id)
    set({ friendIds: ids })
  },

  fetchWeekly: async () => {
    set({ loading: true })
    const rows = await fetchWeeklyLeaderboard()
    const { user } = useAuthStore.getState()
    const friendIdSet = new Set(get().friendIds)

    const entries = rows.map((row) => weeklyRowToEntry(row, friendIdSet, user?.id))

    // Inject "You" if authenticated and not already in results
    if (user && !entries.some((e) => e.isYou)) {
      entries.push(buildYouEntry())
    }

    entries.sort((a, b) => b.weeklyScore - a.weeklyScore)
    set({ weeklyEntries: entries, loading: false })
  },

  fetchAllTime: async () => {
    set({ loading: true })
    const rows = await fetchAllTimeLeaderboard()
    const { user } = useAuthStore.getState()
    const friendIdSet = new Set(get().friendIds)

    const entries = rows.map((row) => profileToEntry(row, friendIdSet, user?.id))

    if (user && !entries.some((e) => e.isYou)) {
      entries.push(buildYouEntry())
    }

    entries.sort((a, b) => b.allTimeScore - a.allTimeScore)
    set({ allTimeEntries: entries, loading: false })
  },

  fetchFriends: async () => {
    const { user } = useAuthStore.getState()
    if (!user) {
      set({ friendEntries: [] })
      return
    }

    set({ loading: true })

    // Re-fetch friend IDs first
    const friendIds = await dbFetchFriendIds(user.id)
    set({ friendIds })
    const friendIdSet = new Set(friendIds)

    // Fetch all-time leaderboard and filter to friends
    const allRows = await fetchAllTimeLeaderboard()
    const friendRows = allRows.filter((row) => friendIdSet.has(row.id))
    const entries = friendRows.map((row) => profileToEntry(row, friendIdSet, user.id))

    // Always add "You"
    if (!entries.some((e) => e.isYou)) {
      entries.push(buildYouEntry())
    }

    entries.sort((a, b) => b.allTimeScore - a.allTimeScore)
    set({ friendEntries: entries, loading: false })
  },

  addFriend: async (code: string) => {
    const { user } = useAuthStore.getState()
    if (!user) return { success: false, error: 'Not signed in' }

    const result = await addFriendByCode(user.id, code)
    if (result.success) {
      // Re-fetch friends after adding
      await get().fetchFriends()
    }
    return result
  },
}))
