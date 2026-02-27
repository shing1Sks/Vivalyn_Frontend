import { useEffect, useState } from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import AgentAvatar from './AgentAvatar'
import UserAvatar from './UserAvatar'
import type { AgentState } from '../../hooks/useAgentSession'

interface SessionScreenProps {
  agentName: string
  userName: string
  mode: 'live' | 'test'
  agentState: AgentState
  micEnabled: boolean
  onToggleMic: () => void
  onEndCall: () => void
}

const STATE_LABELS: Record<AgentState, string> = {
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking',
}

function useElapsed() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionScreen({
  agentName,
  userName,
  mode,
  agentState,
  micEnabled,
  onToggleMic,
  onEndCall,
}: SessionScreenProps) {
  const elapsed = useElapsed()
  const isUserSpeaking = agentState === 'listening' && micEnabled

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            mode === 'live'
              ? 'bg-emerald-900/60 text-emerald-400'
              : 'bg-indigo-900/60 text-indigo-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'
            }`}
          />
          {mode === 'live' ? 'Live' : 'Test'}
        </span>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          {elapsed}
        </div>
      </div>

      {/* Main avatars area */}
      <div className="flex-1 flex items-center justify-center gap-6">
        {/* Agent card */}
        <div className="flex flex-col items-center gap-5 px-14 py-10 rounded-2xl border border-gray-700/60 bg-linear-to-b from-gray-800/70 to-gray-900/80 backdrop-blur-sm">
          <AgentAvatar agentName={agentName} agentState={agentState} />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{agentName}</p>
            <p className="text-xs text-gray-500 mt-0.5 min-h-[16px]">
              {STATE_LABELS[agentState]}
            </p>
          </div>
        </div>

        {/* User card */}
        <div className="flex flex-col items-center gap-5 px-14 py-10 rounded-2xl border border-gray-700/60 bg-linear-to-b from-gray-800/70 to-gray-900/80 backdrop-blur-sm">
          <UserAvatar
            userName={userName}
            isSpeaking={isUserSpeaking}
            micEnabled={micEnabled}
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-gray-500 mt-0.5 min-h-[16px]">
              {isUserSpeaking ? 'Speaking' : !micEnabled ? 'Muted' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 pb-8">
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border duration-[120ms] ${
            micEnabled
              ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
              : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900'
          }`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* End call */}
        <button
          onClick={onEndCall}
          title="End session"
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md duration-[120ms]"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  )
}
