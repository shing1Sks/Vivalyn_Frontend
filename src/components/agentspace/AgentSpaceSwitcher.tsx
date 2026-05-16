import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Orbit, Check, Plus, Pencil } from 'lucide-react'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import { useAuth } from '../../context/AuthContext'
import { renameAgentSpace } from '../../lib/api'

interface AgentSpaceSwitcherProps {
  onCreateClick: () => void
}

export default function AgentSpaceSwitcher({ onCreateClick }: AgentSpaceSwitcherProps) {
  const { spaces, activeSpace, switchSpace, refetchSpaces } = useAgentSpace()
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isAdmin = activeSpace?.role === 'admin'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        if (editing) setEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEditing() {
    setOpen(false)
    setDraft(activeSpace?.name ?? '')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setDraft('')
  }

  async function commitRename() {
    const trimmed = draft.trim()
    if (!trimmed || !activeSpace || trimmed === activeSpace.name || !session?.access_token) {
      cancelEditing()
      return
    }
    setSaving(true)
    try {
      await renameAgentSpace(session.access_token, activeSpace.id, trimmed)
      await refetchSpaces()
    } catch {
      // silently revert on error
    } finally {
      setSaving(false)
      setEditing(false)
      setDraft('')
    }
  }

  return (
    <div className="relative flex items-center group/switcher" ref={ref}>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') cancelEditing()
          }}
          onBlur={commitRename}
          disabled={saving}
          className="px-2.5 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg outline-none border border-indigo-300 focus:border-indigo-500 transition-colors duration-[120ms] w-[160px] disabled:opacity-50"
        />
      ) : (
        <>
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

          {isAdmin && (
            <button
              onClick={startEditing}
              className="ml-0.5 p-1 text-indigo-400 hover:text-indigo-600 rounded cursor-pointer opacity-0 group-hover/switcher:opacity-100 transition-opacity duration-[120ms]"
              title="Rename"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </>
      )}

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
