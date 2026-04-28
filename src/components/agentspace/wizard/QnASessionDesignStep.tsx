import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Clock, FileText, Globe, Image, Loader2, Upload, X } from 'lucide-react'
import type { QnASessionDesignRequest } from '../../../lib/api'
import AutoExpandTextarea from './AutoExpandTextarea'

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
  initialValues?: Partial<QnASessionDesignRequest>
  defaultAgentName?: string
  onChange: (design: QnASessionDesignRequest | null) => void
}

// ── Suggestion data ────────────────────────────────────────────────────────────

const DURATION_PILLS = [10, 15, 30] as const

const OBJECTIVE_CHIPS = [
  { label: 'Knowledge check',   value: "Assess the participant's knowledge of --- through structured questioning" },
  { label: 'Topic review',      value: 'Test understanding of --- across key topics and concepts' },
  { label: 'Applied skills',    value: "Evaluate the participant's ability to apply --- in context" },
  { label: 'Comprehension',     value: 'Review comprehension of --- using targeted follow-up questions' },
]

const AGENT_ROLE_CHIPS = [
  { label: 'Formal examiner',  value: 'A formal examiner testing knowledge of --- with follow-up probing' },
  { label: 'Supportive tutor', value: 'A supportive tutor checking understanding and providing feedback on ---' },
  { label: 'Neutral assessor', value: 'A neutral assessor evaluating knowledge of --- without bias' },
  { label: 'Rigorous evaluator', value: 'A rigorous evaluator challenging the participant on --- under pressure' },
]

const PARTICIPANT_CHIPS = [
  { label: 'Exam student',    value: 'A student revising for or sitting a formal assessment' },
  { label: 'Professional',    value: 'A professional verifying their knowledge in a specific domain' },
  { label: 'Language learner', value: 'A language learner testing vocabulary and comprehension' },
  { label: 'Job candidate',   value: 'A job candidate completing a knowledge screening test' },
]

