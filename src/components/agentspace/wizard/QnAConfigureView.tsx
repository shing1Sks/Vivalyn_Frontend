import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Bot, Brain, CheckCircle2, ChevronDown, ChevronUp,
  GripVertical, Loader2, Plus, RefreshCw, Save, Settings2, Sparkles, Trash2, User, X,
  Zap, ArrowLeftRight,
} from 'lucide-react'
import {
  recompileEval,
  recompileSession,
  updateAgent,
  updateAgentQuestionBank,
  type Agent,
  type EvalConfig,
  type EvalMetric,
  type EvaluationMetrics,
  type QnAPromptSpec,
  type QnAQuestion,
  type QnAQuestionBank,
  type QnASessionDesignRequest,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import VoiceSettingsModal from './VoiceSettingsModal'

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  agent: Agent
}

type Tab = 'questions' | 'profile' | 'evaluation'

const COMM_STYLES = ['Conversational', 'Formal', 'Coaching', 'Strict'] as const
const DURATION_PILLS = [10, 15, 30] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function reorderBank<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
  const next = [...arr]
  const fi = next.findIndex(q => q.id === fromId)
  const ti = next.findIndex(q => q.id === toId)
  if (fi === -1 || ti === -1) return arr
  const [item] = next.splice(fi, 1)
  next.splice(ti, 0, item)
  return next
}

// ── Question bank editor ───────────────────────────────────────────────────────

interface QuestionBankEditorProps {
  bank: QnAQuestionBank
  onChange: (bank: QnAQuestionBank) => void
}

