import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Zap } from 'lucide-react'
import type { QnAQuestion, QnAQuestionBank } from '../../../lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function defaultCountForDuration(minutes?: number): number {
  if (!minutes) return 4
  if (minutes <= 15) return 2
  if (minutes <= 30) return 4
  return 6
}

function reorder<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
  const next = [...arr]
  const fi = next.findIndex(q => q.id === fromId)
  const ti = next.findIndex(q => q.id === toId)
  if (fi === -1 || ti === -1) return arr
  const [item] = next.splice(fi, 1)
  next.splice(ti, 0, item)
  return next
}

// ── Question row ───────────────────────────────────────────────────────────────

interface QuestionRowProps {
  question: QnAQuestion
  index: number
  showCrossToggle: boolean
  isDropTarget: boolean
  onEdit: (text: string) => void
  onDelete: () => void
  onMove: () => void
  onToggleCross?: () => void
}

function QuestionRow({ question, index, showCrossToggle, isDropTarget, onEdit, onDelete, onMove, onToggleCross }: QuestionRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(question.text)

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== question.text) onEdit(trimmed)
    setEditing(false)
  }

  return (
    <div className={`flex items-start gap-2 group bg-white border rounded-lg px-3 py-2 duration-[120ms] ${
      isDropTarget ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <span className="w-5 h-5 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 mt-0.5 select-none">
        {index}
      </span>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') { setDraft(question.text); setEditing(false) } }}
          rows={2}
          className="flex-1 text-sm text-gray-900 resize-none border-none outline-none bg-transparent"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="flex-1 text-sm text-gray-800 cursor-text leading-relaxed"
        >
          {question.text}
        </p>
      )}

      <div className="flex items-center gap-1 shrink-0 duration-[120ms]">
        {showCrossToggle && onToggleCross && (
          <button
            onClick={onToggleCross}
            title={question.cross_question_enabled ? 'Disable cross-question' : 'Enable cross-question follow-up'}
            className={`p-1 rounded duration-[120ms] ${question.cross_question_enabled ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500'}`}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onMove} title="Move to other pool" className="p-1 rounded text-gray-400 hover:text-gray-700 duration-[120ms]">
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} title="Delete question" className="p-1 rounded text-gray-400 hover:text-red-500 duration-[120ms]">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  initialQuestions: Array<{ text: string; type: 'fixed' | 'randomized'; cross_question_enabled: boolean }>
  sessionDurationMinutes?: number
  onBankChange: (bank: QnAQuestionBank | null) => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QnAQuestionReview({ initialQuestions, sessionDurationMinutes, onBankChange }: Props) {
  const [fixed, setFixed] = useState<QnAQuestion[]>(() =>
    initialQuestions
      .filter(q => q.type === 'fixed')
      .map(q => ({ id: crypto.randomUUID(), text: q.text, cross_question_enabled: q.cross_question_enabled }))
  )
  const [randomized, setRandomized] = useState<QnAQuestion[]>(() =>
    initialQuestions
      .filter(q => q.type === 'randomized')
      .map(q => ({ id: crypto.randomUUID(), text: q.text, cross_question_enabled: q.cross_question_enabled }))
  )

  const initialRandomized = initialQuestions.filter(q => q.type === 'randomized').length
  const [randomizedCount, setRandomizedCount] = useState(() =>
    Math.min(defaultCountForDuration(sessionDurationMinutes), initialRandomized || 1)
  )

  // ── Drag state ───────────────────────────────────────────────────────────────
  const dragIdRef = useRef<string | null>(null)
  const dragSectionRef = useRef<'fixed' | 'randomized' | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [sectionDropTarget, setSectionDropTarget] = useState<'fixed' | 'randomized' | null>(null)

  function handleDragStart(id: string, section: 'fixed' | 'randomized') {
    dragIdRef.current = id
    dragSectionRef.current = section
  }

  function handleDragOverItem(e: React.DragEvent, id: string, section: 'fixed' | 'randomized') {
    e.preventDefault()
    e.stopPropagation()
    if (dragSectionRef.current === section) {
      if (dragIdRef.current !== id) setDropTargetId(id)
      setSectionDropTarget(null)
    } else {
      setSectionDropTarget(section)
      setDropTargetId(null)
    }
  }

  function handleDragOverSection(e: React.DragEvent, section: 'fixed' | 'randomized') {
    e.preventDefault()
    if (dragSectionRef.current !== section) {
      setSectionDropTarget(section)
      setDropTargetId(null)
    }
  }

  function handleDropOnItem(targetId: string, targetSection: 'fixed' | 'randomized') {
    const fromId = dragIdRef.current
    const fromSection = dragSectionRef.current
    dragIdRef.current = null
    dragSectionRef.current = null
    setDropTargetId(null)
    setSectionDropTarget(null)

    if (!fromId || !fromSection) return

    if (fromSection === targetSection && fromId !== targetId) {
      if (fromSection === 'fixed') setFixed(prev => reorder(prev, fromId, targetId))
      else setRandomized(prev => reorder(prev, fromId, targetId))
    } else if (fromSection !== targetSection) {
      crossMove(fromId, fromSection)
    }
  }

  function handleDropOnSection(e: React.DragEvent, targetSection: 'fixed' | 'randomized') {
    e.preventDefault()
    const fromId = dragIdRef.current
    const fromSection = dragSectionRef.current
    dragIdRef.current = null
    dragSectionRef.current = null
    setDropTargetId(null)
    setSectionDropTarget(null)

    if (!fromId || !fromSection || fromSection === targetSection) return
    crossMove(fromId, fromSection)
  }

  function crossMove(fromId: string, fromSection: 'fixed' | 'randomized') {
    if (fromSection === 'fixed') {
      const item = fixed.find(q => q.id === fromId)
      if (!item) return
      setFixed(prev => prev.filter(q => q.id !== fromId))
      setRandomized(prev => [...prev, item])
    } else {
      const item = randomized.find(q => q.id === fromId)
      if (!item) return
      setRandomized(prev => prev.filter(q => q.id !== fromId))
      setFixed(prev => [...prev, { ...item, cross_question_enabled: false }])
    }
  }

  function handleDragEnd() {
    dragIdRef.current = null
    dragSectionRef.current = null
    setDropTargetId(null)
    setSectionDropTarget(null)
  }

  // ── Fixed mutations ──────────────────────────────────────────────────────────

  function editFixed(id: string, text: string) {
    setFixed(prev => prev.map(q => q.id === id ? { ...q, text } : q))
  }
  function deleteFixed(id: string) {
    setFixed(prev => prev.filter(q => q.id !== id))
  }
  function moveToRandomized(id: string) {
    const q = fixed.find(q => q.id === id)
    if (!q) return
    setFixed(prev => prev.filter(q => q.id !== id))
    setRandomized(prev => [...prev, q])
  }
  function addFixed() {
    setFixed(prev => [...prev, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }])
  }

  // ── Randomized mutations ─────────────────────────────────────────────────────

  function editRandomized(id: string, text: string) {
    setRandomized(prev => prev.map(q => q.id === id ? { ...q, text } : q))
  }
  function deleteRandomized(id: string) {
    setRandomized(prev => prev.filter(q => q.id !== id))
  }
  function toggleCross(id: string) {
    setRandomized(prev => prev.map(q => q.id === id ? { ...q, cross_question_enabled: !q.cross_question_enabled } : q))
  }
  function moveToFixed(id: string) {
    const q = randomized.find(q => q.id === id)
    if (!q) return
    setRandomized(prev => prev.filter(q => q.id !== id))
    setFixed(prev => [...prev, { ...q, cross_question_enabled: false }])
  }
  function addRandomized() {
    setRandomized(prev => [...prev, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }])
  }

  // ── Validation + propagation ─────────────────────────────────────────────────

  const validCount = Math.min(randomizedCount, randomized.length)
  const canContinue = fixed.length >= 1 && randomized.length >= 1 && validCount >= 1

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onBankChange(canContinue ? { fixed, randomized_pool: randomized, randomized_count: validCount } : null)
  }, [fixed, randomized, randomizedCount])

  const itemVariants = {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' as const } },
    exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.1 } },
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Review your question bank</h2>
          <p className="text-sm text-gray-500 mb-6">
            Click any question to edit. Drag to reorder or move between pools. The lightning bolt enables a follow-up probe.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fixed bank */}
            <div
              onDragOver={e => handleDragOverSection(e, 'fixed')}
              onDrop={e => handleDropOnSection(e, 'fixed')}
              className={`rounded-xl transition-all duration-[120ms] ${sectionDropTarget === 'fixed' ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Fixed Questions</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Asked every session, in order — drag to reorder</p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                  {fixed.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {fixed.map((q, i) => (
                    <motion.div
                      key={q.id}
                      layout
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      draggable
                      onDragStart={() => handleDragStart(q.id, 'fixed')}
                      onDragOver={e => handleDragOverItem(e, q.id, 'fixed')}
                      onDrop={() => handleDropOnItem(q.id, 'fixed')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-1"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <QuestionRow
                          question={q}
                          index={i + 1}
                          showCrossToggle={false}
                          isDropTarget={dropTargetId === q.id}
                          onEdit={text => editFixed(q.id, text)}
                          onDelete={() => deleteFixed(q.id)}
                          onMove={() => moveToRandomized(q.id)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  onClick={addFixed}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1"
                >
                  <Plus className="w-4 h-4" />
                  Add question
                </button>
              </div>
            </div>

            {/* Randomized pool */}
            <div
              onDragOver={e => handleDragOverSection(e, 'randomized')}
              onDrop={e => handleDropOnSection(e, 'randomized')}
              className={`rounded-xl transition-all duration-[120ms] ${sectionDropTarget === 'randomized' ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Randomized Pool</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Sampled randomly each session — drag to reorder</p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                  {randomized.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {randomized.map((q, i) => (
                    <motion.div
                      key={q.id}
                      layout
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      draggable
                      onDragStart={() => handleDragStart(q.id, 'randomized')}
                      onDragOver={e => handleDragOverItem(e, q.id, 'randomized')}
                      onDrop={() => handleDropOnItem(q.id, 'randomized')}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-1"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <QuestionRow
                          question={q}
                          index={i + 1}
                          showCrossToggle={true}
                          isDropTarget={dropTargetId === q.id}
                          onEdit={text => editRandomized(q.id, text)}
                          onDelete={() => deleteRandomized(q.id)}
                          onMove={() => moveToFixed(q.id)}
                          onToggleCross={() => toggleCross(q.id)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  onClick={addRandomized}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1"
                >
                  <Plus className="w-4 h-4" />
                  Add question
                </button>
              </div>
            </div>
          </div>

          {/* Randomized count */}
          <div className="mt-6 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
            <span className="text-sm text-gray-700 flex-1">Questions picked per session from the randomized pool</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRandomizedCount(c => Math.max(1, c - 1))}
                disabled={randomizedCount <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-gray-900">{validCount}</span>
              <button
                onClick={() => setRandomizedCount(c => Math.min(randomized.length, c + 1))}
                disabled={randomizedCount >= randomized.length}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Move between pools
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Enable follow-up probe
            </div>
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5" />
              Drag to reorder or move
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
