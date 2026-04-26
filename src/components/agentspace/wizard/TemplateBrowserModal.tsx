import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Clock, ChevronRight } from 'lucide-react'
import {
  GENERAL_TEMPLATES,
  QNA_TEMPLATES,
  type AgentTemplate,
  type QnAAgentTemplate,
} from '../../../lib/agentTemplates'
import { useScrollLock } from '../../../hooks/useScrollLock'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GeneralProps {
  type: 'general'
  onSelect: (template: AgentTemplate) => void
  onClose: () => void
}

interface QnAProps {
  type: 'qna'
  onSelect: (template: QnAAgentTemplate) => void
  onClose: () => void
}

type Props = GeneralProps | QnAProps

// ── Category config ────────────────────────────────────────────────────────────

const GENERAL_CATEGORIES = [
  { id: 'academic', label: 'Academic & Viva' },
  { id: 'interview', label: 'Interview & Speaking' },
  { id: 'corporate', label: 'Corporate & Sales' },
] as const

const QNA_CATEGORIES = [
  { id: 'academic', label: 'Academic' },
  { id: 'professional', label: 'Professional' },
  { id: 'language', label: 'Language' },
] as const

// ── Component ──────────────────────────────────────────────────────────────────

export default function TemplateBrowserModal(props: Props) {
  useScrollLock(true)
  const { type, onClose } = props

  const categories = type === 'general' ? GENERAL_CATEGORIES : QNA_CATEGORIES
  const templates = type === 'general' ? GENERAL_TEMPLATES : QNA_TEMPLATES

  const [activeCategory, setActiveCategory] = useState<string>(categories[0].id)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = templates.filter(t => t.category === activeCategory)

  function handleSelect(template: AgentTemplate | QnAAgentTemplate) {
    if (type === 'general') {
      (props as GeneralProps).onSelect(template as AgentTemplate)
    } else {
      (props as QnAProps).onSelect(template as QnAAgentTemplate)
    }
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.12 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Browse templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select a template to pre-fill your session design</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-6 pt-4 pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-[120ms] ${
                  activeCategory === cat.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="grid grid-cols-2 gap-3 pt-2">
              {(filtered as (AgentTemplate | QnAAgentTemplate)[]).map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`text-left p-4 rounded-xl border transition-all duration-[120ms] ${
                    hoveredId === template.id
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 leading-snug">
                      {template.name}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`mt-0.5 flex-shrink-0 transition-colors duration-[120ms] ${
                        hoveredId === template.id ? 'text-indigo-500' : 'text-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{template.meta}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                    {template.session_objective.length > 100
                      ? template.session_objective.slice(0, 97) + '...'
                      : template.session_objective}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              All fields will be pre-filled — you can edit them before continuing
            </p>
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-[120ms]"
            >
              Use custom instead
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
