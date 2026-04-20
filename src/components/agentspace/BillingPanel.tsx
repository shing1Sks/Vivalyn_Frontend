import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import { fetchPaymentTransactions } from '../../lib/api'
import type { PaymentTransaction } from '../../lib/api'
import SlidePanel from './SlidePanel'

const PAGE_SIZE = 10

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    subscription_activated: 'Activated',
    subscription_renewed: 'Renewed',
    subscription_cancelled: 'Cancelled',
    payment_failed: 'Failed',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

function statusBadgeClass(status: string): string {
  if (status === 'success') return 'bg-emerald-50 text-emerald-700'
  if (status === 'failed') return 'bg-red-50 text-red-600'
  return 'bg-gray-100 text-gray-500'
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function BillingPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const token = session?.access_token
  const spaceId = activeSpace?.id

  useEffect(() => {
    if (!open || !token || !spaceId) return
    setLoading(true)
    fetchPaymentTransactions(token, spaceId, page, PAGE_SIZE)
      .then((res) => { setTransactions(res.transactions); setTotal(res.total) })
      .catch((e: Error) => {
        console.error('[BillingPanel]', e.message)
        setTransactions([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [open, token, spaceId, page])

  // Reset page when panel re-opens
  useEffect(() => {
    if (open) setPage(1)
  }, [open])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <SlidePanel open={open} onClose={onClose} title="Billing" subtitle={activeSpace?.name}>
      <div className="px-6 py-4">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}
        {!loading && transactions.length === 0 && (
          <p className="text-sm text-gray-400 py-10 text-center">No billing history yet.</p>
        )}
        {!loading && transactions.length > 0 && (
          <>
            <div className="space-y-0">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900">{eventLabel(tx.event_type)}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusBadgeClass(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span className="capitalize">{tx.plan_tier}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {tx.amount_paid != null ? (
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        {tx.currency === 'INR' ? '₹' : '$'}{Number(tx.amount_paid).toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase">{tx.currency}</p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SlidePanel>
  )
}
