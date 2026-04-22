import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CheckCircle2, ChevronDown, Loader2, Save, Settings2, User, X } from 'lucide-react'
import {
  updateAgent,
  type AgentPromptSpec,
  type EvaluationMetrics,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import VoiceSettingsModal from './VoiceSettingsModal'

interface Props {
  spec: AgentPromptSpec
  agentId: string
  agentLanguage: string
  agentVoice: string
  agentFirstSpeaker?: string
  evaluationMetrics?: EvaluationMetrics | null
  onSaved: (spec: AgentPromptSpec) => void
  onAgentUpdated?: (updates: { agent_language: string; agent_voice: string; agent_first_speaker?: string }) => void
}

type Tab = 'session' | 'evaluation'

// ── Main component ──────────────────────────────────────────────────────────────

export default function AgentConfigureView({
  spec, agentId, agentLanguage, agentVoice, agentFirstSpeaker, evaluationMetrics, onSaved, onAgentUpdated,
}: Props) {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('session')
  const [edited, setEdited] = useState<AgentPromptSpec>({ ...spec })
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (agentFirstSpeaker as 'agent' | 'user') ?? 'agent'
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

  // Save states per tab
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [evalSaving, setEvalSaving] = useState(false)
  const [evalSaved, setEvalSaved] = useState(false)
  const evalTabRef = useRef<{ save: () => Promise<void> }>(null)

  function updateStringField(key: keyof AgentPromptSpec, value: string) {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  function updateListItem(key: keyof AgentPromptSpec, idx: number, value: string) {
    setEdited(prev => {
      const arr = [...(prev[key] as string[])]
      arr[idx] = value
      return { ...prev, [key]: arr }
    })
  }

  function updateDictItem(key: keyof AgentPromptSpec, field: string, value: string) {
    setEdited(prev => ({
      ...prev,
      [key]: { ...(prev[key] as Record<string, string>), [field]: value },
    }))
  }

  async function handleSaveSession() {
    if (!session) return
    setSessionSaving(true)
    setSessionSaved(false)
    try {
      await updateAgent(session.access_token, agentId, { agent_prompt: edited })
      setSessionSaved(true)
      onSaved(edited)
      setTimeout(() => setSessionSaved(false), 3000)
    } catch { /* silent */ } finally {
      setSessionSaving(false)
    }
  }

  async function handleHeaderSave() {
    if (activeTab === 'session') {
      await handleSaveSession()
    } else {
      setEvalSaving(true)
      setEvalSaved(false)
      try {
        await evalTabRef.current?.save()
        setEvalSaved(true)
        setTimeout(() => setEvalSaved(false), 3000)
      } catch { /* silent */ } finally {
        setEvalSaving(false)
      }
    }
  }

  function handleVoiceUpdated(lang: string, voice: string) {
    onAgentUpdated?.({ agent_language: lang, agent_voice: voice })
  }

  async function handleFirstSpeakerChange(val: 'agent' | 'user') {
    if (val === firstSpeaker || !session) return
    setFirstSpeaker(val)
    try {
      await updateAgent(session.access_token, agentId, { agent_first_speaker: val })
      onAgentUpdated?.({ agent_language: agentLanguage, agent_voice: agentVoice, agent_first_speaker: val })
    } catch { /* silent */ }
  }

  const isSaving = activeTab === 'session' ? sessionSaving : evalSaving
  const isSaved = activeTab === 'session' ? sessionSaved : evalSaved

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* ── Header: title + tabs + lang badge + gear + save ───────────────── */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 md:gap-4">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Configure Agent</h2>
          {/* Desktop tabs */}
          <div className="hidden md:inline-flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('session')}
              className={`text-xs font-medium px-3 py-1.5 rounded-md duration-[120ms] ${
                activeTab === 'session'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Session
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`text-xs font-medium px-3 py-1.5 rounded-md duration-[120ms] ${
                activeTab === 'evaluation'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Evaluation
            </button>
          </div>

          {/* Mobile tab dropdown */}
          <div className="md:hidden relative" ref={tabMenuRef}>
            <button
              onClick={() => setTabMenuOpen(v => !v)}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 duration-[120ms]"
            >
              {activeTab === 'session' ? 'Session' : 'Evaluation'}
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${tabMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {tabMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setActiveTab('session'); setTabMenuOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium duration-[120ms] ${
                    activeTab === 'session' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Session
                </button>
                <button
                  onClick={() => { setActiveTab('evaluation'); setTabMenuOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium duration-[120ms] ${
                    activeTab === 'evaluation' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Evaluation
                </button>
              </div>
            )}
          </div>

          {/* Language badge + settings */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
              {agentLanguage}
            </span>
            <button
              onClick={() => setVoiceModalOpen(true)}
              title="Change voice & language"
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Who opens the session */}
          <div className="hidden md:flex items-center gap-2">
            {(['agent', 'user'] as const).map(val => (
              <button
                key={val}
                onClick={() => handleFirstSpeakerChange(val)}
                className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all duration-150 ${
                  firstSpeaker === val
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {val === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                {val === 'agent' ? 'Agent starts' : 'Participant starts'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleHeaderSave}
          disabled={isSaving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]"
          title={isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save Changes'}
        >
          <span className="hidden md:inline">
            {isSaving ? (
              <><Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" /> Saving…</>
            ) : isSaved ? (
              <><CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Saved</>
            ) : (
              'Save Changes'
            )}
          </span>
          <span className="md:hidden">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" />
              : isSaved ? <CheckCircle2 className="w-4 h-4" />
              : <Save className="w-4 h-4" />}
          </span>
        </button>
      </div>

      {/* Mobile language/voice + first-speaker row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {agentVoice} · <span className="font-medium text-gray-700">{agentLanguage.toUpperCase()}</span>
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
            <button
              key={val}
              onClick={() => handleFirstSpeakerChange(val)}
              title={val === 'agent' ? 'Agent starts' : 'Participant starts'}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 ${
                firstSpeaker === val
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {val === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      <VoiceSettingsModal
        agentId={agentId}
        agentLanguage={agentLanguage}
        agentVoice={agentVoice}
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onUpdated={handleVoiceUpdated}
      />

      {activeTab === 'session' ? (
        <>
          {/* ── Two-column body ──────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-start">
            {/* LHS — string sections */}
            <div className="w-full md:w-[55%] flex flex-col gap-4 px-3 md:px-5 py-4 md:py-5 border-b md:border-b-0 md:border-r border-gray-100">
              <StringSection
                label="Identity & Persona"
                value={edited.identity_and_persona}
                rows={10}
                onChange={v => updateStringField('identity_and_persona', v)}
              />
              <StringSection
                label="Session Brief"
                value={edited.session_brief}
                rows={4}
                onChange={v => updateStringField('session_brief', v)}
              />
            </div>

            {/* RHS — collapsible sections */}
            <div className="flex-1 flex flex-col gap-3 px-3 md:px-5 py-4 md:py-5">
              <DictSection
                label="Behavior Rules"
                value={edited.behavior_rules}
                defaultOpen={true}
                onItemChange={(field, v) => updateDictItem('behavior_rules', field, v)}
              />
              <CollapsibleSection
                label="Guardrails"
                value={edited.guardrails}
                defaultOpen={false}
                onItemChange={(i, v) => updateListItem('guardrails', i, v)}
              />
            </div>
          </div>
        </>
      ) : (
        <EvaluationTab
          ref={evalTabRef}
          agentId={agentId}
          initialMetrics={evaluationMetrics ?? null}
        />
      )}
    </div>
  )}

interface EvaluationTabProps {
  agentId: string
  initialMetrics: EvaluationMetrics | null
  ref?: React.Ref<{ save: () => Promise<void> }>
}

function EvaluationTab({ agentId, initialMetrics, ref }: EvaluationTabProps) {
  const { session } = useAuth()
  const [evalPrompt, setEvalPrompt] = useState(initialMetrics?.report_curator_prompt ?? '')
  const MAX_METRICS = 4

  // 4 editable metric slots
  const [slotDrafts, setSlotDrafts] = useState<string[]>(() => {
    const m = initialMetrics?.metrics ?? []
    const slots = m.slice(0, MAX_METRICS)
    while (slots.length < MAX_METRICS) slots.push('')
    return slots
  })

  const originalMetrics = useMemo(() => new Set(initialMetrics?.metrics ?? []), [])
  const metricNames = slotDrafts.filter(Boolean)

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

  async function handleSave() {
    if (!session) return
    const metrics = slotDrafts.filter(Boolean)
    const hasContent = metrics.length > 0 || evalPrompt.trim()
    await updateAgent(session.access_token, agentId, {
      transcript_evaluation_metrics: hasContent ? { metrics, report_curator_prompt: evalPrompt } : null,
    })
  }

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }))

  return (
    <div className="px-3 md:px-5 py-4 md:py-5 flex flex-col md:flex-row gap-5">
      {/* Eval prompt — main content */}
      <div className="flex-1 order-2 md:order-1">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Eval Prompt</span>
          </div>
          <div className="px-5 py-4">
            <textarea
              value={evalPrompt}
              onChange={e => setEvalPrompt(e.target.value)}
              rows={10}
              placeholder="Scoring rubric and instructions for evaluating sessions…"
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] leading-relaxed"
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
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${metricNames.length >= MAX_METRICS ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {metricNames.length}/{MAX_METRICS}
              </span>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {/* 4 editable slots */}
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
                      disabled={!draft && metricNames.length >= MAX_METRICS}
                      placeholder={!draft && metricNames.length < MAX_METRICS ? '+' : ''}
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
  )
}

// ── String section (LHS) ────────────────────────────────────────────────────────

interface StringSectionProps {
  label: string
  value: string
  rows: number
  onChange: (v: string) => void
}

function StringSection({ label, value, rows, onChange }: StringSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className="px-5 pb-5">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] leading-relaxed"
        />
      </div>
    </div>
  )
}

// ── Collapsible section (RHS) ───────────────────────────────────────────────────

interface CollapsibleSectionProps {
  label: string
  value: string[]
  defaultOpen: boolean
  onItemChange: (idx: number, val: string) => void
}

function CollapsibleSection({
  label, value, defaultOpen, onItemChange,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 duration-[120ms] group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`w-4 h-4 text-gray-400 duration-[120ms] ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-gray-100">
              {value.map((item, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <span className="text-xs text-gray-400 font-mono mt-2.5 w-5 flex-shrink-0 text-right">{idx + 1}.</span>
                  <textarea
                    value={item}
                    onChange={e => onItemChange(idx, e.target.value)}
                    rows={2}
                    className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Dict section (behavior_rules) ──────────────────────────────────────────────

interface DictSectionProps {
  label: string
  value: Record<string, string>
  defaultOpen: boolean
  onItemChange: (field: string, val: string) => void
}

const BEHAVIOR_KEY_ORDER = ['opening', 'probing', 'adaptation', 'feedback', 'closing']

function DictSection({
  label, value, defaultOpen, onItemChange,
}: DictSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const keys = [
    ...BEHAVIOR_KEY_ORDER.filter(k => k in value),
    ...Object.keys(value).filter(k => !BEHAVIOR_KEY_ORDER.includes(k)),
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 duration-[120ms] group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 duration-[120ms] ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-100">
              {keys.map(key => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{key}</span>
                  <textarea
                    value={value[key] ?? ''}
                    onChange={e => onItemChange(key, e.target.value)}
                    rows={2}
                    className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


