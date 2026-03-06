import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  userId: string
  displayName: string
  avatarUrl: string
  correct: boolean
  solveTimeMs: number | null
  score: number
  completedAt: string
}

type LeaderboardStats = {
  totalCompletions: number
  correctCount: number
  avgSolveTimeMs: number | null
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '0.875rem',
}

// ── Format time ────────────────────────────────────────────────────────────────

export function formatSolveTime(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(0)
  return `${mins}:${secs.padStart(2, '0')}`
}

// ── Medal / rank display ───────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[rank]) {
    return (
      <span style={{ fontSize: 18, minWidth: 28, textAlign: 'center', display: 'inline-block' }}>
        {medals[rank]}
      </span>
    )
  }
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4B5563',
      minWidth: 28, textAlign: 'center', display: 'inline-block' }}>
      #{rank}
    </span>
  )
}

// ── Avatar component ───────────────────────────────────────────────────────────

function Avatar({ name, url, isYou }: { name: string; url: string; isYou?: boolean }) {
  const src = url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0c1424&textColor=6366f1`
  return (
    <img
      src={src}
      alt={name}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        border: isYou ? '2px solid #818CF8' : '1px solid #1e293b',
        flexShrink: 0,
      }}
    />
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div style={{ padding: '0.5rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
          <div style={{ width: 28, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1e293b' }} />
          <div style={{ flex: 1, height: 12, borderRadius: 4, backgroundColor: '#1e293b', maxWidth: 120 + i * 20 }} />
          <div style={{ width: 48, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
          <div style={{ width: 40, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
        </div>
      ))}
    </div>
  )
}

// ── Leaderboard row ────────────────────────────────────────────────────────────

function LeaderboardRow({ entry, rank, isYou }: { entry: LeaderboardEntry; rank: number; isYou: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0.75rem 1rem',
        backgroundColor: isYou ? 'rgba(99,102,241,0.07)' : hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderLeft: isYou ? '3px solid #818CF8' : '3px solid transparent',
        borderRadius: '0.5rem',
        transition: 'background 0.15s',
      }}
    >
      {/* Rank */}
      <div style={{ minWidth: 36, display: 'flex', justifyContent: 'center' }}>
        <RankBadge rank={rank} />
      </div>

      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <Avatar name={entry.displayName} url={entry.avatarUrl} isYou={isYou} />
        <div style={{
          fontSize: '0.875rem', fontWeight: isYou ? 700 : 600,
          color: isYou ? '#C7D2FE' : '#E2E8F0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.displayName}{isYou ? ' (You)' : ''}
        </div>
      </div>

      {/* Solve time — primary ranking column */}
      <div style={{ textAlign: 'right', minWidth: 72 }}>
        <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: isYou ? '#818CF8' : '#F9FAFB' }}>
          {formatSolveTime(entry.solveTimeMs)}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: 1 }}>time</div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', minWidth: 56 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FCD34D' }}>
          {entry.score.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: 1 }}>pts</div>
      </div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function DailyLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboardDate, setLeaderboardDate] = useState<string>('')

  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/daily-leaderboard')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setEntries(data.entries ?? [])
        setStats(data.stats ?? null)
        setLeaderboardDate(data.date ?? '')
      } catch (err) {
        console.error('Failed to fetch daily leaderboard:', err)
        setError('Could not load leaderboard. Try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  const dateDisplay = leaderboardDate
    ? new Date(leaderboardDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  // My rank among correct solvers only (entries is already filtered to correct)
  const myRank = user ? entries.findIndex((e) => e.userId === user.id) + 1 : 0
  const myEntry = user ? entries.find((e) => e.userId === user.id) : null

  // Correct rate
  const correctRate = stats && stats.totalCompletions > 0
    ? Math.round((stats.correctCount / stats.totalCompletions) * 100)
    : null

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, paddingBottom: 64, paddingLeft: 20, paddingRight: 20 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.025em', margin: '0 0 8px' }}>
            ⚡ Speed Rankings
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            {dateDisplay
              ? `${dateDisplay} — Fastest correct answers`
              : 'Fastest correct answers today'}
          </p>
        </div>

        {/* Back link */}
        <div>
          <Link to="/daily" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
              color: '#818CF8',
            }}>
              ← Back to Daily
            </button>
          </Link>
        </div>

        {/* Stats summary cards — shown as soon as we have data */}
        {!loading && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Players', value: String(stats.totalCompletions), color: '#818CF8' },
              { label: 'Correct Rate', value: correctRate != null ? `${correctRate}%` : '—', color: '#34D399' },
              { label: 'Avg Correct Time', value: formatSolveTime(stats.avgSolveTimeMs), color: '#FCD34D' },
            ].map((s) => (
              <div key={s.label} style={{ ...card, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: '#4B5563', textAlign: 'center', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Your rank highlight — only shows if you got it correct */}
        {myEntry && myRank > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '0.75rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 24 }}>
              {myRank <= 3 ? ['🥇', '🥈', '🥉'][myRank - 1] : '🏅'}
            </span>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#C7D2FE' }}>
                Your rank: #{myRank} of {entries.length} correct solver{entries.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                {formatSolveTime(myEntry.solveTimeMs)}
                {stats?.avgSolveTimeMs != null && myEntry.solveTimeMs != null && (
                  <span style={{ color: myEntry.solveTimeMs < stats.avgSolveTimeMs ? '#34D399' : '#F87171' }}>
                    {myEntry.solveTimeMs < stats.avgSolveTimeMs
                      ? ` · ${formatSolveTime(stats.avgSolveTimeMs - myEntry.solveTimeMs)} faster than avg`
                      : ` · ${formatSolveTime(myEntry.solveTimeMs - stats.avgSolveTimeMs)} slower than avg`}
                  </span>
                )}
                {' · '}{myEntry.score.toLocaleString()} pts
              </div>
            </div>
          </motion.div>
        )}

        {/* Sign-in nudge */}
        {!user && (
          <div style={{
            backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '0.75rem', padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>📡</span>
            <p style={{ fontSize: '0.8rem', color: '#818CF8', margin: 0, lineHeight: 1.5 }}>
              Sign in to appear on the leaderboard and see your rank.
            </p>
          </div>
        )}

        {/* Table */}
        <div style={{ ...card, overflow: 'hidden' }}>

          {/* Column headers */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '0.625rem 1rem',
            borderBottom: '1px solid #1e293b',
          }}>
            <div style={{ minWidth: 36 }} />
            <div style={{ flex: 1, fontSize: '0.6rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Player
            </div>
            <div style={{ minWidth: 72, textAlign: 'right', fontSize: '0.6rem', fontWeight: 700, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              ⚡ Time
            </div>
            <div style={{ minWidth: 56, textAlign: 'right', fontSize: '0.6rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Score
            </div>
          </div>

          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#F87171', fontSize: '0.875rem' }}>{error}</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#4B5563', fontSize: '0.875rem' }}>
              No correct answers yet today — be the first!
            </div>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              {entries.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  rank={idx + 1}
                  isYou={user?.id === entry.userId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        {!loading && stats && stats.totalCompletions > stats.correctCount && (
          <p style={{ fontSize: '0.75rem', color: '#374151', textAlign: 'center', margin: 0 }}>
            {stats.totalCompletions - stats.correctCount} player{stats.totalCompletions - stats.correctCount !== 1 ? 's' : ''} attempted but did not get the correct answer.
          </p>
        )}

      </div>
    </div>
  )
}
