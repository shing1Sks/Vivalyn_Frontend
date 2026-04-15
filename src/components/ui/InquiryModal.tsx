import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, ArrowLeft } from 'lucide-react'
import Button from './Button'
import { requestOtp, verifyOtp } from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
  prefillEmail?: string
}

type Step = 'form' | 'otp' | 'success'

export default function InquiryModal({ open, onClose, prefillEmail }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [message, setMessage] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep('form')
      setError('')
      setName('')
      setEmail(prefillEmail ?? '')
      setMessage('')
      setOtp('')
    }
  }, [open, prefillEmail])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await requestOtp({ name: name.trim(), email: email.trim().toLowerCase(), message: message.trim() })
      setStep('otp')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() })
      setStep('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      await requestOtp({ name: name.trim(), email: email.trim().toLowerCase(), message: message.trim() })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not resend. Please wait and try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            ref={backdropRef}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={(e) => { if (e.target === backdropRef.current) onClose() }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.12 }}
            >
              <AnimatePresence mode="wait">

                {step === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Talk to us</h2>
                        <p className="text-xs text-gray-500 mt-0.5">We'll get back to you shortly.</p>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          What's your question or what's holding you back? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="e.g. Pricing wasn't clear for my team size, wondering if custom sessions are supported..."
                          rows={4}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms] resize-none"
                        />
                      </div>

                      {error && <p className="text-xs text-red-600">{error}</p>}

                      <div className="flex gap-3 pt-1">
                        <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={loading}>
                          {loading ? 'Sending...' : 'Send verification code'}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {step === 'otp' && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setStep('form'); setError(''); setOtp('') }}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <h2 className="text-base font-semibold text-gray-900">Check your inbox</h2>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleOtpSubmit} className="p-6 space-y-4">
                      <p className="text-sm text-gray-600">
                        We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>. Enter it below to submit your message.
                      </p>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Verification code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          className="w-full text-center text-2xl font-semibold tracking-[0.3em] border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]"
                        />
                      </div>

                      {error && <p className="text-xs text-red-600">{error}</p>}

                      <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify and submit'}
                      </Button>

                      <p className="text-center text-xs text-gray-500">
                        Didn't receive it?{' '}
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={loading}
                          className="text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Resend code
                        </button>
                      </p>
                    </form>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col items-center text-center p-10"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                      <CheckCircle size={24} className="text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Message sent</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      We'll be in touch shortly.
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
