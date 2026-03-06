import { supabase } from './supabase'
import { type QuizCategory } from '../data/quizQuestions'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DbProfile = {
  id: string
  display_name: string
  avatar_url: string
  email: string
  friend_code: string
  quiz_high_score: number
  quiz_longest_streak: number
  quiz_total_played: number
  total_xp: number
  streak_shields: number
  category_mastery: Record<QuizCategory, { correct: number; attempted: number }>
  login_streak: number | null
  last_login_date: string | null
  username: string | null
}

// ── Display name helper ────────────────────────────────────────────────────────
// Priority: username → first name from display_name → 'Player'
// Never exposes full name or email on public leaderboards.

export function resolveDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  _email?: string | null,
): string {
  if (username) return username
  if (displayName) return displayName.split(' ')[0] // first name only
  return 'Player'
}

export type DbQuizResult = {
  id: string
  user_id: string
  score: number
  max_streak: number
  category: string
  question_ids: string[]
  answers: Array<{ category: QuizCategory; correct: boolean }>
  played_at: string
}

export type WeeklyLeaderboardRow = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string
  email: string
  friend_code: string
  weekly_score: number
  weekly_streak: number
  weekly_games: number
  all_time_score: number
  all_time_streak: number
  all_time_games: number
  total_xp: number
  category_mastery: Record<QuizCategory, { correct: number; attempted: number }>
}

// ── Profile ────────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('[db] fetchProfile:', error.message)
    return null
  }
  return data as DbProfile
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<DbProfile, 'id' | 'friend_code'>>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) console.error('[db] upsertProfile:', error.message)
}

export async function updateUsername(
  userId: string,
  username: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ username: username.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) {
    // Unique constraint violation
    if (error.code === '23505') return { success: false, error: 'Username already taken' }
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ── Quiz Results ───────────────────────────────────────────────────────────────

export async function insertQuizResult(params: {
  userId: string
  score: number
  maxStreak: number
  category: string
  questionIds: string[]
  answers: Array<{ category: QuizCategory; correct: boolean }>
}): Promise<void> {
  const { error } = await supabase.from('quiz_results').insert({
    user_id: params.userId,
    score: params.score,
    max_streak: params.maxStreak,
    category: params.category,
    question_ids: params.questionIds,
    answers: params.answers,
  })
  if (error) console.error('[db] insertQuizResult:', error.message)
}

// ── Leaderboard ────────────────────────────────────────────────────────────────

export async function fetchWeeklyLeaderboard(): Promise<WeeklyLeaderboardRow[]> {
  const { data, error } = await supabase
    .from('weekly_leaderboard')
    .select('*')
    .order('weekly_score', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[db] fetchWeeklyLeaderboard:', error.message)
    return []
  }
  return (data ?? []) as WeeklyLeaderboardRow[]
}

export async function fetchAllTimeLeaderboard(): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('quiz_high_score', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[db] fetchAllTimeLeaderboard:', error.message)
    return []
  }
  return (data ?? []) as DbProfile[]
}

// ── Friends ────────────────────────────────────────────────────────────────────

export async function fetchFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id, user_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
  if (error) {
    console.error('[db] fetchFriendIds:', error.message)
    return []
  }
  return (data ?? []).map((row: { user_id: string; friend_id: string }) =>
    row.user_id === userId ? row.friend_id : row.user_id,
  )
}

export async function addFriendByCode(
  userId: string,
  friendCode: string,
): Promise<{ success: boolean; error?: string }> {
  // Look up friend by code
  const { data: friendProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('friend_code', friendCode.trim().toLowerCase())
    .single()

  if (lookupError || !friendProfile) {
    return { success: false, error: 'Friend code not found' }
  }
  if (friendProfile.id === userId) {
    return { success: false, error: 'Cannot add yourself' }
  }

  // Insert bidirectional friendship
  const { error: insertError } = await supabase.from('friendships').insert([
    { user_id: userId, friend_id: friendProfile.id },
    { user_id: friendProfile.id, friend_id: userId },
  ])
  if (insertError) {
    if (insertError.code === '23505') return { success: false, error: 'Already friends' }
    return { success: false, error: insertError.message }
  }
  return { success: true }
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await supabase.from('friendships').delete().match({ user_id: userId, friend_id: friendId })
  await supabase.from('friendships').delete().match({ user_id: friendId, friend_id: userId })
}