function QuestionBankEditor({ bank, onChange }: QuestionBankEditorProps) {
  const dragIdRef = useRef<string | null>(null)
  const dragSectionRef = useRef<'fixed' | 'randomized' | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [sectionDropTarget, setSectionDropTarget] = useState<'fixed' | 'randomized' | null>(null)

  function handleDragStart(id: string, section: 'fixed' | 'randomized') {
    dragIdRef.current = id
    dragSectionRef.current = section
  }
  function handleDragOverItem(e: React.DragEvent, id: string, section: 'fixed' | 'randomized') {
    e.preventDefault(); e.stopPropagation()
    if (dragSectionRef.current === section) { if (dragIdRef.current !== id) setDropTargetId(id); setSectionDropTarget(null) }
    else { setSectionDropTarget(section); setDropTargetId(null) }
  }
  function handleDragOverSection(e: React.DragEvent, section: 'fixed' | 'randomized') {
    e.preventDefault()
    if (dragSectionRef.current !== section) { setSectionDropTarget(section); setDropTargetId(null) }
  }
  function clearDrag() { dragIdRef.current = null; dragSectionRef.current = null; setDropTargetId(null); setSectionDropTarget(null) }

  function handleDropOnItem(targetId: string, targetSection: 'fixed' | 'randomized') {
    const fromId = dragIdRef.current; const fromSection = dragSectionRef.current; clearDrag()
    if (!fromId || !fromSection) return
    if (fromSection === targetSection && fromId !== targetId) {
      if (fromSection === 'fixed') onChange({ ...bank, fixed: reorderBank(bank.fixed, fromId, targetId) })
      else onChange({ ...bank, randomized_pool: reorderBank(bank.randomized_pool, fromId, targetId) })
    } else if (fromSection !== targetSection) {
      crossMove(fromId, fromSection, bank, onChange)
    }
  }
  function handleDropOnSection(e: React.DragEvent, targetSection: 'fixed' | 'randomized') {
    e.preventDefault(); const fromId = dragIdRef.current; const fromSection = dragSectionRef.current; clearDrag()
    if (!fromId || !fromSection || fromSection === targetSection) return
    crossMove(fromId, fromSection, bank, onChange)
  }

  function editFixed(id: string, text: string) { onChange({ ...bank, fixed: bank.fixed.map(q => q.id === id ? { ...q, text } : q) }) }
  function deleteFixed(id: string) { onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id) }) }
  function moveFixedToPool(id: string) {
    const q = bank.fixed.find(q => q.id === id); if (!q) return
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id), randomized_pool: [...bank.randomized_pool, q] })
  }
  function addFixed() { onChange({ ...bank, fixed: [...bank.fixed, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] }) }
  function editRandomized(id: string, text: string) { onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, text } : q) }) }
  function deleteRandomized(id: string) { onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id) }) }
  function toggleCross(id: string) { onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, cross_question_enabled: !q.cross_question_enabled } : q) }) }
  function movePoolToFixed(id: string) {
    const q = bank.randomized_pool.find(q => q.id === id); if (!q) return
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id), fixed: [...bank.fixed, { ...q, cross_question_enabled: false }] })
  }
  function addRandomized() { onChange({ ...bank, randomized_pool: [...bank.randomized_pool, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] }) }

  const validCount = Math.min(bank.randomized_count, bank.randomized_pool.length)

  const itemVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.13, ease: 'easeOut' as const } },
    exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.1 } },
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <div
          onDragOver={e => handleDragOverSection(e, 'fixed')}
          onDrop={e => handleDropOnSection(e, 'fixed')}
          className={`rounded-xl transition-all duration-[120ms] ${sectionDropTarget === 'fixed' ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Fixed Questions</h4>
              <p className="text-xs text-gray-500 mt-0.5">Asked every session — drag to reorder</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.fixed.length}</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {bank.fixed.map((q, i) => (
                <motion.div key={q.id} layout variants={itemVariants} initial="initial" animate="animate" exit="exit"
                  draggable onDragStart={() => handleDragStart(q.id, 'fixed')}
                  onDragOver={e => handleDragOverItem(e, q.id, 'fixed')}
                  onDrop={() => handleDropOnItem(q.id, 'fixed')}
                  onDragEnd={clearDrag}
                  className="flex items-center gap-1"
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <QuestionItem question={q} index={i + 1} showCross={false} isDropTarget={dropTargetId === q.id}
                      onEdit={t => editFixed(q.id, t)} onDelete={() => deleteFixed(q.id)} onMove={() => moveFixedToPool(q.id)} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addFixed} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>

        <div
          onDragOver={e => handleDragOverSection(e, 'randomized')}
          onDrop={e => handleDropOnSection(e, 'randomized')}
          className={`rounded-xl transition-all duration-[120ms] ${sectionDropTarget === 'randomized' ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Randomized Pool</h4>
              <p className="text-xs text-gray-500 mt-0.5">Sampled each session — drag to reorder</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.randomized_pool.length}</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {bank.randomized_pool.map((q, i) => (
                <motion.div key={q.id} layout variants={itemVariants} initial="initial" animate="animate" exit="exit"
                  draggable onDragStart={() => handleDragStart(q.id, 'randomized')}
                  onDragOver={e => handleDragOverItem(e, q.id, 'randomized')}
                  onDrop={() => handleDropOnItem(q.id, 'randomized')}
                  onDragEnd={clearDrag}
                  className="flex items-center gap-1"
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <QuestionItem question={q} index={i + 1} showCross={true} isDropTarget={dropTargetId === q.id}
                      onEdit={t => editRandomized(q.id, t)} onDelete={() => deleteRandomized(q.id)}
                      onMove={() => movePoolToFixed(q.id)} onToggleCross={() => toggleCross(q.id)} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addRandomized} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <span className="text-sm text-gray-700 flex-1">Questions picked per session from the pool</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange({ ...bank, randomized_count: Math.max(1, bank.randomized_count - 1) })}
            disabled={bank.randomized_count <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold text-gray-900">{validCount}</span>
          <button onClick={() => onChange({ ...bank, randomized_count: Math.min(bank.randomized_pool.length, bank.randomized_count + 1) })}
            disabled={bank.randomized_count >= bank.randomized_pool.length}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function crossMove(fromId: string, fromSection: 'fixed' | 'randomized', bank: QnAQuestionBank, onChange: (b: QnAQuestionBank) => void) {
  if (fromSection === 'fixed') {
    const item = bank.fixed.find(q => q.id === fromId); if (!item) return
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== fromId), randomized_pool: [...bank.randomized_pool, item] })
  } else {
    const item = bank.randomized_pool.find(q => q.id === fromId); if (!item) return
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== fromId), fixed: [...bank.fixed, { ...item, cross_question_enabled: false }] })
  }
}

interface QuestionItemProps {
  question: QnAQuestion
  index: number
  showCross: boolean
  isDropTarget: boolean
  onEdit: (text: string) => void
  onDelete: () => void
  onMove: () => void
  onToggleCross?: () => void
}

