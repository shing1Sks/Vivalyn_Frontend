import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Clock, ChevronDown } from 'lucide-react'
import type { SessionDesignRequest } from '../../../lib/api'
import AutoExpandTextarea from './AutoExpandTextarea'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  language: string
  initialValues?: Partial<SessionDesignRequest>
  defaultAgentName?: string
  onChange: (design: SessionDesignRequest | null) => void
}

// ── Suggestion data ────────────────────────────────────────────────────────────

const DURATION_PILLS = [10, 15, 30] as const

const OBJECTIVE_CHIPS = [
  { label: 'Knowledge assessment', value: 'Assess understanding of --- through structured questioning' },
  { label: 'Mock examination',     value: 'Conduct a mock examination of the participant on ---' },
  { label: 'Interview practice',   value: 'Practise for an upcoming --- interview and build confidence' },
  { label: 'Coaching session',     value: 'Coach the participant to improve their --- skills' },
]

const AGENT_ROLE_CHIPS = [
  { label: 'Oral examiner',      value: 'A rigorous oral examiner testing depth of knowledge on ---' },
  { label: 'Interviewer',        value: 'A professional interviewer assessing fit for a --- role' },
  { label: 'Supportive coach',   value: 'A supportive coach helping the participant improve their ---' },
  { label: 'Roleplay character', value: 'A roleplay character: a --- in a realistic professional scenario' },
]

const PARTICIPANT_CHIPS = [
  { label: 'Exam student',  value: 'A student preparing for a formal examination or assessment' },
  { label: 'Job candidate', value: 'A job candidate preparing for a professional interview' },
  { label: 'Professional',  value: 'A professional looking to develop their --- skills' },
  { label: 'Researcher',    value: 'A researcher defending their thesis or project work' },
]

const STYLE_OPTIONS = [
  { label: 'Conversational', value: 'Conversational', desc: 'Relaxed, natural flow' },
  { label: 'Formal', value: 'Formal', desc: 'Professional, structured' },
  { label: 'Coaching', value: 'Coaching', desc: 'Supportive, guiding' },
  { label: 'Strict', value: 'Strict', desc: 'Rigorous, no-nonsense' },
] as const

// ── Component ──────────────────────────────────────────────────────────────────

