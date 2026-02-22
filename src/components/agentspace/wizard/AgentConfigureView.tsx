import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Volume2, X } from 'lucide-react'
import {
  fetchVoices,
  fetchVoicePreviewBlob,
  rewriteAgentSection,
  updateAgent,
  type AgentPromptSpec,
  type LanguageVoiceOption,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import { FLAG_MAP, getVoiceName } from './voiceConfig'

interface Props {
  spec: AgentPromptSpec
  agentId: string
  agentLanguage: string
  agentVoice: string
  onSaved: (spec: AgentPromptSpec) => void
  onAgentUpdated?: (updates: { agent_language: string; agent_voice: string }) => void
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function AgentConfigureView({
  spec, agentId, agentLanguage, agentVoice, onSaved, onAgentUpdated,
}: Props) {
  const { session } = useAuth()
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

  function applyAiRewrite(key: keyof AgentPromptSpec, isList: boolean, newContent: string) {
    if (isList) {
      try {
        const parsed = JSON.parse(newContent)
        if (Array.isArray(parsed)) {
          setEdited(prev => ({ ...prev, [key]: parsed }))
          return
        }
      } catch { /* fall through */ }
      const lines = newContent.split('\n').filter(l => l.trim())
      setEdited(prev => ({ ...prev, [key]: lines }))
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

  function handleVoiceUpdated(lang: string, voice: string, personaName: string) {
    // Update voice_character locally so next "Save Changes" persists it too
    setEdited(prev => ({
      ...prev,
      voice_character: {
        name: `Your name is ${personaName}.`,
        persona: `You are ${personaName}. Introduce yourself by name at the start of each session and maintain a warm, natural conversational style throughout.`,
      },
    }))
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
      </div>

      {/* ── Voice bar ──────────────────────────────────────────────────────── */}
      <VoiceBar
        agentId={agentId}
        agentLanguage={agentLanguage}
        agentVoice={agentVoice}
        editedSpec={edited}
        onUpdated={handleVoiceUpdated}
      />

      {/* ── Two-column body ────────────────────────────────────────────────── */}
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
            onAiRewrite={c => applyAiRewrite('identity_and_persona', false, c)}
          />
          <StringSection
            sectionKey="task_definition"
            label="Task Definition"
            value={edited.task_definition}
            rows={7}
            agentId={agentId}
            onChange={v => updateStringField('task_definition', v)}
            onAiRewrite={c => applyAiRewrite('task_definition', false, c)}
          />
        </div>

        {/* RHS — collapsible list sections */}
        <div className="flex-1 flex flex-col gap-3 px-5 py-5">
          <CollapsibleSection
            sectionKey="objectives"
            label="Objectives"
            value={edited.objectives}
            defaultOpen={true}
            agentId={agentId}
            onItemChange={(i, v) => updateListItem('objectives', i, v)}
            onAiRewrite={c => applyAiRewrite('objectives', true, c)}
          />
          <CollapsibleSection
            sectionKey="transcript"
            label="Transcript"
            value={edited.transcript}
            defaultOpen={false}
            agentId={agentId}
            onItemChange={(i, v) => updateListItem('transcript', i, v)}
            onAiRewrite={c => applyAiRewrite('transcript', true, c)}
          />
          <CollapsibleSection
            sectionKey="guardrails"
            label="Guardrails"
            value={edited.guardrails}
            defaultOpen={false}
            agentId={agentId}
            onItemChange={(i, v) => updateListItem('guardrails', i, v)}
            onAiRewrite={c => applyAiRewrite('guardrails', true, c)}
          />
        </div>
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
  onUpdated: (lang: string, voice: string, personaName: string) => void
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
    const personaName = getVoiceName(selectedLang, selectedPref)
    setUpdating(true)
    try {
      await updateAgent(session.access_token, agentId, {
        agent_language: selectedLang,
        agent_voice: selectedVoiceName,
        agent_prompt: {
          ...editedSpec,
          voice_character: {
            name: `Your name is ${personaName}.`,
            persona: `You are ${personaName}. Introduce yourself by name at the start of each session and maintain a warm, natural conversational style throughout.`,
          },
        },
      })
      onUpdated(selectedLang, selectedVoiceName, personaName)
      setOpen(false)
      stopAudio()
    } catch { /* silent */ } finally {
      setUpdating(false)
    }
  }

  // Extract persona name from voice_character (set on agent creation/update)
  const vcName = editedSpec.voice_character?.name ?? ''
  const personaMatch = vcName.match(/Your name is (.+?)\.?\s*$/)
  const displayPersona = personaMatch?.[1] ?? getVoiceName(agentLanguage, 'female1')

  return (
    <div className="border-b border-gray-100 bg-white">
      {/* Info row */}
      <div className="flex items-center gap-3 px-6 py-3">
        <span className="text-xl">{FLAG_MAP[agentLanguage] ?? '🌐'}</span>
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
                          {FLAG_MAP[l.key] ?? '🌐'} {l.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Voice options */}
                  {activeLangOption && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Voice</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {activeLangOption.voices.map(voice => {
                          const isActive = selectedPref === voice.preference
                          const isLoading = loadingPref === voice.preference
                          const isPlaying = playingPref === voice.preference
                          const personaName = getVoiceName(selectedLang, voice.preference)
                          return (
                            <div
                              key={voice.preference}
                              onClick={() => {
                                setSelectedPref(voice.preference)
                                setSelectedVoiceName(voice.voice_name)
                              }}
                              className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer duration-[120ms] ${
                                isActive
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                              }`}
                            >
                              <span className={`text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                                {personaName}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate font-mono" title={voice.voice_name}>
                                {voice.voice_name}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); handlePlay(voice.preference) }}
                                className={`self-start flex items-center gap-1 text-xs px-2 py-1 rounded-md duration-[120ms] ${
                                  isLoading ? 'bg-gray-100 text-gray-400 cursor-wait'
                                  : isPlaying ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {isLoading ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" /> Loading</>
                                ) : isPlaying ? (
                                  <><SoundWave /> Stop</>
                                ) : (
                                  <><Volume2 className="w-3 h-3" /> Play</>
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
