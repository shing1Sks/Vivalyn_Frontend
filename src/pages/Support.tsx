import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Clock, FileText, CheckCircle, ArrowLeft } from 'lucide-react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Button from '../components/ui/Button'
import { requestOtp, verifyOtp } from '../lib/api'

type Step = 'form' | 'otp' | 'success'

const INPUT_CLASS =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]'

export default function Support() {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setMessage('')
    setOtp('')
    setError('')
  }

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Get Help</h1>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                Email us at{' '}
                <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">
                  support@vivalyn.in
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <Clock size={16} className="text-gray-400 flex-shrink-0" />
                We respond within 48 hours on business days
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                Include your account email, a description of the issue, and screenshots if relevant
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <AnimatePresence mode="wait">

              {step === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.12 }}
                >
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Send us a message</h2>
                  <p className="text-xs text-gray-500 mb-6">We'll send a verification code to confirm your email.</p>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
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
                          className={INPUT_CLASS}
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
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        How can we help? <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Describe your issue, question, or billing concern..."
                        rows={4}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
                      {loading ? 'Sending...' : 'Send verification code'}
                    </Button>
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
                  <div className="flex items-center gap-2 mb-6">
                    <button
                      onClick={() => { setStep('form'); setError(''); setOtp('') }}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <h2 className="text-base font-semibold text-gray-900">Check your inbox</h2>
                  </div>

                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600">
                      We sent a 6-digit code to{' '}
                      <span className="font-medium text-gray-900">{email}</span>.
                      Enter it below to submit your message.
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
                  className="flex flex-col items-center text-center py-8"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <CheckCircle size={24} className="text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Message sent</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    We'll be in touch within 48 hours.
                  </p>
                  <Button variant="secondary" onClick={resetForm}>
                    Send another message
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
