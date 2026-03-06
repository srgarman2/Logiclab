import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { NavBar } from './components/layout/NavBar'
import { Home } from './pages/Home'
import { Quiz } from './pages/Quiz'
import { Leaderboard } from './pages/Leaderboard'
import { Daily } from './pages/Daily'
import { DailyLeaderboard } from './pages/DailyLeaderboard'
import { XPToastContainer } from './components/XPToast'
import { showStreakBonusToast } from './components/XPToast'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useProgressStore } from './store/progressStore'
import { useLeaderboardStore } from './store/leaderboardStore'
import { fetchProfile, fetchFriendIds } from './lib/database'

async function hydrateProfile(userId: string) {
  const profile = await fetchProfile(userId)
  if (profile) {
    useProgressStore.getState().hydrateFromSupabase(profile)
    useLeaderboardStore.getState().setMyFriendCode(profile.friend_code)
  }
  const friendIds = await fetchFriendIds(userId)
  useLeaderboardStore.getState().setFriendIds(friendIds)
}

export default function App() {
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    // Hydrate session on first load from Supabase's own localStorage cache
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        hydrateProfile(data.session.user.id)
      }
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user) {
          hydrateProfile(session.user.id)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [setSession])

  // Check login streak on app open (once per day)
  useEffect(() => {
    // Small delay so progress store has time to hydrate from localStorage
    const timer = setTimeout(() => {
      const result = useProgressStore.getState().checkLoginStreak()
      if (result && result.bonusXP > 0) {
        showStreakBonusToast(result.bonusXP, result.newStreak)
      }
      // Sync streak to Supabase if signed in
      const { user } = useAuthStore.getState()
      if (user) {
        useProgressStore.getState().syncToSupabase()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />
      <XPToastContainer />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/daily/leaderboard" element={<DailyLeaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
