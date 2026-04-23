import { useRef, useState } from 'react'
import { Globe, LayoutTemplate } from 'lucide-react'
import type { SessionDesignRequest } from '../../../lib/api'
import {
  GENERAL_TEMPLATES,
  templateToSessionDesign,
  type AgentTemplate,
} from '../../../lib/agentTemplates'
import TemplateBrowserModal from './TemplateBrowserModal'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  language: string
  onContinue: (design: SessionDesignRequest) => void
}

// ── Suggestion data ────────────────────────────────────────────────────────────

const DURATION_PILLS = [10, 15, 30] as const

const OBJECTIVE_CHIPS = [
  'Assess understanding of --- through structured questioning',
  'Practise for an upcoming --- interview and build confidence',
  'Coach the participant to improve their --- skills',
  'Conduct a mock examination of the participant on ---',
]

const AGENT_ROLE_CHIPS = [
  'A rigorous oral examiner testing depth of knowledge on ---',
  'A professional interviewer assessing fit for a --- role',
  'A supportive coach helping the participant improve their ---',
  'A roleplay character: a --- in a realistic professional scenario',
]

const PARTICIPANT_CHIPS = [
  'A student preparing for a formal examination or assessment',
  'A job candidate preparing for a professional interview',
  'A professional looking to develop their --- skills',
  'A researcher defending their thesis or project work',
  'A sales representative preparing for client-facing conversations',
  'A speaker preparing to present at a conference or event',
]

const STYLE_PILLS = [
  { label: 'Conversational', value: 'Conversational' },
  { label: 'Formal', value: 'Formal' },
  { label: 'Coaching', value: 'Coaching' },
  { label: 'Strict', value: 'Strict' },
] as const

// ── Component ──────────────────────────────────────────────────────────────────

export default function SessionDesignStep({ language, onContinue }: Props) {
  const [agentName, setAgentName] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [sessionObjective, setSessionObjective] = useState('')
  const [agentRole, setAgentRole] = useState('')
  const [participantRole, setParticipantRole] = useState('')
  const [style, setStyle] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [showAdditional, setShowAdditional] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  const objectiveRef = useRef<HTMLTextAreaElement>(null)
  const agentRoleRef = useRef<HTMLTextAreaElement>(null)
  const participantRef = useRef<HTMLTextAreaElement>(null)

  const effectiveDuration = isCustomDuration
    ? parseInt(customDuration, 10) || null
    : duration

  const canContinue =
    agentName.trim() &&
    effectiveDuration !== null &&
    effectiveDuration > 0 &&
    sessionObjective.trim() &&
    agentRole.trim() &&
    participantRole.trim() &&
    style

  function applyChip(
    _current: string,
    chip: string,
    setter: (v: string) => void,
    ref: React.RefObject<HTMLTextAreaElement | null>,
  ) {
    setter(chip)
    setTimeout(() => {
      if (!ref.current) return
      ref.current.focus()
      const pos = chip.indexOf('---')
      if (pos !== -1) {
        ref.current.setSelectionRange(pos, pos + 3)
      }
    }, 10)
  }

  function handleTemplateSelect(template: AgentTemplate) {
    const design = templateToSessionDesign(template, template.suggested_name)
    setAgentName(design.agent_name)
    setSessionObjective(design.session_objective)
    setAgentRole(design.agent_role)
    setParticipantRole(design.participant_role)
    setStyle(design.communication_style)
    const idx = DURATION_PILLS.indexOf(design.session_duration_minutes as typeof DURATION_PILLS[number])
    if (idx !== -1) {
      setDuration(design.session_duration_minutes)
      setIsCustomDuration(false)
    } else {
      setIsCustomDuration(true)
      setCustomDuration(String(design.session_duration_minutes))
    }
  }

  function handleContinue() {
    if (!canContinue || effectiveDuration === null) return
    onContinue({
      agent_name: agentName.trim(),
      session_objective: sessionObjective.trim(),
      agent_role: agentRole.trim(),
      participant_role: participantRole.trim(),
      communication_style: style,
      session_duration_minutes: effectiveDuration,
      additional_context: additionalContext.trim() || undefined,
    })
  }

  return (
    <>
      {templateModalOpen && (
        <TemplateBrowserModal
          type="general"
          onSelect={handleTemplateSelect}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          {/* Language + persona badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full border border-gray-200">
              <Globe size={11} />
              {language}
            </span>

          </div>

          {/* Heading with inline agent name */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold text-gray-900 whitespace-nowrap">
              Design your session with
            </h2>
            <input
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Agent name"
              className="text-2xl font-semibold text-indigo-600 bg-transparent border-b-2 border-indigo-200 focus:border-indigo-500 focus:outline-none placeholder:text-indigo-300 min-w-[120px] w-auto transition-colors duration-[120ms]"
              style={{ width: `${Math.max(agentName.length || 12, 12)}ch` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the session details or start from a template.
          </p>

          {/* Template selector */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-[120ms]"
            >
              <LayoutTemplate size={14} />
              Browse templates
            </button>
            {GENERAL_TEMPLATES.slice(0, 3).map(t => (
              <button
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
                className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors duration-[120ms]"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">
          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Session duration
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {DURATION_PILLS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setIsCustomDuration(false) }}
                  className={`px-4 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
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
                className={`px-4 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                  isCustomDuration
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Custom
              </button>
              {isCustomDuration && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customDuration}
                    onChange={e => setCustomDuration(e.target.value)}
                    placeholder="20"
                    autoFocus
                    className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
              )}
            </div>
          </div>

          {/* Session objective */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Session objective
            </label>
            <p className="text-xs text-gray-400 mb-2">
              What is this session trying to achieve?
            </p>
            <textarea
              ref={objectiveRef}
              value={sessionObjective}
              onChange={e => setSessionObjective(e.target.value)}
              placeholder="e.g. Conduct a rigorous oral examination of the participant's thesis"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {OBJECTIVE_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(sessionObjective, chip, setSessionObjective, objectiveRef)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
                >
                  {chip.replace('---', '[topic]')}
                </button>
              ))}
            </div>
          </div>

          {/* Agent role */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              {agentName || 'Agent'}'s role in this session
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Who is {agentName || 'the agent'} in this session? Define the persona and behaviour.
            </p>
            <textarea
              ref={agentRoleRef}
              value={agentRole}
              onChange={e => setAgentRole(e.target.value)}
              placeholder="e.g. A rigorous oral examiner probing depth of understanding and academic reasoning"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AGENT_ROLE_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(agentRole, chip, setAgentRole, agentRoleRef)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
                >
                  {chip.replace('---', '[topic]')}
                </button>
              ))}
            </div>
          </div>

          {/* Participant role */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Who is joining this session?
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Describe the participant's background and purpose in this session
            </p>
            <textarea
              ref={participantRef}
              value={participantRole}
              onChange={e => setParticipantRole(e.target.value)}
              placeholder="e.g. A postgraduate student defending their thesis"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PARTICIPANT_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(participantRole, chip, setParticipantRole, participantRef)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
                >
                  {chip.replace('---', '[field]')}
                </button>
              ))}
            </div>
          </div>

          {/* Communication style */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Communication style
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {STYLE_PILLS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                    style === s.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional context */}
          {showAdditional ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional context{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Any extra context that should shape the agent's behaviour..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdditional(true)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]"
            >
              + Add additional context (optional)
            </button>
          )}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 pt-4 border-t border-gray-100">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-[120ms] ${
              canContinue
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
