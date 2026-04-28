import { useEffect, useState } from 'react'
import { Clock, Loader2, RotateCcw, Send, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import {
  fetchAgentSpaceInvites,
  createInvite,
  resendInvite,
  revokeInvite,
} from '../../lib/api'
import type { Invite } from '../../lib/api'
import SlidePanel from './SlidePanel'

const RESEND_COOLDOWN_SECONDS = 180

function useCooldown(lastSentAt: string | null) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!lastSentAt) { setRemaining(0); return }
    const compute = () => {
      const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000
      return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed))
    }
    setRemaining(compute())
    const t = setInterval(() => {
      const r = compute()
      setRemaining(r)
      if (r <= 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [lastSentAt])

  return remaining
}

function InviteRow({
  invite,
  onRevoke,
  onResend,
}: {
  invite: Invite
  onRevoke: (id: string) => void
  onResend: (id: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentOk, setResentOk] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const cooldownSecs = useCooldown(invite.last_sent_at)

  const canResend = invite.status !== 'accepted' && invite.status !== 'revoked'

  async function handleResend() {
    setResending(true)
    setResendError(null)
    try {
      await onResend(invite.id)
      setResentOk(true)
      setConfirming(false)
      setTimeout(() => setResentOk(false), 3000)
    } catch (e) {
      setResendError(e instanceof Error ? e.message : 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  const badge = () => {
    if (invite.is_expired && invite.status === 'pending') {
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><Clock className="w-3 h-3" />Expired</span>
    }
    if (invite.status === 'accepted') return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Accepted</span>
    if (invite.status === 'revoked') return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Revoked</span>
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">Pending</span>
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{invite.invited_email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {invite.role === 'admin' ? 'Admin' : 'Member'} · Sent {new Date(invite.created_at).toLocaleDateString()}
          </p>
        </div>
        {badge()}
        {canResend && (
          cooldownSecs > 0 ? (
            <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {Math.floor(cooldownSecs / 60)}:{String(cooldownSecs % 60).padStart(2, '0')}
            </span>
          ) : resentOk ? (
            <span className="text-xs text-emerald-600 whitespace-nowrap">Sent!</span>
          ) : (
            <button
              onClick={() => { setConfirming((v) => !v); setResendError(null) }}
              title="Resend invite"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )
        )}
        {invite.status === 'pending' && !invite.is_expired && (
          <button
            onClick={() => onRevoke(invite.id)}
            title="Revoke invite"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2 pl-0 pr-1">
          <p className="text-xs text-gray-500 mb-2">
            Check your spam folder first. If the invite is expired it will be extended by 7 days.
          </p>
          {resendError && <p className="text-xs text-red-500 mb-2">{resendError}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-[120ms] cursor-pointer"
            >
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Resend
            </button>
            <button
              onClick={() => { setConfirming(false); setResendError(null) }}
              disabled={resending}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-[120ms] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function InvitesPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentOk, setSentOk] = useState(false)

  const token = session?.access_token
  const spaceId = activeSpace?.id

  useEffect(() => {
    if (!open || !token || !spaceId) return
    setLoading(true)
    setError(null)
    fetchAgentSpaceInvites(token, spaceId)
      .then(setInvites)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, token, spaceId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !spaceId) return
    setSending(true)
    setSendError(null)
    setSentOk(false)
    try {
      const newInvite = await createInvite(token, spaceId, inviteEmail.trim().toLowerCase(), inviteRole)
      setInvites((prev) => [newInvite, ...prev])
      setInviteEmail('')
      setSentOk(true)
      setTimeout(() => setSentOk(false), 3000)
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!token || !spaceId) return
    try {
      await revokeInvite(token, spaceId, inviteId)
      setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status: 'revoked' } : i))
    } catch (e) {
      console.error('[ERROR] revoke invite:', e)
    }
  }

  async function handleResend(inviteId: string) {
    if (!token || !spaceId) return
    const updated = await resendInvite(token, spaceId, inviteId)
    setInvites((prev) => prev.map((i) => i.id === inviteId ? updated : i))
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Invites" subtitle={activeSpace?.name}>
      <div className="px-6 py-4">
        {/* Invite form */}
        <form onSubmit={handleSend} className="mb-6">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Invite people</p>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            disabled={sending}
            className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-[120ms] disabled:opacity-50 mb-2"
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-2">
            {(['member', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={sending}
                onClick={() => setInviteRole(r)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all duration-[120ms] disabled:opacity-50 ${inviteRole === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r === 'admin' ? 'Admin' : 'Member'}
              </button>
            ))}
          </div>
          {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
          {sentOk && <p className="text-xs text-emerald-600 mb-2">Invite sent successfully!</p>}
          <button
            type="submit"
            disabled={sending || !inviteEmail.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-[120ms] cursor-pointer"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send invite
          </button>
        </form>

        {/* Invite history */}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && invites.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Sent invites</p>
            {invites.map((inv) => (
              <InviteRow key={inv.id} invite={inv} onRevoke={handleRevoke} onResend={handleResend} />
            ))}
          </>
        )}
      </div>
    </SlidePanel>
  )
}
