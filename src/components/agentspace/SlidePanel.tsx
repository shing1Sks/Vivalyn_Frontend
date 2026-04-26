import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useScrollLock } from '../../hooks/useScrollLock'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function SlidePanel({ open, onClose, title, subtitle, children }: SlidePanelProps) {
  useScrollLock(open)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full max-w-[440px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex-1 min-w-0 mr-3">
                <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
