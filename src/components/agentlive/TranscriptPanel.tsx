import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TranscriptEntry } from '../../hooks/useAgentSession'

interface TranscriptPanelProps {
  transcript: TranscriptEntry[]
  agentName: string
}

export default function TranscriptPanel({ transcript, agentName }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript.length])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Transcript
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {transcript.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6">
            Conversation will appear here…
          </p>
        )}

        <AnimatePresence initial={false}>
          {transcript.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`flex flex-col gap-1 ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] font-medium text-gray-400">
                {entry.role === 'user' ? 'You' : agentName}
              </span>
              <div
                className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  entry.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                {entry.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
