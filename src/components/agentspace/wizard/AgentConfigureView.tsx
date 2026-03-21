import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Volume2, X } from 'lucide-react'
import {
  fetchVoices,
  fetchVoicePreviewBlob,
  rewriteAgentSection,
  updateAgent,
  generateEvaluationCriteria,
  type AgentPromptSpec,
  type EvaluationMetrics,
  type LanguageVoiceOption,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'

interface Props {
  spec: AgentPromptSpec
  agentId: string
  agentLanguage: string
  agentVoice: string
  evaluationMetrics?: EvaluationMetrics | null
  onSaved: (spec: AgentPromptSpec) => void
  onAgentUpdated?: (updates: { agent_language: string; agent_voice: string }) => void
}

type Tab = 'session' | 'evaluation'

// ── Main component ──────────────────────────────────────────────────────────────

export default function AgentConfigureView({
  spec, agentId, agentLanguage, agentVoice, evaluationMetrics, onSaved, onAgentUpdated,
}: Props) {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('session')
  const [edited, setEdited] = useState<AgentPromptSpec>({ ...spec })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

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

  function applyAiRewrite(key: keyof AgentPromptSpec, type: 'string' | 'list' | 'dict', newContent: string) {
    if (type === 'list') {
      try {
        const parsed = JSON.parse(newContent)
        if (Array.isArray(parsed)) {
          setEdited(prev => ({ ...prev, [key]: parsed }))
          return
        }
      } catch { /* fall through */ }
      setEdited(prev => ({ ...prev, [key]: newContent.split('\n').filter(l => l.trim()) }))
    } else if (type === 'dict') {
      try {
        const parsed = JSON.parse(newContent)
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          setEdited(prev => ({ ...prev, [key]: parsed }))
        }
      } catch { /* fall through */ }
    } else {
      setEdited(prev => ({ ...prev, [key]: newContent }))
    }
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setSavedOk(false)
    try {
      await updateAgent(session.access_token, agentId, { agent_prompt: edited })
      setSavedOk(true)
      onSaved(edited)
      setTimeout(() => setSavedOk(false), 3000)
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  function handleVoiceUpdated(lang: string, voice: string) {
    onAgentUpdated?.({ agent_language: lang, agent_voice: voice })
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Configure Agent</h2>
          <p className="hidden md:block text-xs text-gray-400 mt-0.5">Edit sections directly or use AI to refine content.</p>
        </div>
        {activeTab === 'session' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]"
          >
            {saving ? (
              <><Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" /> Saving…</>
            ) : savedOk ? (
              <><CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Saved</>
            ) : (
              'Save Changes'
            )}
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-3 bg-white border-b border-gray-100">
        <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
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
      </div>

      {activeTab === 'session' ? (
        <>
          {/* ── Voice bar ────────────────────────────────────────────────────── */}
          <VoiceBar
            agentId={agentId}
            agentLanguage={agentLanguage}
            agentVoice={agentVoice}
            editedSpec={edited}
            onUpdated={handleVoiceUpdated}
          />

          {/* ── Two-column body ──────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-start">
            {/* LHS — string sections */}
            <div className="w-full md:w-[55%] flex flex-col gap-4 px-5 py-5 border-b md:border-b-0 md:border-r border-gray-100">
              <StringSection
                sectionKey="identity_and_persona"
                label="Identity & Persona"
                value={edited.identity_and_persona}
                rows={10}
                agentId={agentId}
                onChange={v => updateStringField('identity_and_persona', v)}
                onAiRewrite={c => applyAiRewrite('identity_and_persona', 'string', c)}
              />
              <StringSection
                sectionKey="session_brief"
                label="Session Brief"
                value={edited.session_brief}
                rows={4}
                agentId={agentId}
                onChange={v => updateStringField('session_brief', v)}
                onAiRewrite={c => applyAiRewrite('session_brief', 'string', c)}
              />
            </div>

            {/* RHS — collapsible sections */}
            <div className="flex-1 flex flex-col gap-3 px-5 py-5">
              <DictSection
                sectionKey="behavior_rules"
                label="Behavior Rules"
                value={edited.behavior_rules}
                defaultOpen={true}
                agentId={agentId}
                onItemChange={(field, v) => updateDictItem('behavior_rules', field, v)}
                onAiRewrite={c => applyAiRewrite('behavior_rules', 'dict', c)}
              />
              <CollapsibleSection
                sectionKey="guardrails"
                label="Guardrails"
                value={edited.guardrails}
                defaultOpen={false}
                agentId={agentId}
                onItemChange={(i, v) => updateListItem('guardrails', i, v)}
                onAiRewrite={c => applyAiRewrite('guardrails', 'list', c)}
              />
            </div>
          </div>
        </>
      ) : (
        <EvaluationTab
          agentId={agentId}
          sessionBrief={edited.session_brief}
          initialMetrics={evaluationMetrics ?? null}
        />
      )}
    </div>
  )
}

// ── Evaluation tab ───────────────────────────────────────────────────────────────

interface EvalAiButtonProps {
  sessionBrief: string
  onGenerated: (result: EvaluationMetrics) => void
}

function EvalAiButton({ sessionBrief, onGenerated }: EvalAiButtonProps) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!input.trim() || !session) return
    setLoading(true)
    setError(null)
    try {
      const result = await generateEvaluationCriteria(session.access_token, {
        session_brief: sessionBrief,
        users_raw_evaluation_criteria: input.trim(),
      })
      onGenerated(result)
      setInput('')
      setOpen(false)
    } catch {
      setError('Failed to generate. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); setInput(''); setError(null) }}
        title="Generate with AI"
        className={`w-7 h-7 rounded-full flex items-center justify-center duration-[120ms] ${
          open ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-9 z-20 w-72 max-w-[calc(100vw-2.5rem)] bg-white border border-gray-200 rounded-xl shadow-lg p-3"
          >
            <p className="text-xs text-gray-500 mb-2">Describe what to evaluate</p>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Communication quality, follow-up questions..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setOpen(false); setInput('') }}
                className="p-1.5 text-gray-400 hover:text-gray-600 duration-[120ms]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EvaluationTabProps {
  agentId: string
  sessionBrief: string
  initialMetrics: EvaluationMetrics | null
}

function EvaluationTab({ agentId, sessionBrief, initialMetrics }: EvaluationTabProps) {
  const { session } = useAuth()
  const [metricNames, setMetricNames] = useState<string[]>(initialMetrics?.metrics ?? [])
  const [evalPrompt, setEvalPrompt] = useState(initialMetrics?.report_curator_prompt ?? '')
  const [newMetric, setNewMetric] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  function handleAddMetric() {
    if (!newMetric.trim()) return
    setMetricNames(prev => [...prev, newMetric.trim()])
    setNewMetric('')
  }

  function handleRemoveMetric(idx: number) {
    setMetricNames(prev => prev.filter((_, i) => i !== idx))
  }

  function onAiGenerated(result: EvaluationMetrics) {
    setMetricNames(result.metrics)
    setEvalPrompt(result.report_curator_prompt)
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setSavedOk(false)
    try {
      const hasContent = metricNames.length > 0 || evalPrompt.trim()
      await updateAgent(session.access_token, agentId, {
        transcript_evaluation_metrics: hasContent ? { metrics: metricNames, report_curator_prompt: evalPrompt } : null,
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-5 max-w-2xl flex flex-col gap-5">
      {/* Metrics */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Metrics</span>
          <EvalAiButton sessionBrief={sessionBrief} onGenerated={onAiGenerated} />
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {metricNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {metricNames.map((m, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1"
                >
                  {m}
                  <button
                    onClick={() => handleRemoveMetric(idx)}
                    className="ml-0.5 text-indigo-400 hover:text-indigo-600 duration-[120ms]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newMetric}
              onChange={e => setNewMetric(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMetric()}
              placeholder="Add a metric…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
            />
            <button
              onClick={handleAddMetric}
              disabled={!newMetric.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Eval prompt */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Eval Prompt</span>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={evalPrompt}
            onChange={e => setEvalPrompt(e.target.value)}
            rows={6}
            placeholder="Scoring rubric and instructions for evaluating sessions…"
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] leading-relaxed"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms]"
        >
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          ) : savedOk ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  )
}

// ── Voice bar ───────────────────────────────────────────────────────────────────

interface VoiceBarProps {
  agentId: string
  agentLanguage: string
  agentVoice: string
  editedSpec: AgentPromptSpec
  onUpdated: (lang: string, voice: string) => void
}

function VoiceBar({ agentId, agentLanguage, agentVoice, editedSpec, onUpdated }: VoiceBarProps) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [languages, setLanguages] = useState<LanguageVoiceOption[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [selectedLang, setSelectedLang] = useState(agentLanguage)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const [selectedVoiceName, setSelectedVoiceName] = useState(agentVoice)
  const [updating, setUpdating] = useState(false)

  // Audio preview states
  const [loadingPref, setLoadingPref] = useState<string | null>(null)
  const [playingPref, setPlayingPref] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const activePlayRef = useRef<{ pref: string; cancelled: boolean } | null>(null)

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  function stopAudio() {
    if (activePlayRef.current) activePlayRef.current.cancelled = true
    activePlayRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setPlayingPref(null)
    setLoadingPref(null)
  }

  async function handlePlay(pref: string) {
    if (loadingPref === pref || playingPref === pref) { stopAudio(); return }
    stopAudio()
    setLoadingPref(pref)
    const ctx = { pref, cancelled: false }
    activePlayRef.current = ctx
    try {
      const blob = await fetchVoicePreviewBlob(selectedLang, pref)
      if (ctx.cancelled) return
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { if (!ctx.cancelled) setPlayingPref(null) }
      const promise = audio.play()
      if (promise !== undefined) {
        promise
          .then(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) } })
          .catch(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) } })
      } else {
        if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) }
      }
    } catch {
      if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) }
    }
  }

  function applyCurrentPref(langs: LanguageVoiceOption[]) {
    const currentLangOption = langs.find(l => l.key === agentLanguage)
    const matched = currentLangOption?.voices.find(v => v.voice_name === agentVoice)
    setSelectedPref(matched?.preference ?? null)
  }

  async function handleOpen() {
    setOpen(true)
    setSelectedLang(agentLanguage)
    setSelectedVoiceName(agentVoice)
    if (languages.length > 0) {
      applyCurrentPref(languages)
      return
    }
    setLoadingVoices(true)
    try {
      const data = await fetchVoices()
      setLanguages(data.languages)
      applyCurrentPref(data.languages)
    } catch { /* silent */ } finally {
      setLoadingVoices(false)
    }
  }

  function handleClose() {
    setOpen(false)
    stopAudio()
    setSelectedLang(agentLanguage)
    setSelectedPref(null)
    setSelectedVoiceName(agentVoice)
  }

  const activeLangOption = languages.find(l => l.key === selectedLang)

  async function handleUpdate() {
    if (!session || !selectedPref) return
    setUpdating(true)
    try {
      await updateAgent(session.access_token, agentId, {
        agent_language: selectedLang,
        agent_voice: selectedVoiceName,
      })
      onUpdated(selectedLang, selectedVoiceName)
      setOpen(false)
      stopAudio()
    } catch { /* silent */ } finally {
      setUpdating(false)
    }
  }

  const displayPersona = agentVoice

  return (
    <div className="border-b border-gray-100 bg-white">
      {/* Info row */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">{displayPersona}</span>
          <span className="text-xs text-gray-400">{agentLanguage.toUpperCase()} voice</span>
        </div>
        <button
          onClick={open ? handleClose : handleOpen}
          className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 duration-[120ms]"
        >
          {open ? 'Cancel' : 'Change Voice'}
        </button>
      </div>

      {/* Expandable picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="px-6 py-4">
              {loadingVoices ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Language select */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Language</label>
                    <select
                      value={selectedLang}
                      onChange={e => {
                        setSelectedLang(e.target.value)
                        setSelectedPref(null)
                        stopAudio()
                      }}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white duration-[120ms]"
                    >
                      {languages.map(l => (
                        <option key={l.key} value={l.key}>
                          {l.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Voice options */}
                  {activeLangOption && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Voice</label>
                      <div className="grid grid-cols-4 gap-2">
                        {activeLangOption.voices.map(voice => {
                          const isActive = selectedPref === voice.preference
                          const isLoading = loadingPref === voice.preference
                          const isPlaying = playingPref === voice.preference
                          const personaName = voice.voice_name
                          const isFemale = voice.preference.startsWith('female')
                          return (
                            <div
                              key={voice.preference}
                              onClick={() => {
                                setSelectedPref(voice.preference)
                                setSelectedVoiceName(voice.voice_name)
                              }}
                              className={`flex flex-col gap-2.5 p-3 rounded-xl border cursor-pointer duration-[120ms] ${
                                isActive
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {/* Name + gender badge */}
                              <div className="flex items-start justify-between gap-1">
                                <span className={`text-sm font-semibold leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                                  {personaName}
                                </span>
                                <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  isActive
                                    ? 'bg-indigo-100 text-indigo-500'
                                    : isFemale
                                    ? 'bg-pink-50 text-pink-400'
                                    : 'bg-sky-50 text-sky-400'
                                }`}>
                                  {isFemale ? '♀' : '♂'}
                                </span>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); handlePlay(voice.preference) }}
                                className={`flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-lg w-full duration-[120ms] ${
                                  isLoading ? 'bg-gray-100 text-gray-400 cursor-wait'
                                  : isPlaying ? 'bg-indigo-100 text-indigo-700'
                                  : isActive ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {isLoading ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" />Loading</>
                                ) : isPlaying ? (
                                  <><SoundWave />Stop</>
                                ) : (
                                  <><Volume2 className="w-3 h-3" />Preview</>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Update button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdate}
                      disabled={!selectedPref || updating}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms]"
                    >
                      {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Update Voice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── String section (LHS) ────────────────────────────────────────────────────────

interface StringSectionProps {
  sectionKey: string
  label: string
  value: string
  rows: number
  agentId: string
  onChange: (v: string) => void
  onAiRewrite: (content: string) => void
}

function StringSection({ sectionKey, label, value, rows, agentId, onChange, onAiRewrite }: StringSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <SectionHeader label={label} sectionKey={sectionKey} isList={false} value={value} agentId={agentId} onAiRewrite={onAiRewrite} />
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
  sectionKey: string
  label: string
  value: string[]
  defaultOpen: boolean
  agentId: string
  onItemChange: (idx: number, val: string) => void
  onAiRewrite: (content: string) => void
}

function CollapsibleSection({
  sectionKey, label, value, defaultOpen, agentId, onItemChange, onAiRewrite,
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
          {/* AI button — stop propagation so it doesn't toggle */}
          <div onClick={e => e.stopPropagation()}>
            <AiButton sectionKey={sectionKey} label={label} isList value={JSON.stringify(value)} agentId={agentId} onAiRewrite={onAiRewrite} />
          </div>
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
  sectionKey: string
  label: string
  value: Record<string, string>
  defaultOpen: boolean
  agentId: string
  onItemChange: (field: string, val: string) => void
  onAiRewrite: (content: string) => void
}

const BEHAVIOR_KEY_ORDER = ['opening', 'probing', 'adaptation', 'feedback', 'closing']

function DictSection({
  sectionKey, label, value, defaultOpen, agentId, onItemChange, onAiRewrite,
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
        <div className="flex items-center gap-2">
          <div onClick={e => e.stopPropagation()}>
            <AiButton sectionKey={sectionKey} label={label} isList={false} value={JSON.stringify(value)} agentId={agentId} onAiRewrite={onAiRewrite} />
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 duration-[120ms] ${isOpen ? 'rotate-180' : ''}`} />
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

// ── Shared section header with AI button (used by StringSection) ────────────────

interface SectionHeaderProps {
  label: string
  sectionKey: string
  isList: boolean
  value: string | string[]
  agentId: string
  onAiRewrite: (content: string) => void
}

function SectionHeader({ label, sectionKey, isList, value, agentId, onAiRewrite }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <AiButton sectionKey={sectionKey} label={label} isList={isList} value={isList ? JSON.stringify(value) : value as string} agentId={agentId} onAiRewrite={onAiRewrite} />
    </div>
  )
}

// ── AI rewrite button + inline input ───────────────────────────────────────────

interface AiButtonProps {
  sectionKey: string
  label: string
  isList: boolean
  value: string
  agentId: string
  onAiRewrite: (content: string) => void
}

function AiButton({ label, isList, value, onAiRewrite }: AiButtonProps) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!input.trim() || !session) return
    setLoading(true)
    try {
      const res = await rewriteAgentSection(session.access_token, {
        section_name: label,
        current_content: isList ? value : value,
        instruction: input.trim(),
      })
      onAiRewrite(res.updated_content)
      setInput('')
      setOpen(false)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); setInput('') }}
        title="Refine with AI"
        className={`w-7 h-7 rounded-full flex items-center justify-center duration-[120ms] ${
          open ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-9 z-20 w-72 max-w-[calc(100vw-2.5rem)] bg-white border border-gray-200 rounded-xl shadow-lg p-3"
          >
            <p className="text-xs text-gray-500 mb-2">Describe the change</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Make it more concise"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setOpen(false); setInput('') }}
                className="p-1.5 text-gray-400 hover:text-gray-600 duration-[120ms]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Animated sound wave icon ────────────────────────────────────────────────────

function SoundWave() {
  return (
    <span className="flex items-end gap-[2px] h-3">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className="w-[3px] bg-indigo-600 rounded-full animate-bounce"
          style={{ height: `${[60, 100, 70][i - 1]}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </span>
  )
}
