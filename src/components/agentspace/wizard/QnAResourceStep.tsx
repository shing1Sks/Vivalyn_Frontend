import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, FileText, Image, Upload, X } from 'lucide-react'

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
  personaName: string
  onGenerate: (context: string, resourceText: string, resourceImages: string[], tone: string, feedbackMode: 'silent' | 'feedback') => void
}

// ── Tone options ───────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { label: 'Friendly Tutor', value: 'friendly tutor' },
  { label: 'Formal Examiner', value: 'formal examiner' },
  { label: 'Strict Evaluator', value: 'strict evaluator' },
  { label: 'Neutral Interviewer', value: 'neutral interviewer' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

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

export default function QnAResourceStep({ language, personaName, onGenerate }: Props) {
  const [context, setContext] = useState('')
  const [tone, setTone] = useState('')
  const [feedbackMode, setFeedbackMode] = useState<'silent' | 'feedback'>('silent')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  function handleSubmit() {
    if (!context.trim() || !tone) return
    const resourceText = files.filter(f => f.fileType === 'text').map(f => f.text).join('\n\n')
    const resourceImages = [
      ...files.filter(f => f.fileType === 'image').map(f => f.dataUri!),
      ...files.filter(f => f.fileType === 'scanned-pdf').flatMap(f => f.pageImages!),
    ]
    onGenerate(context.trim(), resourceText, resourceImages, tone, feedbackMode)
  }

  const canSubmit = context.trim().length > 0 && tone !== ''

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Meta chips */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            {language.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
            {personaName}
          </span>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Set up your assessment</h2>
        <p className="text-sm text-gray-500 mb-5">
          Describe what this assessment covers. Questions and agent prompt are generated automatically.
        </p>

        {/* Two-column main form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
          {/* Left — Assessment description */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assessment description</label>
              <textarea
                autoFocus
                value={context}
                onChange={e => setContext(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) handleSubmit()
                }}
                rows={5}
                placeholder="e.g. Mid-semester oral assessment for 2nd year CS students on data structures and algorithms..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference materials <span className="text-gray-400 font-normal">(optional)</span></label>
              <div
                onDragEnter={e => { e.preventDefault(); setDragging(true) }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer duration-[120ms] ${
                  dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={inputRef}
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
                        className="text-gray-400 hover:text-gray-700 duration-[120ms]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Tone + Feedback mode */}
          <div className="flex flex-col gap-4">
            {/* Tone selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessor tone</label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left duration-[120ms] ${
                      tone === opt.value
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">After each answer, the agent should</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setFeedbackMode('silent')}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left duration-[120ms] ${
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
                  onClick={() => setFeedbackMode('feedback')}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left duration-[120ms] ${
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
          </div>
        </div>

        {/* Submit */}
        <p className="text-xs text-gray-400 mb-3">Press Cmd+Enter or click Generate to continue</p>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Brain className="w-4 h-4" />
          Generate Assessment
        </button>
      </div>
    </div>
  )
}
