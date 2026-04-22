import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, User, Pin } from 'lucide-react'
import type { TranscriptEntry } from '../../hooks/useAgentSession'

interface BubbleItem {
  id: string
  role: 'agent' | 'user'
  text: string
  isLive: boolean
  pinned: boolean
}

interface FloatingTranscriptProps {
  transcript: TranscriptEntry[]
  agentName: string
  streamingAgentText?: string
  partialUserText?: string
}

const DISMISS_MS = 8000

export default function FloatingTranscript({
  transcript,
  agentName,
  streamingAgentText,
  partialUserText,
}: FloatingTranscriptProps) {
  const [bubbles, setBubbles] = useState<BubbleItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())
  const removedRef = useRef<Set<string>>(new Set())
  const prevLenRef = useRef(transcript.length)

  function clearTimer(id: string) {
    const t = timersRef.current.get(id)
    if (t) {
      window.clearTimeout(t)
      timersRef.current.delete(id)
    }
  }

  function startTimer(id: string) {
    clearTimer(id)
    const t = window.setTimeout(() => {
      removeBubble(id)
    }, DISMISS_MS)
    timersRef.current.set(id, t)
  }

  function hasLiveBubble(items: BubbleItem[]) {
    return items.some(b => b.isLive)
  }

  const removeBubble = useCallback((id: string) => {
    if (removedRef.current.has(id)) return
    removedRef.current.add(id)
    clearTimer(id)
    setBubbles(prev => prev.filter(b => b.id !== id))
  }, [])

  // Single unified effect reconciles all three data sources
  useEffect(() => {
    setBubbles(prev => {
      let next = prev.map(b => ({ ...b }))
      let agentWasFinalized = false
      let userWasFinalized = false

      // ── Step 1: New finalized transcript entries ──────────────────────
      const newLen = transcript.length
      const prevLen = prevLenRef.current
      if (newLen > prevLen) {
        const entry = transcript[newLen - 1]
        const liveId = entry.role === 'agent' ? 'latest-agent' : 'latest-user'
        const liveIdx = next.findIndex(b => b.id === liveId)

        if (liveIdx >= 0) {
          // Convert live bubble → finalized in place (same key = zero animation)
          clearTimer(liveId)
          next[liveIdx] = {
            ...next[liveIdx],
            isLive: false,
            pinned: false,
          }
        } else {
          // No matching live bubble — add new finalized bubble
          const bubble: BubbleItem = {
            id: `final-${entry.role}-${newLen - 1}`,
            role: entry.role,
            text: entry.text,
            isLive: false,
            pinned: false,
          }
          next = [...next, bubble]
        }

        if (entry.role === 'agent') agentWasFinalized = true
        else userWasFinalized = true
        prevLenRef.current = newLen
      }

      // ── Step 2: Streaming agent text ──────────────────────────────────
      const agentLiveId = 'latest-agent'
      const agentLiveIdx = next.findIndex(b => b.id === agentLiveId)
      if (streamingAgentText && streamingAgentText.trim()) {
        if (agentLiveIdx >= 0) {
          next[agentLiveIdx] = { ...next[agentLiveIdx], text: streamingAgentText }
        } else {
          next = [...next, {
            id: agentLiveId,
            role: 'agent',
            text: streamingAgentText,
            isLive: true,
            pinned: false,
          }]
        }
      } else if (agentLiveIdx >= 0 && next[agentLiveIdx].isLive && !agentWasFinalized) {
        clearTimer(agentLiveId)
        next = next.filter(b => b.id !== agentLiveId)
      }

      // ── Step 3: Partial user text ─────────────────────────────────────
      const userLiveId = 'latest-user'
      const userLiveIdx = next.findIndex(b => b.id === userLiveId)
      if (partialUserText && partialUserText.trim()) {
        if (userLiveIdx >= 0) {
          next[userLiveIdx] = { ...next[userLiveIdx], text: partialUserText }
        } else {
          next = [...next, {
            id: userLiveId,
            role: 'user',
            text: partialUserText,
            isLive: true,
            pinned: false,
          }]
        }
      } else if (userLiveIdx >= 0 && next[userLiveIdx].isLive && !userWasFinalized) {
        clearTimer(userLiveId)
        next = next.filter(b => b.id !== userLiveId)
      }

      // ── Step 4: Enforce max 2 (respect pinned) ────────────────────────
      while (next.length > 2) {
        const removable = next.findIndex(b => !b.pinned)
        if (removable >= 0) {
          clearTimer(next[removable].id)
          next.splice(removable, 1)
        } else {
          clearTimer(next[0].id)
          next.shift()
        }
      }

      // ── Step 5: Manage timers ─────────────────────────────────────────
      const hasLive = hasLiveBubble(next)
      next.forEach(b => {
        if (b.isLive || b.pinned) {
          clearTimer(b.id)
        } else if (hasLive) {
          clearTimer(b.id)
        } else {
          if (!timersRef.current.has(b.id)) {
            startTimer(b.id)
          }
        }
      })

      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript.length, streamingAgentText, partialUserText])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const togglePin = useCallback((id: string) => {
    setBubbles(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const wasPinned = next[idx].pinned
      next[idx] = { ...next[idx], pinned: !wasPinned }

      if (wasPinned) {
        if (!hasLiveBubble(next)) {
          startTimer(id)
        }
      } else {
        clearTimer(id)
      }
      return next
    })
  }, [])

  if (bubbles.length === 0) return null

  return (
    <div className="absolute bottom-[96px] left-0 right-0 z-20 flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence initial={false}>
        {bubbles.map(bubble => (
          <BubbleCard
            key={bubble.id}
            bubble={bubble}
            agentName={agentName}
            onPin={() => togglePin(bubble.id)}
            onDismiss={() => removeBubble(bubble.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Individual bubble with swipe-to-dismiss ────────────────────────────────

interface BubbleCardProps {
  bubble: BubbleItem
  agentName: string
  onPin: () => void
  onDismiss: () => void
}

function BubbleCard({ bubble, agentName, onPin, onDismiss }: BubbleCardProps) {
  const [exitX, setExitX] = useState(0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: exitX, transition: { duration: 0.25, ease: 'easeOut' } }}
      transition={{
        layout: { duration: 0.3, ease: 'easeOut' },
        opacity: { duration: 0.2 },
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_e, info) => {
        if (Math.abs(info.offset.x) > 60) {
          setExitX(info.offset.x > 0 ? 120 : -120)
          onDismiss()
        }
      }}
      onClick={onPin}
      className={`pointer-events-auto w-full max-w-[92%] cursor-pointer select-none ${
        bubble.pinned ? 'ring-1 ring-indigo-400/40 rounded-xl' : ''
      }`}
    >
      <div className="bg-gray-950/85 backdrop-blur-md border border-gray-800/80 rounded-xl px-4 py-3 shadow-lg">
        {/* Sender label */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {bubble.role === 'agent' ? (
              <Bot className="w-3 h-3 text-indigo-400" />
            ) : (
              <User className="w-3 h-3 text-emerald-400" />
            )}
            <span
              className={`text-[10px] font-medium uppercase tracking-wider ${
                bubble.role === 'agent' ? 'text-indigo-400' : 'text-emerald-400'
              }`}
            >
              {bubble.role === 'agent' ? agentName : 'You'}
              {bubble.isLive && (
                <span className="ml-1.5 text-gray-500 font-normal">live</span>
              )}
            </span>
          </div>
          {bubble.pinned && (
            <Pin className="w-3 h-3 text-indigo-400" />
          )}
        </div>

        {/* Message text */}
        <p className="text-sm text-gray-100 leading-relaxed line-clamp-4">
          {bubble.text}
        </p>
      </div>
    </motion.div>
  )
}
