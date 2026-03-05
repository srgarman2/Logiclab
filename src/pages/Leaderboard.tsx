import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useLeaderboardStore, type LeaderboardEntry } from '../store/leaderboardStore'
import { useAuthStore } from '../store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

type GlobalTab = 'weekly' | 'alltime'
type MainTab   = 'global' | 'friends'

// ── Style helpers ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: '#0c1424',
  border: '1px solid #1e293b',
  borderRadius: '0.875rem',
}

const TAG_COLORS: Record<string, string> = {
  'Formal Logic':      '#A855F7',
  'Flaw Detection':    '#22C55E',
  'Argument Analysis': '#EC4899',
  'Indicator Words':   '#3B82F6',
  'All Topics':        '#6366F1',
}

// ── Avatar component ───────────────────────────────────────────────────────────

function Avatar({ seed, isYou }: { seed: string; isYou?: boolean }) {
  return (
    <img
      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0c1424&textColor=6366f1`}
      alt={seed}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        border: isYou ? '2px solid #818CF8' : '1px solid #1e293b',
        flexShrink: 0,
      }}
    />
  )
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

// ── Loading skeleton ───────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div style={{ padding: '0.5rem' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0.75rem 1rem', borderRadius: '0.5rem',
          }}
        >
          <div style={{ width: 28, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#1e293b' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 100 + i * 20, height: 12, borderRadius: 4, backgroundColor: '#1e293b' }} />
            <div style={{ width: 64, height: 10, borderRadius: 4, backgroundColor: '#141e30' }} />
          </div>
          <div style={{ width: 48, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
          <div style={{ width: 40, height: 14, borderRadius: 4, backgroundColor: '#1e293b' }} />
        </div>
      ))}
    </div>
  )
}

// ── Leaderboard table row ──────────────────────────────────────────────────────

type RowProps = {
  entry: LeaderboardEntry
  rank: number
  scoreKey: 'weeklyScore' | 'allTimeScore'
  streakKey: 'weeklyStreak' | 'allTimeStreak'
  showChallenge?: boolean
  onChallenge?: () => void
}

function LeaderboardRow({ entry, rank, scoreKey, streakKey, showChallenge, onChallenge }: RowProps) {
  const [hovered, setHovered] = useState(false)
  const tagColor = TAG_COLORS[entry.topCategory] ?? '#6B7280'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0.75rem 1rem',
        backgroundColor: entry.isYou
          ? 'rgba(99,102,241,0.07)'
          : hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderLeft: entry.isYou ? '3px solid #818CF8' : '3px solid transparent',
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
        <Avatar seed={entry.avatarSeed || entry.name} isYou={entry.isYou} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: entry.isYou ? 700 : 600,
            color: entry.isYou ? '#C7D2FE' : '#E2E8F0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}{entry.isYou ? ' (You)' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: tagColor,
              backgroundColor: tagColor + '15', border: `1px solid ${tagColor}35`,
              borderRadius: '0.25rem', padding: '0.1rem 0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {entry.topCategory}
            </span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', minWidth: 72 }}>
        <div style={{ fontSize: '0.9375rem', fontWeight: 800,
          color: entry.isYou ? '#818CF8' : '#F9FAFB' }}>
          {entry[scoreKey].toLocaleString()}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: 1 }}>pts</div>
      </div>

      {/* Streak */}
      <div style={{ textAlign: 'right', minWidth: 56 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FCD34D' }}>
          🔥×{entry[streakKey]}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#374151', marginTop: 1 }}>streak</div>
      </div>

      {/* Challenge button (Friends tab only) */}
      {showChallenge && !entry.isYou && (
        <button
          onClick={onChallenge}
          style={{
            padding: '0.3rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem',
            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
            color: '#F97316', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.1)' }}
        >
          ⚡ Challenge
        </button>
      )}
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function Leaderboard() {
  const [mainTab, setMainTab] = useState<MainTab>('global')
  const [globalTab, setGlobalTab] = useState<GlobalTab>('weekly')
  const [codeCopied, setCodeCopied] = useState(false)
  const [friendCodeInput, setFriendCodeInput] = useState('')
  const [addFriendStatus, setAddFriendStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const {
    weeklyEntries, allTimeEntries, friendEntries,
    loading, myFriendCode,
    fetchWeekly, fetchAllTime, fetchFriends, addFriend,
  } = useLeaderboardStore()

  // ── Fetch data when tab changes ──────────────────────────────────────────

  useEffect(() => {
    if (mainTab === 'friends') {
      fetchFriends()
    } else if (globalTab === 'weekly') {
      fetchWeekly()
    } else {
      fetchAllTime()
    }
  }, [mainTab, globalTab, fetchWeekly, fetchAllTime, fetchFriends])

  // ── Current entries ──────────────────────────────────────────────────────

  const entries = mainTab === 'friends'
    ? friendEntries
    : globalTab === 'weekly'
      ? weeklyEntries
      : allTimeEntries

  const scoreKey: 'weeklyScore' | 'allTimeScore' = (mainTab === 'global' && globalTab === 'alltime')
    ? 'allTimeScore'
    : mainTab === 'friends'
      ? 'allTimeScore'
      : 'weeklyScore'

  const streakKey: 'weeklyStreak' | 'allTimeStreak' = (mainTab === 'global' && globalTab === 'alltime')
    ? 'allTimeStreak'
    : mainTab === 'friends'
      ? 'allTimeStreak'
      : 'weeklyStreak'

  // ── Friend code copy ────────────────────────────────────────────────────

  const handleCopyCode = () => {
    if (!myFriendCode) return
    navigator.clipboard.writeText(myFriendCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  // ── Add friend ──────────────────────────────────────────────────────────

  const handleAddFriend = async () => {
    const code = friendCodeInput.trim()
    if (!code) return
    setAddFriendStatus(null)
    const result = await addFriend(code)
    if (result.success) {
      setAddFriendStatus({ msg: 'Friend added!', ok: true })
      setFriendCodeInput('')
    } else {
      setAddFriendStatus({ msg: result.error ?? 'Failed', ok: false })
    }
    setTimeout(() => setAddFriendStatus(null), 3000)
  }

  const handleChallenge = () => {
    navigate('/quiz')
  }

  // ── Styles ─────────────────────────────────────────────────────────────

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
    backgroundColor: active ? '#4F46E5' : 'transparent',
    border: active ? '1px solid #4338CA' : '1px solid transparent',
    color: active ? '#fff' : '#6B7280',
  })

  const subTabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
    backgroundColor: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
    color: active ? '#818CF8' : '#4B5563',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, paddingBottom: 64, paddingLeft: 20, paddingRight: 20 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#F9FAFB',
            letterSpacing: '-0.025em', margin: '0 0 8px' }}>
            🏆 Leaderboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            See how you stack up against other LogicLab players.
          </p>
        </div>

        {/* Friend code / sign-in prompt */}
        {user && myFriendCode ? (
          <div style={{
            backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '0.75rem', padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 16 }}>🔗</span>
            <p style={{ fontSize: '0.8rem', color: '#818CF8', margin: 0, lineHeight: 1.5, flex: 1 }}>
              Your friend code: <strong style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{myFriendCode}</strong>
            </p>
            <button
              onClick={handleCopyCode}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer',
                backgroundColor: codeCopied ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                border: codeCopied ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(99,102,241,0.35)',
                color: codeCopied ? '#34D399' : '#818CF8',
                transition: 'all 0.15s',
              }}
            >
              {codeCopied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
        ) : !user ? (
          <div style={{
            backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '0.75rem', padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>📡</span>
            <p style={{ fontSize: '0.8rem', color: '#818CF8', margin: 0, lineHeight: 1.5 }}>
              Sign in to track your rank, add friends, and sync progress across devices.
            </p>
          </div>
        ) : null}

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabBtn(mainTab === 'global')} onClick={() => setMainTab('global')}>
            🌍 Global
          </button>
          <button style={tabBtn(mainTab === 'friends')} onClick={() => setMainTab('friends')}>
            👥 Friends
          </button>
        </div>

        {/* Global sub-tabs */}
        {mainTab === 'global' && (
          <div style={{ display: 'flex', gap: 8, marginTop: -12 }}>
            <button style={subTabBtn(globalTab === 'weekly')} onClick={() => setGlobalTab('weekly')}>
              This Week
            </button>
            <button style={subTabBtn(globalTab === 'alltime')} onClick={() => setGlobalTab('alltime')}>
              All Time
            </button>
          </div>
        )}

        {/* Friends tab top bar */}
        {mainTab === 'friends' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12, marginTop: -12,
          }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Enter friend code…"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddFriend() }}
                  style={{
                    flex: 1, minWidth: 140, padding: '0.4rem 0.75rem',
                    borderRadius: '0.5rem', fontSize: '0.8125rem',
                    backgroundColor: '#141e30', border: '1px solid #1e293b',
                    color: '#E2E8F0', outline: 'none', fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={handleAddFriend}
                  style={{
                    padding: '0.4rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
                    fontWeight: 600, cursor: 'pointer',
                    backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
                    color: '#818CF8', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  + Add Friend
                </button>
                {addFriendStatus && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: addFriendStatus.ok ? '#34D399' : '#F87171',
                  }}>
                    {addFriendStatus.msg}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                Sign in to see your friends and add new ones.
              </p>
            )}
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
            <div style={{ flex: 1, fontSize: '0.6rem', fontWeight: 700, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Player
            </div>
            <div style={{ minWidth: 72, textAlign: 'right', fontSize: '0.6rem', fontWeight: 700,
              color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Score
            </div>
            <div style={{ minWidth: 56, textAlign: 'right', fontSize: '0.6rem', fontWeight: 700,
              color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Streak
            </div>
            {mainTab === 'friends' && (
              <div style={{ minWidth: 80 }} />
            )}
          </div>

          {/* Rows / loading / empty */}
          {loading ? (
            <SkeletonRows />
          ) : entries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#4B5563', fontSize: '0.875rem' }}>
              {mainTab === 'friends'
                ? user
                  ? 'No friends yet — enter a friend code above to get started!'
                  : 'Sign in to see your friends here.'
                : 'No leaderboard data yet. Play a quiz to get on the board!'}
            </div>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              {entries.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={idx + 1}
                  scoreKey={scoreKey}
                  streakKey={streakKey}
                  showChallenge={mainTab === 'friends'}
                  onChallenge={handleChallenge}
                />
              ))}
            </div>
          )}
        </div>

        {/* Challenge hint */}
        <p style={{ fontSize: '0.75rem', color: '#374151', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          ⚡ Click <strong style={{ color: '#F97316' }}>Challenge</strong> to start a quiz — then share the link from the results screen to let your friend play the same questions.
        </p>

      </div>
    </div>
  )
}
