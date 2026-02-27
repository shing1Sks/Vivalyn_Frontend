import { motion } from 'framer-motion'
import { MicOff } from 'lucide-react'

interface UserAvatarProps {
  userName: string
  isSpeaking: boolean
  micEnabled: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UserAvatar({ userName, isSpeaking, micEnabled }: UserAvatarProps) {
  const initials = getInitials(userName || 'Me')

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {/* Speaking ripple rings */}
      {isSpeaking && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-400/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-[-8px] rounded-full bg-emerald-400/10"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          />
        </>
      )}

      {/* Avatar circle */}
      <div className={`w-36 h-36 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg select-none duration-[120ms] ${!micEnabled ? 'opacity-60' : ''}`}>
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
