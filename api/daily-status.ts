import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ── Handler ────────────────────────────────────────────────────────────────────
// Returns today's questions + whether the authenticated user already completed it.
// Triggers question generation if today's challenge doesn't exist yet.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const todayStr = new Date().toISOString().split('T')[0]

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const anonKey      = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  // Public client for reading challenges + user-scoped completions
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.authorization ?? '' } },
  })

  // ── Fetch today's challenge (or trigger generation) ─────────────────────────
  let { data: challenge } = await supabase
    .from('daily_challenges')
    .select('challenge_date, category, questions')
    .eq('challenge_date', todayStr)
    .maybeSingle()

  if (!challenge) {
    // Lazy-generate by calling our other endpoint internally
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      const genRes = await fetch(`${baseUrl}/api/generate-daily`)
      if (genRes.ok) {
        const generated = await genRes.json()
        challenge = {
          challenge_date: generated.date,
          category: generated.category,
          questions: generated.questions,
        }
      }
    } catch (err) {
      console.error('Failed to trigger generation:', err)
    }
  }

  if (!challenge) {
    return res.status(503).json({ error: 'Daily challenge not available yet' })
  }

  // ── Check if user already completed today ───────────────────────────────────
  const authHeader = req.headers.authorization
  let completion = null

  if (authHeader) {
    // Get user from JWT
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (user) {
      const { data } = await supabase
        .from('daily_completions')
        .select('score, max_streak, answers, completed_at')
        .eq('user_id', user.id)
        .eq('challenge_date', todayStr)
        .maybeSingle()

      completion = data
    }
  }

  // ── Compute challenge number (days since app launch: 2025-01-01) ────────────
  const launchDate = new Date('2025-01-01')
  const today = new Date(todayStr)
  const challengeNumber = Math.floor(
    (today.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  return res.status(200).json({
    date: todayStr,
    challengeNumber,
    category: challenge.category,
    // Only send questions if user hasn't completed yet (or return for review)
    questions: challenge.questions,
    completed: completion !== null,
    completion: completion ?? null,
  })
}
