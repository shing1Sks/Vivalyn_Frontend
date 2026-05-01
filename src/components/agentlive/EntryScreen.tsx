import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic } from 'lucide-react'
import { requestSessionOtp, verifySessionOtp, ApiError } from '../../lib/api'

interface EntryScreenProps {
  agentName: string
  mode: 'live' | 'test'
  prefillEmail?: string
  onJoin: (email: string, name: string) => void
  error?: string | null
  accessLinkToken?: string
}

export default function EntryScreen({
  agentName,
  mode,
  prefillEmail,
  onJoin,
  error,
  accessLinkToken,
}: EntryScreenProps) {
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const otpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus()
  }, [step])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    if (!name.trim()) return
    if (mode === 'test') {
      setJoining(true)
      onJoin(email.trim(), name.trim())
      return
    }
    if (!email.trim()) return
    setLoading(true)
    try {
      await requestSessionOtp(email.trim(), accessLinkToken)
      setStep('otp')
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Failed to send code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    if (otp.trim().length !== 6) return
    setLoading(true)
    try {
      await verifySessionOtp(email.trim(), otp.trim())
      setJoining(true)
      onJoin(email.trim(), name.trim())
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Verification failed. Try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setFieldError(null)
    setOtp('')
    setLoading(true)
    try {
      await requestSessionOtp(email.trim(), accessLinkToken)
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmitForm = name.trim().length > 0 && (mode === 'test' || email.trim().length > 0)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8"
      >
        {/* Agent icon */}
        <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-5">
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

        {(error || fieldError) && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center">
            {error ?? fieldError}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
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
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 duration-[120ms]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmitForm || loading || joining}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] mt-2"
            >
              {loading || joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {joining ? 'Connecting…' : 'Sending code…'}
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  {mode === 'live' ? 'Send verification code' : 'Join Session'}
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-3">
            <p className="text-xs text-gray-500 text-center">
              A 6-digit code was sent to <span className="font-medium text-gray-700">{email}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Verification code
              </label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={loading || joining}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 duration-[120ms] text-center tracking-widest font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={otp.trim().length !== 6 || loading || joining}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms]"
            >
              {loading || joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {joining ? 'Connecting…' : 'Verifying…'}
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Verify &amp; Join
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep('form'); setOtp(''); setFieldError(null) }}
                disabled={loading || joining}
                className="text-xs text-gray-400 hover:text-gray-600 duration-[120ms] disabled:opacity-50"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || joining}
                className="text-xs text-indigo-600 hover:text-indigo-700 duration-[120ms] disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          This session uses voice. Please allow microphone access when prompted.
        </p>
      </motion.div>
    </div>
  )
}