const STYLE_OPTIONS = [
  { label: 'Conversational', value: 'Conversational', desc: 'Relaxed, natural flow' },
  { label: 'Formal',         value: 'Formal',         desc: 'Professional, structured' },
  { label: 'Coaching',       value: 'Coaching',       desc: 'Supportive, guiding' },
  { label: 'Strict',         value: 'Strict',         desc: 'Rigorous, no-nonsense' },
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

export default function QnASessionDesignStep({ language, initialValues, defaultAgentName, onChange }: Props) {
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
  const [feedbackMode, setFeedbackMode] = useState<'silent' | 'feedback'>(() => initialValues?.feedback_mode ?? 'silent')
  const [additionalContext, setAdditionalContext] = useState(() => initialValues?.additional_context ?? '')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [files, setFiles] = useState<AttachedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleFiles(incoming: File[]) {
    setFileError(null)
    const allowed = incoming.filter(f => isPdfFile(f) || isTxtFile(f) || isImageFile(f))
    if (allowed.length !== incoming.length) setFileError('Only PDF, .txt, JPG, PNG, and WebP files are supported.')
    if (allowed.length === 0) return
    if (files.length + allowed.length > 3) { setFileError('Maximum 3 files allowed.'); return }

    const oversized = allowed.filter(f => f.size > (isImageFile(f) ? 2 * 1024 * 1024 : 5 * 1024 * 1024))
    if (oversized.length > 0) { setFileError(isImageFile(oversized[0]) ? 'Images must be under 2 MB.' : 'Files must be under 5 MB.'); return }

    setFileProcessing(true)
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
    } finally {
      setFileProcessing(false)
    }
  }

  function removeFile(idx: number) { setFiles(prev => prev.filter((_, i) => i !== idx)) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files))
  }

  useEffect(() => {
    if (!canContinue || effectiveDuration === null) { onChange(null); return }
    const resourceText = files.filter(f => f.fileType === 'text').map(f => f.text).join('\n\n')
    const resourceImages = [
      ...files.filter(f => f.fileType === 'image').map(f => f.dataUri!),
      ...files.filter(f => f.fileType === 'scanned-pdf').flatMap(f => f.pageImages!),
    ]
    onChange({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, sessionObjective, agentRole, participantRole, style, duration, customDuration, isCustomDuration, feedbackMode, additionalContext, files])

  const summaryFilled = agentName.trim() || agentRole.trim() || participantRole.trim() || effectiveDuration || style || sessionObjective.trim()

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {language && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full border border-gray-200">
              <Globe size={11} />
              {language}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Design your assessment</h2>
        <p className="text-sm text-gray-500 mt-1">Define who the agent is and what the session should accomplish.</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 items-start">

        {/* ── Left: Form fields ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Agent name + duration row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Agent name</label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. Prof. Chen"
                className="w-full text-base text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              />
            </div>

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
                placeholder="e.g. Assess understanding of data structures through structured questioning…"
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
                placeholder="e.g. A formal examiner testing knowledge of the subject with follow-up probing…"
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
              placeholder="e.g. A student revising for or sitting a formal assessment…"
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

          {/* After-answer feedback mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">After each answer</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackMode('silent')}
                className={`flex-1 px-3 py-2.5 text-sm rounded-lg border text-left transition-all duration-[120ms] ${
                  feedbackMode === 'silent'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="block font-medium">Move on silently</span>
                <span className={`block text-xs mt-0.5 ${feedbackMode === 'silent' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  No immediate feedback
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackMode('feedback')}
                className={`flex-1 px-3 py-2.5 text-sm rounded-lg border text-left transition-all duration-[120ms] ${
                  feedbackMode === 'feedback'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="block font-medium">Give brief feedback</span>
                <span className={`block text-xs mt-0.5 ${feedbackMode === 'feedback' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  Comment before next question
                </span>
              </button>
            </div>
          </div>

          {/* File attachment */}
          <div>
            <div className="mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Source material <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <p className="text-xs text-gray-400 mt-0.5">Questions are generated from this content — assignments, quizzes, notes, or any reference doc.</p>
            </div>
            <div
              onDragEnter={e => { e.preventDefault(); setDragging(true) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-4 py-3 text-center cursor-pointer transition-all duration-[120ms] ${
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
              {fileProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 text-indigo-500 mx-auto mb-1 animate-spin" />
                  <p className="text-sm text-indigo-600">Reading file…</p>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Drop files or click to browse</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, .txt, images — max 3 files · does not affect agent persona</p>
                </>
              )}
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
              <div className="flex flex-col gap-1 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    {f.fileType === 'text'
                      ? <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      : <Image className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    }
                    <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                    {f.fileType === 'scanned-pdf' && (
                      <span className="text-xs text-gray-400 shrink-0">{f.pageImages!.length}p</span>
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
                      <><span className="font-medium text-gray-800">{style.toLowerCase()}</span>{' '}assessment{' '}</>
                    ) : (
                      <>assessment{' '}</>
                    )}
                    {participantRole.trim() ? (
                      <>with <span className="font-medium text-gray-800">{participantRole.trim().toLowerCase()}</span>.</>
                    ) : (
                      <>— participant not set.</>
                    )}
                  </p>
                )}

                {feedbackMode === 'feedback' && (
                  <p className="text-xs text-gray-500">Brief feedback given after each answer.</p>
                )}

                {sessionObjective.trim() && (
                  <p className="text-gray-500 text-xs border-t border-gray-100 pt-3 mt-3">
                    <span className="font-medium text-gray-600">Objective:</span>{' '}
                    {sessionObjective.trim()}
                  </p>
                )}

                {files.length > 0 && (
                  <p className="text-xs text-gray-400">{files.length} resource file{files.length > 1 ? 's' : ''} attached.</p>
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
                { label: 'Agent name',  filled: !!agentName.trim() },
                { label: 'Objective',   filled: !!sessionObjective.trim() },
                { label: 'Agent role',  filled: !!agentRole.trim() },
                { label: 'Participant', filled: !!participantRole.trim() },
                { label: 'Style',       filled: !!style },
                { label: 'Duration',    filled: effectiveDuration !== null && effectiveDuration > 0 },
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
