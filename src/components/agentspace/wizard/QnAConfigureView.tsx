import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Save, Settings2, Trash2, User, X, Zap, ArrowLeftRight } from 'lucide-react'
import {
  updateAgent,
  updateAgentQuestionBank,
  type Agent,
  type QnAPromptSpec,
  type QnAQuestion,
  type QnAQuestionBank,
  type SessionContext,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import VoiceSettingsModal from './VoiceSettingsModal'

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  agent: Agent
}

type Tab = 'questions' | 'profile' | 'evaluation'

// ── Question bank editor ───────────────────────────────────────────────────────

interface QuestionBankEditorProps {
  bank: QnAQuestionBank
  onChange: (bank: QnAQuestionBank) => void
}

function QuestionBankEditor({ bank, onChange }: QuestionBankEditorProps) {
  function editFixed(id: string, text: string) {
    onChange({ ...bank, fixed: bank.fixed.map(q => q.id === id ? { ...q, text } : q) })
  }
  function deleteFixed(id: string) {
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id) })
  }
  function moveFixedToPool(id: string) {
    const q = bank.fixed.find(q => q.id === id)
    if (!q) return
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id), randomized_pool: [...bank.randomized_pool, q] })
  }
  function addFixed() {
    onChange({ ...bank, fixed: [...bank.fixed, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] })
  }

  function editRandomized(id: string, text: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, text } : q) })
  }
  function deleteRandomized(id: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id) })
  }
  function toggleCross(id: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, cross_question_enabled: !q.cross_question_enabled } : q) })
  }
  function movePoolToFixed(id: string) {
    const q = bank.randomized_pool.find(q => q.id === id)
    if (!q) return
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id), fixed: [...bank.fixed, { ...q, cross_question_enabled: false }] })
  }
  function addRandomized() {
    onChange({ ...bank, randomized_pool: [...bank.randomized_pool, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] })
  }

  const validCount = Math.min(bank.randomized_count, bank.randomized_pool.length)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        {/* Fixed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Fixed Questions</h4>
              <p className="text-xs text-gray-500 mt-0.5">Asked every session</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.fixed.length}</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            {bank.fixed.map(q => (
              <QuestionItem key={q.id} question={q} showCross={false}
                onEdit={t => editFixed(q.id, t)} onDelete={() => deleteFixed(q.id)}
                onMove={() => moveFixedToPool(q.id)} />
            ))}
            <button onClick={addFixed} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>

        {/* Randomized */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Randomized Pool</h4>
              <p className="text-xs text-gray-500 mt-0.5">Sampled each session</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.randomized_pool.length}</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            {bank.randomized_pool.map(q => (
              <QuestionItem key={q.id} question={q} showCross={true}
                onEdit={t => editRandomized(q.id, t)} onDelete={() => deleteRandomized(q.id)}
                onMove={() => movePoolToFixed(q.id)} onToggleCross={() => toggleCross(q.id)} />
            ))}
            <button onClick={addRandomized} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>
      </div>

      {/* Count selector */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <span className="text-sm text-gray-700 flex-1">Questions picked per session from the pool</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ ...bank, randomized_count: Math.max(1, bank.randomized_count - 1) })}
            disabled={bank.randomized_count <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold text-gray-900">{validCount}</span>
          <button
            onClick={() => onChange({ ...bank, randomized_count: Math.min(bank.randomized_pool.length, bank.randomized_count + 1) })}
            disabled={bank.randomized_count >= bank.randomized_pool.length}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuestionItemProps {
  question: QnAQuestion
  showCross: boolean
  onEdit: (text: string) => void
  onDelete: () => void
  onMove: () => void
  onToggleCross?: () => void
}

function QuestionItem({ question, showCross, onEdit, onDelete, onMove, onToggleCross }: QuestionItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(question.text)

  function commitEdit() {
    const t = draft.trim()
    if (t && t !== question.text) onEdit(t)
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-2 group bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-300 duration-[120ms]">
      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') { setDraft(question.text); setEditing(false) } }}
          rows={1} className="flex-1 text-sm text-gray-900 resize-none border-none outline-none bg-transparent" />
      ) : (
        <p onClick={() => setEditing(true)} className="flex-1 text-sm text-gray-800 cursor-text leading-relaxed">{question.text}</p>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showCross && onToggleCross && (
          <button onClick={onToggleCross} title={question.cross_question_enabled ? 'Disable cross-question' : 'Enable cross-question'}
            className={`p-1 rounded duration-[120ms] ${question.cross_question_enabled ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500'}`}>
            <Zap className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onMove} className="p-1 rounded text-gray-400 hover:text-gray-700 duration-[120ms]"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 duration-[120ms]"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// ── Session context section (shared UI) ────────────────────────────────────────

const COMM_STYLES_QNA = ['Conversational', 'Formal', 'Coaching', 'Strict'] as const

interface QnASessionContextSectionProps {
  value: SessionContext
  onChange: (v: SessionContext) => void
}

function QnASessionContextSection({ value, onChange }: QnASessionContextSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Session Context</span>
      </div>
      <div className="px-5 pb-5 pt-1 space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Agent role</span>
                <textarea
                  value={value.agent_role}
                  onChange={e => onChange({ ...value, agent_role: e.target.value })}
                  rows={2}
                  placeholder="The agent's role in this session"
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Participant role</span>
                <textarea
                  value={value.participant_role}
                  onChange={e => onChange({ ...value, participant_role: e.target.value })}
                  rows={2}
                  placeholder="Who the participant is in this session"
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Session objective</span>
                <textarea
                  value={value.session_objective}
                  onChange={e => onChange({ ...value, session_objective: e.target.value })}
                  rows={2}
                  placeholder="What this session is for"
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1 shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Duration (min)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={value.session_duration_minutes || ''}
                    onChange={e => onChange({ ...value, session_duration_minutes: parseInt(e.target.value, 10) || 0 })}
                    placeholder="15"
                    className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Style</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMM_STYLES_QNA.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onChange({ ...value, communication_style: s })}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all duration-[120ms] ${
                          value.communication_style === s
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Session brief</span>
                <textarea
                  value={value.session_brief}
                  onChange={e => onChange({ ...value, session_brief: e.target.value })}
                  rows={2}
                  placeholder="One sentence: what happens in this session and for how long"
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
                />
              </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function QnAConfigureView({ agent }: Props) {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('questions')
  const [editedAgentName, setEditedAgentName] = useState(agent.agent_name)
  const [editedDisplayLabel, setEditedDisplayLabel] = useState(agent.agent_display_label ?? '')
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (agent.agent_first_speaker as 'agent' | 'user') ?? 'agent'
  )
  const [tabMenuOpen, setTabMenuOpen] = useState(false)
  const tabMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target as Node)) {
        setTabMenuOpen(false)
      }
    }
    if (tabMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tabMenuOpen])

  const spec = agent.agent_prompt as QnAPromptSpec

  // Session context state
  const [editedContext, setEditedContext] = useState<SessionContext>(() => {
    const ctx = spec.session_context ?? {
      agent_role: '',
      participant_role: '',
      session_objective: '',
      session_duration_minutes: 0,
      communication_style: '',
      session_brief: '',
    }
    return {
      ...ctx,
      session_brief: ctx.session_brief || (spec as unknown as Record<string, string>).session_brief || '',
    }
  })

  // Question bank state
  const [bank, setBank] = useState<QnAQuestionBank>(spec.question_bank)
  const [savingBank, setSavingBank] = useState(false)
  const [savedBankOk, setSavedBankOk] = useState(false)

  // Profile state
  const [editedIdentity, setEditedIdentity] = useState(spec.identity_and_persona)
