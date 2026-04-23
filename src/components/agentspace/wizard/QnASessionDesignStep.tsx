import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, FileText, Globe, Image, LayoutTemplate, Upload, X } from 'lucide-react'
import type { QnASessionDesignRequest } from '../../../lib/api'
import {
  QNA_TEMPLATES,
  qnaTemplateToSessionDesign,
  type QnAAgentTemplate,
} from '../../../lib/agentTemplates'
import TemplateBrowserModal from './TemplateBrowserModal'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string
  fileType: 'text' | 'image' | 'scanned-pdf'
  text: string
  dataUri?: string
  pageImages?: string[]
}

interface Props {
  language: string
  onContinue: (design: QnASessionDesignRequest) => void
}

// ── Suggestion data ────────────────────────────────────────────────────────────

const DURATION_PILLS = [10, 15, 30] as const

const OBJECTIVE_CHIPS = [
  'Assess the participant\'s knowledge of --- through structured questioning',
  'Test understanding of --- across key topics and concepts',
  'Evaluate the participant\'s ability to apply --- in context',
  'Review comprehension of --- using targeted follow-up questions',
]

const AGENT_ROLE_CHIPS = [
  'A formal examiner testing knowledge of --- with follow-up probing',
  'A supportive tutor checking understanding and providing feedback on ---',
  'A neutral assessor evaluating knowledge of --- without bias',
  'A rigorous evaluator challenging the participant on --- under pressure',
]

const PARTICIPANT_CHIPS = [
  'A student revising for or sitting a formal assessment',
  'A professional verifying their knowledge in a specific domain',
  'A language learner testing vocabulary and comprehension',
  'A job candidate completing a knowledge screening test',
  'A researcher reviewing their understanding of a subject area',
]

const STYLE_PILLS = [
  { label: 'Conversational', value: 'Conversational' },
  { label: 'Formal', value: 'Formal' },
  { label: 'Coaching', value: 'Coaching' },
  { label: 'Strict', value: 'Strict' },
] as const

// ── File helpers ───────────────────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve((e.target?.result as string) ?? '')
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