export default function SessionDesignStep({ language, initialValues, defaultAgentName, onChange }: Props) {
  const [agentName, setAgentName] = useState(() => initialValues?.agent_name ?? defaultAgentName ?? '')
  const [duration, setDuration] = useState<number | null>(() => {
    const d = initialValues?.session_duration_minutes
    if (!d) return null
    return DURATION_PILLS.includes(d as typeof DURATION_PILLS[number]) ? d : null
  })
  const [customDuration, setCustomDuration] = useState(() => {
    const d = initialValues?.session_duration_minutes
    if (!d) return ''
    return DURATION_PILLS.includes(d as typeof DURATION_PILLS[number]) ? '' : String(d)
  })
  const [isCustomDuration, setIsCustomDuration] = useState(() => {
    const d = initialValues?.session_duration_minutes
    return !!d && !DURATION_PILLS.includes(d as typeof DURATION_PILLS[number])
  })
  const [sessionObjective, setSessionObjective] = useState(() => initialValues?.session_objective ?? '')
  const [agentRole, setAgentRole] = useState(() => initialValues?.agent_role ?? '')
  const [participantRole, setParticipantRole] = useState(() => initialValues?.participant_role ?? '')
  const [style, setStyle] = useState(() => initialValues?.communication_style ?? '')
  const [additionalContext, setAdditionalContext] = useState(() => initialValues?.additional_context ?? '')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const objectiveRef = useRef<HTMLTextAreaElement>(null)
  const agentRoleRef = useRef<HTMLTextAreaElement>(null)
  const participantRef = useRef<HTMLTextAreaElement>(null)


  const effectiveDuration = isCustomDuration ? parseInt(customDuration, 10) || null : duration

  const canContinue =
    agentName.trim() &&
    effectiveDuration !== null &&
    effectiveDuration > 0 &&
    sessionObjective.trim() &&
    agentRole.trim() &&
    participantRole.trim() &&
    style

  function applyChip(
    chip: string,
    setter: (v: string) => void,
    ref: React.RefObject<HTMLTextAreaElement | null>,
  ) {
    setter(chip)
    setTimeout(() => {
      if (!ref.current) return
      ref.current.focus()
      const pos = chip.indexOf('---')
      if (pos !== -1) ref.current.setSelectionRange(pos, pos + 3)
    }, 10)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!canContinue || effectiveDuration === null) { onChange(null); return }
    onChange({
      agent_name: agentName.trim(),
      session_objective: sessionObjective.trim(),
      agent_role: agentRole.trim(),
      participant_role: participantRole.trim(),
      communication_style: style,
      session_duration_minutes: effectiveDuration,
      additional_context: additionalContext.trim() || undefined,
    })
  }, [agentName, sessionObjective, agentRole, participantRole, style, duration, customDuration, isCustomDuration, additionalContext])

  // Live summary preview
  const summaryFilled = agentName.trim() || agentRole.trim() || participantRole.trim() || effectiveDuration || style || sessionObjective.trim()

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {language && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full border border-gray-200">
              <Globe size={11} />
              {language}
            </span>
          </div>
        )}
        <h2 className="text-2xl font-semibold text-gray-900">Design your session</h2>
        <p className="text-sm text-gray-500 mt-1">Define who the agent is and what the session should accomplish.</p>
      </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Left: Form fields ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Agent name + duration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Agent name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. Dr. Patel"
                  className="w-full text-base text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Clock size={13} className="inline mr-1 text-gray-400" />
                  Duration
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DURATION_PILLS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDuration(d); setIsCustomDuration(false) }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                        !isCustomDuration && duration === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomDuration(true)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                      isCustomDuration
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Custom
                  </button>
                  {isCustomDuration && (
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={customDuration}
                      onChange={e => setCustomDuration(e.target.value)}
                      placeholder="20"
                      autoFocus
                      className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Session objective + Agent role - 2 per row on lg */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Session objective</label>
                <AutoExpandTextarea
                  ref={objectiveRef}
                  value={sessionObjective}
                  onChange={e => setSessionObjective(e.target.value)}
                  placeholder="e.g. Conduct a rigorous oral examination on machine learning fundamentals…"
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
                <div className="flex flex-wrap gap-1.5">
                  {OBJECTIVE_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => applyChip(chip.value, setSessionObjective, objectiveRef)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms] shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Agent role</label>
                <AutoExpandTextarea
                  ref={agentRoleRef}
                  value={agentRole}
                  onChange={e => setAgentRole(e.target.value)}
                  placeholder="e.g. A rigorous oral examiner testing depth of knowledge on the subject…"
                  className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_ROLE_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => applyChip(chip.value, setAgentRole, agentRoleRef)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms] shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Participant role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Participant role</label>
              <AutoExpandTextarea
                ref={participantRef}
                value={participantRole}
                onChange={e => setParticipantRole(e.target.value)}
                placeholder="e.g. A postgraduate student preparing for their thesis defense…"
                className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PARTICIPANT_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => applyChip(chip.value, setParticipantRole, participantRef)}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms] shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Communication style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Communication style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all duration-[120ms] ${
                      style === s.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block font-medium">{s.label}</span>
                    <span className={`block text-xs mt-0.5 ${style === s.value ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced / additional context */}
            <div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 duration-[120ms]"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-[120ms] ${advancedOpen ? 'rotate-180' : ''}`} />
                Advanced
              </button>
              <AnimatePresence>
                {advancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-3"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Additional context
                      <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <AutoExpandTextarea
                      value={additionalContext}
                      onChange={e => setAdditionalContext(e.target.value)}
                      placeholder="Any extra context, constraints, or instructions for the agent…"
                      className="w-full px-3 py-2.5 text-base border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right: Live summary card ──────────────────────────────────── */}
          <div className="sticky top-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Session preview</p>

              {summaryFilled ? (
                <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                  {agentName.trim() && (
                    <p>
                      <span className="font-semibold text-gray-900">{agentName.trim()}</span>
                      {agentRole.trim() ? (
                        <span className="text-gray-600"> will act as {agentRole.trim().toLowerCase().replace(/^a\s/, '')}</span>
                      ) : (
                        <span className="text-gray-400"> — role not set</span>
                      )}
                      {'.'}
                    </p>
                  )}

                  {(effectiveDuration || style || participantRole.trim()) && (
                    <p className="text-gray-600">
                      {effectiveDuration ? (
                        <><span className="font-medium text-gray-800">{effectiveDuration}-minute</span>{' '}</>
                      ) : null}
                      {style ? (
                        <><span className="font-medium text-gray-800">{style.toLowerCase()}</span>{' '}session{' '}</>
                      ) : (
                        <>session{' '}</>
                      )}
                      {participantRole.trim() ? (
                        <>with <span className="font-medium text-gray-800">{participantRole.trim().toLowerCase()}</span>.</>
                      ) : (
                        <>— participant not set.</>
                      )}
                    </p>
                  )}

                  {sessionObjective.trim() && (
                    <p className="text-gray-500 text-xs border-t border-gray-100 pt-3 mt-3">
                      <span className="font-medium text-gray-600">Objective:</span>{' '}
                      {sessionObjective.trim()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-400">Fill in the fields on the left to see a preview of your session setup.</p>
                </div>
              )}

              {/* Completion checklist */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5">
                {[
                  { label: 'Agent name', filled: !!agentName.trim() },
                  { label: 'Objective', filled: !!sessionObjective.trim() },
                  { label: 'Agent role', filled: !!agentRole.trim() },
                  { label: 'Participant', filled: !!participantRole.trim() },
                  { label: 'Style', filled: !!style },
                  { label: 'Duration', filled: effectiveDuration !== null && effectiveDuration > 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.filled ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                    <span className={`text-xs ${item.filled ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
  )
}