const [editedRules, setEditedRules] = useState<Record<string, string>>({ ...spec.behavior_rules })
  const [editedGuardrails, setEditedGuardrails] = useState<string[]>([...spec.guardrails])
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfileOk, setSavedProfileOk] = useState(false)
  const [behaviorOpen, setBehaviorOpen] = useState(true)
  const [guardrailsOpen, setGuardrailsOpen] = useState(false)
  const [identityOpen, setIdentityOpen] = useState(false)

  // Evaluation state
  const [curatorPrompt, setCuratorPrompt] = useState(agent.transcript_evaluation_metrics?.report_curator_prompt ?? '')
  const [savingEval, setSavingEval] = useState(false)
  const [savedEvalOk, setSavedEvalOk] = useState(false)
  const MAX_METRICS = 4

  // 4 editable metric slots
  const [slotDrafts, setSlotDrafts] = useState<string[]>(() => {
    const m = agent.transcript_evaluation_metrics?.metrics ?? []
    const slots = m.slice(0, MAX_METRICS)
    while (slots.length < MAX_METRICS) slots.push('')
    return slots
  })

  const originalMetrics = useMemo(() => new Set(agent.transcript_evaluation_metrics?.metrics ?? []), [])
  const metricsList = slotDrafts.filter(Boolean)

  function updateSlot(idx: number, value: string) {
    setSlotDrafts(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  function clearSlot(idx: number) {
    setSlotDrafts(prev => {
      const next = [...prev]
      next[idx] = ''
      return next
    })
  }

  // ── Question bank save ───────────────────────────────────────────────────────

  async function handleSaveBank() {
    if (!session) return
    setSavingBank(true)
    setSavedBankOk(false)
    try {
      await updateAgentQuestionBank(session.access_token, agent.id, bank)
      setSavedBankOk(true)
      setTimeout(() => setSavedBankOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingBank(false)
    }
  }

  // ── Profile save ─────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!session) return
    setSavingProfile(true)
    setSavedProfileOk(false)
    const updatedSpec: QnAPromptSpec = {
      ...spec,
      session_context: (editedContext.agent_role || editedContext.participant_role || editedContext.session_objective)
        ? editedContext
        : undefined,
      identity_and_persona: editedIdentity,
      behavior_rules: editedRules,
      guardrails: editedGuardrails,
      question_bank: bank,
    }
    try {
      const updates: Parameters<typeof updateAgent>[2] = { agent_prompt: updatedSpec as unknown as Parameters<typeof updateAgent>[2]['agent_prompt'] }
      if (editedAgentName && editedAgentName !== agent.agent_name) updates.agent_name = editedAgentName
      if (editedDisplayLabel !== (agent.agent_display_label ?? '')) updates.agent_display_label = editedDisplayLabel || undefined
      await updateAgent(session.access_token, agent.id, updates)
      setSavedProfileOk(true)
      setTimeout(() => setSavedProfileOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveEval() {
    if (!session) return
    setSavingEval(true)
    setSavedEvalOk(false)
    try {
      const metrics = slotDrafts.filter(Boolean)
      await updateAgent(session.access_token, agent.id, {
        transcript_evaluation_metrics: { report_curator_prompt: curatorPrompt, metrics },
      })
      setSavedEvalOk(true)
      setTimeout(() => setSavedEvalOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingEval(false)
    }
  }

  // ── Tab nav ───────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'questions', label: 'Questions' },
    { key: 'evaluation', label: 'Evaluation' },
  ]

  const isSaving = activeTab === 'questions' ? savingBank : activeTab === 'profile' ? savingProfile : savingEval
  const isSaved = activeTab === 'questions' ? savedBankOk : activeTab === 'profile' ? savedProfileOk : savedEvalOk

  function handleVoiceUpdated(lang: string, voice: string) {
    agent.agent_language = lang
    agent.agent_voice = voice
  }

  async function handleFirstSpeakerChange(val: 'agent' | 'user') {
    if (val === firstSpeaker || !session) return
    setFirstSpeaker(val)
    try {
      await updateAgent(session.access_token, agent.id, { agent_first_speaker: val })
      agent.agent_first_speaker = val
    } catch { /* silent */ }
  }

  async function handleHeaderSave() {
    if (activeTab === 'questions') await handleSaveBank()
    else if (activeTab === 'profile') await handleSaveProfile()
    else await handleSaveEval()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* Header: title + pill tabs + lang badge + gear + save */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 md:gap-4">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Configure Agent</h2>
          {/* Desktop tabs */}
          <div className="hidden md:inline-flex bg-gray-100 rounded-lg p-1 gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md duration-[120ms] ${
                  activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Mobile tab dropdown */}
          <div className="md:hidden relative" ref={tabMenuRef}>
            <button
              onClick={() => setTabMenuOpen(v => !v)}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 duration-[120ms]"
            >
              {tabs.find(t => t.key === activeTab)?.label}
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${tabMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {tabMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setActiveTab(t.key); setTabMenuOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium duration-[120ms] ${
                      activeTab === t.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language + voice badges + settings */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
              {agent.agent_name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
              {agent.agent_language}
            </span>
            <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {agent.agent_voice}
            </span>
            <button
              onClick={() => setVoiceModalOpen(true)}
              title="Change voice & language"
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* First speaker toggle */}
          <div className="hidden md:flex items-center gap-2">
            {(['agent', 'user'] as const).map(val => (
              <button key={val} onClick={() => handleFirstSpeakerChange(val)}
                className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all duration-150 ${
                  firstSpeaker === val
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}>
                {val === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                {val === 'agent' ? 'Agent starts' : 'Participant starts'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleHeaderSave} disabled={isSaving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]"
          title={isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save Changes'}>
          <span className="hidden md:inline">
            {isSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              : isSaved ? <><CheckCircle2 className="w-3 h-3" /> Saved</>
              : 'Save Changes'}
          </span>
          <span className="md:hidden">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" />
              : isSaved ? <CheckCircle2 className="w-4 h-4" />
              : <Save className="w-4 h-4" />}
          </span>
        </button>
      </div>

      {/* Mobile language/voice row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {agent.agent_voice} · <span className="font-medium text-gray-700">{agent.agent_language.toUpperCase()}</span>
          </span>
          <button
            onClick={() => setVoiceModalOpen(true)}
            title="Change voice & language"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Starts</span>
          {(['agent', 'user'] as const).map(val => (
            <button key={val} onClick={() => handleFirstSpeakerChange(val)}
              title={val === 'agent' ? 'Agent starts' : 'Participant starts'}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 ${
                firstSpeaker === val
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
              }`}>
              {val === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      <VoiceSettingsModal
        agentId={agent.id}
        agentLanguage={agent.agent_language}
        agentVoice={agent.agent_voice}
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onUpdated={handleVoiceUpdated}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6">

        {/* ── Questions tab ──────────────────────────────────────────────── */}
        {activeTab === 'questions' && (
          <div className="px-0 md:px-5 py-4 md:py-5">
            <QuestionBankEditor bank={bank} onChange={setBank} />
          </div>
        )}

        {/* ── Profile tab ───────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="flex flex-col md:flex-row md:items-start">
            {/* LHS — string sections */}
            <div className="w-full md:w-[55%] flex flex-col gap-4 px-3 md:px-5 py-4 md:py-5 border-b md:border-b-0 md:border-r border-gray-100">
              {/* Agent name + display label */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Names</span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Persona name</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Used in prompt — rename carefully</span>
                    </div>
                    <input
                      type="text"
                      value={editedAgentName}
                      onChange={e => setEditedAgentName(e.target.value)}
                      placeholder="e.g. Prof. Chen"
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Display label</span>
                      <span className="text-[10px] text-gray-400">Shown in records — freely editable</span>
                    </div>
                    <input
                      type="text"
                      value={editedDisplayLabel}
                      onChange={e => setEditedDisplayLabel(e.target.value)}
                      placeholder="e.g. Biology Knowledge Assessment"
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                    />
                  </div>
                </div>
              </div>
              <QnASessionContextSection value={editedContext} onChange={setEditedContext} />
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <button
                  onClick={() => setIdentityOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 duration-[120ms]"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Identity & Persona</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 duration-[120ms] ${identityOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {identityOpen && (
                    <motion.div
                      key="identity"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                        <textarea value={editedIdentity} onChange={e => setEditedIdentity(e.target.value)} rows={3}
                          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RHS — behavior rules + guardrails */}
            <div className="flex-1 flex flex-col gap-3 px-3 md:px-5 py-4 md:py-5">
              {/* Behavior Rules */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setBehaviorOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 duration-[120ms] group"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Behavior Rules</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 duration-[120ms] ${behaviorOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {behaviorOpen && (
                    <motion.div
                      key="behavior"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-100">
                        {['opening', 'transition', 'closing'].map(key => (
                          <div key={key}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{key}</p>
                            <textarea
                              value={editedRules[key] ?? ''}
                              onChange={e => setEditedRules(prev => ({ ...prev, [key]: e.target.value }))}
                              rows={3}
                              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Guardrails */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setGuardrailsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 duration-[120ms] group"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guardrails</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 duration-[120ms] ${guardrailsOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {guardrailsOpen && (
                    <motion.div
                      key="guardrails"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-gray-100">
                        {editedGuardrails.map((g, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="text-xs text-gray-400 font-mono mt-2.5 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                            <textarea value={g} onChange={e => {
                              const next = [...editedGuardrails]; next[i] = e.target.value; setEditedGuardrails(next)
                            }} rows={2}
                              className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed" />
                            <button onClick={() => setEditedGuardrails(prev => prev.filter((_, j) => j !== i))}
                              className="text-gray-400 hover:text-red-500 duration-[120ms] flex-shrink-0 mt-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setEditedGuardrails(prev => [...prev, ''])}
                          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1">
                          <Plus className="w-4 h-4" /> Add guardrail
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* ── Evaluation tab ─────────────────────────────────────────────── */}
        {activeTab === 'evaluation' && (
          <div className="flex flex-col md:flex-row gap-5">
            {/* Eval Prompt — main content */}
            <div className="flex-1 order-2 md:order-1">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Eval Prompt</span>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    value={curatorPrompt}
                    onChange={e => setCuratorPrompt(e.target.value)}
                    rows={10}
                    placeholder="Scoring rubric and instructions for evaluating sessions…"
                    className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Metrics — sidebar */}
            <div className="w-full md:w-[280px] flex-shrink-0 order-1 md:order-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Metrics</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${metricsList.length >= MAX_METRICS ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {metricsList.length}/{MAX_METRICS}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {slotDrafts.map((draft, i) => {
                      const isOriginal = draft && originalMetrics.has(draft)
                      return (
                        <div key={i} className="relative">
                          <input
                            type="text"
                            value={draft}
                            onChange={e => updateSlot(i, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            disabled={!draft && metricsList.length >= MAX_METRICS}
                            placeholder={!draft && metricsList.length < MAX_METRICS ? '+' : ''}
                            className={`w-full text-sm rounded-lg px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 duration-[120ms] ${
                              draft
                                ? isOriginal
                                  ? 'bg-gray-50 border border-gray-200 text-gray-600 font-medium placeholder:text-gray-300'
                                  : 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium placeholder:text-indigo-300'
                                : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          />
                          {draft && (
                            <button
                              onClick={() => clearSlot(i)}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 duration-[120ms] ${
                                isOriginal ? 'text-gray-400 hover:text-gray-600' : 'text-indigo-400 hover:text-indigo-600'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


