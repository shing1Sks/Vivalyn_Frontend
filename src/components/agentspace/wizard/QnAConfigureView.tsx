import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Settings2, Trash2, User, X, Zap, ArrowLeftRight } from 'lucide-react'
import {
  updateAgent,
  updateAgentQuestionBank,
  type Agent,
  type QnAPromptSpec,
  type QnAQuestion,
  type QnAQuestionBank,
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
        <p onClick={() => setEditing(true)} className="flex-1 text-sm text-gray-800 cursor-text leading-relaxed truncate">{question.text}</p>
      )}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 duration-[120ms]">
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function QnAConfigureView({ agent }: Props) {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('questions')
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (agent.agent_first_speaker as 'agent' | 'user') ?? 'agent'
  )

  const spec = agent.agent_prompt as QnAPromptSpec

  // Question bank state
  const [bank, setBank] = useState<QnAQuestionBank>(spec.question_bank)
  const [savingBank, setSavingBank] = useState(false)
  const [savedBankOk, setSavedBankOk] = useState(false)

  // Profile state
  const [editedIdentity, setEditedIdentity] = useState(spec.identity_and_persona)
  const [editedBrief, setEditedBrief] = useState(spec.session_brief)
  const [editedRules, setEditedRules] = useState<Record<string, string>>({ ...spec.behavior_rules })
  const [editedGuardrails, setEditedGuardrails] = useState<string[]>([...spec.guardrails])
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfileOk, setSavedProfileOk] = useState(false)
  const [behaviorOpen, setBehaviorOpen] = useState(true)
  const [guardrailsOpen, setGuardrailsOpen] = useState(false)

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
      identity_and_persona: editedIdentity,
      session_brief: editedBrief,
      behavior_rules: editedRules,
      guardrails: editedGuardrails,
      question_bank: bank,
    }
    try {
      await updateAgent(session.access_token, agent.id, { agent_prompt: updatedSpec as unknown as Parameters<typeof updateAgent>[2]['agent_prompt'] })
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
          <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md duration-[120ms] ${
                  activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Language badge + settings */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
              {agent.agent_language}
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
          className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]">
          {isSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
            : isSaved ? <><CheckCircle2 className="w-3 h-3" /> Saved</>
            : 'Save Changes'}
        </button>
      </div>

      {/* Mobile language/voice row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-xs text-gray-500">
          {agent.agent_voice} · <span className="font-medium text-gray-700">{agent.agent_language.toUpperCase()}</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {(['agent', 'user'] as const).map(val => (
              <button key={val} onClick={() => handleFirstSpeakerChange(val)}
                className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                  firstSpeaker === val
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}>
                {val === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {val === 'agent' ? 'Agent' : 'Participant'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 duration-[120ms]"
          >
            <Settings2 className="w-3 h-3" /> Voice
          </button>
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
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">

        {/* ── Questions tab ──────────────────────────────────────────────── */}
        {activeTab === 'questions' && (
          <div className="px-5 py-5">
            <QuestionBankEditor bank={bank} onChange={setBank} />
          </div>
        )}

        {/* ── Profile tab ───────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="flex flex-col md:flex-row md:items-start">
            {/* LHS — string sections */}
            <div className="w-full md:w-[55%] flex flex-col gap-4 px-5 py-5 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Identity & Persona</span>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <textarea value={editedIdentity} onChange={e => setEditedIdentity(e.target.value)} rows={10}
                    className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Session Brief</span>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <textarea value={editedBrief} onChange={e => setEditedBrief(e.target.value)} rows={4}
                    className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] leading-relaxed" />
                </div>
              </div>
            </div>

            {/* RHS — behavior rules + guardrails */}
            <div className="flex-1 flex flex-col gap-3 px-5 py-5">
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


