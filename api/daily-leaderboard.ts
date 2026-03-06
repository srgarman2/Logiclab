import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ── Handler ────────────────────────────────────────────────────────────────────
// Returns today's daily challenge leaderboard.
// Ranked by: correct first, then fastest solve time.
// Uses service-role key to bypass RLS (daily_completions has user-only RLS).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Allow querying a specific date, default to today (UTC)
  const dateParam = typeof req.query.date === 'string' ? req.query.date : null
  const todayStr = dateParam || new Date().toISOString().split('T')[0]

  try {
    // Fetch all completions for today, joined with profiles for display name
    const { data: completions, error } = await supabase
      .from('daily_completions')
      .select(`
        user_id,
        score,
        max_streak,
        answers,
        solve_time_ms,
        completed_at,
        profiles:user_id (
          display_name,
          avatar_url,
          email
        )
      `)
      .eq('challenge_date', todayStr)
      .order('score', { ascending: false })

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return res.status(500).json({ error: 'Database error' })
    }

    if (!completions || completions.length === 0) {
      return res.status(200).json({ date: todayStr, entries: [] })
    }

    // Build leaderboard entries
    type Entry = {
      userId: string
      displayName: string
      avatarUrl: string
      correct: boolean
      solveTimeMs: number | null
      score: number
      completedAt: string
    }

    const entries: Entry[] = completions.map((c: any) => {
      const profile = c.profiles
      const answers = c.answers as Array<{ correct: boolean; timedOut: boolean }>
      const isCorrect = answers.length > 0 && answers[0]?.correct === true

      return {
        userId: c.user_id,
        displayName: profile?.display_name || profile?.email?.split('@')[0] || 'Anonymous',
        avatarUrl: profile?.avatar_url || '',
        correct: isCorrect,
        solveTimeMs: c.solve_time_ms,
        score: c.score,
        completedAt: c.completed_at,
      }
    })

    // Sort: correct first, then by fastest solve time (nulls last)
    entries.sort((a, b) => {
      // Correct answers first
      if (a.correct !== b.correct) return a.correct ? -1 : 1
      // Then by solve time (faster = better, nulls last)
      if (a.solveTimeMs == null && b.solveTimeMs == null) return 0
      if (a.solveTimeMs == null) return 1
      if (b.solveTimeMs == null) return -1
      return a.solveTimeMs - b.solveTimeMs
    })

    return res.status(200).json({
      date: todayStr,
      entries: entries.slice(0, 100), // Top 100
    })

  } catch (err) {
    console.error('Leaderboard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
