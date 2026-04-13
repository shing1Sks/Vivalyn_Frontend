import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, FileText, Loader2, Upload, X } from 'lucide-react'

// ── Thinking panel ─────────────────────────────────────────────────────────────

const THINKING_MESSAGES = [
  'Reading your materials...',
  'Identifying key concepts...',
  'Mapping assessment scope...',
  'Generating question pool...',
]

function ThinkingPanel() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % THINKING_MESSAGES.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
        <Brain className="w-3.5 h-3.5 text-indigo-400" />
        Question Generator
      </div>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-600 font-medium"
          >
            {THINKING_MESSAGES[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string
  text: string  // extracted text content
}

interface Props {
  language: string
  personaName: string
  isLoading: boolean
  onGenerate: (context: string, resourceText: string) => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QnAResourceStep({ language, personaName, isLoading, onGenerate }: Props) {
  const [context, setContext] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  async function handleFiles(incoming: File[]) {
    setFileError(null)
    const allowed = incoming.filter(f => f.type === 'application/pdf' || f.type === 'text/plain' || f.name.endsWith('.txt'))
    if (allowed.length !== incoming.length) {
      setFileError('Only PDF and .txt files are supported.')
    }
    const oversized = allowed.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length > 0) {
      setFileError('Files must be under 5 MB.')
      return
    }
    if (files.length + allowed.length > 3) {
      setFileError('Maximum 3 files allowed.')
      return
    }

    try {
      const results: AttachedFile[] = []
      for (const file of allowed) {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await readFileAsText(file)
          results.push({ name: file.name, text })
        } else {
          // PDF — encode as base64 in chunks to avoid call-stack overflow on large files
          const buf = await file.arrayBuffer()
          const b64 = arrayBufferToBase64(buf)
          results.push({ name: file.name, text: `[PDF_BASE64:${b64}]` })
        }
      }
      setFiles(prev => [...prev, ...results])
    } catch {
      setFileError('Could not read file. Please try again.')
    }
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  function handleSubmit() {
    if (!context.trim()) return
    const resourceText = files.map(f => f.text).join('\n\n')
    onGenerate(context.trim(), resourceText)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ThinkingPanel />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Meta chips */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {language.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
              {personaName}
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Describe the assessment</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tell us what this assessment covers. Optionally attach reference materials — the question generator will draw from them.
          </p>

          {/* Context textarea */}
          <textarea
            autoFocus
            value={context}
            onChange={e => setContext(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && context.trim()) handleSubmit()
            }}
            rows={4}
            placeholder="e.g. Mid-semester oral assessment for 2nd year CS students on data structures and algorithms..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms] mb-4"
          />

          {/* File upload zone */}
          <div
            onDragEnter={e => { e.preventDefault(); setDragging(true) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer duration-[120ms] ${
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFiles(Array.from(e.target.files))
                e.target.value = ''
              }}
            />
            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Attach reference materials</p>
            <p className="text-xs text-gray-400 mt-1">PDF or .txt, max 3 files, 5 MB each — optional</p>
          </div>

          {/* File error */}
          <AnimatePresence>
            {fileError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-600 mt-2"
              >
                {fileError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Attached files */}
          {files.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
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

          <p className="text-xs text-gray-400 mt-3">Press Cmd+Enter or click Generate to continue</p>

          <button
            onClick={handleSubmit}
            disabled={!context.trim()}
            className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
              context.trim()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Brain className="w-4 h-4" />
            Generate Questions
          </button>
        </div>
      </div>
    </div>
  )
}
