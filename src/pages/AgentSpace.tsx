import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Bot, Check, Copy, Link2, Loader2, Plus, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AgentSpaceProvider, useAgentSpace } from '../context/AgentSpaceContext'
import AgentSpaceHeader from '../components/agentspace/AgentSpaceHeader'
import CreateAgentSpaceModal from '../components/agentspace/CreateAgentSpaceModal'
import AgentSpaceSettingsPanel from '../components/agentspace/AgentSpaceSettingsPanel'
import InboxPanel from '../components/agentspace/InboxPanel'
import CreateAgentWizard from '../components/agentspace/CreateAgentWizard'
import AgentConfigureView from '../components/agentspace/wizard/AgentConfigureView'
import { fetchAgents, toggleAgentStatus, type Agent } from '../lib/api'
import { fadeInUp, staggerContainer } from '../lib/motion'

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractPersonaName(agent: Agent): string {
  return agent.agent_prompt.name ?? ''
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Main content ───────────────────────────────────────────────────────────────

function AgentSpaceContent() {
  const { activeSpace, spaces, spacesLoading, spacesError, refetchSpaces } = useAgentSpace()
  const { signOut, session } = useAuth()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [createAgentOpen, setCreateAgentOpen] = useState(false)

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [configuringAgent, setConfiguringAgent] = useState<Agent | null>(null)

  const retryCount = useRef(0)

  useEffect(() => {
    if (!spacesLoading && spaces.length === 0 && !spacesError && retryCount.current < 5) {
      const timer = setTimeout(() => {
        retryCount.current += 1
        refetchSpaces()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [spacesLoading, spaces.length, spacesError, refetchSpaces])

  // Fetch agents whenever the active space changes
  useEffect(() => {
    if (!activeSpace || !session) return
    setAgentsLoading(true)
    fetchAgents(session.access_token, activeSpace.id)
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false))
  }, [activeSpace?.id, session])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function handleWizardClose() {
    setCreateAgentOpen(false)
    if (activeSpace && session) {
      fetchAgents(session.access_token, activeSpace.id).then(setAgents).catch(() => {})
    }
  }

  if (spacesLoading) {
    return (
      <>
        <AgentSpaceHeader
          onSignOut={handleSignOut}
          onCreateSpaceClick={() => setCreateOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          onInboxClick={() => setInboxOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      </>
    )
  }

  if (spacesError) {
    return (
      <>
        <AgentSpaceHeader
          onSignOut={handleSignOut}
          onCreateSpaceClick={() => setCreateOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          onInboxClick={() => setInboxOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-red-500">{spacesError}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AgentSpaceHeader
        onSignOut={handleSignOut}
        onCreateSpaceClick={() => setCreateOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        onInboxClick={() => setInboxOpen(true)}
      />

      <main className="flex-1 px-6 py-8">
        {activeSpace ? (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">

            {/* Space header row */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{activeSpace.name}</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeSpace.role === 'admin' ? 'Admin' : 'Member'}
                  </p>
                </div>
                <button
                  onClick={() => setCreateAgentOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms] flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create Training Agent
                </button>
              </div>
            </motion.div>

            {/* Agents list */}
            <motion.div variants={fadeInUp} className="mt-8">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-sm font-semibold text-gray-900">Training Agents</h2>
                {!agentsLoading && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {agents.length}
                  </span>
                )}
              </div>

              {agentsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <EmptyAgentsState onCreate={() => setCreateAgentOpen(true)} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      token={session?.access_token ?? ''}
                      onConfigure={() => setConfiguringAgent(agent)}
                      onStatusChange={updated =>
                        setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>

          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-500">Setting up your agentspace…</p>
            </div>
          </motion.div>
        )}
      </main>

      <CreateAgentSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => setCreateOpen(false)}
      />

      <AgentSpaceSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <InboxPanel
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
      />

      {activeSpace && (
        <CreateAgentWizard
          open={createAgentOpen}
          agentspaceId={activeSpace.id}
          onClose={handleWizardClose}
        />
      )}

      {/* Agent configure panel — full-screen overlay */}
      <AnimatePresence>
        {configuringAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="h-14 border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0">
              <div className="w-24 flex-shrink-0">
                <button
                  onClick={() => setConfiguringAgent(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 duration-[120ms]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
              <div className="flex-1 flex justify-center min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate">{configuringAgent.agent_name}</span>
              </div>
              <div className="w-24 flex-shrink-0 flex justify-end">
                <button
                  onClick={() => setConfiguringAgent(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AgentConfigureView
                spec={configuringAgent.agent_prompt}
                agentId={configuringAgent.id}
                agentLanguage={configuringAgent.agent_language}
                agentVoice={configuringAgent.agent_voice}
                onSaved={spec => {
                  setConfiguringAgent(prev => prev ? { ...prev, agent_prompt: spec } : null)
                  setAgents(prev =>
                    prev.map(a => a.id === configuringAgent.id ? { ...a, agent_prompt: spec } : a),
                  )
                }}
                onAgentUpdated={updates => {
                  setConfiguringAgent(prev => prev ? { ...prev, ...updates } : null)
                  setAgents(prev =>
                    prev.map(a => a.id === configuringAgent!.id ? { ...a, ...updates } : a),
                  )
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Agent card ─────────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent
  token: string
  onConfigure: () => void
  onStatusChange: (updated: Agent) => void
}

function AgentCard({ agent, token, onConfigure, onStatusChange }: AgentCardProps) {
  const personaName = extractPersonaName(agent)
  const isLive = agent.agent_status === 'live'

  const [toggling, setToggling] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)

  async function handleToggleStatus() {
    if (toggling) return
    const next: 'live' | 'idle' = isLive ? 'idle' : 'live'
    setToggling(true)
    try {
      const updated = await toggleAgentStatus(token, agent.id, next)
      onStatusChange(updated)
    } catch {
      // silently revert — UI stays as-is
    } finally {
      setToggling(false)
    }
  }

  function copyLink(url: string, which: 'live' | 'test') {
    navigator.clipboard.writeText(url).then(() => {
      if (which === 'live') {
        setCopiedLive(true)
        setTimeout(() => setCopiedLive(false), 2000)
      } else {
        setCopiedTest(true)
        setTimeout(() => setCopiedTest(false), 2000)
      }
    })
  }

  const liveUrl = `${window.location.origin}/agent/${agent.id}`
  const testUrl = `${window.location.origin}/agent/${agent.id}?mode=test`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-300 hover:shadow-sm duration-[120ms]"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-[1.125rem] h-[1.125rem] text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate flex-1">{agent.agent_name}</p>
            {/* Status badge */}
            <span
              className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {isLive ? 'Live' : 'Idle'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
              {agent.agent_language}
            </span>
            {personaName && (
              <span className="text-xs text-gray-500">{personaName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Voice + meta */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-gray-400 font-mono truncate" title={agent.agent_voice}>
          {agent.agent_voice}
        </p>
        <p className="text-xs text-gray-400">
          <span className="text-gray-500">{agent.created_by_name}</span>
          <span className="mx-1.5">·</span>
          {formatRelativeDate(agent.created_at)}
        </p>
      </div>

      {/* Configure button — always visible */}
      <div className="pt-1 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={onConfigure}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 duration-[120ms]"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Configure
        </button>

        {/* Live toggle */}
        <div className="flex items-center justify-between px-0.5 py-0.5">
          <span className="text-xs text-gray-500">Go Live</span>
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            title={isLive ? 'Pause agent' : 'Deploy agent live'}
            className="flex items-center gap-1 disabled:opacity-50 duration-[120ms]"
          >
            {toggling ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : isLive ? (
              <ToggleRight className="w-6 h-6 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-gray-300" />
            )}
          </button>
        </div>

        {/* Copy Live Link — all members */}
        <button
          onClick={() => copyLink(liveUrl, 'live')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 duration-[120ms]"
        >
          {copiedLive ? (
            <><Check className="w-3 h-3" /> Copied!</>
          ) : (
            <><Link2 className="w-3 h-3" /> Copy Live Link</>
          )}
        </button>

        {/* Copy Test Link — all members */}
        <button
          onClick={() => copyLink(testUrl, 'test')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 duration-[120ms]"
        >
          {copiedTest ? (
            <><Check className="w-3 h-3" /> Copied!</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy Test Link</>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyAgentsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Bot className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">No training agents yet</p>
      <p className="text-xs text-gray-400 mb-5 max-w-xs">
        Create your first voice training agent using the planner — it only takes a few minutes.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms]"
      >
        <Plus className="w-4 h-4" />
        Create Training Agent
      </button>
    </div>
  )
}

// ── Page root ──────────────────────────────────────────────────────────────────

export default function AgentSpace() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <AgentSpaceProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <AgentSpaceContent />
      </div>
    </AgentSpaceProvider>
  )
}
