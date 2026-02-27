/**
 * AgentLive — public page for interacting with a deployed agent via voice.
 *
 * Routes:
 *   /agent/:agentId          — live mode (agent must be live, asks email + name)
 *   /agent/:agentId?mode=test — test mode (requires auth, members only)
 *
 * State machine: loading → entry → session → ended / error
 */

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { fetchAgentPublicConfig, type AgentPublicConfig } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAgentSession } from '../hooks/useAgentSession'
import EntryScreen from '../components/agentlive/EntryScreen'
import SessionScreen from '../components/agentlive/SessionScreen'
import TranscriptPanel from '../components/agentlive/TranscriptPanel'
import EndedScreen from '../components/agentlive/EndedScreen'

type PageState = 'loading' | 'entry' | 'session' | 'ended' | 'error'

// ── Inner session component (mounts useAgentSession once join details are known) ──

interface ActiveSessionProps {
  agentId: string
  agentName: string
  email: string
  name: string
  mode: 'live' | 'test'
  token?: string
  onEnded: (turnCount: number) => void
}

function ActiveSession({
  agentId,
  agentName,
  email,
  name,
  mode,
  token,
  onEnded,
}: ActiveSessionProps) {
  const userName = name
  const { phase, agentState, transcript, micEnabled, toggleMic, endSession, error } =
    useAgentSession({ agentId, email, name, mode, token })

  useEffect(() => {
    if (phase === 'ended') {
      onEnded(transcript.filter(e => e.role === 'user').length)
    }
  }, [phase, transcript, onEnded])

  if (phase === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-400">Connecting to {agentName}…</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-gray-700 font-medium mb-2">{error ?? 'Connection failed'}</p>
          <p className="text-sm text-gray-400">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Main call area */}
      <div className="flex-1 flex flex-col">
        <SessionScreen
          agentName={agentName}
          userName={userName}
          mode={mode}
          agentState={agentState}
          micEnabled={micEnabled}
          onToggleMic={toggleMic}
          onEndCall={endSession}
        />
      </div>

      {/* Transcript panel */}
      <div className="w-72 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TranscriptPanel transcript={transcript} agentName={agentName} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AgentLive() {
  const { agentId } = useParams<{ agentId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session: authSession } = useAuth()

  const mode = (searchParams.get('mode') === 'test' ? 'test' : 'live') as 'live' | 'test'

  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig] = useState<AgentPublicConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Join details — set when user submits the entry form
  const [joinEmail, setJoinEmail] = useState('')
  const [joinName, setJoinName] = useState('')
  const [sessionStarted, setSessionStarted] = useState(false)
  const [endedTurnCount, setEndedTurnCount] = useState(0)

  // 1. Load public agent config
  useEffect(() => {
    if (!agentId) return
    fetchAgentPublicConfig(agentId)
      .then(cfg => {
        // If live mode and agent is idle, block
        if (mode === 'live' && cfg.agent_status !== 'live') {
          setLoadError('This agent is not currently live.')
          setPageState('error')
          return
        }
        setConfig(cfg)
        setPageState('entry')
      })
      .catch(err => {
        setLoadError(err.message ?? 'Agent not found.')
        setPageState('error')
      })
  }, [agentId, mode])

  // 2. Test mode — require auth
  useEffect(() => {
    if (mode === 'test' && pageState === 'entry' && !authSession) {
      navigate(`/auth?next=/agent/${agentId}?mode=test`, { replace: true })
    }
  }, [mode, pageState, authSession, agentId, navigate])

  const handleJoin = (email: string, name: string) => {
    setJoinEmail(email)
    setJoinName(name)
    setSessionStarted(true)
    setPageState('session')
  }

  const handleEnded = (turnCount: number) => {
    setEndedTurnCount(turnCount)
    setPageState('ended')
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            {loadError ?? 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-500">
            {mode === 'live'
              ? 'The agent owner may have paused it. Try again later.'
              : 'Ensure you have access to this agentspace.'}
          </p>
        </div>
      </div>
    )
  }

  if (pageState === 'ended') {
    return (
      <EndedScreen
        agentName={config?.agent_name ?? 'Agent'}
        turnCount={endedTurnCount}
      />
    )
  }

  if (pageState === 'entry') {
    return (
      <EntryScreen
        agentName={config?.agent_name ?? 'Agent'}
        mode={mode}
        prefillEmail={mode === 'test' ? (authSession?.user.email ?? '') : ''}
        onJoin={handleJoin}
      />
    )
  }

  // session state — sessionStarted is true
  if (pageState === 'session' && sessionStarted && agentId) {
    return (
      <ActiveSession
        agentId={agentId}
        agentName={config?.persona_name ?? config?.agent_name ?? 'Agent'}
        email={joinEmail}
        name={joinName}
        mode={mode}
        token={mode === 'test' ? (authSession?.access_token ?? '') : undefined}
        onEnded={handleEnded}
      />
    )
  }

  return null
}
