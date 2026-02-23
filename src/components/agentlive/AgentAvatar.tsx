import { motion } from 'framer-motion'
import type { AgentState } from '../../hooks/useAgentSession'

interface AgentAvatarProps {
  agentName: string
  agentState: AgentState
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function AgentAvatar({ agentName, agentState }: AgentAvatarProps) {
  const initials = getInitials(agentName || 'AG')

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {/* Outer animated ring */}
      {agentState === 'speaking' && (
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

      {agentState === 'listening' && (
        <motion.div
          className="absolute inset-[-4px] rounded-full border-2 border-indigo-400/40"
          animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {agentState === 'thinking' && (
        <motion.div
          className="absolute inset-[-4px] rounded-full border-2 border-dashed border-gray-300"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Avatar circle */}
      <div className="w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg select-none">
        <span className="text-4xl font-semibold text-white tracking-wide">
          {initials}
        </span>
      </div>
    </div>
  )
}
