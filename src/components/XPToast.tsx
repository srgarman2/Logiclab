import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLevelForXP, getLevelProgress, type XPLevel } from '../store/progressStore'

// ── Toast types ─────────────────────────────────────────────────────────────────

type XPToastItem = {
  id: number
  type: 'xp' | 'level-up' | 'streak-bonus'
  amount?: number
  level?: XPLevel
  streakDays?: number
}

let toastIdCounter = 0

// ── Global event bus (so any component can trigger a toast) ─────────────────────

type ToastListener = (item: XPToastItem) => void
const listeners: Set<ToastListener> = new Set()

export function showXPToast(amount: number, prevXP: number) {
  const prevLevel = getLevelForXP(prevXP)
  const newLevel = getLevelForXP(prevXP + amount)

  // XP gain toast
  const xpItem: XPToastItem = { id: ++toastIdCounter, type: 'xp', amount }
  listeners.forEach((fn) => fn(xpItem))

  // Level-up toast (delayed slightly for stacking effect)
  if (newLevel.level > prevLevel.level) {
    setTimeout(() => {
      const lvlItem: XPToastItem = { id: ++toastIdCounter, type: 'level-up', level: newLevel }
      listeners.forEach((fn) => fn(lvlItem))
    }, 400)
  }
}

export function showStreakBonusToast(bonusXP: number, streakDays: number) {
  const item: XPToastItem = { id: ++toastIdCounter, type: 'streak-bonus', amount: bonusXP, streakDays }
  listeners.forEach((fn) => fn(item))
}

// ── Toast container component (mount once in App) ──────────────────────────────

export function XPToastContainer() {
  const [toasts, setToasts] = useState<XPToastItem[]>([])

  const addToast = useCallback((item: XPToastItem) => {
    setToasts((prev) => [...prev, item])
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id))
    }, 3000)
  }, [])

  useEffect(() => {
    listeners.add(addToast)
    return () => { listeners.delete(addToast) }
  }, [addToast])

  return (
    <div style={{
      position: 'fixed', top: 80, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Individual toast ────────────────────────────────────────────────────────────

function Toast({ item }: { item: XPToastItem }) {
  if (item.type === 'level-up' && item.level) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 60, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 60, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          backgroundColor: 'rgba(79,70,229,0.95)',
          border: '1px solid rgba(129,140,248,0.5)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1.25rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
          minWidth: 200,
        }}
      >
        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FCD34D', marginBottom: 2 }}>
          Level Up!
        </div>
        <div style={{ fontSize: '0.8rem', color: '#E0E7FF' }}>
          Level {item.level.level} · {item.level.title}
        </div>
      </motion.div>
    )
  }

  if (item.type === 'streak-bonus') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 60, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 60, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          backgroundColor: 'rgba(249,115,22,0.92)',
          border: '1px solid rgba(251,191,36,0.5)',
          borderRadius: '0.75rem',
          padding: '0.625rem 1.125rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 6px 24px rgba(249,115,22,0.35)',
          minWidth: 180,
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
          +{item.amount} XP
        </div>
        <div style={{ fontSize: '0.75rem', color: '#FEF3C7' }}>
          {item.streakDays}-day login streak bonus!
        </div>
      </motion.div>
    )
  }

  // Default: XP gain
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      style={{
        backgroundColor: 'rgba(16,185,129,0.92)',
        border: '1px solid rgba(52,211,153,0.5)',
        borderRadius: '0.75rem',
        padding: '0.625rem 1.125rem',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 6px 24px rgba(16,185,129,0.3)',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
        +{item.amount} XP
      </div>
    </motion.div>
  )
}