async function extractPdfContent(file: File): Promise<{ text: string; pageImages: string[] }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise

  const textParts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    textParts.push(content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '))
  }
  const text = textParts.join('\n').trim()
  if (text) return { text, pageImages: [] }

  const pageImages: string[] = []
  const pageCount = Math.min(3, pdf.numPages)
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, canvas, viewport }).promise
    pageImages.push(canvas.toDataURL('image/jpeg', 0.7))
  }
  return { text: '', pageImages }
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function isImageFile(file: File) {
  return IMAGE_TYPES.has(file.type) || IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
}
function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
function isTxtFile(file: File) {
  return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
}
function imageSlotCount(list: AttachedFile[]) {
  return list.filter(f => f.fileType === 'image' || f.fileType === 'scanned-pdf').length
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QnASessionDesignStep({ language, onContinue }: Props) {
  const [agentName, setAgentName] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [sessionObjective, setSessionObjective] = useState('')
  const [agentRole, setAgentRole] = useState('')
  const [participantRole, setParticipantRole] = useState('')
  const [style, setStyle] = useState('')
  const [feedbackMode, setFeedbackMode] = useState<'silent' | 'feedback'>('silent')
  const [additionalContext, setAdditionalContext] = useState('')
  const [showAdditional, setShowAdditional] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  const [files, setFiles] = useState<AttachedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleTemplateSelect(template: QnAAgentTemplate) {
    const design = qnaTemplateToSessionDesign(template, template.suggested_name)
    setAgentName(design.agent_name)
    setSessionObjective(design.session_objective)
    setAgentRole(design.agent_role)
    setParticipantRole(design.participant_role)
    setStyle(design.communication_style)
    setFeedbackMode(design.feedback_mode)
    const idx = DURATION_PILLS.indexOf(design.session_duration_minutes as typeof DURATION_PILLS[number])
    if (idx !== -1) {
      setDuration(design.session_duration_minutes)
      setIsCustomDuration(false)
    } else {
      setIsCustomDuration(true)
      setCustomDuration(String(design.session_duration_minutes))
    }
  }

  async function handleFiles(incoming: File[]) {
    setFileError(null)
    const allowed = incoming.filter(f => isPdfFile(f) || isTxtFile(f) || isImageFile(f))
    if (allowed.length !== incoming.length) setFileError('Only PDF, .txt, JPG, PNG, and WebP files are supported.')
    if (allowed.length === 0) return
    if (files.length + allowed.length > 3) { setFileError('Maximum 3 files allowed.'); return }

    const oversized = allowed.filter(f => f.size > (isImageFile(f) ? 2 * 1024 * 1024 : 5 * 1024 * 1024))
    if (oversized.length > 0) { setFileError(isImageFile(oversized[0]) ? 'Images must be under 2 MB.' : 'Files must be under 5 MB.'); return }

    try {
      const results: AttachedFile[] = []
      for (const file of allowed) {
        if (isTxtFile(file)) {
          results.push({ name: file.name, fileType: 'text', text: await readFileAsText(file) })
        } else if (isPdfFile(file)) {
          const { text, pageImages } = await extractPdfContent(file)
          if (text) {
            results.push({ name: file.name, fileType: 'text', text })
          } else {
            if (imageSlotCount(files) + imageSlotCount(results) >= 2) { setFileError('Maximum 2 images allowed.'); continue }
            results.push({ name: file.name, fileType: 'scanned-pdf', text: '', pageImages })
          }
        } else {
          if (imageSlotCount(files) + imageSlotCount(results) >= 2) { setFileError('Maximum 2 images allowed.'); continue }
          const b64 = arrayBufferToBase64(await file.arrayBuffer())
          results.push({ name: file.name, fileType: 'image', text: '', dataUri: `data:${file.type};base64,${b64}` })
        }
      }
      if (results.length > 0) setFiles(prev => [...prev, ...results])
    } catch {
      setFileError('Could not read file. Please try again.')
    }
  }

  function removeFile(idx: number) { setFiles(prev => prev.filter((_, i) => i !== idx)) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files))
  }

  function handleContinue() {
    if (!canContinue || effectiveDuration === null) return
    const resourceText = files.filter(f => f.fileType === 'text').map(f => f.text).join('\n\n')
    const resourceImages = [
      ...files.filter(f => f.fileType === 'image').map(f => f.dataUri!),
      ...files.filter(f => f.fileType === 'scanned-pdf').flatMap(f => f.pageImages!),
    ]
    onContinue({
      agent_name: agentName.trim(),
      session_objective: sessionObjective.trim(),
      agent_role: agentRole.trim(),
      participant_role: participantRole.trim(),
      communication_style: style,
      session_duration_minutes: effectiveDuration,
      feedback_mode: feedbackMode,
      resource_text: resourceText || undefined,
      resource_images: resourceImages.length > 0 ? resourceImages : undefined,
      additional_context: additionalContext.trim() || undefined,
    })
  }

  return (
    <>
      {templateModalOpen && (
        <TemplateBrowserModal
          type="qna"
          onSelect={handleTemplateSelect}
          onClose={() => setTemplateModalOpen(false)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full border border-gray-200">
              <Globe size={11} />
              {language}
            </span>

          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold text-gray-900 whitespace-nowrap">
              Design your assessment with
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

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-[120ms]"
            >
              <LayoutTemplate size={14} />
              Browse templates
            </button>
            {QNA_TEMPLATES.slice(0, 3).map(t => (
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
            <label className="block text-sm font-medium text-gray-800 mb-2">Session duration</label>
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
            <label className="block text-sm font-medium text-gray-800 mb-1">Session objective</label>
            <p className="text-xs text-gray-400 mb-2">What topics or knowledge areas is this assessment covering?</p>
            <textarea
              ref={objectiveRef}
              value={sessionObjective}
              onChange={e => setSessionObjective(e.target.value)}
              placeholder="e.g. Assess understanding of data structures and algorithms through structured questioning"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {OBJECTIVE_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(chip, setSessionObjective, objectiveRef)}
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
              {agentName || 'Agent'}'s role
            </label>
            <p className="text-xs text-gray-400 mb-2">How should {agentName || 'the agent'} behave during questioning?</p>
            <textarea
              ref={agentRoleRef}
              value={agentRole}
              onChange={e => setAgentRole(e.target.value)}
              placeholder="e.g. A formal examiner testing knowledge with targeted follow-up questions"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AGENT_ROLE_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(chip, setAgentRole, agentRoleRef)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
                >
                  {chip.replace('---', '[topic]')}
                </button>
              ))}
            </div>
          </div>

          {/* Participant role */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Who is being assessed?</label>
            <p className="text-xs text-gray-400 mb-2">Describe the participant's background and purpose</p>
            <textarea
              ref={participantRef}
              value={participantRole}
              onChange={e => setParticipantRole(e.target.value)}
              placeholder="e.g. A student revising for a mid-semester assessment"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PARTICIPANT_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(chip, setParticipantRole, participantRef)}
                  className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Communication style */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Communication style</label>
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

          {/* Feedback mode */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              After each answer, {agentName || 'the agent'} should
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setFeedbackMode('silent')}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-[120ms] ${
                  feedbackMode === 'silent'
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  feedbackMode === 'silent' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Move on silently</p>
                  <p className="text-xs text-gray-500 mt-0.5">Acknowledge briefly and continue to the next question</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackMode('feedback')}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-[120ms] ${
                  feedbackMode === 'feedback'
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  feedbackMode === 'feedback' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Give brief feedback</p>
                  <p className="text-xs text-gray-500 mt-0.5">One sentence of targeted response before moving on</p>
                </div>
              </button>
            </div>
          </div>

          {/* Resource materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference materials{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Upload course notes, textbook pages, or images to ground the questions
            </p>
            <div
              onDragEnter={e => { e.preventDefault(); setDragging(true) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-all duration-[120ms] ${
                dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,text/plain,application/pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files) handleFiles(Array.from(e.target.files)); e.target.value = '' }}
              />
              <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
              <p className="text-sm text-gray-500">Drop files or click to browse</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, .txt, JPG/PNG/WebP — max 3 files</p>
            </div>

            <AnimatePresence>
              {fileError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-600 mt-1.5"
                >
                  {fileError}
                </motion.p>
              )}
            </AnimatePresence>

            {files.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    {f.fileType === 'text'
                      ? <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      : <Image className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    }
                    <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                    {f.fileType === 'scanned-pdf' && (
                      <span className="text-xs text-gray-400 shrink-0">{f.pageImages!.length}p scanned</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(i) }}
                      className="text-gray-400 hover:text-gray-700 transition-colors duration-[120ms]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-[120ms] flex items-center justify-center gap-2 ${
              canContinue
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Brain className="w-4 h-4" />
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
