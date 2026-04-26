import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, CreditCard, Wrench, MessageSquare, HelpCircle } from 'lucide-react'
import Button from './Button'
import { submitSupport, type SupportTicketType } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useScrollLock } from '../../hooks/useScrollLock'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'form' | 'success'

interface TicketOption {
  type: SupportTicketType
  label: string
  description: string
  icon: React.ReactNode
}

const TICKET_OPTIONS: TicketOption[] = [
  {
    type: 'billing',
    label: 'Billing',
    description: 'Plans, payments, invoices',
    icon: <CreditCard size={16} />,
  },
  {
    type: 'technical',
    label: 'Technical / Bug',
    description: 'Something broken or not working',
    icon: <Wrench size={16} />,
  },
  {
    type: 'feedback',
    label: 'Feedback',
    description: 'Suggestions or feature requests',
    icon: <MessageSquare size={16} />,
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Anything else on your mind',
    icon: <HelpCircle size={16} />,
  },
]

export default function SupportModal({ open, onClose }: Props) {
  useScrollLock(open)
  const [step, setStep] = useState<Step>('form')
  const [selectedType, setSelectedType] = useState<SupportTicketType | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const backdropRef = useRef<HTMLDivElement>(null)
  const { session } = useAuth()

  useEffect(() => {
    if (open) {
      setStep('form')
      setSelectedType(null)
      setMessage('')
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) {
      setError('Please select a topic.')
      return
    }
    if (!message.trim()) {
      setError('Please describe your issue.')
      return
    }
    if (!session?.access_token) {
      setError('You must be signed in to submit a support request.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await submitSupport(session.access_token, { type: selectedType, message: message.trim() })
      setStep('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
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
                        <h2 className="text-base font-semibold text-gray-900">Contact support</h2>
                        <p className="text-xs text-gray-500 mt-0.5">We'll get back to you on your email.</p>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">What is this about?</p>
                        <div className="grid grid-cols-2 gap-2">
                          {TICKET_OPTIONS.map((opt) => (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() => { setSelectedType(opt.type); setError('') }}
                              className={[
                                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-[120ms] cursor-pointer',
                                selectedType === opt.type
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
                              ].join(' ')}
                            >
                              <span className={selectedType === opt.type ? 'text-indigo-600' : 'text-gray-500'}>
                                {opt.icon}
                              </span>
                              <span className="text-xs font-medium">{opt.label}</span>
                              <span className="text-[11px] text-gray-400 leading-tight">{opt.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Describe your issue <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Provide as much detail as you can..."
                          rows={4}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms] resize-none"
                        />
                      </div>

                      {error && <p className="text-xs text-red-600">{error}</p>}

                      <div className="flex gap-3 pt-1">
                        <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          className="flex-1 justify-center"
                          disabled={loading}
                        >
                          {loading ? 'Submitting...' : 'Submit'}
                        </Button>
                      </div>
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
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Request submitted</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      Check your inbox for a confirmation. We'll follow up shortly.
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
