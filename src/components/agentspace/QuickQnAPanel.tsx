import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, ChevronDown, ChevronUp, Copy, FileText, Image,
  Link2, Loader2, MessageSquare, Pencil, Settings2,
  Tag, ToggleLeft, ToggleRight, Upload, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useScrollLock } from '../../hooks/useScrollLock'
import {
  compileQnAAgent,
  fetchVoicePreviewBlob,
  fetchVoices,
  generateEvaluationCriteria,
  generateQnAQuestions,
  saveQnAAgent,
  toggleAgentStatus,
  updateAgent,
  updateAgentQuestionBank,
  type Agent,
  type LanguageVoiceOption,
  type QnAQuestion,
  type QnAQuestionBank,
} from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelPhase = 'form' | 'converting' | 'done'
type StepStatus = 'pending' | 'active' | 'done' | 'error'

interface StepState {
  questions: StepStatus
  agent: StepStatus
  eval: StepStatus
  saving: StepStatus
}

interface AttachedFile {
  name: string
  fileType: 'text' | 'image' | 'scanned-pdf'
  text: string
  dataUri?: string
  pageImages?: string[]
}

// ── File helpers ──────────────────────────────────────────────────────────────

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
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
const isImageFile = (f: File) => IMAGE_TYPES.has(f.type) || IMAGE_EXTS.some(e => f.name.toLowerCase().endsWith(e))
const isPdfFile = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
const isTxtFile = (f: File) => f.type === 'text/plain' || f.name.toLowerCase().endsWith('.txt')
const imageSlotCount = (list: AttachedFile[]) => list.filter(f => f.fileType === 'image' || f.fileType === 'scanned-pdf').length

function cleanFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  agentspaceId: string
  onClose: () => void
  onCreated: (agent: Agent) => void
  onConfigure?: (agent: Agent) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickQnAPanel({ open, agentspaceId, onClose, onCreated, onConfigure }: Props) {
  const { session } = useAuth()
  useScrollLock(open)

  const [phase, setPhase] = useState<PanelPhase>('form')

  // form
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [topic, setTopic] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [feedbackMode, setFeedbackMode] = useState<'silent' | 'feedback'>('silent')

  // lang / voice
  const [languages, setLanguages] = useState<LanguageVoiceOption[]>([])
  const [langLoading, setLangLoading] = useState(true)
  const [langSearch, setLangSearch] = useState('')
  const [langDropOpen, setLangDropOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const langDropRef = useRef<HTMLDivElement>(null)
  const [loadingPref, setLoadingPref] = useState<string | null>(null)
  const [playingPref, setPlayingPref] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const activePlayRef = useRef<{ pref: string; cancelled: boolean } | null>(null)

  // converting
  const [steps, setSteps] = useState<StepState>({ questions: 'pending', agent: 'pending', eval: 'pending', saving: 'pending' })
  const [convertError, setConvertError] = useState<string | null>(null)

  // done
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)
  const [questionsOpen, setQuestionsOpen] = useState(true)
  const [editingBank, setEditingBank] = useState<QnAQuestionBank | null>(null)
  const [savingBank, setSavingBank] = useState(false)

  const activeLang = languages.find(l => l.key === selectedLang) ?? null
  const selectedVoiceName = activeLang?.voices.find(v => v.preference === selectedPref)?.voice_name ?? ''
  const canConvert = topic.trim().length > 0 && selectedLang !== null && selectedPref !== null

  // reset on open
  useEffect(() => {
    if (!open) return
    setPhase('form')
    setFiles([])
    setFileError(null)
    setFileProcessing(false)
    setDragging(false)
    setTopic('')
    setAdditionalContext('')
    setFeedbackMode('silent')
    setLangSearch('')
    setLangDropOpen(false)
    setSteps({ questions: 'pending', agent: 'pending', eval: 'pending', saving: 'pending' })
    setConvertError(null)
    setSavedAgent(null)
    setQuestionsOpen(true)
    setEditingBank(null)
  }, [open])

  // load voices once
  useEffect(() => {
    if (!open || languages.length > 0) return
    setLangLoading(true)
    fetchVoices()
      .then(data => {
        setLanguages(data.languages)
        const en = data.languages.find(l => l.key === 'en') ?? data.languages[0]
        if (en) {
          setSelectedLang(en.key)
          const male1 = en.voices.find(v => v.preference === 'male1')
          setSelectedPref(male1?.preference ?? en.voices[0]?.preference ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLangLoading(false))
  }, [open, languages.length])

  // click-outside lang dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langDropRef.current && !langDropRef.current.contains(e.target as Node)) {
        setLangDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // audio cleanup
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }, [])

  // ── File handling ─────────────────────────────────────────────────────────

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
      if (results.length === 0) return
      setFiles(prev => {
        const next = [...prev, ...results]
        if (!topic.trim() && results[0]) setTopic(cleanFilename(results[0].name))
        return next
      })
    } catch {
      setFileError('Could not read file. Please try again.')
    } finally {
      setFileProcessing(false)
    }
  }

  // ── Language / voice ──────────────────────────────────────────────────────

  function selectLang(key: string) {
    const lang = languages.find(l => l.key === key)
    setSelectedLang(key)
    setSelectedPref(lang?.voices[0]?.preference ?? null)
    setLangDropOpen(false)
    setLangSearch('')
    stopAudio()
  }

  function stopAudio() {
    if (activePlayRef.current) activePlayRef.current.cancelled = true
    activePlayRef.current = null
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
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
      const blob = await fetchVoicePreviewBlob(selectedLang!, pref)
      if (ctx.cancelled) return
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { if (!ctx.cancelled) setPlayingPref(null) }
      audio.onerror = () => { if (!ctx.cancelled) { setPlayingPref(null); setLoadingPref(null) } }
      const p = audio.play()
      if (p !== undefined) {
        p.then(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) } })
         .catch(() => { if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) } })
      } else {
        if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(pref) }
      }
    } catch {
      if (!ctx.cancelled) { setLoadingPref(null); setPlayingPref(null) }
    }
  }

  // ── Convert ───────────────────────────────────────────────────────────────

  function markStep(id: keyof StepState, status: StepStatus) {
    setSteps(prev => ({ ...prev, [id]: status }))
  }

  async function handleConvert() {
    if (!canConvert || !session) return
    const token = session.access_token
    const resourceText = files.filter(f => f.fileType === 'text').map(f => f.text).join('\n\n')
    const resourceImages = [
      ...files.filter(f => f.fileType === 'image').map(f => f.dataUri!),
      ...files.filter(f => f.fileType === 'scanned-pdf').flatMap(f => f.pageImages!),
    ]
    const context = additionalContext.trim()
      ? `${topic.trim()}\n\n${additionalContext.trim()}`
      : topic.trim()

    setPhase('converting')
    setConvertError(null)
    setSteps({ questions: 'active', agent: 'active', eval: 'pending', saving: 'pending' })

    try {
      const questionsPromise = generateQnAQuestions(token, {
        context,
        resource_text: resourceText || undefined,
        resource_images: resourceImages.length ? resourceImages : undefined,
      }).then(r => { markStep('questions', 'done'); return r })

      const compileAndEvalPromise = compileQnAAgent(token, {
        session_design: {
          agent_name: selectedVoiceName,
          session_objective: topic.trim(),
          agent_role: 'A neutral assessor evaluating knowledge without bias',
          participant_role: 'A candidate completing a knowledge assessment',
          communication_style: 'Conversational',
          session_duration_minutes: 15,
          feedback_mode: feedbackMode,
          additional_context: additionalContext.trim() || undefined,
          resource_text: resourceText || undefined,
          resource_images: resourceImages.length ? resourceImages : undefined,
        },
      }).then(async compile => {
        markStep('agent', 'done')
        markStep('eval', 'active')
        const ctx = compile.spec.session_context
        const evalResult = await generateEvaluationCriteria(token, {
          session_brief: ctx?.session_brief ?? '',
          competency: '',
          strong_performance: '',
          weak_performance: '',
          additional: ctx
            ? [
                `Agent role: ${ctx.agent_role}`,
                `Participant: ${ctx.participant_role}`,
                `Objective: ${ctx.session_objective}`,
                `Style: ${ctx.communication_style}`,
                `Duration: ${ctx.session_duration_minutes} min`,
              ].join('\n')
            : '',
        })
        markStep('eval', 'done')
        return { compile, evalResult }
      })

      const [questionsRes, { compile, evalResult }] = await Promise.all([
        questionsPromise,
        compileAndEvalPromise,
      ])

      const fixedQs: QnAQuestion[] = questionsRes.questions
        .filter(q => q.type === 'fixed')
        .map(q => ({ id: crypto.randomUUID(), text: q.text, cross_question_enabled: q.cross_question_enabled }))
      const randomizedPool: QnAQuestion[] = questionsRes.questions
        .filter(q => q.type === 'randomized')
        .map(q => ({ id: crypto.randomUUID(), text: q.text, cross_question_enabled: q.cross_question_enabled }))
      const questionBank: QnAQuestionBank = { fixed: fixedQs, randomized_pool: randomizedPool, randomized_count: 5 }

      markStep('saving', 'active')
      const agent = await saveQnAAgent(token, agentspaceId, {
        agent_name: selectedVoiceName,
        agent_display_label: compile.agent_display_label || undefined,
        agent_prompt: { ...compile.spec, question_bank: questionBank },
        agent_language: selectedLang!,
        agent_voice: selectedVoiceName,
        agent_first_speaker: 'agent',
        transcript_evaluation_metrics: evalResult,
        session_design_config: {
          agent_name: selectedVoiceName,
          session_objective: topic.trim(),
          agent_role: 'A neutral assessor evaluating knowledge without bias',
          participant_role: 'A candidate completing a knowledge assessment',
          communication_style: 'Conversational',
          session_duration_minutes: 15,
          feedback_mode: feedbackMode,
          additional_context: additionalContext.trim() || undefined,
        },
        eval_config: { mode: 'auto' },
      })
      markStep('saving', 'done')

      setEditingBank(questionBank)
      setSavedAgent(agent)
      onCreated(agent)
      setTimeout(() => setPhase('done'), 500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      setConvertError(msg)
      setSteps(prev => ({
        questions: prev.questions === 'active' ? 'error' : prev.questions,
        agent: prev.agent === 'active' ? 'error' : prev.agent,
        eval: prev.eval === 'active' ? 'error' : prev.eval,
        saving: prev.saving === 'active' ? 'error' : prev.saving,
      }))
    }
  }

  // ── Question edit ─────────────────────────────────────────────────────────

  async function saveQuestionEdit(section: 'fixed' | 'randomized', idx: number, newText: string) {
    if (!savedAgent || !editingBank || !session) return
    const trimmed = newText.trim()
    if (!trimmed) return
    const updatedBank: QnAQuestionBank = {
      ...editingBank,
      fixed: section === 'fixed'
        ? editingBank.fixed.map((q, i) => i === idx ? { ...q, text: trimmed } : q)
        : editingBank.fixed,
      randomized_pool: section === 'randomized'
        ? editingBank.randomized_pool.map((q, i) => i === idx ? { ...q, text: trimmed } : q)
        : editingBank.randomized_pool,
    }
    setEditingBank(updatedBank)
    setSavingBank(true)
    try {
      await updateAgentQuestionBank(session.access_token, savedAgent.id, updatedBank)
    } catch { /* silent */ } finally {
      setSavingBank(false)
    }
  }

  if (!open) return null

  const filteredLangs = languages.filter(l =>
    l.display_name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.key.toLowerCase().includes(langSearch.toLowerCase()),
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={phase === 'form' ? onClose : undefined}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-white shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-900">Doc to Session</span>
                <span className="text-xs text-gray-400 font-normal">— instant QnA agent</span>
              </div>
              <button
                onClick={onClose}
                disabled={phase === 'converting'}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto">

              {/* ── FORM PHASE ─────────────────────────────────────────────── */}
              {phase === 'form' && (
                <div className="px-5 py-5 space-y-5">

                  {/* Source material */}
                  <div>
                    <div className="mb-1.5">
                      <p className="text-sm font-medium text-gray-700">Source material</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Questions are generated from this content. PDF, .txt, or images — up to 3 files.
                      </p>
                    </div>
                    <div
                      onDragEnter={e => { e.preventDefault(); setDragging(true) }}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
                      onClick={() => !fileProcessing && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg px-4 py-4 text-center duration-[120ms] ${
                        fileProcessing
                          ? 'border-indigo-300 bg-indigo-50 cursor-wait'
                          : dragging
                          ? 'border-indigo-400 bg-indigo-50 cursor-copy'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
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
                          <p className="text-xs text-gray-400 mt-0.5">Does not affect agent persona</p>
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
                              onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)) }}
                              className="text-gray-400 hover:text-gray-700 duration-[120ms]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Topic <span className="text-xs font-normal text-gray-400">— what this assesses</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. Python data structures, 2nd year CS"
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent duration-[120ms]"
                    />
                  </div>

                  {/* Additional context */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Additional context <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={additionalContext}
                      onChange={e => setAdditionalContext(e.target.value)}
                      placeholder="e.g. Mid-semester exam, focus on practical application, undergraduate level"
                      rows={2}
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent duration-[120ms]"
                    />
                  </div>

                  {/* Feedback mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">After each answer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'silent', label: 'Move on silently', desc: 'No immediate feedback' },
                        { value: 'feedback', label: 'Give brief feedback', desc: 'Comment before next question' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFeedbackMode(opt.value)}
                          className={`text-left px-3 py-2.5 text-sm rounded-lg border duration-[120ms] ${
                            feedbackMode === opt.value
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="block font-medium">{opt.label}</span>
                          <span className={`block text-xs mt-0.5 ${feedbackMode === opt.value ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {opt.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language + Voice */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Language &amp; Voice</label>
                    {langLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-sm text-gray-400">Loading voices…</span>
                      </div>
                    ) : (
                      <>
                        <div ref={langDropRef} className="relative mb-2">
                          <button
                            type="button"
                            onClick={() => setLangDropOpen(o => !o)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 duration-[120ms]"
                          >
                            <span className="font-medium">{activeLang?.display_name ?? 'Select language'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 duration-[120ms] ${langDropOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {langDropOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden"
                              >
                                <div className="p-2 border-b border-gray-100">
                                  <input
                                    type="text"
                                    placeholder="Search languages…"
                                    value={langSearch}
                                    onChange={e => setLangSearch(e.target.value)}
                                    autoFocus
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto p-1">
                                  {filteredLangs.map(lang => (
                                    <button
                                      key={lang.key}
                                      type="button"
                                      onClick={() => selectLang(lang.key)}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm duration-[120ms] ${
                                        selectedLang === lang.key
                                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                                          : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="text-[10px] font-bold text-gray-400 w-6 shrink-0">
                                        {lang.key.toUpperCase()}
                                      </span>
                                      {lang.display_name}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {activeLang && (
                          <div className="grid grid-cols-2 gap-2">
                            {activeLang.voices.map(voice => {
                              const isActive = selectedPref === voice.preference
                              const isLoading = loadingPref === voice.preference
                              const isPlaying = playingPref === voice.preference
                              const isFemale = voice.preference.startsWith('female')
                              return (
                                <div
                                  key={voice.preference}
                                  onClick={() => setSelectedPref(voice.preference)}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer duration-[120ms] ${
                                    isActive
                                      ? 'border-indigo-600 bg-indigo-50'
                                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                                      isActive ? 'bg-indigo-100 text-indigo-500'
                                        : isFemale ? 'bg-pink-50 text-pink-400'
                                        : 'bg-sky-50 text-sky-400'
                                    }`}>
                                      {isFemale ? 'F' : 'M'}
                                    </span>
                                    <span className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                                      {voice.voice_name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={e => { e.stopPropagation(); handlePlay(voice.preference) }}
                                    className={`shrink-0 p-1 rounded duration-[120ms] ${
                                      isLoading ? 'text-gray-400 cursor-wait'
                                        : isPlaying ? 'text-indigo-600'
                                        : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                  >
                                    {isLoading
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : isPlaying
                                      ? <VolumeX className="w-3.5 h-3.5" />
                                      : <Volume2 className="w-3.5 h-3.5" />
                                    }
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── CONVERTING PHASE ───────────────────────────────────────── */}
              {phase === 'converting' && (
                <ConvertingPhase steps={steps} error={convertError} onRetry={() => setPhase('form')} />
              )}

              {/* ── DONE PHASE ─────────────────────────────────────────────── */}
              {phase === 'done' && savedAgent && editingBank && session && (
                <DonePhase
                  agent={savedAgent}
                  token={session.access_token}
                  questionsOpen={questionsOpen}
                  editingBank={editingBank}
                  savingBank={savingBank}
                  onToggleQuestions={() => setQuestionsOpen(o => !o)}
                  onQuestionEdit={saveQuestionEdit}
                  onConfigure={onConfigure ? () => onConfigure(savedAgent) : undefined}
                  onClose={onClose}
                />
              )}
            </div>

            {/* Footer — form only */}
            {phase === 'form' && (
              <div className="shrink-0 border-t border-gray-100 px-5 py-4">
                <button
                  onClick={handleConvert}
                  disabled={!canConvert}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 duration-[120ms] ${
                    canConvert
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Convert to QnA Agent
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Converting phase ──────────────────────────────────────────────────────────

const STEP_META: { id: keyof StepState; label: string; sublabel: string }[] = [
  { id: 'questions', label: 'Generating questions',  sublabel: 'Reading source material' },
  { id: 'agent',     label: 'Building agent',        sublabel: 'Compiling persona & behavior' },
  { id: 'eval',      label: 'Writing evaluation',    sublabel: 'Creating scoring metrics' },
  { id: 'saving',    label: 'Saving',                sublabel: 'Publishing to your space' },
]

function ConvertingPhase({
  steps,
  error,
  onRetry,
}: {
  steps: StepState
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="px-5 py-8 flex flex-col gap-3">
      {STEP_META.map(({ id, label, sublabel }) => {
        const status = steps[id]
        return (
          <div key={id} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
              status === 'done'    ? 'bg-indigo-600'
              : status === 'active' ? 'bg-indigo-50 border border-indigo-200'
              : status === 'error'  ? 'bg-red-50 border border-red-200'
              : 'bg-gray-100'
            }`}>
              {status === 'done'   && <Check className="w-3.5 h-3.5 text-white" />}
              {status === 'active' && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
              {status === 'error'  && <X className="w-3.5 h-3.5 text-red-500" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${
                status === 'done'    ? 'text-gray-900'
                : status === 'active' ? 'text-indigo-700'
                : status === 'error'  ? 'text-red-600'
                : 'text-gray-400'
              }`}>
                {label}
              </p>
              {(status === 'active' || status === 'done') && (
                <p className="text-xs text-gray-400">{sublabel}</p>
              )}
            </div>
          </div>
        )
      })}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border border-red-200 bg-red-50 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={onRetry}
                className="self-start px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms]"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Done phase ────────────────────────────────────────────────────────────────

function DonePhase({
  agent,
  token,
  questionsOpen,
  editingBank,
  savingBank,
  onToggleQuestions,
  onQuestionEdit,
  onConfigure,
  onClose,
}: {
  agent: Agent
  token: string
  questionsOpen: boolean
  editingBank: QnAQuestionBank
  savingBank: boolean
  onToggleQuestions: () => void
  onQuestionEdit: (section: 'fixed' | 'randomized', idx: number, newText: string) => void
  onConfigure?: () => void
  onClose: () => void
}) {
  const liveUrl  = `${window.location.origin}/agent/${agent.id}`
  const testUrl  = `${window.location.origin}/agent/${agent.id}?mode=test`

  const [isLive, setIsLive] = useState(agent.agent_status === 'live')
  const [toggling, setToggling] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)
  const [displayLabel, setDisplayLabel] = useState(agent.agent_display_label ?? '')
  const [labelDraft, setLabelDraft] = useState(agent.agent_display_label ?? '')
  const [editingLabel, setEditingLabel] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (agent.agent_first_speaker as 'agent' | 'user') ?? 'agent',
  )
  const [showReport, setShowReport] = useState(agent.show_report ?? false)

  async function handleToggleLive() {
    if (toggling) return
    const next: 'live' | 'idle' = isLive ? 'idle' : 'live'
    setToggling(true)
    try { await toggleAgentStatus(token, agent.id, next); setIsLive(!isLive) }
    catch { /* silent */ } finally { setToggling(false) }
  }

  function copyLink(url: string, which: 'live' | 'test') {
    navigator.clipboard.writeText(url).then(() => {
      if (which === 'live') { setCopiedLive(true); setTimeout(() => setCopiedLive(false), 2000) }
      else { setCopiedTest(true); setTimeout(() => setCopiedTest(false), 2000) }
    })
  }

  async function handleFirstSpeaker(val: 'agent' | 'user') {
    if (val === firstSpeaker) return
    setFirstSpeaker(val)
    try { await updateAgent(token, agent.id, { agent_first_speaker: val }) } catch { /* silent */ }
  }

  async function handleShowReport() {
    const next = !showReport
    setShowReport(next)
    try { await updateAgent(token, agent.id, { show_report: next }) } catch { /* silent */ }
  }

  async function saveLabel() {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed === displayLabel) return
    setDisplayLabel(trimmed)
    try { await updateAgent(token, agent.id, { agent_display_label: trimmed || undefined }) } catch { /* silent */ }
  }

  const tile = 'border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 duration-[120ms]'

  return (
    <div className="px-5 py-5 flex flex-col gap-3">
      {/* Success header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{agent.agent_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">QnA</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className={`text-xs font-medium ${isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isLive ? 'Live' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick-action grid */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => copyLink(liveUrl, 'live')}
          className={`${tile} hover:border-emerald-300 hover:bg-emerald-50/50`}
        >
          {copiedLive ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          <span className="text-sm text-gray-700 font-medium truncate">{copiedLive ? 'Copied!' : 'Live link'}</span>
        </button>

        <button
          onClick={() => copyLink(testUrl, 'test')}
          className={`${tile} hover:border-orange-300 hover:bg-orange-50/50`}
        >
          {copiedTest ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-orange-400 shrink-0" />}
          <span className="text-sm text-gray-700 font-medium truncate">{copiedTest ? 'Copied!' : 'Test link'}</span>
        </button>

        {isLive ? (
          <div className={`${tile} bg-emerald-50 border-emerald-200`}>
            <ToggleRight className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">Live</span>
          </div>
        ) : (
          <button
            onClick={handleToggleLive}
            disabled={toggling}
            className={`${tile} hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-60`}
          >
            {toggling
              ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
              : <ToggleLeft className="w-5 h-5 text-gray-300 shrink-0" />
            }
            <span className="text-sm text-gray-700 font-medium">Go live</span>
          </button>
        )}

        {onConfigure && (
          <button
            onClick={onConfigure}
            className={`${tile} hover:border-gray-300 hover:bg-gray-50`}
          >
            <Settings2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Configure</span>
          </button>
        )}
      </div>

      {/* Display label */}
      <div className={`${tile} justify-between`}>
        <div className="flex items-center gap-2.5">
          <Tag className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 font-medium">Display label</span>
        </div>
        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={e => setLabelDraft(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabelDraft(displayLabel); setEditingLabel(false) } }}
            placeholder="Public-facing name…"
            className="text-sm text-right border-b border-indigo-400 outline-none text-gray-700 bg-transparent max-w-[160px]"
          />
        ) : (
          <button
            onClick={() => { setLabelDraft(displayLabel); setEditingLabel(true) }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 duration-[120ms]"
          >
            {displayLabel || <span className="text-gray-300 text-xs italic">not set</span>}
            <Pencil className="w-3 h-3 text-gray-400 shrink-0" />
          </button>
        )}
      </div>

      {/* Who opens the session */}
      <div className={`${tile} justify-between`}>
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 font-medium">Opens first</span>
        </div>
        <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(['agent', 'user'] as const).map(val => (
            <button
              key={val}
              onClick={() => handleFirstSpeaker(val)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md duration-[120ms] ${
                firstSpeaker === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {val === 'agent' ? 'Agent' : 'Participant'}
            </button>
          ))}
        </div>
      </div>

      {/* Show report */}
      <div className={`${tile} justify-between`}>
        <div className="flex items-center gap-2.5">
          <FileTextIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 font-medium">Show report to candidate</span>
        </div>
        <button onClick={handleShowReport}>
          {showReport
            ? <ToggleRight className="w-6 h-6 text-indigo-600" />
            : <ToggleLeft className="w-6 h-6 text-gray-300" />
          }
        </button>
      </div>

      {/* Questions accordion */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={onToggleQuestions}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 duration-[120ms]"
        >
          <span>Questions ({editingBank.fixed.length + editingBank.randomized_pool.length})</span>
          <div className="flex items-center gap-2">
            {savingBank && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            {questionsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        <AnimatePresence initial={false}>
          {questionsOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-gray-100"
            >
              <div className="px-4 py-3 space-y-4">
                {editingBank.fixed.length > 0 && (
                  <QuestionSection label="Always asked" questions={editingBank.fixed} section="fixed" onEdit={onQuestionEdit} />
                )}
                {editingBank.randomized_pool.length > 0 && (
                  <QuestionSection
                    label="Question pool"
                    sublabel={`${editingBank.randomized_count} picked per session`}
                    questions={editingBank.randomized_pool}
                    section="randomized"
                    onEdit={onQuestionEdit}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 duration-[120ms]"
      >
        Done
      </button>
    </div>
  )
}

// ── Question section ──────────────────────────────────────────────────────────

function QuestionSection({
  label, sublabel, questions, section, onEdit,
}: {
  label: string
  sublabel?: string
  questions: QnAQuestion[]
  section: 'fixed' | 'randomized'
  onEdit: (section: 'fixed' | 'randomized', idx: number, newText: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
      <div className="space-y-1">
        {questions.map((q, i) => (
          <EditableQuestion key={q.id} text={q.text} onSave={newText => onEdit(section, i, newText)} />
        ))}
      </div>
    </div>
  )
}

// ── Editable question row ─────────────────────────────────────────────────────

function EditableQuestion({ text, onSave }: { text: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== text) onSave(draft.trim())
    else setDraft(text)
  }

  return (
    <div className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 duration-[120ms]">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(text); setEditing(false) } }}
          className="flex-1 text-sm text-gray-800 bg-transparent border-b border-indigo-400 outline-none py-0.5"
        />
      ) : (
        <>
          <p className="flex-1 text-sm text-gray-700 leading-relaxed">{text}</p>
          <button
            onClick={() => { setDraft(text); setEditing(true) }}
            className="shrink-0 opacity-0 group-hover:opacity-100 duration-[120ms] text-gray-400 hover:text-gray-700 p-0.5"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  )
}

// FileText alias to avoid shadowing the imported icon name
function FileTextIcon({ className }: { className?: string }) {
  return <FileText className={className} />
}
