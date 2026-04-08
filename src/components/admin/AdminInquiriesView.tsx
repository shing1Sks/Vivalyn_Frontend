import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, Mail, X } from 'lucide-react'
import {
  fetchAdminInquiries,
  updateAdminInquiry,
  sendAdminFollowupEmail,
  type Inquiry,
} from '../../lib/api'

const STATUS_OPTIONS = ['new', 'contacted', 'in_progress', 'closed'] as const
type InquiryStatus = typeof STATUS_OPTIONS[number]

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status as InquiryStatus] ?? 'bg-gray-100 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FollowupEmailModal({
  inquiry,
  onClose,
  token,
}: {
  inquiry: Inquiry
  onClose: () => void
  token: string
}) {
  const [subject, setSubject] = useState(`Following up on your Vivalyn inquiry`)
  const [body, setBody] = useState(
    `Hi ${inquiry.name},\n\nThank you for reaching out to Vivalyn. We'd love to help you get started.\n\nBest,\nThe Vivalyn Team`
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required.'); return }
    setLoading(true); setError('')
    const htmlBody = body.replace(/\n/g, '<br/>')
    try {
      await sendAdminFollowupEmail(token, inquiry.id, { subject, body_html: htmlBody })
      setSent(true)
    } catch {
      setError('Failed to send email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onMouseDown={e => { if (e.target === backdropRef.current) onClose() }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.12 }}
        >
          {sent ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">Email sent to {inquiry.email}</p>
              <p className="text-xs text-gray-500 mb-6">The follow-up has been delivered.</p>
              <button onClick={onClose} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Send follow-up to {inquiry.name}</p>
                  <p className="text-xs text-gray-400">{inquiry.email}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
                  <textarea
                    value={body} onChange={e => setBody(e.target.value)}
                    rows={8}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors duration-[120ms]">
                    Cancel
                  </button>
                  <button
                    onClick={handleSend} disabled={loading}
                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function AdminInquiriesView({ token }: { token: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [followupTarget, setFollowupTarget] = useState<Inquiry | null>(null)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetchAdminInquiries(token, statusFilter === 'all' ? undefined : statusFilter)
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false))
  }, [token, statusFilter])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleStatusChange = async (inquiry: Inquiry, newStatus: string) => {
    setStatusDropdownId(null)
    try {
      const updated = await updateAdminInquiry(token, inquiry.id, { status: newStatus })
      setInquiries(prev => prev.map(i => i.id === inquiry.id ? updated : i))
    } catch {
      // silent
    }
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Inquiries</h2>
        <p className="text-sm text-gray-500 mt-0.5">Contact form submissions from the landing page.</p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-4 w-fit">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-[120ms] capitalize ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No inquiries found.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Business</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Use case</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Currency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inquiries.map(inq => (
                <tr key={inq.id} className="hover:bg-gray-50 transition-colors duration-[120ms]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inq.name}</p>
                    <p className="text-xs text-gray-400">{inq.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {inq.business_name || <span className="text-gray-300">—</span>}
                    {inq.size && <p className="text-xs text-gray-400">{inq.size}</p>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-gray-600 text-xs line-clamp-2">{inq.use_case}</p>
                  </td>
                  <td className="px-4 py-3">
                    {inq.plan_interest ? (
                      <span className="text-xs font-medium text-indigo-600 capitalize">{inq.plan_interest}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{inq.currency_pref}</td>
                  <td className="px-4 py-3">
                    <div ref={dropdownRef} className="relative inline-block">
                      <button
                        onClick={() => setStatusDropdownId(prev => prev === inq.id ? null : inq.id)}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <StatusBadge status={inq.status} />
                        <ChevronDown size={12} className="text-gray-400" />
                      </button>
                      <AnimatePresence>
                        {statusDropdownId === inq.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                            className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(inq, s)}
                                className={`w-full text-left px-3 py-2 text-xs duration-[120ms] capitalize ${
                                  inq.status === s ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {s.replace('_', ' ')}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setFollowupTarget(inq)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-[120ms]"
                    >
                      <Mail size={12} />
                      Follow up
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {followupTarget && (
        <FollowupEmailModal
          inquiry={followupTarget}
          token={token}
          onClose={() => setFollowupTarget(null)}
        />
      )}
    </div>
  )
}
