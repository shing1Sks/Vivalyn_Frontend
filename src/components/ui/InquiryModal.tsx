import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'
import Button from './Button'
import { submitInquiry } from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
  planInterest?: string
  prefillEmail?: string
}

export default function InquiryModal({ open, onClose, planInterest, prefillEmail }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [businessName, setBusinessName] = useState('')
  const [size, setSize] = useState('')
  const [useCase, setUseCase] = useState('')
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setSuccess(false)
      setError('')
      setName('')
      setBusinessName('')
      setSize('')
      setUseCase('')
      setCurrency('INR')
      setEmail(prefillEmail ?? '')
    }
  }, [open, prefillEmail])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !useCase.trim()) {
      setError('Please fill in the required fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await submitInquiry({
        name: name.trim(),
        email: email.trim(),
        business_name: businessName.trim(),
        size: size.trim(),
        use_case: useCase.trim(),
        plan_interest: planInterest ?? null,
        currency_pref: currency,
      })
      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
              {success ? (
                <div className="flex flex-col items-center text-center p-10">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <CheckCircle size={24} className="text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">We'll be in touch</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Thanks for reaching out. Our team will respond within 24 hours with pricing details and next steps.
                  </p>
                  <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {planInterest
                          ? `Get started with ${planInterest.charAt(0).toUpperCase() + planInterest.slice(1)}`
                          : 'Contact us'}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        We'll reach out within 24 hours.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {planInterest && (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                        <span className="text-xs text-indigo-600 font-medium">
                          Interested in: {planInterest.charAt(0).toUpperCase() + planInterest.slice(1)} plan
                        </span>
                      </div>
                    )}

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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Business / Institute
                        </label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          placeholder="Company name"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Team size
                        </label>
                        <input
                          type="text"
                          value={size}
                          onChange={e => setSize(e.target.value)}
                          placeholder="e.g. 10–50"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Use case <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={useCase}
                        onChange={e => setUseCase(e.target.value)}
                        placeholder="e.g. Sales coaching, interview prep, customer support training..."
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-[120ms] resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Currency preference
                      </label>
                      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setCurrency('INR')}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-[120ms] cursor-pointer ${
                            currency === 'INR'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          INR (₹)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency('USD')}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-[120ms] cursor-pointer ${
                            currency === 'USD'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          USD ($)
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 justify-center"
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1 justify-center"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Send Inquiry'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
