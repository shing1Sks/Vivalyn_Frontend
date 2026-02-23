import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic } from 'lucide-react'

interface EntryScreenProps {
  agentName: string
  mode: 'live' | 'test'
  prefillEmail?: string
  onJoin: (email: string, name: string) => void
  error?: string | null
}

export default function EntryScreen({
  agentName,
  mode,
  prefillEmail,
  onJoin,
  error,
}: EntryScreenProps) {
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (mode === 'live' && !email.trim()) return
    setJoining(true)
    onJoin(email.trim(), name.trim())
  }

  const canSubmit =
    name.trim().length > 0 && (mode === 'test' || email.trim().length > 0)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8"
      >
        {/* Agent icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto mb-5">
          <Mic className="w-7 h-7 text-white" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">{agentName}</h1>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
              mode === 'live'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                mode === 'live' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
            />
            {mode === 'live' ? 'Live Session' : 'Test Mode'}
          </span>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={joining}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 duration-[120ms]"
              autoFocus
            />
          </div>

          {mode === 'live' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={joining}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 duration-[120ms]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || joining}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] mt-2"
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Join Session
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          This session uses voice. Please allow microphone access when prompted.
        </p>
      </motion.div>
    </div>
  )
}