function QuestionItem({ question, index, showCross, isDropTarget, onEdit, onDelete, onMove, onToggleCross }: QuestionItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(question.text)

  function commitEdit() {
    const t = draft.trim()
    if (t && t !== question.text) onEdit(t)
    setEditing(false)
  }

  return (
    <div className={`flex items-start gap-2 group bg-white border rounded-lg px-3 py-2 duration-[120ms] ${
      isDropTarget ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <span className="w-5 h-5 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 mt-0.5 select-none">
        {index}
      </span>
      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') { setDraft(question.text); setEditing(false) } }}
          rows={1} className="flex-1 text-sm text-gray-900 resize-none border-none outline-none bg-transparent" />
      ) : (
        <p onClick={() => setEditing(true)} className="flex-1 text-sm text-gray-800 cursor-text leading-relaxed">{question.text}</p>
      )}
      <div className="flex items-center gap-1 shrink-0">
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
    (agent.agent_first_speaker as 'agent' | 'user') ?? 'agent',
  )
  const [tabMenuOpen, setTabMenuOpen] = useState(false)
  const tabMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target as Node)) setTabMenuOpen(false)
    }
    if (tabMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [tabMenuOpen])

  const spec = agent.agent_prompt as QnAPromptSpec

  // ── Questions tab state ────────────────────────────────────────────────────
  const [bank, setBank] = useState<QnAQuestionBank>(spec.question_bank ?? { fixed: [], randomized_pool: [], randomized_count: 1 })
  const [savingBank, setSavingBank] = useState(false)
  const [savedBankOk, setSavedBankOk] = useState(false)

  // ── Profile tab state ──────────────────────────────────────────────────────
  const [editedAgentName, setEditedAgentName] = useState(agent.agent_name)
  const [editedDisplayLabel, setEditedDisplayLabel] = useState(agent.agent_display_label ?? '')
  const storedSessionConfig = agent.session_design_config as QnASessionDesignRequest | null | undefined
  const [sessionConfig, setSessionConfig] = useState<Partial<QnASessionDesignRequest>>(() => {
    if (storedSessionConfig) return { ...storedSessionConfig }
    const ctx = spec.session_context
    if (ctx) {
      return {
        agent_name: agent.agent_name,
        session_objective: ctx.session_objective,
        agent_role: ctx.agent_role,
        participant_role: ctx.participant_role,
        communication_style: ctx.communication_style,
        session_duration_minutes: ctx.session_duration_minutes,
        feedback_mode: 'silent' as const,
      }
    }
    return {}
  })
  const [customDuration, setCustomDuration] = useState(() => {
    const d = storedSessionConfig?.session_duration_minutes ?? spec.session_context?.session_duration_minutes
    if (!d) return ''
    return DURATION_PILLS.includes(d as typeof DURATION_PILLS[number]) ? '' : String(d)
  })
  const [isCustomDuration, setIsCustomDuration] = useState(() => {
    const d = storedSessionConfig?.session_duration_minutes ?? spec.session_context?.session_duration_minutes
    return !!d && !DURATION_PILLS.includes(d as typeof DURATION_PILLS[number])
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfileOk, setSavedProfileOk] = useState(false)
  const [sessionStale, setSessionStale] = useState(false)
  const [sessionStaleDismissed, setSessionStaleDismissed] = useState(false)
  const [recompileSessionLoading, setRecompileSessionLoading] = useState(false)

  // ── Evaluation tab state ───────────────────────────────────────────────────
  const storedEvalConfig = agent.eval_config as EvalConfig | null | undefined
  const [currentEvalConfig, setCurrentEvalConfig] = useState<EvalConfig>(storedEvalConfig ?? { mode: 'auto' })
  const isLegacyMetrics = (m: EvaluationMetrics['metrics']): boolean =>
    m.length > 0 && typeof (m[0] as unknown as string) === 'string'
  const [editedMetrics, setEditedMetrics] = useState<EvalMetric[]>(() => {
    const m = agent.transcript_evaluation_metrics?.metrics ?? []
    if (isLegacyMetrics(m)) return []
    const slots = [...(m as EvalMetric[]).slice(0, 4)]
    while (slots.length < 4) slots.push({ name: '', definition: '', strong: '', weak: '' })
    return slots
  })
  const [editedCuratorPrompt, setEditedCuratorPrompt] = useState(agent.transcript_evaluation_metrics?.report_curator_prompt ?? '')
  const [savingEval, setSavingEval] = useState(false)
  const [savedEvalOk, setSavedEvalOk] = useState(false)
  const [evalStale, setEvalStale] = useState(false)
  const [evalStaleDismissed, setEvalStaleDismissed] = useState(false)
  const [recompileEvalLoading, setRecompileEvalLoading] = useState(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildSessionDesignRequest(): QnASessionDesignRequest {
    const effectiveDuration = isCustomDuration
      ? parseInt(customDuration, 10) || 0
      : (sessionConfig.session_duration_minutes ?? 0)
    return {
      agent_name: editedAgentName.trim(),
      session_objective: sessionConfig.session_objective?.trim() ?? '',
      agent_role: sessionConfig.agent_role?.trim() ?? '',
      participant_role: sessionConfig.participant_role?.trim() ?? '',
      communication_style: sessionConfig.communication_style ?? '',
      session_duration_minutes: effectiveDuration,
      additional_context: sessionConfig.additional_context?.trim() || undefined,
      feedback_mode: sessionConfig.feedback_mode ?? 'silent',
      resource_text: sessionConfig.resource_text,
      resource_images: sessionConfig.resource_images,
    }
  }

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

  async function handleSaveProfile() {
    if (!session) return
    setSavingProfile(true)
    setSavedProfileOk(false)
    try {
      const config = buildSessionDesignRequest()
      const updates: Parameters<typeof updateAgent>[2] = { session_design_config: config }
      if (editedAgentName.trim() !== agent.agent_name) updates.agent_name = editedAgentName.trim()
      if (editedDisplayLabel !== (agent.agent_display_label ?? '')) updates.agent_display_label = editedDisplayLabel.trim() || undefined
      await updateAgent(session.access_token, agent.id, updates)
      setSavedProfileOk(true)
      setSessionStale(true)
      setSessionStaleDismissed(false)
      setTimeout(() => setSavedProfileOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingProfile(false)
    }
  }

  async function handleRecompileSession() {
    if (!session) return
    setRecompileSessionLoading(true)
    try {
      const config = buildSessionDesignRequest()
      await recompileSession(session.access_token, agent.id, config)
      setSessionStale(false)
      setSessionStaleDismissed(false)
    } catch { /* silent */ } finally {
      setRecompileSessionLoading(false)
    }
  }

  async function handleSaveEvalConfig() {
    if (!session) return
    setSavingEval(true)
    setSavedEvalOk(false)
    try {
      await updateAgent(session.access_token, agent.id, { eval_config: currentEvalConfig })
      setSavedEvalOk(true)
      setEvalStale(true)
      setEvalStaleDismissed(false)
      setTimeout(() => setSavedEvalOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingEval(false)
    }
  }

  async function handleRecompileEval() {
    if (!session) return
    setRecompileEvalLoading(true)
    try {
      const sessionBrief = spec.session_context?.session_brief ?? ''
      const updatedAgent = await recompileEval(session.access_token, agent.id, {
        session_brief: sessionBrief,
        eval_config: currentEvalConfig,
      })
      const newMetrics = updatedAgent.transcript_evaluation_metrics
      if (newMetrics && !isLegacyMetrics(newMetrics.metrics)) {
        const slots = [...(newMetrics.metrics as EvalMetric[]).slice(0, 4)]
        while (slots.length < 4) slots.push({ name: '', definition: '', strong: '', weak: '' })
        setEditedMetrics(slots)
        setEditedCuratorPrompt(newMetrics.report_curator_prompt)
      }
      setEvalStale(false)
      setEvalStaleDismissed(false)
    } catch { /* silent */ } finally {
      setRecompileEvalLoading(false)
    }
  }

  async function handleSaveMetrics() {
    if (!session) return
    const metrics = editedMetrics.filter(m => m.name.trim())
    await updateAgent(session.access_token, agent.id, {
      transcript_evaluation_metrics: metrics.length > 0 || editedCuratorPrompt.trim()
        ? { metrics, report_curator_prompt: editedCuratorPrompt }
        : null,
    })
  }

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

  const isSaving = activeTab === 'questions' ? savingBank : activeTab === 'profile' ? savingProfile : savingEval
  const isSaved = activeTab === 'questions' ? savedBankOk : activeTab === 'profile' ? savedProfileOk : savedEvalOk

  async function handleHeaderSave() {
    if (activeTab === 'questions') await handleSaveBank()
    else if (activeTab === 'profile') await handleSaveProfile()
    else await handleSaveEvalConfig()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'questions', label: 'Questions' },
    { key: 'evaluation', label: 'Evaluation' },
  ]

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 md:gap-4">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Configure Agent</h2>

          {/* Mobile tab dropdown */}
          <div className="md:hidden relative" ref={tabMenuRef}>
            <button onClick={() => setTabMenuOpen(v => !v)}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 duration-[120ms]">
              {tabs.find(t => t.key === activeTab)?.label}
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${tabMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {tabMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => { setActiveTab(t.key); setTabMenuOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium duration-[120ms] ${
                      activeTab === t.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language / voice badges */}
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
            <button onClick={() => setVoiceModalOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]">
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
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]">
          <span className="hidden md:inline">
            {isSaving ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Saving…</>
              : isSaved ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Saved</>
              : 'Save config'}
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
          <button onClick={() => setVoiceModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Starts</span>
          {(['agent', 'user'] as const).map(val => (
            <button key={val} onClick={() => handleFirstSpeakerChange(val)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 ${
                firstSpeaker === val
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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

      {/* ── Two-panel layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar — desktop only */}
        <nav className="hidden md:flex flex-col w-44 shrink-0 border-r border-gray-100 bg-white py-6 px-3 gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-all duration-[120ms] ${
                activeTab === t.key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

      {/* Questions */}
      {activeTab === 'questions' && (
        <div className="px-6 md:px-8 py-6">
          <QuestionBankEditor bank={bank} onChange={setBank} />
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="px-6 md:px-8 py-6 space-y-5">

          {!storedSessionConfig && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
              This agent was created before config storage was added. Fill in the fields below and click
              <span className="font-semibold"> Regenerate Agent</span> to enable config-based editing.
            </div>
          )}

          <AnimatePresence>
            {sessionStale && !sessionStaleDismissed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    Config updated — regenerate to apply changes.
                  </div>
                  <button onClick={() => setSessionStaleDismissed(true)} className="text-amber-400 hover:text-amber-700 duration-[120ms]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Names */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Names</p>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Persona name</label>
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Used in prompt — rename carefully</span>
              </div>
              <input type="text" value={editedAgentName} onChange={e => setEditedAgentName(e.target.value)}
                placeholder="e.g. Prof. Chen"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Display label</label>
                <span className="text-[10px] text-gray-400">Freely editable</span>
              </div>
              <input type="text" value={editedDisplayLabel} onChange={e => setEditedDisplayLabel(e.target.value)}
                placeholder="e.g. Biology Knowledge Assessment"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]" />
            </div>
          </div>

          {/* Session config fields */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Session configuration</p>

            {/* Compact controls - 2 per row on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Feedback mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Feedback mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['silent', 'feedback'] as const).map(fm => (
                    <button key={fm} type="button"
                      onClick={() => setSessionConfig(prev => ({ ...prev, feedback_mode: fm }))}
                      className={`px-3 py-2.5 text-sm rounded-lg border text-left capitalize transition-all duration-[120ms] ${
                        sessionConfig.feedback_mode === fm
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      {fm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DURATION_PILLS.map(d => (
                    <button key={d} type="button"
                      onClick={() => { setSessionConfig(prev => ({ ...prev, session_duration_minutes: d })); setIsCustomDuration(false) }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                        !isCustomDuration && sessionConfig.session_duration_minutes === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      {d} min
                    </button>
                  ))}
                  <button type="button" onClick={() => setIsCustomDuration(true)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                      isCustomDuration ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    Custom
                  </button>
                  {isCustomDuration && (
                    <input type="number" min={1} max={120} value={customDuration}
                      onChange={e => setCustomDuration(e.target.value)} placeholder="20" autoFocus
                      className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  )}
                </div>
              </div>
            </div>

            {/* Textareas - 2 per row on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Session objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Session objective</label>
                <textarea value={sessionConfig.session_objective ?? ''}
                  onChange={e => setSessionConfig(prev => ({ ...prev, session_objective: e.target.value }))}
                  rows={2} placeholder="e.g. Test the participant's knowledge on…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>

              {/* Agent role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Agent role</label>
                <textarea value={sessionConfig.agent_role ?? ''}
                  onChange={e => setSessionConfig(prev => ({ ...prev, agent_role: e.target.value }))}
                  rows={2} placeholder="e.g. A knowledgeable interviewer…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>

              {/* Participant role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Participant role</label>
                <textarea value={sessionConfig.participant_role ?? ''}
                  onChange={e => setSessionConfig(prev => ({ ...prev, participant_role: e.target.value }))}
                  rows={2} placeholder="e.g. A student being assessed on…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>

              {/* Additional context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional context
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <textarea value={sessionConfig.additional_context ?? ''}
                  onChange={e => setSessionConfig(prev => ({ ...prev, additional_context: e.target.value }))}
                  rows={2} placeholder="Extra context or constraints…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>
            </div>

            {/* Communication style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Communication style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMM_STYLES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, communication_style: s }))}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                      sessionConfig.communication_style === s
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Regenerate button */}
          <button onClick={handleRecompileSession} disabled={recompileSessionLoading}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-[120ms]">
            {recompileSessionLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating…</>
              : <><RefreshCw className="w-4 h-4" />Regenerate Agent</>}
          </button>
        </div>
      )}

      {/* Evaluation */}
      {activeTab === 'evaluation' && (
        <div className="px-6 md:px-8 py-6 space-y-5">

          {!storedEvalConfig && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
              This agent was created before eval config storage was added. Set your preferences below and click
              <span className="font-semibold"> Regenerate Eval</span>.
            </div>
          )}

          <AnimatePresence>
            {evalStale && !evalStaleDismissed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    Eval config updated — regenerate to apply changes.
                  </div>
                  <button onClick={() => setEvalStaleDismissed(true)} className="text-amber-400 hover:text-amber-700 duration-[120ms]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Eval config form */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Evaluation configuration</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setCurrentEvalConfig(prev => ({ ...prev, mode: 'auto' }))}
                className={`text-left border rounded-xl p-4 transition-all duration-[120ms] ${
                  currentEvalConfig.mode === 'auto'
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-900">Auto-generate</p>
                  <Sparkles size={14} className={currentEvalConfig.mode === 'auto' ? 'text-indigo-500' : 'text-gray-300'} />
                </div>
                <p className="text-xs text-gray-500">Based on session design</p>
              </button>
              <button type="button" onClick={() => setCurrentEvalConfig(prev => ({ ...prev, mode: 'custom' }))}
                className={`text-left border rounded-xl p-4 transition-all duration-[120ms] ${
                  currentEvalConfig.mode === 'custom'
                    ? 'bg-white border-indigo-300 ring-1 ring-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-900">Customize</p>
                  <Brain size={14} className={currentEvalConfig.mode === 'custom' ? 'text-indigo-500' : 'text-gray-300'} />
                </div>
                <p className="text-xs text-gray-500">Define criteria manually</p>
              </button>
            </div>

            <AnimatePresence>
              {currentEvalConfig.mode === 'custom' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4"
                >
                  {[
                    { label: 'What is being evaluated?', key: 'competency' as const, placeholder: 'e.g. Knowledge of subject matter' },
                    { label: 'Strong performance', key: 'strong_performance' as const, placeholder: 'e.g. Answers accurately and completely…' },
                    { label: 'Weak performance', key: 'weak_performance' as const, placeholder: 'e.g. Answers are vague or incorrect…' },
                    { label: 'Additional context', key: 'additional' as const, placeholder: 'Any other notes…' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <textarea value={currentEvalConfig[key] ?? ''}
                        onChange={e => setCurrentEvalConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={2} placeholder={placeholder}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handleRecompileEval} disabled={recompileEvalLoading}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-[120ms]">
            {recompileEvalLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating…</>
              : <><RefreshCw className="w-4 h-4" />Regenerate Eval</>}
          </button>

          {(editedMetrics.some(m => m.name) || editedCuratorPrompt) && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current metrics</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {editedMetrics.map((metric, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-gray-400">Metric {i + 1}</p>
                    <input type="text" value={metric.name}
                      onChange={e => setEditedMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, name: e.target.value } : m))}
                      placeholder="Name"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                    <textarea value={metric.definition}
                      onChange={e => setEditedMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, definition: e.target.value } : m))}
                      placeholder="Definition" rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                    <div className="grid grid-cols-2 gap-2">
                      <textarea value={metric.strong}
                        onChange={e => setEditedMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, strong: e.target.value } : m))}
                        placeholder="Strong (5/5)" rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                      <textarea value={metric.weak}
                        onChange={e => setEditedMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, weak: e.target.value } : m))}
                        placeholder="Weak (1/5)" rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Report curator prompt</label>
                <textarea value={editedCuratorPrompt} onChange={e => setEditedCuratorPrompt(e.target.value)}
                  rows={4} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>
              <button onClick={handleSaveMetrics}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]">
                Save metrics
              </button>
            </div>
          )}
        </div>
      )}

        </div>
      </div>
    </div>
  )
}
