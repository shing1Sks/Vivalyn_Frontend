import { useEffect, useState } from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import AgentAvatar from './AgentAvatar'
import type { AgentState } from '../../hooks/useAgentSession'

interface SessionScreenProps {
  agentName: string
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
  mode,
  agentState,
  micEnabled,
  onToggleMic,
  onEndCall,
}: SessionScreenProps) {
  const elapsed = useElapsed()

  return (
    <div className="flex flex-col items-center justify-between h-full py-8 px-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Agent</p>
          <h2 className="text-base font-semibold text-gray-900">{agentName}</h2>
        </div>
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            mode === 'live'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-indigo-50 text-indigo-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'
            }`}
          />
          {mode === 'live' ? 'Live' : 'Test'}
        </span>
      </div>

      {/* Agent avatar */}
      <div className="flex flex-col items-center gap-4">
        <AgentAvatar agentName={agentName} agentState={agentState} />
        <span className="text-sm text-gray-500 font-medium min-h-[20px]">
          {STATE_LABELS[agentState]}
        </span>
      </div>

      {/* Session timer */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        {elapsed}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border duration-[120ms] ${
            micEnabled
              ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              : 'bg-gray-900 border-gray-900 text-white'
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
