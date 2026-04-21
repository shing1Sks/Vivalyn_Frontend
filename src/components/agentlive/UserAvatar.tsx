import type { MutableRefObject } from 'react'
import { motion, useMotionValue, useTransform, useAnimationFrame } from 'framer-motion'
import { MicOff } from 'lucide-react'

interface UserAvatarProps {
  userName: string
  isSpeaking: boolean
  micEnabled: boolean
  audioLevelRef: MutableRefObject<number>
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UserAvatar({ userName, isSpeaking, micEnabled, audioLevelRef }: UserAvatarProps) {
  const initials = getInitials(userName || 'Me')

  const level = useMotionValue(0)
  useAnimationFrame(() => {
    level.set(isSpeaking ? audioLevelRef.current : 0)
  })

  // Ring 1 — matches agent's inset-0 ring (bg-emerald-400/20)
  const ring1Scale = useTransform(level, [0, 1], [1, 1.3])
  const ring1Opacity = useTransform(level, [0, 0.04, 1], [0, 0.6, 0.6])

  // Ring 2 — matches agent's -inset-2 ring (bg-emerald-400/10)
  const ring2Scale = useTransform(level, [0, 1], [1, 1.5])
  const ring2Opacity = useTransform(level, [0, 0.04, 1], [0, 0.4, 0.4])

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {/* Amplitude-driven ring 1 — same visual as agent speaking ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-emerald-400/20"
        style={{ scale: ring1Scale, opacity: ring1Opacity }}
      />
      {/* Amplitude-driven ring 2 — same visual as agent outer speaking ring */}
      <motion.div
        className="absolute -inset-2 rounded-full bg-emerald-400/10"
        style={{ scale: ring2Scale, opacity: ring2Opacity }}
      />

      {/* Avatar circle */}
      <div className={`w-36 h-36 rounded-full bg-linear-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg select-none duration-[120ms] ${!micEnabled ? 'opacity-60' : ''}`}>
        <span className="text-4xl font-semibold text-white tracking-wide">
          {initials}
        </span>
      </div>

      {/* Muted badge */}
      {!micEnabled && (
        <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          <MicOff className="w-3.5 h-3.5 text-gray-300" />
        </div>
      )}
    </div>
  )
}
