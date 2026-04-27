import { useEffect, useRef, useState } from 'react'
import type { TranscriptEntry } from '../../hooks/useAgentSession'

function WordRevealText({ text, onReveal }: { text: string; onReveal?: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const wordPosRef = useRef(0)

  useEffect(() => {
    if (!text) {
      setDisplayed('')
      wordPosRef.current = 0
      return
    }
    const words = text.split(' ')
    if (wordPosRef.current >= words.length) return

    const timer = setInterval(() => {
      wordPosRef.current++
      setDisplayed(words.slice(0, wordPosRef.current).join(' '))
      onReveal?.()
      if (wordPosRef.current >= words.length) clearInterval(timer)
    }, 120)

    return () => clearInterval(timer)
  }, [text, onReveal])

  return <>{displayed}</>
}

interface TranscriptPanelProps {
  transcript: TranscriptEntry[]
  agentName: string
  streamingAgentText?: string
  partialUserText?: string
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

export default function TranscriptPanel({ transcript, agentName, streamingAgentText, partialUserText }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript.length])

  useEffect(() => {
    if (streamingAgentText) scrollToBottom()
  }, [streamingAgentText])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Transcript
        </h3>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {transcript.length === 0 && !streamingAgentText && !partialUserText && (
          <p className="text-xs text-gray-500 text-center mt-6">
            Conversation will appear here…
          </p>
        )}

        {transcript.map((entry, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-[10px] font-medium text-gray-400">
              {entry.role === 'user' ? 'You' : agentName}
              <span className="ml-1.5 text-gray-500 font-normal">{formatTime(entry.timestamp)}</span>
            </span>
            <div
              className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                entry.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-sm'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {streamingAgentText && (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] font-medium text-gray-400">{agentName}</span>
            <div className="max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-sm">
              <WordRevealText text={streamingAgentText} onReveal={scrollToBottom} />
            </div>
          </div>
        )}

        {partialUserText && (
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] font-medium text-gray-400">You</span>
            <div className="max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed bg-indigo-600 text-white rounded-br-sm">
              {partialUserText}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
