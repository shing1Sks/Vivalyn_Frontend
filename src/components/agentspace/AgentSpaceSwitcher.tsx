import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Orbit, Check, Plus } from 'lucide-react'
import { useAgentSpace } from '../../context/AgentSpaceContext'

interface AgentSpaceSwitcherProps {
  onCreateClick: () => void
}

export default function AgentSpaceSwitcher({ onCreateClick }: AgentSpaceSwitcherProps) {
  const { spaces, activeSpace, switchSpace } = useAgentSpace()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms] cursor-pointer"
      >
        <span className="max-w-[160px] truncate">
          {activeSpace?.name ?? 'Loading...'}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-2"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-1.5">
              Your Spaces
            </p>

            <div className="space-y-0.5">
              {spaces.map((space) => {
                const isActive = space.id === activeSpace?.id
                return (
                  <button
                    key={space.id}
                    onClick={() => {
                      switchSpace(space.id)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors duration-[120ms] cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Orbit className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate font-medium">
                      {space.name}
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => {
                  setOpen(false)
                  onCreateClick()
                }}
                className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">New AgentSpace</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
