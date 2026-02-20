import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Inbox, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import { fetchInboxInvites, acceptInvite, ApiError } from '../../lib/api'
import type { Invite } from '../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function InviteCard({
  invite,
  onAccept,
}: {
  invite: Invite
  onAccept: (id: string) => void
}) {
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  const isPendingAndValid = invite.status === 'pending' && !invite.is_expired

  async function handleAccept() {
    if (!session?.access_token) return
    setAccepting(true)
    setError(null)
    try {
      await acceptInvite(session.access_token, invite.id)
      onAccept(invite.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept')
    } finally {
      setAccepting(false)
    }
  }

  const statusBadge = () => {
    if (invite.is_expired && invite.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
          <Clock className="w-2.5 h-2.5" />
          Expired
        </span>
      )
    }
    if (invite.status === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle className="w-2.5 h-2.5" />
          Accepted
        </span>
      )
    }
    if (invite.status === 'revoked') {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          Revoked
        </span>
      )
    }
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
        Pending
      </span>
    )
  }

  return (
    <div className={`rounded-xl border p-4 ${isPendingAndValid ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{invite.agentspace_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Invited by <span className="font-medium text-gray-700">{invite.invited_by_name}</span> as{' '}
            <span className="font-medium text-gray-700">{invite.role === 'admin' ? 'Admin' : 'Member'}</span>
          </p>
        </div>
        <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{timeAgo(invite.created_at)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {statusBadge()}
        {isPendingAndValid && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-[120ms] cursor-pointer"
          >
            {accepting && <Loader2 className="w-3 h-3 animate-spin" />}
            Accept
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}

export default function InboxPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { refetchSpaces } = useAgentSpace()

  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInvites = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInboxInvites(session.access_token)
      setInvites(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (open) loadInvites()
  }, [open, loadInvites])

  function handleAccepted(inviteId: string) {
    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: 'accepted' } : i))
    )
    refetchSpaces()
  }

  const pendingCount = invites.filter((i) => i.status === 'pending' && !i.is_expired).length

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-gray-500" />
                <h2 className="text-[15px] font-semibold text-gray-900">Inbox</h2>
                {pendingCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              )}
              {error && (
                <p className="text-sm text-red-500 py-4 text-center">{error}</p>
              )}
              {!loading && !error && invites.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Inbox className="w-8 h-8 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No invitations</p>
                  <p className="text-xs text-gray-400 mt-1">When someone invites you to an agentspace, it'll show up here.</p>
                </div>
              )}
              {!loading && !error && invites.map((invite) => (
                <InviteCard key={invite.id} invite={invite} onAccept={handleAccepted} />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Export a hook to count pending invites for the header badge
export function usePendingInviteCount(): number {
  const { session } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!session?.access_token) return
    fetchInboxInvites(session.access_token)
      .then((invites) => setCount(invites.filter((i) => i.status === 'pending' && !i.is_expired).length))
      .catch(() => {})
  }, [session?.access_token])

  return count
}
